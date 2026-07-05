# v5.1.1 — bug fix: Mizuho lens (and article date) not persisting on saved analyses

One file: `app/api/saved/route.ts` (→ `app/api/saved/route.ts`). ✅ tsc + build clean.

## Root cause
The saved-item POST route rebuilds the item **field-by-field from a whitelist** before writing to KV (for validation/coercion). `mizuhoLens` was never added to that whitelist, so on save it was silently stripped — the lens showed live (from the in-memory item) but was gone from the KV copy, so it vanished on reopen. The same whitelist was also dropping **`articleDate`** (v4.8.4), so the "Published …" date on saved analyses disappeared on reload too.

## Fix
Added `mizuhoLens` and `articleDate` to the persisted item. Both now survive the KV round-trip.

- **Note:** this only fixes analyses saved **from now on**. Items saved before this build were persisted without the lens, so they won't have it — re-save them to attach it.
- **Fragility flagged:** this whitelist must be updated whenever a new `SavedItem` field is added, or it silently drops on persist (this is the second time — `articleDate` slipped the same way). Worth a future hardening so new fields pass through by default; noted for the backlog.

## Deploy
```
npm run build
git add . && git commit -m "v5.1.1: persist mizuhoLens + articleDate on saved analyses"
git push
```

## Test
Analyze an article (with a Mizuho-domain match) → save → close/reopen the app → the saved card still shows "Through Mizuho's lens" (and the Published date).
