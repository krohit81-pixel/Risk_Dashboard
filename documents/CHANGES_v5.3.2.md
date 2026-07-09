# v5.3.2 — fix: Print button was there but effectively invisible

One file: `components/saved/SavedList.tsx`. ✅ tsc + build clean.

## What was actually wrong
The Print/Export link *was* in the code (added in v5.3.0) and worked correctly — but I'd placed it as the very **last** element in the card, after What happened, Why it matters, Banking impact, Focus, Mizuho alignment, and the Mizuho lens block (which itself can run long). In practice that put it several screens down. Your screenshot cuts off right at the collapsed "Through Mizuho's lens" row — the print link was real, just buried well past what anyone would reasonably scroll to find it. That's a placement mistake on my part, not a missing feature.

## Fix
Moved **"🖨️ Print / Export PDF"** up to sit right next to **"Read article ↗"**, near the top of the card — directly under the published date, before any of the analysis content. Both links now render in a row together. Print is always shown (not conditional on having a source URL, unlike Read Article); removed the old duplicate link from the bottom of the card.

## Deploy
```
npm run build
git add . && git commit -m "v5.3.2: move Print/Export link to the top of the saved card, next to Read article"
git push
```

## Test
Open any saved item in Learn (tap the title to expand) → "Read article ↗" and "🖨️ Print / Export PDF" both appear together right at the top, no scrolling needed.
