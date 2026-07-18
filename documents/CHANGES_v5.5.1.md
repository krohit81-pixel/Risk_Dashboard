# v5.5.1 — concept card fix, indicator table fix, new logo/icons, + a clarification

✅ tsc + build clean.

## Apply map
```
ConceptStudio.tsx          → components/learn/ConceptStudio.tsx  (replaces)
WhatChanged.tsx             → components/WhatChanged.tsx          (replaces)
page.tsx                    → app/page.tsx                        (replaces)
manifest.json                → public/manifest.json                (replaces)
app_icons/icon.png           → app/icon.png                        (NEW)
app_icons/apple-icon.png     → app/apple-icon.png                  (NEW)
public_icons/icon-192.png    → public/icons/icon-192.png           (NEW)
public_icons/icon-512.png    → public/icons/icon-512.png           (NEW)
public_icons/logo-header.png → public/icons/logo-header.png        (NEW)
```

## 1 · Bug fix — concept card only showed the layman line
Confirmed by reading the actual render code (not a data-loss bug — Edit correctly reloaded everything, which is how I could tell the full record was genuinely saved): the "Your concepts" card only ever rendered `category`, `term`, and `layman`. `formal`, `risk` (CRO language), `cro` (why it matters), and `aliases` were being saved correctly the whole time but never displayed. Fixed — each card now shows all of it: formal name (if different from the term), Plain English, CRO language, Why a CRO cares, and aliases.

## 2 · Bug fix — "Show All Indicators" was missing several tracked indicators
Root cause, precisely: `WhatChanged.tsx` rendered a hardcoded 7-item list (`cpi, fedfunds, ust10y, sp500, vix, usdjpy, brent`), while the "What Changed" movers list (`lib/overnight.ts`) ranks a much wider set by magnitude — including `japancpi`, `nikkei`, `curve2s10s`, `jgb10y`, `move`, `gold`, `nasdaq`, `unrate`. So a mover like Japan CPI could show up top with a delta ("+30 bps") but have nowhere to show its actual prev/now numbers, because it simply wasn't in the table's whitelist — exactly your report. Expanded the table to the full 16-indicator set (grouped: rates & inflation, curve, vol & credit, FX & commodities, equities). Any indicator not actually present in a given day's fetched data just won't render a row — no risk of a broken/blank line.

## 3 · New logo + app icons
- **In-app header**: the "R" square badge is now your logo.
- **iOS "Add to Home Screen"**: `app/apple-icon.png` (Next.js's file-convention auto-detects this — no manual `<link>` tag needed). Built as a full-bleed 180×180 square with the corners filled in your artwork's own near-black navy rather than left transparent — Apple's touch-icon convention expects a solid square (iOS applies its own corner mask), and a transparent-cornered source can render oddly there.
- **Browser favicon**: `app/icon.png` (same auto-detection).
- **PWA manifest icons** (Android/Chrome "Install app"): added a proper `icons` array to `public/manifest.json` — it had none before this — pointing at new 192×512 versions (kept transparent here, which Android/Chrome handle fine).
- Source: your uploaded 1024×1024 PNG, genuinely transparent (verified), cropped tightly to the artwork's actual bounding box before resizing (there was a fair amount of empty margin in the original canvas that would've made the icon look small/off-center at typical display sizes).

## Clarification (not a code change — a real fork worth your call before I build it)
**"Are Top Developments static? Can they be dynamic?"** — verified against the actual code, precise answer: **both, currently**. The section shows up to 5 items: up to 4 are genuinely **dynamic**, generated fresh from live indicator moves each time the dashboard loads (`deriveDevelopments()` — e.g. "US CPI 3.7% — cooler than prior," which changes automatically as the real CPI value changes). But there are exactly **2 permanently static filler items** — "Geopolitical and trade friction remains a live tail risk" and "CRE and private-credit exposures stay on the supervisory radar" — hardcoded verbatim, same text every single day regardless of what's actually happening, used to pad the list out to 5 when fewer than 4 indicators moved meaningfully.

If you'd like these made dynamic too, there are two genuinely different approaches and I'd want your steer before building either:
- **(a) Rules-based**, matching how the other 4 are built — extend `deriveDevelopments()` with more indicator-driven templates (e.g. if the app already tracks a CRE-relevant series, template off that). Cheap, consistent, but geopolitics isn't really a numeric series the app tracks, so this fits banking/credit better than geopolitics.
- **(b) LLM-generated**, similar to the CRO Conversation/Editorial Intelligence sections — pull 1-2 "other notable developments" from the same clustered news source already used for the daily snapshot, picking things not already covered by the derived movers or the CRO themes. More flexible, genuinely reflects the day, but is a real new call on the daily critical path (cost/latency), not a small tweak.

Let me know which direction (or if you'd rather leave the 2 static fillers as a deliberate "always-on tail risk reminder," which is a defensible design choice too) and I'll build it as its own version.

## Deploy
```
npm run build
git add . && git commit -m "v5.5.1: concept card full detail, indicator table completeness, new app logo/icons"
git push
```

## Test
1. Learn → 08 Add Concept → your saved "Net Interest Income" card should now show Plain English / CRO language / Why a CRO cares, not just the one-liner.
2. Today → What Changed → Show All Indicators → Japan CPI (YoY), Yield Curve 2s10s, Nikkei 225 should now appear with real prev/now numbers.
3. Check the header — your logo, not "R".
4. On iPhone: Share → Add to Home Screen → confirm the new icon shows (may need to remove any existing home-screen bookmark first, since iOS sometimes caches the old icon).
