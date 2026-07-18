# v5.5.2 — quick fixes: icon, indicator wrapping, Learn reorder

Files: `app/page.tsx` · `components/WhatChanged.tsx` · `public/icons/logo-header.png` (re-included). ✅ tsc + build clean.

## Apply map
```
page.tsx                     → app/page.tsx                        (replaces)
WhatChanged.tsx               → components/WhatChanged.tsx          (replaces)
public_icons/logo-header.png → public/icons/logo-header.png        (re-included — see below)
```

## 1 · Icon not showing
Your screenshot shows the browser's broken-image placeholder — the header is correctly trying to load `/icons/logo-header.png`, but that file isn't present at that path in your deployment. Most likely explanation: it's a **binary image file**, easy to miss when applying a bundle of mostly `.tsx`/`.ts` files — worth double-checking it actually landed at `public/icons/logo-header.png` (not just `public/` or skipped entirely). I've **re-included it here** and verified it's a real, valid 64×64 PNG before packaging (not an empty/corrupt file this time — checked explicitly).

I also added a **fallback**: if the image ever fails to load for any reason, it now quietly reveals the old "R" badge underneath instead of showing a broken-image icon. So even if this recurs, you'll see something reasonable rather than a broken glyph — and it'll be an obvious visual cue that the file's missing, not a mystery.

## 2 · "Japan CPI +30 bps" wrapping to two lines
Fixed with `whitespace-nowrap` on both the Change cell and the Indicator-label cell, plus slightly tighter padding to give the now-much-longer table (16 rows vs. the original 7) more breathing room. Also wrapped the table in a horizontally-scrollable container as a safety net — if the fuller indicator set (with longer labels like "Yield Curve 2s10s") ever doesn't quite fit a narrow phone width, it'll scroll sideways rather than wrap or clip.

## 3 · Learn tab reordered
"Add Concept" moved from section 08 to **04, right after Concept Library** (03), matching how you'd naturally think about them — browse the glossary, then add to it. Everything after renumbered: Weekly Summary (05), Mizuho Reference (06), Briefing Books (07), Appearance (08).

## Deploy
```
npm run build
git add . && git commit -m "v5.5.2: icon fallback, indicator table nowrap+scroll, Learn section reorder"
git push
```
Double-check `public/icons/logo-header.png` specifically lands in your repo — `git status` after applying should show it as a new/changed file, not silently skipped.

## Test
1. Header shows your logo (or, if it still doesn't, the "R" fallback — no broken-image icon either way).
2. Today → Show All Indicators → Japan CPI (YoY) and every other row stays on one line.
3. Learn → order is Saved Analyses, Saved for Later, Concept Library, **Add Concept**, Weekly Summary, Mizuho Reference, Briefing Books, Appearance.
