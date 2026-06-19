# Global Risk Intelligence Dashboard

A morning risk briefing for the CRO of a global bank. Answers one question:
**“What are the most important global risk developments I need to know this morning?”**

Built mobile-first for iPhone Safari — save it to the Home Screen and it runs like an app.

---

## Run it

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

That's it. The dashboard works with **no API keys** — any indicator it can't fetch
live falls back to clearly-marked `sample` values, so nothing is ever blank.

### Optional: live macro data (recommended, ~1 minute)

Macro indicators (CPI, unemployment, Fed funds, 10Y, HY spread) come from **FRED**,
which needs a free key. Market data (S&P, Nasdaq, VIX, USD/JPY, Brent) comes from
**Yahoo Finance** and needs no key.

1. Get a free key: https://fred.stlouisfed.org/docs/api/api_key.html
2. Copy `.env.local.example` → `.env.local`
3. Paste your key:

```
FRED_API_KEY=your_key_here
```

4. Restart `npm run dev`.

---

## Add to iPhone Home Screen

1. Open the URL in **Safari** on your iPhone.
2. Tap **Share → Add to Home Screen**.
3. Launch it from the icon — it opens full-screen, no browser chrome.

(On your phone, replace `localhost` with your computer's LAN IP, e.g.
`http://192.168.1.20:3000`, while `npm run dev` is running — or deploy to Vercel.)

---

## What's on the screen

| # | Section | Source |
|---|---------|--------|
| 1 | **Morning Risk Brief** — status, change vs yesterday, generated summary, risk meter | computed from live deltas |
| 2 | **Top Developments** — 5 items with category, severity, why-it-matters | derived from data + curated watch items |
| 3 | **What Changed Since Yesterday** — compact table with arrows | live indicators |
| 4 | **Top Emerging Risks** — 5 cards (probability / impact / trend) | curated CRO watch-list |
| 5 | **Global Risk Heat Map** — US / EU / UK / JP / CN / IN, green-amber-red | US is data-driven; others editorial |
| 6 | **Key CRO Dashboard** — grouped indicator cards | live + fallback |
| 7 | **Implications for a Global Bank** — credit / market / liquidity / capital / profitability | CRO framework |

The risk colours (green / amber / red) are **functional**: they always reflect the
*risk* direction of a move, not just whether a number went up or down. A falling
S&P shows red; a falling VIX shows green.

---

## How it's wired

```
app/
  layout.tsx            Inter font + iOS home-screen meta
  page.tsx              Client page: fetch /api/dashboard, render 7 sections
  globals.css           Tailwind + safe-area + reduced-motion
  api/dashboard/route.ts  Fetches FRED + Yahoo in parallel, runs the engine
components/             One file per section + shared ui primitives + RiskGauge
lib/
  fred.ts               FRED fetch (level + YoY helpers)
  markets.ts            Yahoo Finance quote fetch
  riskEngine.ts         Composite score, status, generated brief, derived developments
  fallbackData.ts       Sample values + curated narrative content
  format.ts             Display formatting
  types.ts              Shared types
```

All third-party fetching is **server-side** (the API route), so there are no CORS
issues and no keys are exposed to the browser.

### Tuning the analysis

- **Scoring / status thresholds** — `lib/riskEngine.ts` (`computeScore`, `statusFromScore`).
- **Emerging risks, heat-map reasoning, bank implications** — `lib/fallbackData.ts`.
  These are an editorial starting framework; tailor them to your institution.
- **Tracked indicators** — `lib/fallbackData.ts` (`INDICATOR_SCAFFOLD`) and the
  FRED/Yahoo symbols in `app/api/dashboard/route.ts`.

### Wiring in live news (Section 2)

Top Developments currently combines data-derived headlines with curated watch
items. To add a live news feed, fetch your provider (e.g. a headlines API) inside
`app/api/dashboard/route.ts`, map results to the `Development` shape in
`lib/types.ts`, and merge them into the `developments` array.

---

## Notes

- Decision-support tool, not investment advice.
- Yahoo's public endpoint is unofficial and can rate-limit; the dashboard degrades
  gracefully to sample values when a source is unavailable.

---

## Version 2 additions

New metrics wired into the live pipeline (all degrade to clearly-marked `sample` values if a source is unavailable):

| Metric | Source | Notes |
|---|---|---|
| Gold (spot) | Yahoo `GC=F` | live, no key |
| Yield Curve 2s10s | FRED `T10Y2Y` | live daily; a rise = steepening = risk-positive |
| MOVE Index | Yahoo `^MOVE` | ⚠️ rarely served by Yahoo's free endpoint — usually shows `sample`. No reliable free source exists for MOVE (proprietary ICE index). |
| **Japan Watch** (new section) | — | USD/JPY + Nikkei live; JGB 10Y, BOJ rate, Japan CPI are FRED monthly series (lagged by reporting cadence) |

Japan Watch series IDs: JGB 10Y `IRLTLT01JPM156N`, BOJ rate `IRSTCB01JPM156N`, Japan CPI `JPNCPIALLMINMEI` (computed YoY). Gold/MOVE/Yield-Curve appear inside the existing Key CRO Dashboard groups; Japan Watch is its own section (07), with Implications now section 08.

To activate the FRED-based metrics, make sure `FRED_API_KEY` is set and redeploy (`vercel --prod`).

---

## Version 3 — CRO Intelligence Layer (sections 09–13)

An editorial / interpretation layer beneath the live v2 data spine. The data
anchors; the intelligence layer explains the "why" and surfaces developments
that never appear as an indicator.

| # | Section | Notes |
|---|---|---|
| 09 | What CROs are talking about | Radar chips, each classified Market / Strategic / Credit / Regulatory / Macro |
| 10 | Today's CRO conversation | Ranked theme cards (Mizuho lens, signals, learning prep) |
| 11 | Editorial intelligence | Lean < 30s cards: what happened (sourced) / why it matters (interpretation) / 1st & 2nd order / bank-risk / takeaway |
| 12 | Japan & Asia watch | Daily Japan risk narrative + Mizuho block |
| 13 | Weekly learning summary | Weekly cadence role-prep accelerator |

**Executive vs Learning toggle** (top of page): Executive view is glanceable;
Learning view adds *Questions leadership may ask*, *If this comes up in a meeting*,
and *What I should understand*.

**Single theme engine (build rule):** sections 09 and 10 draw from ONE set
(`THEMES` in `lib/intelligence.ts`). The radar lists every theme as a chip;
section 10 expands those flagged `expanded`. They cannot drift.

**Data anchors, news explains:** themes/editorial items with an `anchorId` are
pinned to the live indicator at assembly time (e.g. the JGB theme shows the live
JGB 10Y). Edit interpretation freely; the anchored number always comes from data.

**Colour semantics:** blue = structure / lens / links · amber = attention /
interpretation / talking point · teal = learning layer · purple = Mizuho context ·
red/green = direction of move only.

### Wiring live news (currently curated)

The intelligence layer is curated editorial (clearly tagged `interpretation` /
`sourced` and confidence-rated) until a news source is connected. The pipeline is
scaffolded in `lib/newsAdapter.ts` (sources behind adapters: Marketaux, Finnhub,
NewsAPI, GNews; premium feeds deferred). To go live:

1. Implement `fetchRaw()` for an adapter and set its key (e.g. `MARKETAUX_API_KEY`).
2. Cluster + de-dup + score with the provided `relevanceScore`.
3. Pass survivors to an LLM for interpretation.
4. Map results to the `CroTheme` / `EditorialCard` shapes — the UI is unchanged.

Until then, `liveNews` is `false` and the curated layer renders. No code in the
v2 data spine changed; FRED/Yahoo, the brief, heat map and Japan Watch are intact.

---

## Version 3.1 — Daily editorial snapshot (two clocks)

The data layer (01–08, Japan Watch) keeps refreshing live. The editorial layer
(09–13) is now generated **on a schedule, frozen all day, and read from storage** —
not regenerated on page loads.

**Two daily snapshots** (Vercel Cron, `vercel.json`):
- `morning` — `30 22 * * *` UTC (~04:00 IST), labelled the 06:00 IST briefing; captures the full prior US session.
- `evening` — `0 16 * * *` UTC (~21:30 IST); captures the US open / Asia hand-off.

**What you'll see:** an *Editorial snapshot* header with generation time (IST),
sources, articles reviewed, themes, overall confidence, and a coverage checklist.
A banner appears when the snapshot is a curated baseline, stale (previous day), or
built on limited news.

### How it behaves by configuration

| Configured | Editorial layer |
|---|---|
| Nothing | Curated baseline seed, served via the same freeze/metadata path |
| `CRON_SECRET` + KV | Daily snapshot persisted & frozen; curated content until news/AI added |
| + `MARKETAUX_API_KEY` | Real article counts, sources, coverage; curated interpretation |
| + `ANTHROPIC_API_KEY` | Live LLM-interpreted themes (grounded, schema-validated, derived confidence) |

### Setup to activate the daily freeze

1. **Provision KV:** Vercel dashboard → Storage → create a KV store → it adds
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically.
2. **Add `CRON_SECRET`** (any long random string) to the project's env (Production).
3. Redeploy. The two crons appear under the project's *Cron Jobs*.
4. (Optional) add `MARKETAUX_API_KEY`, then `ANTHROPIC_API_KEY` to go fully live.

Without KV, an in-memory store is used (fine for `npm run dev`, not durable across
serverless instances) and the read path falls back to the curated seed.

**Guarantees built in:** generation failures never overwrite a good snapshot
(graceful staleness); the LLM may only interpret supplied stories and its output is
schema-validated before persistence; anchor numbers are frozen at generation and a
drift chip appears if live data moves materially; confidence is derived, not guessed;
themes carry a controlled `topicId` for future "New Since Yesterday" diffing; up to
14 days × 2 slots are retained for the weekly summary.

---

## Version 3.2 — Live news ingestion + AI interpretation

The editorial layer now generates from **real news** when keys are present. Adapters
sit behind one interface (`lib/newsAdapter.ts`); each activates only if its key is set.

| Source | Env var | Free tier |
|---|---|---|
| Marketaux | `MARKETAUX_API_KEY` | 100 req/day |
| NewsData.io | `NEWSDATA_API_KEY` | 200 credits/day |
| Finnhub | `FINNHUB_API_KEY` | 60 req/min |
| Alpha Vantage | `ALPHAVANTAGE_API_KEY` | 25 req/day (optional) |

Add any or all — more keys = more articles. The pipeline merges, de-dupes, clusters
by CRO topic, relevance-scores (earnings/single-stock noise suppressed), then — if
`ANTHROPIC_API_KEY` is set — an LLM writes the themes, **grounded** (interpret only
supplied stories), **schema-validated**, with **derived confidence** (anchored +
multi-source = High) and numbers re-anchored to the live data spine. Any section the
model omits falls back to curated, and any failure falls back to the last good snapshot.

### Behaviour by configuration

| Keys present | Editorial layer |
|---|---|
| none | Curated baseline (frozen daily) |
| news only | Real article counts + sources; curated interpretation |
| news + `ANTHROPIC_API_KEY` | Live LLM-written themes from today's news |

### Activate & verify

1. `vercel env add MARKETAUX_API_KEY production` (and any others you want), then
   `vercel env add ANTHROPIC_API_KEY production`.
2. `vercel --prod`.
3. Trigger a run: Cron Jobs → **Run** on `…?slot=morning` (or visit the URL with `&secret=`).
4. Check the run's response JSON: `articlesReviewed` should be **> 0** and `seed` **false**.
5. The dashboard's Editorial Snapshot header should now show real sources and an article count.

Cost: one LLM run per snapshot, twice daily, over a handful of themes — a few cents/day.

### LLM provider (Gemini-first)

The interpretation step is provider-agnostic (`lib/llm.ts`):
- **Gemini is tried first** (free tier — `GEMINI_API_KEY`, model `gemini-2.5-flash`).
- If Gemini errors or returns nothing **and** `ANTHROPIC_API_KEY` is set, it
  **automatically falls back to Anthropic** (default model Haiku) for that run.
- Neither key → curated content.

The Editorial Snapshot header shows which provider actually wrote the briefing
("Generated … · by Gemini"). News fetches run in parallel with per-call timeouts,
and the LLM call has its own timeout, to stay within Vercel's function limit.

---

## Version 3.2 — Collapsible sections, What Changed Overnight, source ranking

- **What Changed Overnight** (below the Daily Risk Brief): top risk-relevant movers
  since yesterday, data-only and always live. Colour = direction of *risk* (rising
  yields/spreads/vol/inflation = 🔴, rising equities = 🟢, ambiguous = 🟠).
- **Collapsible sections** with state persisted across refreshes. Always-expanded:
  Daily Risk Brief, What Changed Overnight, Top Developments, conversation radar,
  Today's CRO Conversation. Collapsed by default: the rest.
- **Source-tier ranking**: finance wires (Reuters/Bloomberg/Nikkei/FT/CNBC/Finnhub/
  Marketaux) outrank general/local outlets in the relevance score; known low-quality
  local sources are penalised. (Premium wires can't be *fetched* on free tiers — this
  ranks them up when they appear via the configured adapters.)
- **Finnhub** adapter active via `FINNHUB_API_KEY` (finance-grade market news).
- **One daily snapshot**: evening cron removed; morning only (`30 22 * * *` UTC ≈ 04:00 IST).

Mizuho Relevance Score is planned for v3.3 (banded Low/Moderate/Elevated/High, per-theme).

---

## Version 3.3 — Trust, learning structure, mobile tabs (Vercel Pro)

**Robustness & quality**
- `maxDuration` raised to 180s (Pro); LLM timeouts relaxed (Gemini 90s / Anthropic 60s, env-tunable).
- **Degrade reason** recorded + surfaced: the snapshot header and cron JSON now say *why* a briefing is curated (`llm_timeout`, `llm_invalid_json`, `no_news`, `no_llm_key`, `carried_forward`, …).
- **Retry-once** on invalid JSON; **last-good generated snapshot** preferred over curated on failure (marked stale).
- **Cron logging checkpoints** (`[gen] ingested … clusters … provider … degradeReason …`) so logs always show the pipeline path.
- Finnhub adapter + source-tier weighting + cross-section dedupe (from 3.2) retained.

**Structure & learning**
- **Three tabs** (bottom nav): **Today** (brief · merged What Changed · CRO Conversation · editorial · Japan), **Markets** (indicators · Japan watch · tappable heat · emerging risks · implications), **Learn** (weekly summary). Standalone Deep Dive removed; Conversation Radar folded into themes.
- **Merged "What Changed"**: top risk-ranked movers + "Show all indicators" expander.
- **Theme persistence**: NEW tag / "Day N · ongoing · seen N×", tracked in KV (`ed:topicSeen`).
- **Go deeper** embedded per theme (lenses, signals, talking points, plain-English).
- **Tappable regional heat** (one-line read on tap).
- **Footer attribution**: "Prepared by Rohit Kohli · Head of Risk India, Mizuho."

Deferred to 3.4: learning-inventory KV, personal knowledge base, concept history, more metrics.

---

## Version 3.4 — Built-in "Explain simply" + header fix

- **Explain simply** (inside each theme's "Go deeper", as a Mechanics ⇄ Explain simply toggle):
  pre-generated at snapshot time, **grounded** as a translation of the theme's own points —
  a quick plain-English **headline**, then each **Mizuho bullet** and **meeting question** shown as
  **Layman's Meaning** + **Risk Executive Language** (names the standard term: IRRBB, ICR, PD, NPL,
  mark-to-market volatility, AFS, CET1… only when it genuinely applies).
- Generated by a **separate, isolated LLM call** after themes — if it fails, themes still render
  (the Explain toggle just doesn't appear). Rides inside the existing free daily Gemini API run (~$0).
- **Cosmetic fix:** Editorial Snapshot header restructured (Articles/Themes as a 2-col row, Sources
  full-width below) — fixes the source-name / "62" overlap on narrow screens.

Deferred: sparklines + persistence-timeline + heat-strip visuals (→ 3.5); Mizuho relevance band; learning-inventory KV.

---

## Version 3.5 — Learn tab as a personal concept library

- **Concept Library** (Learn tab): a curated core of ~24 CRO concepts (carry trade, IRRBB,
  ICR, PD, ECL, NPL, AFS, CET1, VaR, CVA, RWA, LCR, NIM, term premium, BOJ normalisation,
  CRE wall, private credit, repatriation…). Each entry: **Layman's meaning · Risk executive
  language · Why a CRO cares · optional visual chain · "Where you've seen it"**.
- **Auto-collect**: during generation, theme text is scanned for concept aliases and recorded
  in KV (`learn:conceptSeen`) — so entries show **"Day N · seen N×"** and link back to the
  themes they appeared in. The library grows/personalises as you use the dashboard.
- **Pin favourites** (persisted in localStorage); search; seen-concepts sort first.
- **Term linking**: recognised terms inside a theme's **Explain simply** view are tappable and
  jump straight to their Learn entry.
- Visuals are restrained labelled "chains" (e.g. Rates ↑ → bond price ↓ → AFS loss → CET1
  pressure), only where a picture teaches better than prose.

Deferred: LLM auto-definition of *novel* terms beyond the curated core; live "ask a follow-up";
sparklines on Markets; Mizuho relevance band.

---

## Version 3.6 — Learning view = whole-screen plain-English

- **Learning view now rewrites the entire screen into plain English** — every prose field
  across CRO Conversation themes, Editorial Intelligence, Japan & Asia Watch, Bank Implications
  and Emerging Risks (why it matters, banking impact, Mizuho, go-deeper lenses/questions/meeting
  prep, what-to-understand, first/second-order, key takeaway). Executive view = the original
  expert wording. The toggle is now a **language switch**, not a "show more" switch.
- **Pre-generated** in the morning run as a parallel `layman` twin per item (grounded translation,
  same facts, no jargon) — instant + offline on mobile, fits the two-clock model. Themes/editorial/
  Japan are LLM-translated; Implications/Emerging-risks ship hand-authored plain-English twins
  (curated, reliable). If the translation step fails, Learning view falls back to the original text.
- **"Explain simply" (per-term toggle) retired** — the whole-screen translation replaces it.
  Concept term-linking is preserved: recognised terms in a theme's Banking-impact line remain
  tappable into the Learn library.
- LLM budget unchanged: the translation call replaces the old Explain call (still two calls/run).

Watch the log line: `[gen] layman attached (N fields)` confirms the translation succeeded.

---

## Version 3.7 — UX/data-quality polish (pre-V4)

- **Toggle scope:** the Executive ↔ Learning toggle now appears **only on the Today tab** and
  affects only sections 03+ (CRO Conversation, Editorial Intelligence, Japan & Asia Watch).
  Sections 01–02 are untouched; the toggle is gone from Markets and Learn (those render in their
  default wording).
- **Persistence fix:** `topicId` is normalised to a stable slug, so "Day X · seen X×" now reflects
  true theme persistence. Day X = calendar days since first appearance; seen X× = unique daily
  snapshots. Refreshing the page and regenerating the same day no longer change the counters.
- **"Explain This" removed** everywhere (links, imports, component) — redundant since Learning view
  rewrites the whole screen.
- **Footer** now reads "Prepared by Rohit Kohli" (name only, no title).

---

## LLM provider diagnostics (instrumentation)

`interpretWithProvider` now emits an explicit line at every decision point so one
unattended cron run reveals exactly why a provider was used. Never logs key values —
only boolean presence.

- `[gen] env keys: gemini=<bool> anthropic=<bool> disableGemini=<val>` (start of run)
- `[gen] providers available gemini=<bool> anthropic=<bool>`
- `[gen] provider selection starting`
- `[gen] attempting provider=gemini` → `provider=gemini success` | `provider=gemini failed reason=<r> status=<n> type=<class> message="..."`
- `[gen] provider=gemini skipped reason=missing_api_key | config_disabled`
- `[gen] falling back to anthropic` (or `no fallback available …`)
- `[gen] attempting provider=anthropic` → `provider=anthropic success` | `provider=anthropic failed …`
- `[gen] llm provider=<provider> reason=<reason>` (preserved summary)

Config: set `DISABLE_GEMINI=1` to force the Anthropic path (emits `config_disabled`).

---

## Gemini JSON robustness

Minor formatting deviations no longer trigger an unnecessary Anthropic fallback.
`parseLlmJson()` recovers in order: (1) strip ```` ```json ```` / ```` ``` ```` fences + trim → direct
`JSON.parse`; (2) string-aware balanced extraction of the first JSON value (handles prose
before/after). Only if BOTH fail does the provider report `invalid_json` and fall back.

Gemini parse logging (no keys, model output only):
- `[gen] gemini response: length=<n> fences=<bool> finishReason=<r>`
- `[gen] gemini json recovered via extraction` (when wrapper/prose stripping was needed)
- `[gen] gemini json parse FAILED — raw first 1000 chars: "<…>"` (on unrecoverable output)

Also: `maxOutputTokens` raised to 8192 (Gemini) and `max_tokens` to 8000 (Anthropic) to stop the
large layman-translation call truncating mid-JSON; truncation is now named explicitly
(`finishReason=MAX_TOKENS` / `stop_reason=max_tokens`).

---

## Version 3.8 — Relevance + retention (Americas-first)

- **US-first relevance rebalance.** Phase-aware four-lens weighting in `lib/relevanceConfig.ts`
  (US / macro / Japan / Europe). `ONBOARDING_PHASE` env (default `1` = Americas) shifts the
  weighting without a rebuild. US banking/credit/regulatory specificity is rewarded; the ranking
  prompt prioritises Fed/Treasury/US credit/US banking/capital markets/US regulation. Japan stays
  protected by its own dedicated section.
- **Save for Later.** Save the *interpreted* snapshot (title · why it matters · banking impact ·
  why-Mizuho · source) of any theme/editorial/Japan item. KV-backed (`saved:items`, capped 50),
  surfaced in a Learn-tab "Saved for Later" section. API: `/api/saved` (GET/POST/DELETE).
- **Also on the Radar.** Headline-only breadth built deterministically from leftover clusters —
  no LLM call, no translation, no truncation risk. Lens-tagged, tappable to source.
- **Regenerate editorial.** Manual re-run button on Today (busy-guarded via KV `regen:status`,
  preserves last-good on failure). API: `/api/regenerate` (POST run, GET status).

Deferred to V4: Ask About This, Add to Learn, Supabase, editable concept library, personal notes.

---

## Version 3.8.1 — Radar quality, junk filtering, run visibility

- **Ingestion junk filter** (`isJunk` in `lib/newsAdapter.ts`): entertainment, sports, local
  crime, lifestyle and junk domains are dropped at ingestion — improving BOTH theme and radar
  quality (root-cause fix, not a radar patch).
- **Radar = high-relevance near-misses**, not leftovers: each item must clear a relevance floor,
  come from a credible source tier, carry a genuine CRO signal, and classify into a real lens.
  Unclassifiable items are dropped (no "default to Macro"). Capped small; empty if nothing qualifies.
- **Save for Later** now records **saved date + original snapshot date** for timeline context.
- **Generation History** (`/api/runs`, `lib/runStore.ts`): 15-entry ring buffer recorded by both
  the cron and the regenerate route — time · scheduled/manual · ok/fail · provider · fallback.
  Surfaced in a "Generation History" section on Today.
