# v5.3.4 — fix: "Item not found" for every saved item

Files: `app/print/item/page.tsx` (NEW — the real fix) · `app/print/[id]/page.tsx` (now a redirect) · `app/api/saved/route.ts` · `components/saved/SavedList.tsx` · `components/research/ResearchWorkspace.tsx`. ✅ tsc + build clean.

## Apply map
```
app_print_item/page.tsx        → app/print/item/page.tsx        (NEW)
app_print_id_redirect/page.tsx → app/print/[id]/page.tsx         (replaces existing — now just a redirect)
app_api_saved/route.ts         → app/api/saved/route.ts          (replaces existing)
SavedList.tsx                  → components/saved/SavedList.tsx
ResearchWorkspace.tsx           → components/research/ResearchWorkspace.tsx
```

## What I found — and the honest limit on what I can confirm
Your screenshot showed a *clean* "not found" (not the distinct error message added in 5.3.3), for **every** saved item, while the Learn tab's list view worked fine throughout. That pattern rules out a genuine per-item data problem and points at something in how the id travels through the URL specifically for single-item lookups.

The concrete, testable difference: saved-analysis ids look like `analysis-2026-07-08T03:40:11.845Z` — colons, dots — and I was passing that through a **dynamic path segment** (`/print/[id]/<id>`). The briefing-book route has always used a **query string** (`/print/book?pack=<id>`) for its ids and has never shown this problem. I don't have live access to reproduce the exact mechanism, so I can't point to the precise line where the mismatch happens — but "special-character ids through a path segment fail; simple ids through a query string work" is a real, observable pattern, not a guess, and it's the most likely explanation.

## The fix
Moved the single-item print view from `/print/[id]` to **`/print/item?id=<id>`** — the same proven-working pattern as the briefing books. The old `/print/[id]/<id>` route still exists but now just redirects to the new one, so nothing that already points at it breaks. Both `SavedList.tsx` (Learn tab) and `ResearchWorkspace.tsx` (live Research view) now link to the new route directly.

Also added a one-line diagnostic log to `/api/saved` (the requested id + whether it was found), so **if this doesn't fully resolve it**, checking the Vercel function logs will show exactly what id string was actually queried — turning any recurrence into something diagnosable rather than another round of guessing.

## Deploy
```
npm run build
git add . && git commit -m "v5.3.4: move single-item print to a query-string route (fixes persistent not-found)"
git push
```

## Test
1. Open any saved item in Learn → tap "🖨️ Print / Export PDF" → should now load and render correctly, not "not found".
2. Print an analysis directly from the Research tab after saving it → same check.
3. If you have any old bookmarked `/print/<id>` links, confirm they redirect and still work.
4. **If it still says "not found" anywhere** — that would be genuinely useful new information (it would rule out my current theory entirely) — please send the exact screen again; I'd want to see the Vercel logs for that request next.
