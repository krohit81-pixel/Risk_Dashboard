# v4.8.4 — collapse defaults, "Newsletter ingestion" rename, article source date

Files: `components/research/ResearchWorkspace.tsx` · `components/RunHistory.tsx` · `components/saved/SavedList.tsx` · `lib/analyze.ts` · `lib/types.ts` · `lib/savedStore.ts` · `lib/savedMappers.ts`. ✅ tsc + build clean. No Python, no new env.

## 1 · Collapse defaults flipped
- **"Newsletters — today"** panel now starts **collapsed** by default.
- **"Analyze your own content"** workspace now starts **open** by default (reversed from 4.8.3).

## 2 · "Bloomberg ingestion" → "Newsletter ingestion"
Renamed the Today-tab generation-history sub-list heading and the per-run badge ("bloomberg" → "newsletter"), since ingestion now covers finews and other sources too.

## 3 · Source/publication date on Research analyses
The analysis now captures **when the article was published at the source** and shows it at the top of the card (just under the title, above "What happened"):
- The model extracts `articleDate` from the content's dateline/byline/timestamp (URL, pasted text, or screenshot text) → normalized to `YYYY-MM-DD`.
- If the model finds nothing, it falls back to a date parsed from the URL path (e.g. `/2026/06/30/`).
- If still nothing, the card shows the **analyzed** date instead — labelled honestly: **"Published {date}"** when we have the article's own date, **"Analyzed {date}"** when it's the fallback.
- Carried through to the **saved** card too (`articleDate` on the saved item).

Hardened the date parser to reject bare numbers / junk so a stray token can't masquerade as a date.
- *Model-path caveat:* date extraction is a prompt instruction validated by build only — eyeball a few analyses (a URL with a dated path, a pasted article with a dateline, a screenshot) to confirm it pulls the right date and falls back cleanly.

## Deploy
```
npm run build
git add . && git commit -m "v4.8.4: collapse defaults, newsletter-ingestion rename, article source date"
git push
```

## Test
1. Research tab: Newsletters collapsed, workspace expanded.
2. Today → Generation History: sub-list reads "Newsletter ingestion" with a "newsletter" badge.
3. Analyze a dated article (URL/text/screenshot) → "Published {date}" at top; analyze something undated → "Analyzed {date}".
