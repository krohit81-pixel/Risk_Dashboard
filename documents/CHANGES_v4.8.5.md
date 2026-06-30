# v4.8.5 — hotfix: restore `_decode_part` (newsletter ingestion was failing)

One file: `api/cron-bloomberg.py`. ✅ py_compile clean.

## Root cause
Every email failed with `name '_decode_part' is not defined`. Back in v4.8.0, when the `extract_article_links` helper was added, the edit accidentally swallowed the `def _decode_part(...)` header — its body was left as unreachable code after `extract_article_links`'s `return out`, so the function was never actually defined. `py_compile` passed (the orphaned lines are valid unreachable code), so it slipped through.

It stayed **latent** until now because `_decode_part` is only called during body extraction, which happens **after** the dedupe gate. Recent runs were all dedupe-skips (skipped before extraction), so the call never fired. Today's 5 fresh emails (incl. the new Daily Upside sender) reached extraction → `NameError` on all 5.

## Fix
Restored `_decode_part` as a proper module-level function. Verified via AST that it — and every other helper (`clean_html`, `detect_newsletter`, `_extract_with_retry`, `_extract_with_anthropic`, `_load_extra_newsletters`, `_log_run`, `extract_article_links`, …) — is defined.

Your env changes are fine — `INGEST_SENDERS` and `EXTRA_NEWSLETTERS` (with The Daily Upside) are correct and were not the problem.

## Deploy
```
git add . && git commit -m "v4.8.5: restore _decode_part (fix newsletter ingestion NameError)"
git push
```
After deploy, the 5 emails are still unread (they failed, so were never marked read) — the next scheduled run will pick them up automatically, or trigger `/api/cron-bloomberg?secret=<CRON_SECRET>` now.
