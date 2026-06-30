# v4.8.1 — bug fixes

Files: `lib/savedMappers.ts` · `components/saved/SavedList.tsx` · `components/research/ResearchWorkspace.tsx`. ✅ tsc + build clean. (No Python, no new env.)

## 1 · Saved Research analysis kept its editorial format
`savedFromAnalysis` wasn't carrying the new editorial fields, so a saved analysis fell back to the old layout. It now maps `firstOrder / secondOrder / keyTakeaway / whatToUnderstand` into the saved item's `detail` (and the bank-risk line), exactly like `savedFromEditorial`. Saved research analyses now render in the same Editorial format as editorial saves — what happened, why it matters, first/second-order, bank risk, key takeaway (under "Full detail"), plus the Mizuho alignment + focus that are research-specific.
- Note: this affects analyses saved **from now on**. Items saved before this build don't have the fields stored and will still show the old layout — re-save them to upgrade.

## 2 · Trimmed newsletter headers + date only
- Briefing headers are shortened: **"Evening Briefing — Americas" → "Americas — Eve"**, "Morning Briefing — Asia" → "Asia — Morn", etc. (no more wrapping to a second line). Short labels like "Markets Daily" / "finews" pass through unchanged. The **full** label is still used as the saved-analysis source, so provenance isn't lost.
- The date hint is now **just the date** — removed "yesterday" / "Nd ago".

## 3 · Saved-analysis footer shows only the analyzed date
Removed the "· saved {date}" tail from the analysis footer — it now ends at "… · analyzed {date}".

## Deploy
```
npm run build
git add . && git commit -m "v4.8.1: saved research keeps editorial format, trimmed newsletter headers, footer date cleanup"
git push
```
