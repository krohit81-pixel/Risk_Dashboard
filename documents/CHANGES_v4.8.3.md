# v4.8.3 — pasted-URL capture + collapse research workspace

Files: `app/api/research/analyze/route.ts` (→ `app/api/research/analyze/route.ts`) · `components/saved/SavedList.tsx` · `components/research/ResearchWorkspace.tsx`. ✅ tsc + build clean. No new env.

⚠️ Apply note: the staged `analyze-route.ts` goes to **`app/api/research/analyze/route.ts`** (renamed only to avoid a name clash in the bundle).

## 1 · Pasted text with a URL at the top
When you paste text and include a link near the start, the analyzer now captures it:
- `extractLeadingUrl()` grabs the first `http(s)` URL in the first ~600 chars (trailing punctuation trimmed); missing → ignored.
- It's stored as the analysis `originalUrl`, so on the **saved** card you now get:
  - a **"Read article ↗"** link under the title, and
  - the **site-name source tag** ("CNBC URL", "Reuters URL", …) — the chip now keys off the URL itself, so it works for pasted-with-link items, not just the "From URL" mode.
- Removed the old footer "· open link" (now redundant with the Read-article button).

## 2 · Research workspace collapsed by default
The "Analyze your own content" workspace (paste / URL / image + Analyze) now starts **collapsed** behind a tappable header, so the Research tab opens compact — Newsletters on top, workspace tucked below until you need it. (The newsletter panel and its per-briefing groups keep their own collapse from 4.8.0/4.8.1.)

## Deploy
```
npm run build
git add . && git commit -m "v4.8.3: capture pasted leading URL (Read article + tag), collapse research workspace by default"
git push
```

## Test
1. Paste an article with its URL on the first line → Analyze → save it → saved card shows "Read article ↗" + a site-name tag (e.g. "CNBC URL").
2. Paste with no URL → no link, chip stays "Pasted".
3. Open Research → workspace is collapsed; tap "Analyze your own content" to expand.
