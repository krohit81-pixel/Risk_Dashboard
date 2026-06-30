# v4.8.2 — make silent newsletter skips visible (dedupe diagnosis)

Files: `api/cron-bloomberg.py` · `components/RunHistory.tsx` · `lib/types.ts`. ✅ py_compile + tsc + build clean. No new env.

## Why your 2 emails were "picked but not processed"
They were skipped by the **dedupe guard**, silently. The flow:
- "2 unread candidate(s)" is logged **before** the dedupe check.
- For each candidate, the extractor checks `processed_msg:{message-id}` in KV (30-day TTL). Both keys already existed from an earlier run, so it did `skip + mark read + continue` — **before** any model call. That matches your log exactly: no Gemini call, and only KV traffic (2 dedupe lookups + 3 run-log writes = 5 calls).

So they weren't failing — they'd already been ingested once, and the guard correctly refused to redo them. The problem was purely that the skip was **invisible** (no log line, not counted in history), so it looked like nothing happened.

## Fixes (observability)
- **Per-candidate skip logs**, e.g.
  `[bloomberg] skip — already processed (use ?force=true to redo): "<subject>" [<message-id>]`
  and `[bloomberg] skip — empty body after cleaning: "<subject>"`.
- **Extraction log** when a candidate does proceed: `[bloomberg] extracting "<subject>" → <label>`.
- **Run summary**: `[bloomberg] run done: processed=X skipped=Y failed=Z (force=...)`.
- **Skipped count in the Today ingestion history**: now shows `… · N skipped` alongside processed/failed.

## To actually re-ingest those two (with the v4.8 URL + multi-story logic)
Since they're already deduped, a normal run will keep skipping them. Use the force flag:
```
/api/cron-bloomberg?secret=<CRON_SECRET>&force=true
```
(mark them unread first; `force=true` bypasses dedupe so they re-extract). This is also how you refresh any already-ingested briefing to pick up newer extraction logic.

## Deploy
```
npm run build
git add . && git commit -m "v4.8.2: log dedupe/empty skips + show skipped count in history"
git push
```
