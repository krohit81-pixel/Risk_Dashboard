"""
api/cron-bloomberg.py
v5.0 — Bloomberg newsletter extractor, running INSIDE the Risk_Dashboard project.

A "dumb pipe": it reads unread Bloomberg emails, scrubs the HTML, asks Gemini to
EXTRACT (not analyze) a structured digest, and writes it to the SAME Vercel KV the
dashboard already reads (`bloomberg:latest` + `bloomberg:{date}`). No risk analysis,
no Mizuho interpretation — that stays in the dashboard's analyzeContent() pipeline.

Because this lives in the same Vercel project, KV_REST_API_URL / KV_REST_API_TOKEN are
already present — no cross-project KV linking needed. Vercel builds this as a Python
Function (root /api + requirements.txt) alongside the Next.js app; it is reachable at
/api/cron-bloomberg and is driven by the cron in vercel.json.
"""

import os
import imaplib
import email
from email.header import decode_header
import json
import re
import time
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler

from bs4 import BeautifulSoup
from google import genai
from google.genai import types
from upstash_redis import Redis

# --- Configuration ---
MODEL_NAME = "gemini-2.5-flash"
MAX_RETRIES = 3
# Transient errors (503 high-demand, 429, 5xx) are worth waiting out with real backoff —
# a 2s gap just lands in the same spike. Seconds to wait BETWEEN attempts.
TRANSIENT_BACKOFF = [15, 35]
TRANSIENT_MARKERS = (
    "503", "429", "500", "502", "504",
    "unavailable", "resource_exhausted", "overloaded", "high demand", "try again",
)
# ── Configurable ingestion (V4.7) ──
# IMAP host + credentials. IMAP_EMAIL/IMAP_PASSWORD preferred; AOL_* kept for back-compat.
IMAP_HOST = os.environ.get("IMAP_HOST", "imap.aol.com")
# Which senders to ingest (comma-separated From-header substrings). Add CNBC, Reuters, etc.
INGEST_SENDERS = [s.strip() for s in os.environ.get(
    "INGEST_SENDERS", "noreply@news.bloomberg.com"
).split(",") if s.strip()]
SENDER_DOMAIN = INGEST_SENDERS[0] if INGEST_SENDERS else "noreply@news.bloomberg.com"
LOOKBACK_HOURS = int(os.environ.get("LOOKBACK_HOURS", "24"))  # only consider mail from the last N hours
LATEST_TTL_HOURS = 36  # each per-briefing digest self-expires after this if not refreshed
RUNS_KEPT = 15  # how many ingestion runs to keep in bloomberg:runs for the Today-tab history

# Fixed newsletter vocabulary. Detection is deterministic from the subject / mail start
# (more reliable than letting the model classify). `match` phrases are normalized
# (lowercased, whitespace-collapsed) substring checks; order = most-specific first.
NEWSLETTER_TYPES = [
    {"key": "evening_briefing_americas", "label": "Evening Briefing — Americas", "match": ["evening briefing americas"]},
    {"key": "morning_briefing_americas", "label": "Morning Briefing — Americas", "match": ["morning briefing americas"]},
    {"key": "evening_briefing_asia", "label": "Evening Briefing — Asia", "match": ["evening briefing asia"]},
    {"key": "morning_briefing_asia", "label": "Morning Briefing — Asia", "match": ["morning briefing asia"]},
    {"key": "markets_daily", "label": "Markets Daily", "match": ["markets daily"]},
]

# Extra classification entries via env, so new sources/briefings (Bloomberg Weekend, CNBC, …)
# can be added without a code change. Two accepted formats in EXTRA_NEWSLETTERS:
#   JSON:    [{"key":"cnbc","label":"CNBC","match":["cnbc"]}, ...]
#   compact: "CNBC=cnbc;Bloomberg Weekend=bloomberg weekend|weekend reading"
# (compact: Label=phrase1|phrase2 ; key auto-slugged from the label).
def _load_extra_newsletters():
    raw = os.environ.get("EXTRA_NEWSLETTERS", "").strip()
    if not raw:
        return []
    try:
        if raw.startswith("["):
            data = json.loads(raw)
            return [
                {"key": e["key"], "label": e["label"], "match": [m.lower() for m in e.get("match", [])]}
                for e in data if e.get("key") and e.get("label")
            ]
    except Exception as ex:
        print(f"[config] EXTRA_NEWSLETTERS JSON parse failed: {ex}")
        return []
    out = []
    for chunk in re.split(r"[;,]", raw):  # accept both ';' and ',' as entry separators
        if "=" not in chunk:
            continue
        label, phrases = chunk.split("=", 1)
        label = label.strip()
        match = [p.strip().lower() for p in phrases.split("|") if p.strip()]
        if label and match:
            key = "".join(c if c.isalnum() else "_" for c in label.lower()).strip("_")
            out.append({"key": key, "label": label, "match": match})
    return out


NEWSLETTER_TYPES = NEWSLETTER_TYPES + _load_extra_newsletters()


def _norm(s: str) -> str:
    # Normalize curly apostrophes so footer subscription matching is reliable.
    s = (s or "").replace("\u2019", "'").replace("\u2018", "'")
    return " ".join(s.lower().split())


# The footer of every Bloomberg newsletter says "...subscribed to Bloomberg's
# {NEWSLETTER NAME} newsletter." — the most reliable type signal, independent of the
# (often creative) subject and of whether the masthead is an image.
SUBSCRIBE_RE = re.compile(r"subscribed to bloomberg's (.{3,60}?) newsletter")


def _log_run(redis, emails_found: int, metrics: dict, processed_types) -> dict:
    """Append a capped, newest-first ingestion run record for the Today-tab history."""
    # Publish the current set of known briefing keys so the dashboard can render
    # env-added types (CNBC, Bloomberg Weekend, …) without a code change.
    try:
        keys = [nt["key"] for nt in NEWSLETTER_TYPES] + ["bloomberg_other"]
        redis.set("bloomberg:type_index", json.dumps(sorted(set(keys))))
    except Exception:
        pass
    run_record = {
        "run_time": datetime.now(timezone.utc).isoformat(),
        "emails_found": emails_found,
        "processed": metrics.get("processed", 0),
        "failed": metrics.get("failed", 0),
        "newsletter_types": sorted(processed_types) if processed_types else [],
    }
    try:
        existing_raw = redis.get("bloomberg:runs")
        runs = json.loads(existing_raw) if existing_raw else []
        if not isinstance(runs, list):
            runs = []
    except Exception:
        runs = []
    runs.insert(0, run_record)
    try:
        redis.set("bloomberg:runs", json.dumps(runs[:RUNS_KEPT]))
    except Exception:
        pass
    return run_record


def _is_transient(err) -> bool:
    msg = str(err).lower()
    return any(m in msg for m in TRANSIENT_MARKERS)


def _extract_with_retry(ai_client, system_prompt: str, user_prompt: str) -> dict:
    """Gemini JSON extraction with transient-aware backoff. Retries 503/429/5xx with real
    waits (so a high-demand spike clears); fails fast on permanent errors. Raises on give-up
    — the caller then leaves the email unread so the NEXT cron run retries it."""
    last_err = None
    for attempt in range(MAX_RETRIES):
        try:
            response = ai_client.models.generate_content(
                model=MODEL_NAME,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            return json.loads(response.text)
        except Exception as e:
            last_err = e
            if not _is_transient(e):
                break  # permanent (e.g. bad request) — don't burn the remaining attempts
            if attempt < MAX_RETRIES - 1:
                wait = TRANSIENT_BACKOFF[min(attempt, len(TRANSIENT_BACKOFF) - 1)]
                print(f"Gemini transient ({str(e)[:80]}) — backing off {wait}s")
                time.sleep(wait)
    raise RuntimeError(f"Gemini extraction failed: {str(last_err)}")


def detect_newsletter(subject: str, html_content: str, text_content: str):
    """Classify the briefing. Priority: (1) footer subscription line — authoritative;
    (2) subject + image alt text (masthead); (3) full body text. Runs on the RAW email
    (not the header/footer-stripped content) so the masthead and footer survive."""
    raw_text, alts = "", []
    if html_content:
        try:
            soup = BeautifulSoup(html_content, "html.parser")
            alts = [img.get("alt", "") for img in soup.find_all("img") if img.get("alt")]
            raw_text = soup.get_text(separator=" ")
        except Exception:
            raw_text = ""
    norm_raw = _norm(f"{raw_text} {text_content or ''}")

    # 1) Footer subscription line (authoritative).
    m = SUBSCRIBE_RE.search(norm_raw)
    if m:
        sub = m.group(1)
        for nt in NEWSLETTER_TYPES:
            if any(p in sub for p in nt["match"]):
                return nt["key"], nt["label"]

    # 2) Subject + masthead image alt text.
    head = _norm(f"{subject} {' '.join(alts)}")
    for nt in NEWSLETTER_TYPES:
        if any(p in head for p in nt["match"]):
            return nt["key"], nt["label"]

    # 3) Full body (last resort; subscription/subject preferred above).
    for nt in NEWSLETTER_TYPES:
        if any(p in norm_raw for p in nt["match"]):
            return nt["key"], nt["label"]

    return "bloomberg_other", "Bloomberg"


# --- Helper: HTML Cleaner ---
def clean_html(html_body: str) -> str:
    """Strips tags, ads, and navigation to leave pure editorial content."""
    if not html_body:
        return ""
    soup = BeautifulSoup(html_body, "html.parser")
    for element in soup(["script", "style", "nav", "footer", "header", "form"]):
        element.decompose()
    for div in soup.find_all(
        "div",
        class_=lambda x: x and any(w in x.lower() for w in ["ad", "promo", "footer", "unsubscribe", "social"]),
    ):
        div.decompose()
    lines = [line.strip() for line in soup.get_text(separator="\n").splitlines() if line.strip()]
    return "\n".join(lines)


def _decode_part(part) -> str:
    """Safely decode an email part body to text. (Fixes the get_payload kwarg bug —
    the correct keyword is decode=True, not decode_bytes=True.)"""
    payload = part.get_payload(decode=True)
    if payload is None:
        return ""
    return payload.decode(errors="ignore")


# --- Core Pipeline ---
def process_bloomberg_inbox(force: bool = False):
    try:
        redis = Redis(url=os.environ["KV_REST_API_URL"], token=os.environ["KV_REST_API_TOKEN"])
        ai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    except KeyError as e:
        return {"error": f"Missing required environment variable: {str(e)}"}

    metrics = {"processed": 0, "skipped": 0, "failed": 0}
    processed_types = set()

    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST)
        mail.login(
            os.environ.get("IMAP_EMAIL") or os.environ["AOL_EMAIL"],
            os.environ.get("IMAP_PASSWORD") or os.environ["AOL_APP_PASSWORD"],
        )
        mail.select("inbox")
    except Exception as e:
        return {"error": f"IMAP connection failed: {str(e)}"}

    # Coarse IMAP filter (SINCE is date-granular) — go back one calendar day so we never
    # miss anything inside the 24h window, then filter precisely by timestamp below.
    # Union across all configured senders (Bloomberg, CNBC, …).
    since_date = (datetime.now(timezone.utc) - timedelta(hours=LOOKBACK_HOURS + 24)).strftime("%d-%b-%Y")
    e_ids: list = []
    seen_ids = set()
    for sender in INGEST_SENDERS:
        status, messages = mail.search(None, f'(UNSEEN FROM "{sender}" SINCE {since_date})')
        for eid in (messages[0].split() if messages and messages[0] else []):
            if eid not in seen_ids:
                seen_ids.add(eid)
                e_ids.append(eid)
    if not e_ids:
        mail.logout()
        _log_run(redis, 0, metrics, processed_types)
        return {"status": "Complete", "metrics": metrics, "message": "No recent unread Bloomberg emails found."}

    cutoff = datetime.now(timezone.utc) - timedelta(hours=LOOKBACK_HOURS)
    print(f"[bloomberg] {len(e_ids)} unread candidate(s) from {INGEST_SENDERS}; lookback={LOOKBACK_HOURS}h")

    # Fetch candidates, parse their dates, keep only those within the lookback window,
    # and sort ascending so the NEWEST email is processed last → newest digest wins.
    # IMPORTANT: BODY.PEEK[] fetches WITHOUT setting \Seen — so an email we then skip as
    # too-old is NOT consumed (RFC822 would have marked it read before we even checked).
    candidates = []
    too_old = 0
    for e_id in e_ids:
        try:
            status, res = mail.fetch(e_id, "(BODY.PEEK[])")
            raw_email_bytes = next(r[1] for r in res if isinstance(r, tuple))
            msg = email.message_from_bytes(raw_email_bytes)
            try:
                msg_dt = email.utils.parsedate_to_datetime(msg.get("Date", ""))
                if msg_dt.tzinfo is None:
                    msg_dt = msg_dt.replace(tzinfo=timezone.utc)
            except Exception:
                msg_dt = datetime.now(timezone.utc)
            if msg_dt < cutoff:
                too_old += 1
                continue  # older than the lookback window — left UNREAD (peek didn't consume it)
            candidates.append((e_id, msg, msg_dt))
        except Exception as e:
            print(f"Failed to fetch email ID {e_id}: {str(e)}")
            metrics["failed"] += 1
            continue
    if too_old:
        print(f"[bloomberg] skipped {too_old} email(s) older than {LOOKBACK_HOURS}h — widen LOOKBACK_HOURS to include them")

    if not candidates:
        mail.logout()
        _log_run(redis, 0, metrics, processed_types)
        return {"status": "Complete", "metrics": metrics, "message": f"No Bloomberg mail in the last {LOOKBACK_HOURS}h."}

    candidates.sort(key=lambda c: c[2])  # oldest → newest

    system_prompt = (
        "You are a Bloomberg Newsletter Extraction Agent.\n"
        "Transform Bloomberg newsletters into structured JSON for downstream processing by a Risk Dashboard.\n"
        "Do NOT perform risk analysis, market analysis, Mizuho-specific interpretation, or investment recommendations. "
        "Extraction and normalization only.\n"
        "Ignore newsletter promotions, 'More from Bloomberg', social media links, and unsubscribe text.\n"
        "Return valid JSON matching the requested schema exactly. No markdown. No explanations."
    )

    schema_template = (
        "{\n"
        '  "source": "Bloomberg",\n'
        '  "newsletter_key": "",\n'
        '  "newsletter_type": "",\n'
        '  "edition": "",\n'
        '  "publication_date": "",\n'
        '  "subject": "",\n'
        '  "lead_editorial": { "author": "", "editorial_text": "" },\n'
        '  "today_stories": [\n'
        '    { "headline": "", "theme": "", "importance": "high|medium|low", "summary": "" }\n'
        "  ],\n"
        '  "tomorrow_watchlist": [ { "headline": "" } ],\n'
        '  "commute_story": { "headline": "", "summary": "" }\n'
        "}"
    )

    for e_id, msg, msg_dt in candidates:
        try:
            # 1. Dedupe via KV — already-processed mail is skipped (also marked \\Seen below).
            message_id = msg.get("Message-ID", "").strip() or f"fallback_{hash(msg.get('Subject', '') + str(time.time()))}"
            kv_dedupe_key = f"processed_msg:{message_id}"
            if redis.get(kv_dedupe_key) and not force:
                metrics["skipped"] += 1
                mail.store(e_id, "+FLAGS", "\\Seen")
                continue

            # 2. Metadata
            subject_header = decode_header(msg.get("Subject", ""))[0]
            subject = (
                subject_header[0].decode(subject_header[1] or "utf-8", errors="ignore")
                if isinstance(subject_header[0], bytes)
                else subject_header[0]
            )
            try:
                pub_date_str = email.utils.parsedate_to_datetime(msg.get("Date", "")).strftime("%Y-%m-%d")
            except Exception:
                pub_date_str = datetime.utcnow().strftime("%Y-%m-%d")

            # 3. Content
            html_content, text_content = "", ""
            if msg.is_multipart():
                for part in msg.walk():
                    ctype = part.get_content_type()
                    if ctype == "text/html":
                        html_content = _decode_part(part)
                    elif ctype == "text/plain":
                        text_content = _decode_part(part)
            else:
                if msg.get_content_type() == "text/html":
                    html_content = _decode_part(msg)
                else:
                    text_content = _decode_part(msg)

            cleaned_text = clean_html(html_content) if html_content else text_content
            if not cleaned_text.strip():
                metrics["skipped"] += 1
                mail.store(e_id, "+FLAGS", "\\Seen")
                continue

            # Deterministic briefing classification (footer subscription line → subject/alt → body).
            nl_key, nl_label = detect_newsletter(subject, html_content, text_content)

            # 4. Gemini extraction with transient-aware backoff.
            user_prompt = (
                f"Expected Schema:\n{schema_template}\n\n"
                f"Subject: {subject}\nDate: {pub_date_str}\n\n"
                f"Newsletter Content:\n{cleaned_text}"
            )
            extracted_data = _extract_with_retry(ai_client, system_prompt, user_prompt)
            # Override model guesses with deterministic metadata.
            extracted_data["subject"] = subject
            extracted_data["publication_date"] = pub_date_str
            extracted_data["newsletter_key"] = nl_key
            extracted_data["newsletter_type"] = nl_label
            extracted_data["edition"] = nl_label
            extracted_data["ingested_at"] = datetime.now(timezone.utc).isoformat()

            # 5. KV storage — ONE key PER BRIEFING, each with its own TTL. The morning and
            # evening briefs coexist; the same briefing next day overwrites only its own key;
            # a briefing that stops arriving expires independently after LATEST_TTL_HOURS.
            redis.setex(f"bloomberg:type:{nl_key}", LATEST_TTL_HOURS * 3600, json.dumps(extracted_data))
            redis.setex(kv_dedupe_key, 2592000, "1")  # 30-day dedupe TTL

            processed_types.add(nl_label)
            mail.store(e_id, "+FLAGS", "\\Seen")
            metrics["processed"] += 1

        except Exception as e:
            print(f"Failed to process email ID {e_id}: {str(e)}")
            metrics["failed"] += 1
            continue

    mail.logout()
    run_record = _log_run(redis, len(candidates), metrics, processed_types)
    return {"status": "Complete", "metrics": metrics, "run": run_record}


def _authorized(headers, path: str) -> bool:
    """Optional protection: if CRON_SECRET is set, require it (Bearer header or ?secret=).
    Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically."""
    secret = os.environ.get("CRON_SECRET")
    if not secret:
        return True
    auth = headers.get("Authorization", "")
    if auth == f"Bearer {secret}":
        return True
    return f"secret={secret}" in (path or "")


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if not _authorized(self.headers, self.path):
            self.send_response(401)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "unauthorized"}).encode("utf-8"))
            return
        try:
            force = ("force=1" in self.path) or ("force=true" in self.path.lower())
            result = process_bloomberg_inbox(force=force)
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
