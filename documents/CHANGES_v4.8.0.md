# v4.8.0 — newsletter URLs + collapse, quota → 20, Editorial-style Research output

Files: `lib/types.ts` · `lib/analyze.ts` · `lib/researchQuota.ts` · `components/research/ResearchWorkspace.tsx` · `api/cron-bloomberg.py`. ✅ tsc + build + py_compile clean.

## 1 · Newsletter section
- **Per-article "Read article ↗" link** next to *Analyze this →*. The extractor now pulls `(headline → href)` pairs from the email HTML (social/unsubscribe/icon links filtered out) and passes them to the model, which attaches the matching URL to each story (`BloombergStory.url`). Link shows only when a URL was found.
- **Individual newsletter sections now collapsed by default** (tap a briefing to expand). The "Newsletters — today" panel itself is unchanged.
- *Model-path caveat:* URL matching is a prompt instruction I can't exercise live here. Re-ingest a newsletter and confirm links attach to the right stories; a story with no confident match simply shows no link.

## 2 · Research quota 10 → 20
`RESEARCH_DAILY_CAP` default raised to **20** analyses/day. ⚠️ If you set `RESEARCH_DAILY_CAP` in Vercel env (you're currently on 10), change it there too — **env overrides code**. Safe on your Tier 1 (20 analyses ≈ 40 Gemini calls/day).

## 3 · Research output now mirrors Editorial Intelligence
The Research analysis card now uses the same structure and look as Editorial Intelligence:
- Header: **category · severity · risk-horizon**, then title.
- **What happened · sourced** (facts) / **Why it matters · interpretation** (kept the sourced-vs-interpretation separation you liked).
- **First-order / Second-order** two-column.
- **Bank risk · {kind} —** one line.
- **Key takeaway** box.
- **What to understand** (learning toggle).
- **What should I focus on** — reuses the existing v4.4 personalized focus capability, as agreed.
- **Mizuho alignment** kept **below** the editorial fields (with the "no clean match" note + the Mar-2025 framework disclaimer), as agreed.
- Related concepts unchanged.

Under the hood: `analyzeContent` now generates `category, severity, horizon, confidence, firstOrder, secondOrder, bankRiskKind, bankRisk, keyTakeaway, whatToUnderstand` (all normalized/validated), still runs the dedicated alignment + focus calls (≈2 LLM calls/analysis, unchanged), and keeps a combined `bankingImpact` string for back-compat (saved items, alignment input). Removed the now-dead `FieldBlock`/`ImpactBlock` renderers and the per-area banking-impact breakdown from the Research card (replaced by the editorial Bank-risk line).
- *Model-path caveat:* the new fields are validated by build only; eyeball the first live analysis to confirm the model fills first/second-order + bank-risk well across pasted/URL/image inputs.

## Deploy
```
npm run build
git add . && git commit -m "v4.8.0: newsletter URLs + collapse, research quota 20, editorial-style research output"
git push
```
(`api/cron-bloomberg.py` changed; no new env required. Remember the `RESEARCH_DAILY_CAP` env note above.)

## Test
1. Research → Newsletters — today: groups start collapsed; expand one → each story shows "Read article ↗" (after re-ingesting with this build).
2. Analyze a story / paste an article → card renders in the Editorial format with First/Second-order, Bank risk, Key takeaway, What should I focus on, and Mizuho alignment below.
3. Quota badge shows "… of 20 analyses left today" (once the env is 20).
