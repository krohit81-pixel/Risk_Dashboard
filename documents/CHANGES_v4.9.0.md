# v4.9.0 — Anthropic-fallback truncation fix + correct newsletter labels

Files: `api/cron-bloomberg.py` · `components/research/ResearchWorkspace.tsx` · `components/saved/SavedList.tsx`. ✅ py_compile + tsc + build clean. No new env.

## 1 · Fix: Anthropic fallback produced truncated JSON
This morning's run: Gemini 503'd through both backoffs, the Anthropic fallback fired correctly (200) — but `json.loads` failed with `Unterminated string ... (char 7878)`. Root cause: `_extract_with_anthropic` capped output at `max_tokens=4096`. JSON is token-dense (~2 chars/token — every quote/colon/brace is a token), so 4096 tokens is only ~7,900 chars, and a full Bloomberg Evening Briefing overran it and got cut off mid-string.

Fix: raised the fallback `max_tokens` to **8192** (comfortable headroom for a full briefing; well within claude-haiku's output limit). Gemini path is unchanged — its failures were 503 overload, not truncation.
- The failed email (`Election year gift`, Evening Briefing — Americas) is still unread, so the next scheduled run picks it up; or trigger the cron now.

## 2 · Backlog item: saved newsletter analyses show the correct publisher
Previously the newsletter-story analyze path hardcoded `Bloomberg · <edition>` as the source label, so every saved newsletter analysis (finews, The Daily Upside, …) showed a "Bloomberg" chip and a "Bloomberg · …" footer.
- `ResearchWorkspace.tsx`: newsletter stories now label as **`Newsletter · <edition>`** → footer reads "Newsletter · The Daily Upside".
- `SavedList.tsx` `sourceChip`: derives the real publisher from the edition — **Bloomberg** editions (briefing / markets daily / weekend) → "Bloomberg", **finews** → "finews", **The Daily Upside** → "Daily Upside", anything else → the edition name. This also **retroactively corrects legacy saves** that were stored as "Bloomberg · finews" / "Bloomberg · The Daily Upside" (parsed off the label, so old items relabel without a re-save).

## Deploy
```
npm run build
git add . && git commit -m "v4.9.0: bump Anthropic fallback max_tokens (fix truncated JSON) + correct newsletter publisher labels"
git push
```

## Test
1. After deploy, run the cron (or wait for the next slot) → the Evening Briefing email extracts (via Gemini normally; if Gemini 503s, the Anthropic fallback now returns complete JSON).
2. Analyze a Daily Upside / finews story → save it → chip shows "Daily Upside" / "finews" and the footer reads "Newsletter · …".
3. An older Bloomberg-prefixed newsletter save now shows the corrected publisher chip.
