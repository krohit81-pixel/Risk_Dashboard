# v4.7.3 — show weekly briefings (don't mute by content age) + force re-ingest

Files: `components/research/ResearchWorkspace.tsx` · `api/cron-bloomberg.py`. ✅ tsc + build + py_compile clean.

## What you saw, and why

**finews ingested fine** (1 of the 2 emails → the Gemini call in your log). But the panel showed "finews — last digest Jun 26, no newer update" instead of the stories. That's the **display** staleness guard, which muted anything whose *content date* is ≥2 days old. finews is dated 26 Jun, so it got muted — wrong for a weekly-ish briefing (the content is legitimately a few days old, but it's the latest there is).

**Bloomberg Weekend = the other email, and it was deduped** ("1/2 processed"). It was almost certainly ingested as a generic "Bloomberg" item by an earlier run, so its `processed_msg:` key already existed and the run skipped it. Marking it unread doesn't clear that dedupe key.

## Fixes

### 1 · Staleness now keys off ingestion, not content age
The panel guard now asks "how long since we **ingested** this?" (KV TTLs at 36h anyway), not "how old is the content?". So a freshly-ingested weekly briefing shows its stories, with a small "· 2d ago" hint next to the date instead of being hidden. Only a briefing not refreshed for 48h+ gets the muted note (which, given the 36h TTL, basically never happens). finews will now show its stories.

### 2 · `force` flag to re-ingest deduped mail
The cron now accepts `?force=true`, which **bypasses the dedupe check** for that run — so an email already processed (like Bloomberg Weekend) gets re-ingested and re-classified with your current keywords. Use it for backfills; normal scheduled runs are unaffected.

## To get Bloomberg Weekend in now

1. Deploy this.
2. Mark the Bloomberg Weekend email **unread** in AOL.
3. Run with force + your wider lookback:
   ```
   /api/cron-bloomberg?secret=<CRON_SECRET>&force=true
   ```
   (keep `LOOKBACK_HOURS=72` for this run so it's in window). It'll re-process and classify as "Bloomberg Weekend".

finews needs nothing further — it's already stored; just reload the app after deploying and its stories will appear.

Afterwards you can drop `LOOKBACK_HOURS` back to 24 and stop using `force` — future Weekend/finews emails arrive fresh with new message-ids, so they'll ingest and classify on the normal schedule without either.

## Deploy
```
npm run build
git add . && git commit -m "v4.7.3: ingestion-based staleness + force re-ingest flag"
git push
```
