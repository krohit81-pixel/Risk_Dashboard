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
SENDER_DOMAIN = "noreply@news.bloomberg.com"
LOOKBACK_HOURS = 24  # only consider Bloomberg mail received in the last N hours


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
def process_bloomberg_inbox():
    try:
        redis = Redis(url=os.environ["KV_REST_API_URL"], token=os.environ["KV_REST_API_TOKEN"])
        ai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    except KeyError as e:
        return {"error": f"Missing required environment variable: {str(e)}"}

    metrics = {"processed": 0, "skipped": 0, "failed": 0}

    try:
        mail = imaplib.IMAP4_SSL("imap.aol.com")
        mail.login(os.environ["AOL_EMAIL"], os.environ["AOL_APP_PASSWORD"])
        mail.select("inbox")
    except Exception as e:
        return {"error": f"IMAP connection failed: {str(e)}"}

    # Coarse IMAP filter (SINCE is date-granular) — go back one calendar day so we never
    # miss anything inside the 24h window, then filter precisely by timestamp below.
    since_date = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%d-%b-%Y")
    status, messages = mail.search(None, f'(UNSEEN FROM "{SENDER_DOMAIN}" SINCE {since_date})')
    if not messages[0]:
        mail.logout()
        return {"status": "Complete", "metrics": metrics, "message": "No recent unread Bloomberg emails found."}

    cutoff = datetime.now(timezone.utc) - timedelta(hours=LOOKBACK_HOURS)

    # Fetch candidates, parse their dates, keep only those within the lookback window,
    # and sort ascending so the NEWEST email is processed last → bloomberg:latest = newest.
    candidates = []
    for e_id in messages[0].split():
        try:
            status, res = mail.fetch(e_id, "(RFC822)")
            raw_email_bytes = next(r[1] for r in res if isinstance(r, tuple))
            msg = email.message_from_bytes(raw_email_bytes)
            try:
                msg_dt = email.utils.parsedate_to_datetime(msg.get("Date", ""))
                if msg_dt.tzinfo is None:
                    msg_dt = msg_dt.replace(tzinfo=timezone.utc)
            except Exception:
                msg_dt = datetime.now(timezone.utc)
            if msg_dt < cutoff:
                continue  # older than the 24h window — leave it untouched
            candidates.append((e_id, msg, msg_dt))
        except Exception as e:
            print(f"Failed to fetch email ID {e_id}: {str(e)}")
            metrics["failed"] += 1
            continue

    if not candidates:
        mail.logout()
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
            if redis.get(kv_dedupe_key):
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

            # 4. Gemini extraction (retry)
            user_prompt = (
                f"Expected Schema:\n{schema_template}\n\n"
                f"Subject: {subject}\nDate: {pub_date_str}\n\n"
                f"Newsletter Content:\n{cleaned_text}"
            )
            extracted_data, last_err = None, None
            for _ in range(MAX_RETRIES):
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
                    extracted_data = json.loads(response.text)
                    extracted_data["subject"] = subject
                    extracted_data["publication_date"] = pub_date_str
                    break
                except Exception as e:
                    last_err = e
                    time.sleep(2)

            if not extracted_data:
                raise RuntimeError(f"Gemini extraction failed: {str(last_err)}")

            # 5. KV storage (same store the dashboard reads)
            redis.set(f"bloomberg:{pub_date_str}", json.dumps(extracted_data))
            redis.set("bloomberg:latest", json.dumps(extracted_data))
            redis.setex(kv_dedupe_key, 2592000, "1")  # 30-day dedupe TTL

            mail.store(e_id, "+FLAGS", "\\Seen")
            metrics["processed"] += 1

        except Exception as e:
            print(f"Failed to process email ID {e_id}: {str(e)}")
            metrics["failed"] += 1
            continue

    mail.logout()
    return {"status": "Complete", "metrics": metrics}


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
            result = process_bloomberg_inbox()
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
