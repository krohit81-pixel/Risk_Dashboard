# v4.5.3 — Bloomberg newsletter detection fix

One file: `api/cron-bloomberg.py` (overwrite). ✅ `py_compile` clean; detection validated against your real "AI freakout" Evening Briefing sample.

## Why the Evening Briefing wasn't grouped

Its **subject was "AI freakout"** — a creative headline, not "Evening Briefing Asia". The briefing name lives only in the **masthead** banner (an image), and the old detector checked the subject plus the *cleaned* body — but `clean_html` strips the `<header>` and `get_text()` ignores image alt text, so the masthead never reached the detector. It fell into the generic `bloomberg_other` bucket (shown as just "Bloomberg"), which is why you saw no "Evening Briefing Asia" group. "Markets Daily" worked only because its subject literally contains "Markets Daily".

## The fix — detect from the footer subscription line

Every Bloomberg email ends with "…subscribed to Bloomberg's **{NEWSLETTER NAME}** newsletter." That names the briefing reliably, regardless of the subject or whether the masthead is an image. Detection now runs in priority order:

1. **Footer subscription line** (authoritative) — regex-extracted, runs on the RAW email text so the footer survives.
2. **Subject + image alt text** (masthead).
3. **Full body text** (last resort).

It also normalizes curly apostrophes (so "Bloomberg's" matches) and beats the "More from Bloomberg" promo list — that section mentions other newsletters (e.g. "Markets Daily"), but the subscription line is checked first, so an Evening Briefing email still classifies as Evening Briefing.

Validated:
- "AI freakout" + image masthead → **evening_briefing_asia** (was `bloomberg_other`)
- Markets Daily → markets_daily
- Morning Asia (with Markets-Daily promo in footer) → morning_briefing_asia

## One note on the already-processed email

The Evening Briefing that already came in was marked read + dedupe-keyed when it was processed as `bloomberg_other`, so re-running won't reclassify *that specific* email. The **next** Evening Briefing Asia will classify correctly, and the stale `bloomberg_other` entry expires on its own within 36h. (If you want the current one reclassified immediately, you'd need to clear its `processed_msg:*` dedupe key in KV and mark it unread — usually not worth it; just wait for the next one.)

## Deploy

Overwrite `api/cron-bloomberg.py`, push. Then trigger `/api/cron-bloomberg?secret=<CRON_SECRET>` after the next briefing arrives and confirm the run log's `newsletter_types` shows the right names.
