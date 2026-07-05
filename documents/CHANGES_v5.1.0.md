# v5.1.0 — Mizuho lens polish + Learn reference section

Builds on v5.0.0 (Mizuho Knowledge Repository). ✅ tsc + build clean. No new env.

## New / changed files
- **NEW** `lib/mizuhoKnowledgeData.ts` — pure data + types + retrieval (no KV/LLM imports), so client components can use the repository safely.
- `lib/mizuhoKnowledge.ts` — slimmed to the server-side readers/interpreter; re-exports the data (existing imports unchanged).
- **NEW** `components/learn/MizuhoReference.tsx` — Learn section 05.
- `components/intel/MizuhoLensBlock.tsx` — collapsible + header fix.
- `components/RunHistory.tsx` — capsule removed.
- `app/page.tsx` — Learn section 05 wired in. `lib/types.ts` + `lib/savedStore.ts` — lens type now references the data module.

## 1 · Generation history — "newsletter" capsule removed
The redundant per-run badge is gone; the line now reads just the timestamp + `processed/found · N skipped · N failed` under the "Newsletter ingestion" heading.

## 2 · "Through Mizuho's lens" header alignment + one-line repo tag
The title no longer wraps into the meta. The repository tag is trimmed to a single non-wrapping line — **"v5.0 · May 2026"** (month-year, right-aligned).

## 3 · "Through Mizuho's lens" is collapsible, default closed
Tap the header (chevron on the right) to expand. Keeps the analysis card compact; the lens is there when you want it.

## 4 · Learn tab — new section 05 "Mizuho Reference"
A structured, summarised reference view of Mizuho's disclosed positions (the same repository the lens draws on), as cards:
- **Capital & Liquidity** (CET1/Tier1/Total/Leverage/LCR/NSFR + interpretation) — Basel Pillar 3.
- **Financial Profile** (FY25 income/profit/assets/guidance + earnings drivers + risk focus).
- **Strategy & Targets** (vision, ROE/payout/buyback/valuation, focus businesses, macro view).
- **Risk Philosophy** (discipline + decision framework).
- **Executive Questions** (the six).
Header notes it's point-in-time disclosure (v{version} · date), not live data.

## Deploy
```
npm run build
git add . && git commit -m "v5.1.0: mizuho lens collapsible + header fix, remove newsletter capsule, Learn Mizuho reference section"
git push
```
(If you haven't already seeded the repository from v5.0.0: `/api/admin/seed-mizuho?secret=<CRON_SECRET>`. The Learn reference reads the embedded copy, so it renders even before seeding.)

## Test
1. Today → Generation History: no "newsletter" badge.
2. Research → analyze an article → "Through Mizuho's lens" is collapsed, header on one line with "v5.0 · May 2026"; tap to expand.
3. Learn → section 05 "Mizuho Reference" → the five reference cards render.

## Still queued (backlog)
- Research "Questions leadership will ask" — **out of scope** per your call (dropped).
