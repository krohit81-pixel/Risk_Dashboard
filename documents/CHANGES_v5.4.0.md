# v5.4.0 — Dark/Light appearance toggle

The full theming system, per the scoping discussion. Manual toggle only, lives in Learn as section 07 "Appearance." ✅ tsc + build clean.

## Apply map
```
tailwind.config.ts                       → tailwind.config.ts                    (replaces)
globals.css                              → app/globals.css                       (replaces)
layout.tsx                               → app/layout.tsx                        (replaces)
page.tsx                                 → app/page.tsx                          (replaces)
components_shared/ThemeProvider.tsx      → components/shared/ThemeProvider.tsx   (NEW)
components_learn/AppearanceToggle.tsx    → components/learn/AppearanceToggle.tsx (NEW)
ui.tsx                                   → components/ui.tsx                     (replaces)
RiskGauge.tsx                            → components/RiskGauge.tsx              (replaces)
components_intel/*.tsx                   → components/intel/*.tsx                (4 files, replaces)
components_learn/ConceptLibrary.tsx      → components/learn/ConceptLibrary.tsx   (replaces)
components_learn/Linkify.tsx             → components/learn/Linkify.tsx          (replaces)
ResearchWorkspace.tsx                    → components/research/ResearchWorkspace.tsx (replaces)
SavedList.tsx                            → components/saved/SavedList.tsx        (replaces)
```
Also run `npm install` (adds `next-themes` as a dependency — reflected in `package.json`).

## How it works
- Every color token (`ink-*`, `fg`/`fg-muted`/`fg-faint`, `line`/`line-soft`, `calm`/`elevated`/`stress`/`steel`/`mizuho`) now resolves through a **CSS custom property** instead of a fixed hex value, with separate `.dark` and `.light` blocks in `globals.css`. `next-themes` toggles a class on `<html>`; the toggle (Learn → 07 Appearance) writes to it and persists the choice in localStorage. Manual only — no "follow system," per your call.
- Because most of the app already used semantic Tailwind classes (`bg-ink-800`, `text-fg-faint`) rather than one-off hex, **the vast majority of components needed zero changes** — they just started resolving against whichever theme is active. That's the payoff of the token architecture already in place.

## The light palette — design reasoning, not a mechanical inversion
I preserved each surface's **role**, not its literal lightness ranking. In dark mode, `ink-900` (page) → `ink-800` (card) → `ink-700` (pressed) each get progressively *lighter*, because there's headroom below white. In light mode there's no headroom above white, so:
- Page background: soft off-white (`#F5F6F8`), not stark white — avoids glare, common in finance-app UI.
- Card surface: pure white — still the "raised" surface relative to the page, exactly like dark mode.
- Pressed/active state: a subtle gray (`#EDEEF2`), *darker* than the card — the standard light-UI press convention, same **intent** (a visible state change) via the only direction available once white is reached.

Status/accent colors (`elevated` amber and `mizuho` purple especially) were **deepened** for light mode — their dark-mode values are light enough to read clearly on near-black but would be too pale to read as legible text on white. `elevated` changed the most (amber → a deeper brownish-orange, `#B45F06`) — flagging this specifically since it's the most visually different token and the one most worth checking once you can see it.

**I cannot verify any of this visually from here** — no headless browser in my sandbox, same category of limitation as live Gemini/Supabase. This is a first pass on the palette; expect to want some adjustments once you see it on your phone, especially the amber tone.

## Fixed while I was in there: 22 hardcoded "dark-only" surface colors
Beyond the token conversion, I found and fixed a real bug class: several components had **whole card surfaces or badge text hardcoded to one-off hex** (e.g. `bg-[#161226]` for the entire "Through Mizuho's lens" card) rather than using the token system. Left alone, these would've rendered as a broken-looking dark box floating inside an otherwise light page. Fixed 22 such occurrences across 8 files (`MizuhoLensBlock`, `MizuhoAlignment`, `RadarSection`, `ConceptLibrary`, `Linkify`, `ResearchWorkspace`) by replacing them with the existing theme-aware tokens + Tailwind's opacity-modifier syntax (e.g. `bg-mizuho/10 border-mizuho/25`), which automatically adapts per theme with no new tokens needed. Also fixed the Sparkline trend-line color and the risk gauge's status colors/track (SVG `stroke`/`fill` can't use Tailwind classes, so these now reference the CSS variables directly).

## Deliberately left unchanged
- **Decorative/categorical accent colors** — the Mizuho-lens chip colors, Learn-section accent dots, saved-item source-chip colors, briefing-pack colors (~7 files, ~70 occurrences). These are fixed brand/category colors (e.g. "Credit Risk Pack" is always red-ish) by design — common practice to keep category colors constant across themes, not a bug.
- **One badge text color** (`CroConversation`'s "NEW" pill) — pinned dark text against its own solid bright-green fill, self-contained regardless of page theme; correctly left alone.
- **Print/PDF views** — already their own dedicated light theme (`app/print/layout.tsx`), built with plain `neutral-*` colors independent of this whole system. Completely unaffected, no changes needed.

## Known minor gap (flagged, not fixed)
The iOS status-bar color (`viewport.themeColor` in `layout.tsx`) and the PWA manifest's `theme_color`/`background_color` are **static**, matching the dark default — they can't easily follow a client-side-only theme choice without a more involved server-side (cookie-based) theme detection, which felt like scope creep beyond what was asked. Practical effect: in light mode, the iOS status bar area will still render as if dark. Cosmetic only, not functional — happy to revisit if it bothers you once you see it.

## Deploy
```
npm install
npm run build
git add . && git commit -m "v5.4.0: dark/light appearance toggle (manual, in Learn)"
git push
```

## Test — this one needs your eyes, not just mine
1. Learn → section 07 "Appearance" → tap Light → confirm the whole app switches immediately, no flash of the wrong theme on reload.
2. Walk all four tabs + every Learn section in light mode — this is the part I most need your read on, especially the amber ("Elevated" severity, Weekly Summary accent) and purple (Mizuho lens/alignment) tones.
3. Confirm the "Through Mizuho's lens" card and the "Related concepts" chips (Research) no longer show as a dark box in light mode.
4. Switch back to Dark → confirm it looks pixel-identical to before this release (nothing should have changed for anyone who never touches the toggle).
5. Close and reopen the app → your choice should persist.
