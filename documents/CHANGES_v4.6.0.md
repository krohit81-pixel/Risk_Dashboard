# v4.6.0 — Live CPI + Core PCE, Markets/Releases split, sparkline trends

✅ `tsc` + `npm run build` clean. No new env vars (uses the existing `FRED_API_KEY`).

## Files (all overwrite in place)
`lib/fred.ts` · `lib/markets.ts` · `lib/marketData.ts` · `lib/types.ts` · `lib/fallbackData.ts` · `components/ui.tsx` · `components/CroDashboard.tsx` · `lib/version.ts` · `package.json`

## First: why CPI was showing sample (likely root cause)

The old `yoyPair` fetched **exactly 14** observations and hard-failed (`< 14 → null`) if even one was filtered — zero buffer — while every `levelPair` card (unemployment, Fed funds, yields) only needs 2 and stayed live. That asymmetry is the most likely reason CPI *specifically* showed sample even with the key set. The new `yoyHistory` fetches 27, computes a YoY series, and needs only 13 obs to produce a value — robust to gaps.

I also added **targeted logging** in `lib/fred.ts`. After deploy, the Vercel function logs for `/api/dashboard` will say exactly what's happening per series, e.g.:
- `[fred] CPIAUCSL: FRED_API_KEY not set` → the key isn't reaching runtime (check it's set for **Production** and redeploy)
- `[fred] CPIAUCSL: HTTP 400` → key invalid/typo
- `[fred] CPIAUCSL: only N obs (<13)` → data issue
- (no warning) → it's live

> Quick diagnostic regardless of the fix: on the Markets page, do **US Unemployment** and **Fed Funds** also show the "sample" tag? If yes → it's the key/env (all FRED cards are sample), and code alone won't fix it. If only CPI was sample → this release fixes it.

## A · Headline CPI + Core PCE

Both now live from FRED — headline CPI YoY (`CPIAUCSL`) and **Core PCE YoY (`PCEPILFE`), the Fed's preferred gauge**. Each card shows current YoY, previous release, change vs previous (in pp, via the existing change formatter), cadence (Monthly), and a **Last released** line. Core PCE releases ~2 weeks after CPI, so its date will lag — which is exactly why the per-card date helps.

## B · Markets / Releases split + trends

`CroDashboard` now renders two sections instead of group-by-group:
- **Market Indicators** (real-time · daily): S&P 500, Nasdaq, 10Y, HY spread, VIX, USD/JPY, curve, Brent, gold, MOVE.
- **Economic Releases** (scheduled · monthly): CPI, Core PCE, Unemployment, Fed Funds — each with its "Last released: Jun 11" label (true FRED publication date, falling back to "May 2026 data" if the releases API is unavailable).

Per your steer, **no payrolls/GDP added** — instead every card now carries a small **sparkline trend** (last ~13 readings; YoY history for releases, ~22 daily closes for market quotes), colored by risk direction (red = risk-positive move, green = risk-negative). Sample histories ship in the scaffold so the sparklines render even before live data lands.

## Notes / caveats
- **Last released** uses FRED's releases API (CPI=10, PCE=21, Employment=50), cached 6h.
- I **can't end-to-end test the live FRED fetch** here (no key in my env) — validated compilation, build, and the YoY/levels math. Eyeball the first live render: CPI/Core PCE should lose the "sample" tag and show real values + a release date.
- Fed Funds is grouped under Economic Releases (it's a monthly FRED series); say the word if you'd rather it sit elsewhere.

## Deploy
```
npm run build
git add . && git commit -m "v4.6.0: live CPI + Core PCE, Markets/Releases split, sparkline trends"
git push
```
