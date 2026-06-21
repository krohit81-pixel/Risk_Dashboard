# V4.1 — Apply Guide

Two coordinated features: (1) a **Research reservation cap** so on-demand Research can never starve the daily briefing's Gemini quota, and (2) **bulleted per-area banking impact**, each area with its own plain-English twin. Type-checked clean (`tsc --noEmit`, 0 errors) against your repo.

## Files to drop in (overwrite, except the one marked NEW)

| File in this download | Goes to (repo path) | What changed |
|---|---|---|
| `researchQuota.ts` | `lib/researchQuota.ts` | **NEW** — daily-cap reservation guard (counter, `RESEARCH_DAILY_CAP`) |
| `types.ts` | `lib/types.ts` | added `BankingImpactArea`; `ResearchAnalysis.bankingImpactAreas?` |
| `analyze.ts` | `lib/analyze.ts` | `analyzeContent` now returns bulleted impact areas + per-area layman; back-compat strings preserved |
| `route.ts` | `app/api/research/analyze/route.ts` | cap check (429 when exhausted), increment on success, new `GET` for remaining budget |
| `ResearchWorkspace.tsx` | `components/research/ResearchWorkspace.tsx` | bulleted impact render, capped/disabled state, "N of 5 left today" indicator |

> These were edited in place against a fresh clone of `krohit81-pixel/Risk_Dashboard`, so they already contain your existing code plus the changes — safe to overwrite the matching files.

## One environment variable (optional)

Add in Vercel → Project → Settings → Environment Variables, then redeploy:

```
RESEARCH_DAILY_CAP = 5
```

If you don't set it, it defaults to **5**. Raise it (e.g. `20`) only after you enable a paid Gemini tier. Env vars bind at build time, so a redeploy is required for a change to take effect.

## Why 5 (not 7)

Your Gemini key is on the **free tier: 20 RPD** (peak already 12/20). Editorial = ~3 calls/run (4 with a retry); each Research analysis = 2 calls. At cap 5 → 10 Research calls/day, leaving comfortable headroom for the cron + the odd regen under 20 RPD. 7 (14 calls) would tip past 20 on any day you also regenerate. The briefing stays protected regardless — if Gemini ever hits 20, the cron falls through to Anthropic.

## How the guarantee holds

Only the Research route touches the counter. The cron (`/api/cron/editorial`) and manual regenerate (`/api/regenerate`) never call it, so they can't be blocked by it. At the cap, Research disables with a visible reason and **does not** fall back to Anthropic — that backup is reserved for the editorial path.

## Sanity check after deploy

1. Open the Research tab → you should see "5 of 5 analyses left today".
2. Run one analysis → banking impact renders as bullets (Credit risk, Market risk, …); flip to **Learning** → each bullet swaps to its plain-English twin.
3. Counter ticks down; after 5, the Analyze button shows "Paused until tomorrow".
4. Confirm the next morning's 04:00 IST cron still generates normally (it's exempt).

## Docs

`risk-dashboard-master-context-v4_1.md` and `engineering-reference-v4_1.md` are the updated context docs (version bumped, v4.1 changelog, Research-quota section, roadmap re-sequenced with Markets-tab refresh as a tier-gated V4.2 and Weekly Learning as a separate item).
