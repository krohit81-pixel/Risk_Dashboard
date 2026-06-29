# v4.7.4 — newsletter rename + multi-story extraction + Anthropic fallback in extractor

Files: `components/research/ResearchWorkspace.tsx` · `api/cron-bloomberg.py` · `requirements.txt`. ✅ tsc + build + py_compile clean.

## 1 · "Bloomberg — today" → "Newsletters — today"
The Research panel header is now source-neutral, since finews (and future sources) live there too.

## 2 · finews picked up only one story → now captures all featured articles
The extraction prompt was written as a "Bloomberg Newsletter Extraction Agent" and effectively pulled the single same-day lead. finews bundles a week of articles into one edition, so only the 26-Jun lead survived. The prompt is now a source-agnostic "Financial Newsletter Extraction Agent" and explicitly says to populate `today_stories` with the main featured stories in order of prominence (typically 5-10), including articles whose own date differs from the send date, and to drop ads (`ANZEIGE`/`ADVERTORIAL`). Bloomberg is unaffected (its briefing stories are same-day anyway).
- Couldn't run the live model here — this is a prompt change validated by build only. Re-ingest a finews email (mark unread + `?force=true`) and confirm it now lists several stories.

## 3 · Anthropic fallback in the extractor (the morning 503 failure)
Your 00:00 run hit Gemini 503 across all three attempts (15s + 35s backoff) and gave up — the email stayed unread for the next run, but the morning briefing missed it. Since these high-demand 503 spikes keep recurring, the extractor now falls back to **Anthropic (claude-haiku)** once if Gemini is still failing after its retries, mirroring the main app. 
- Added `anthropic` to `requirements.txt`.
- Guarded init: if `ANTHROPIC_API_KEY` (already in your env) or the package is missing, it degrades to the old behaviour (no fallback) — nothing breaks.
- Uses `LLM_MODEL` if set, else `claude-haiku-4-5-20251001`.
- On give-up (both providers fail) the email is still left unread to retry next run.

You'll see `Gemini failed (…) — falling back to Anthropic` in the logs when it kicks in.

## Deploy
```
npm run build
git add . && git commit -m "v4.7.4: Newsletters header + multi-story extraction + Anthropic fallback in extractor"
git push
```
(`requirements.txt` changed, so the Python function will reinstall deps on deploy.)
