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

Everything else (live news, LLM-written editorial, saved items, user-added concepts) is
**progressively enabled** the same way — see `.env.local.example` for the full list
(Marketaux/Finnhub/NewsData for news, Gemini/Anthropic for editorial writing, Supabase for
persistence). None of it is required to run the app; each layer just falls back to sample or
curated content when its keys are absent.

---

## Add to iPhone Home Screen

1. Open the URL in **Safari** on your iPhone.
2. Tap **Share → Add to Home Screen**.
3. Launch it from the icon — it opens full-screen, no browser chrome.

(On your phone, replace `localhost` with your computer's LAN IP, e.g.
`http://192.168.1.20:3000`, while `npm run dev` is running — or deploy to Vercel.)

---

## What's on the screen (current, v5.10.2)

Bottom nav has four tabs; a fifth area (**Settings**) is reached via the hamburger button in
the header, not the nav bar.

| Tab | Sections |
|---|---|
| **Home** | Executive/Learning toggle (sticky, in the header) · Daily Risk Brief (risk meter) · What Changed (top movers + "show all indicators", both as colour-tile grids) · Top Developments · Today's CRO Conversation · Editorial Intelligence · Japan & Asia Watch · Also on the Radar |
| **Markets** | Key CRO Dashboard (live indicators) · Japan Watch · Global Risk Heat Map (tappable regions) · Top Emerging Risks · Implications for a Global Bank |
| **Research** | Research Workspace — paste text or a URL, analyzed through the same CRO framework as the daily editorial; save results to Learn |
| **Learn** | Saved Analyses · Saved for Later · Concept Library (Your Concepts + All Concepts, both collapsible, pinned items grouped to the top) · Weekly Summary |
| **Settings** (hamburger) | 01 Appearance (dark/light) · 02 Briefing Books (print/PDF) · 03 Add Concept (paste → analyze → save; editing a saved concept opens here pre-filled) · 04 Mizuho Reference · 05 Bank Earnings (15-bank baseline+live-overlay, plain-English summaries, "📊 Compare Banks" USD charts screen) · 06 Generation History (Refresh / Regenerate / Refresh Earnings / Reset Earnings) · 07 Mizuho Q1 Earnings (single-bank USD deep-dive, hand-drawn charts) |

The risk colours (green / amber / red) are **functional**: they always reflect the
*risk* direction of a move, not just whether a number went up or down. A falling
S&P shows red; a falling VIX shows green. See `lib/overnight.ts` (`RISK_ON_RISE`) and
`riskUpIsBad` on `Indicator` (`lib/types.ts`).

---

## How it's wired

```
app/
  layout.tsx                    Inter font + iOS home-screen meta + ThemeProvider
  page.tsx                      Client page: tabs, header, all section wiring
  globals.css                   Tailwind + dark/light theme tokens + safe-area
  api/
    dashboard/route.ts          Live indicators (FRED + Yahoo) + reads the frozen snapshot
    cron/editorial/route.ts     Scheduled daily editorial generation (CRON_SECRET-protected)
    cron/weekly/route.ts        Scheduled weekly summary generation
    regenerate/route.ts         Manual on-demand editorial re-run
    research/analyze/route.ts   Research Workspace: analyze pasted text/URL
    concepts/, concepts/analyze/  User-added concept CRUD + AI-assisted drafting
    bank-earnings/route.ts      GET — merged Bank Earnings baseline + KV overlay
    bank-earnings/refresh/route.ts  POST refresh · GET status · DELETE reset-to-baseline
    saved/, runs/, bloomberg/, briefing/generate/, admin/*
api/cron-bloomberg.py           Separate Python cron (newsletter ingestion) — NOT under app/,
                                 deployed as its own Vercel function; see requirements.txt
components/
  <Section>.tsx                 One component per Home/Markets section
  intel/                        Editorial-layer cards (CRO Conversation, Editorial
                                 Intelligence, Japan & Asia Watch, Mizuho alignment, shared
                                 intelUi.tsx primitives like HorizonPill)
  learn/                        Settings/Learn reference & tooling:
                                 ConceptLibrary, ConceptStudio, MizuhoReference, BriefingBooks,
                                 AppearanceToggle — plus the Bank Earnings suite:
                                 BankEarnings.tsx (05 list + Refresh/Reset wiring + Compare
                                 entry point), BankEarningsCompare.tsx (USD comparison charts),
                                 MizuhoQ1Earnings.tsx (07 single-bank USD deep-dive)
  research/, saved/, print/, shared/, ui.tsx
lib/
  riskEngine.ts                 Composite score/status/brief from live deltas
  overnight.ts                  Top-mover ranking + risk-direction colour logic
  intelligence.ts               The single theme engine (THEMES) — radar + CRO Conversation
                                 both draw from this one set
  snapshotEngine.ts / snapshotStore.ts   Daily editorial generation + freeze/read
  llm.ts                        Gemini-first, Anthropic-fallback provider chain
  newsAdapter.ts / relevanceConfig.ts    News ingestion, dedupe, CRO relevance scoring
  mizuhoTopRisks.ts / mizuhoKnowledgeData.ts   Mizuho's own published positions (versioned
                                 locally, never fetched at runtime)
  bankEarnings.ts                05 Bank Earnings — curated fallback baseline, 15 banks
  bankEarningsStore.ts           KV overlay on the baseline + Reset-Earnings clear
  bankEarningsRefresh.ts         Refresh engine: news fetch → filter → 1 batched grounded
                                 LLM call → schema-validate → write to overlay
  bankEarningsMetrics.ts         Structured USD financials feeding Compare Banks (hand-
                                 maintained, separate from the overlay — see CLAUDE.md)
  mizuhoQ1Earnings.ts            Data for the 07 Mizuho Q1 Earnings deep-dive
  concepts.ts / userConcepts.ts  Curated glossary vs. user-added concepts (separate stores)
  fred.ts / markets.ts / marketData.ts   FRED + Yahoo Finance fetch
  fallbackData.ts               Sample values + curated narrative content (no-key fallback)
  supabase.ts / savedStore.ts / runStore.ts   Persistence (Supabase primary, KV/in-memory)
  format.ts / types.ts          Display formatting + shared types
```

All third-party fetching is **server-side** (API routes), so there are no CORS
issues and no keys are exposed to the browser. See `CLAUDE.md` for the deeper
architectural notes (the two-clock live/frozen-snapshot model, LLM grounding rules,
versioning convention, and a couple of hard-won gotchas).

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

---

## Version 3.9 — Mizuho Risk Alignment

- **Curated Top Risks framework** (`lib/mizuhoTopRisks.ts`): Mizuho's published top-risk taxonomy
  (as of March 2025 / FY2025), each risk with published-style scenarios + transmission paths.
  Reference data — versioned locally, never fetched at runtime; quarterly diff-check cadence.
- **Alignment step** (`alignThemesToMizuho`): a grounded LLM call maps each theme to 0..n
  `{riskId, scenarioId, confidence, why}`. Strictly grounded — maps ONLY to supplied ids
  (invalid pairs rejected, not invented), anchors each "why" to a specific scenario's path
  (repetition guard), states transmission from THIS event, and **may return empty (no match)**.
  Confidence derived High/Med/Low. Isolated — failure never breaks the briefing.
- **Theme-card field** (`MizuhoAlignmentBlock`): purple chip(s) in Executive view (risk · scenario ·
  confidence); a "Why Mizuho cares" plain-English narrative in Learning view (pre-translated twin).
  Renders nothing when there's no match. Explicit provenance: framework = sourced fact, mapping =
  AI interpretation (not Mizuho's own view or exposure).
- Curated baseline themes ship with hand-authored alignments so the lens is visible pre-live-run.

---

## Version 3.9a — robustness + bug fixes

- **Cron robustness (root cause).** `gemini-2.5-flash` is a reasoning model; its hidden thinking
  tokens were consuming `maxOutputTokens` and truncating the JSON (`finishReason=MAX_TOKENS`),
  forcing slow Anthropic fallbacks that overran the 180s cron. Fixed by disabling thinking
  (`generationConfig.thinkingConfig.thinkingBudget: 0`).
- **Two LLM calls, not three.** The Mizuho alignment is now *simple tagging* folded into the
  interpret call: each theme returns `mizuhoRisks: [{riskId, scenarioId, confidence}]` (0–2, may be
  empty). Tags are validated against the curated framework (invalid ids rejected) and resolved
  locally — the "why" is the curated scenario `path` / `pathLayman`, so there is no model-written
  mapping prose to hallucinate or translate. Removed the dedicated alignment call.
- **Japan empty-state.** When there's no real Japan news (or a degenerate N/A object), the Japan
  card shows only the "No specific Japan-related developments…" line — no N/A bullets/lens/signals
  and no save action.
- **Regenerate button moved** out of the learning-toggle row (misclick risk) into the Generation
  History section, with an explanatory line.
- **Mizuho caveat shown once** — a single short provenance line at the bottom of the CRO
  Conversation section, instead of repeating under every theme.

---

## Version 4.0 — Research Workspace

A new **Research** tab (Today · Markets · Research · Learn) analyzes any user-supplied content
through the same CRO framework as the daily editorial.

- **Inputs:** paste text (primary, reliable) or a URL (best-effort — premium/paywalled sites
  degrade gracefully to "paste the text instead"). PDF/DOCX/OCR deferred to V4.1.
- **Shared pipeline** (`lib/analyze.ts`): `analyzeContent()` produces What Happened · Why It
  Matters · Banking Impact · Why Mizuho cares · plain-English twin · linked existing concepts.
  Input capped (~4k words) and labelled when truncated.
- **Dedicated Mizuho alignment restored** (`alignToMizuho`): a focused tags-only call (invalid ids
  rejected; "why" from the curated scenario path), reused by BOTH editorial and Research. Reverts
  the 3.9a inline-tagging that was under-producing alignments.
- **Isolation:** Research is ephemeral — it never touches the daily snapshot, run history or theme
  generation. It persists only on **Save to Learn**.
- **Save to Learn → Saved Analyses** in the Learn tab, with source-type, analysis-date, save-date
  and original-URL metadata. Reuses `savedStore` (new `analysis` kind) + `SavedList`.
- API: `POST /api/research/analyze` (`{mode:"text"|"url", text?|url?}`), `maxDuration=60`.

Out of scope (roadmap): PDF/DOCX, OCR, Ask About This, Supabase, personal notes, multi-turn chat.

---

## Version 4.0a — Japan empty-state fix

- **Robust degenerate-Japan detection** (`isDegenerateJapan`). The 3.9a collapse matched one
  literal phrase ("no specific Japan"); the model phrases "no Japan news" many ways, so a card
  like *"No specific news related to Japan, BOJ, Yen, JGB, or Nikkei was provided… cannot be
  populated"* slipped through and rendered with generic filler bullets/lens/signals + a save
  button. Detection now matches the *absence signal* across phrasings (plus all-N/A bullets and
  generic "general-trend" signals), and is verified not to fire on real Japan narratives
  (including "BOJ kept policy unchanged with no immediate change…").
- **Date-specific Japan save id** (`japan-watch-<date>`) so a past save no longer reads as
  "Saved" on a different day's card. (The empty card hides the save action entirely.)

---

## Version 4.1 – 4.9 — Research polish, Bloomberg newsletter ingestion, live Japan data

Condensed summary (see `git log --oneline` for the exact commit-by-commit history —
commit messages are the authoritative changelog for this range):

- **Research Workspace matured**: daily quota, bulleted banking impact, full-piece capture,
  Learning-view parity, personalized-focus section, and a screenshot-input mode.
- **In-repo Bloomberg extractor** (`api/cron-bloomberg.py`, a separate Python Vercel function —
  see `requirements.txt` at repo root): ingests Bloomberg newsletter emails, twice daily, with
  per-briefing grouping, staleness guards, run history, and iterative bug fixes through v4.5–4.9
  (decode/parsing fixes, dedupe logging, configurable lookback, Anthropic fallback in the
  extractor itself).
- **Live macro expansion**: CPI, Core PCE, Markets/Releases split, sparkline trends; Japan Watch
  gained sparklines and its own colour treatment in Learn.
- **Weekly cadence**: Weekly Markets + Weekly Learning summary (Anthropic-generated).
- **Theme persistence hardened**: transient-failure retry, robust "Day N · seen N×" tracking,
  "what's new" detection, and a risk↔implication cross-link.

## Version 5.0 – 5.5 — Mizuho Knowledge Repository, Supabase, print/PDF, Appearance, Add Concept

- **v5.0–5.2**: Mizuho Knowledge Repository added to the Research path, then expanded into a
  multi-card reference (core disclosures, risk governance, RAF/top risks, business model) —
  `lib/mizuhoKnowledgeData.ts`, surfaced in Learn → Mizuho Reference. **Supabase** introduced
  (`lib/supabase.ts`) as the persistence layer for saved items.
- **v5.3**: Print/PDF export — saved items and "briefing books" (monthly/quarterly/themed packs)
  can be rendered to a print-friendly view and exported. Iterated through v5.3.1–5.3.4 on the
  action-bar placement and a routing fix for single-item print (moved to a query-string route).
- **v5.4**: Manual dark/light **Appearance** toggle in Learn (`next-themes`-backed), with a
  v5.4.1 deploy fix.
- **v5.5**: **Add Concept** prototype — paste text → Gemini drafts a concept in the library's
  standard format → review/edit → save, plus full CRUD on your own concepts. Iterated on concept
  card detail, indicator-table completeness, app icons, and Learn section ordering through v5.5.2.

## Version 5.6 — Screen restructure: Settings, Concept Library rework, visual polish

The big navigational change: introduced the **Settings** area (hamburger button in the header,
not in the bottom nav) and moved maintenance/reference screens there — Appearance, Briefing
Books, the Add-Concept *form* (its saved-items list stayed in Learn → Concept Library, now
labelled "Your Concepts"), Mizuho Reference, and Generation History (with Refresh + Regenerate
both available there). Learn tab was trimmed to just Saved Analyses / Saved for Later / Concept
Library / Weekly Summary. Today tab was relabelled **Home**.

Follow-on point releases (5.6.1–5.6.5) fixed real bugs surfaced by this restructure and did
visual polish:
- **5.6.1**: reworked Concept Library into two independently-collapsible groups (Your Concepts /
  All Concepts) with a shared row+detail component, pinned-first sorting, and "Added <date>" for
  user concepts (which have no seen-tracking).
- **5.6.2**: removed decorative section icons per feedback; header's top-right Refresh button
  replaced with today's date (Refresh moved fully into Settings); hamburger icon replaced the
  gear; `RiskGauge` redesigned from a semicircle donut to a slim gradient bar; CRO Conversation
  card header split into two rows to stop mid-word wrapping.
- **5.6.3**: fixed a real bug — sections relocated to Settings had **kept their old
  `localStorage` collapse ids**, so a previously-opened "Add Concept" rendered pre-expanded and
  crowded out the rest of Settings (looked like Concept Library had disappeared). Renamed all
  relocated section ids (`settings-*` prefix). Also reworked Concept Library rows to a two-line
  layout (term+pin on top, capsule+meta below) and gave pinned items an explicit "📌 Pinned"
  group instead of just a sort-order change; added a `dense` size variant to `Chip`/
  `SeverityPill`/`HorizonPill` and moved topic titles above their chip row in both CRO
  Conversation and Editorial Intelligence.
- **5.6.4**: "What Changed" and "Show all indicators" redesigned as Bloomberg-style solid-colour
  tile grids (`components/shared/ToneTile.tsx`) instead of a list/table.
- **5.6.5**: fixed a real data bug in `lib/markets.ts` — Yahoo's `chartPreviousClose` reflects
  the close *before the requested chart range* (≈1 month back for `range=1mo`), not yesterday's
  close, so "vs. yesterday" deltas were silently comparing against a stale, month-old baseline
  (surfaced by Brent Crude showing an inflated overnight move). Fixed to prefer the actual
  second-to-last daily close from the fetched time series.

## Version 5.7.0 — Bank Earnings prototype

New **Bank Earnings** section in Settings: latest-reported-quarter results for 15 banks (5 US:
JPMorgan, Goldman Sachs, Citigroup, Bank of America, Morgan Stanley · 5 Europe: Barclays,
Standard Chartered, HSBC, UBS, Deutsche Bank · 5 Asia: Mizuho, MUFG, SMFG, DBS, ICBC), each a
collapsible card with headline metrics, highlights, stock-market reaction, and risk-management
watch items. Data lives in `lib/bankEarnings.ts` as a **curated static snapshot** (compiled via
research as of the `AS_OF` date in that file) — it is explicitly **not** wired to a live
earnings-data feed yet; update the file by hand (or wire a real provider) to refresh it.

---

## Version 5.8.0 — Bank Earnings: plain-English summaries + Refresh Earnings

- **Plain English.** Every bank card now has a short, jargon-free summary (`plainEnglish`
  field) alongside the existing highlights / market reaction / risk watch — a hand-authored
  translation of the same facts, always visible when a card is expanded.
- **Refresh Earnings** (Settings → Generation History): re-checks all 15 banks against real
  news and updates only the ones where a genuinely newer reported quarter is confirmed.
  - Fetches candidate articles per bank from the **same adapters already in this app**
    (Marketaux / NewsData.io / Finnhub — no new API keys) and keeps only articles that name
    the bank, carry a genuine earnings signal, and were published after the bank's
    currently-stored report date.
  - Banks with qualifying articles go into **one batched, grounded LLM call**
    (`lib/bankEarningsRefresh.ts`, via the existing Gemini-first/Anthropic-fallback
    `interpretWithProvider`) — same "one call for many items" shape as the daily theme
    engine. The model may only use the supplied article snippets and must say so rather than
    guess if it can't confirm a newer quarter.
  - Accepted, schema-validated results are written to a KV overlay
    (`lib/bankEarningsStore.ts`), keyed per bank — the curated baseline in
    `lib/bankEarnings.ts` is never overwritten, so a failed or empty run just leaves
    everything as the last-good fallback (same two-clock guarantee as the daily editorial).
  - `app/api/bank-earnings` serves the merged baseline+overlay data; the Bank Earnings screen
    fetches from there instead of importing the static file, and tags overlay-refreshed banks
    with a "↻ refreshed" badge and source note.
  - Recorded in Generation History with its own `earnings` badge and a short summary
    ("N checked · M with news · K updated").
- **Mizuho Q1 FY2026 (Apr–Jun 2026)** refreshed by hand for this release: net profit ¥422.91B
  (+45.5% YoY), total income ¥2.520T (+18.3%), FY2027 guidance raised to ¥1.40T from ¥1.30T.
  This quarter's CET1/credit-cost/stock-reaction figures weren't cleanly confirmed from
  available sources at write time — flagged as unconfirmed rather than guessed; a future
  Refresh Earnings run can fill them in once clearer coverage exists.

---

## Version 5.10.0 — Compare Banks

A **"📊 Compare Banks"** button at the top of 05 Bank Earnings opens a separate, chart-heavy
screen (`components/learn/BankEarningsCompare.tsx`) putting all 15 banks side by side in USD:

- **KPI leaderboard** (computed, not hardcoded): most profitable on a quarterly run-rate basis,
  fastest YoY profit growth, strongest CET1, biggest earnings-day stock pop.
- **By-region rollup**, **net profit** (toggle: quarterly run-rate vs. as-reported, region
  color-coded), **YoY profit growth**, **CET1 ratio**, and **earnings-day stock reaction** —
  each a ranked or diverging horizontal bar chart, hand-drawn inline SVG in the same visual
  style as the 07 Mizuho Q1 Earnings screen (CSS-variable colors, no chart library).
- Backing data: `lib/bankEarningsMetrics.ts` — structured numeric figures (not the free-text
  label/value pairs in `lib/bankEarnings.ts`) converted to USD at real FX rates (GBP/USD
  1.3465, EUR/USD 1.153, USD/JPY 162.45 — the same spot rate `lib/mizuhoQ1Earnings.ts`
  discloses, USD/SGD 1.2828, USD/CNY 6.77, as of Jul 30, 2026). Every figure traces to one
  already in `lib/bankEarnings.ts` except Citigroup's absolute net income ($5.8B, +45% YoY),
  which that card only carried as a YoY % — confirmed from Citi's own Q2 2026 results instead
  of left as a gap in the profit chart.
- **Honest about basis differences rather than silently blending them**: pre-tax banks
  (Barclays, Standard Chartered, HSBC) are tagged "(pretax)" next to everyone else's net
  profit; half-year (Barclays H1, StanChart H1) and full-year (MUFG, SMFG — Q1 FY26 not yet
  released for either) figures get an even-split "quarterly run-rate" approximation, with the
  as-reported raw figures one toggle away; banks lacking a clean YoY/CET1/stock-reaction
  number are listed under each chart rather than papered over with an invented figure.
- This dataset is a **hand-maintained companion**, like `lib/bankEarnings.ts` itself — it is
  not yet wired into the automated Refresh Earnings pipeline, so a bank refreshed via that
  button may show updated text on its card before its bars here catch up (flagged in the
  Compare screen's own caption).

---

## Version 5.10.1 — Refresh-quality bug fixes + Reset Earnings

A live Refresh Earnings run surfaced a real bug: one bank's card ended up showing an unrelated
news headline ("FTSE 100 lifted by miners rally…") inside its stock-reaction pill instead of a
short reaction value, because a general market wrap-up article that happened to name the bank
in passing slipped through the news filter and the model used its headline as color for that
bank's fields. Fixed at every layer rather than just papered over on screen:

- **Filtering** (`lib/bankEarningsRefresh.ts`): index-level wrap-up stories ("FTSE 100", "Nikkei
  225", "Dow Jones", "S&P 500", "STOXX 600", "Hang Seng index", "Nasdaq Composite", "TOPIX") are
  now dropped as candidate evidence for a bank unless that bank is actually named in the
  article's own title — a real earnings story almost always names the bank in the headline;
  an incidental mention buried in a market-wrap sentence doesn't.
- **Prompt**: the extractor now explicitly distinguishes "headline" (one sentence) from
  "changeText" (≤15 characters — a percentage or a short word like "Unconfirmed"/"Mixed"/
  "Muted"/"All-time high", never a sentence or unrelated content), and is told to ignore
  articles that only mention a bank in passing inside a broader market story.
- **Validation**: any returned `changeText` longer than 24 characters or containing a period/
  semicolon is now rejected outright — that bank's update is dropped (last-good kept) instead
  of a sentence-shaped value being accepted into the overlay.
- **Display** (`components/learn/BankEarnings.tsx`): `ReactionPill` no longer trusts its input
  to already be short. Anything sentence-like now falls back to a plain "Up"/"Down"/"Mixed"
  label in the pill (full text still available via a hover tooltip and always visible in the
  "Market reaction" detail box below) instead of wrapping the card header across multiple lines.
- **Data**: Deutsche Bank's baseline `changeText` ("Conflicting across sources" — itself a
  sentence, not a short pill value) shortened to "Mixed"; the fuller nuance was already in its
  detail text.
- **Reset Earnings** (Settings → Generation History, new `DELETE /api/bank-earnings/refresh`):
  a recovery path for exactly this situation — clears the KV overlay and reverts every bank to
  the curated baseline, since a bad overlay entry otherwise only gets replaced by a LATER
  successful refresh for that same bank, which may not happen soon.

---

## Version 5.10.2 — Documentation pass (no code changes)

CLAUDE.md and this README were falling behind the Bank Earnings suite's growth across
V5.7.0–V5.10.1 (stale version numbers, a Settings section list missing 07 Mizuho Q1 Earnings,
a file tree missing `bankEarningsStore.ts`/`bankEarningsRefresh.ts`/`bankEarningsMetrics.ts`/
`mizuhoQ1Earnings.ts`/`BankEarningsCompare.tsx`, and one overloaded bullet point trying to cover
five files' worth of architecture at once). Brought current so a fresh session reading either
file gets an accurate map of the repo before writing any code:
- CLAUDE.md's Bank Earnings content is now its own dedicated section with a file-by-file table
  (role of each of the 8 files in the suite) instead of one long bullet.
- This README's "What's on the screen" table and "How it's wired" file tree both reflect the
  current Settings section list (01–07) and every file the Bank Earnings suite added.
- Version-number examples in both docs updated to the actual current version rather than a
  stale example from several releases back.

+## Version 5.9.0 — Mizuho Q1 Earnings (Settings → 07)
+
+New standalone **Mizuho Q1 Earnings** section in Settings (`07`, closed by default, purple
+accent) — a full-detail, USD-converted companion to the Mizuho card in `05 Bank Earnings`,
+built directly from the primary results deck ("Summary of Financial Results for the First
+Quarter of FY2026 (Under Japanese GAAP)", Jul 30, 2026) rather than compiled from news.
+
+- **Resolves the gap the 05 card flags.** That card's `riskWatch` explicitly notes this
+  quarter's CET1/credit-cost figures "were not cleanly confirmed from available sources" —
+  this section supplies the actual credit-related-cost (−$0.04B) and NPL-ratio (0.70%) figures
+  from the filing. CET1/capital ratio still isn't broken out in this particular release and is
+  left unstated rather than guessed.
+- **Static, one-off, not fetched.** Data lives in `lib/mizuhoQ1Earnings.ts` as typed constants —
+  same "curated snapshot, update by hand" posture as `lib/bankEarnings.ts`, but this one isn't
+  wired to the Refresh Earnings pipeline (single-quarter reference, not a recurring feed).
+- **Content:** headline P&L (What Changed), 6-year trajectory (NBP/expense ratio, profit/ROE),
+  full segment engine (RBC/CIBC/GCIBC/AMC/Markets — table + chart), a dedicated Mizuho Americas
+  deep-dive (regional loan book, deposit share, GCIBC non-interest income, U.S. securities
+  entities), balance sheet snapshot, asset quality (credit costs + NPL trend), and FY26 outlook
+  — each with a "Plain English" box in the same style as Bank Earnings cards.
+- **FX conversion is explicit and two-tier:** quarterly P&L and the Jun-2026 balance sheet use
+  the report's own disclosed spot rate (USD/JPY 162.45); the FY26 outlook uses Mizuho's own
+  planned FY26 rate (USD/JPY 150.00). Historical FY20–FY25 trajectory figures are shown at the
+  *current* spot rate throughout (not each year's actual rate) so the trend line reflects
+  business volume, not currency drift — noted inline wherever it applies.
+- **New files:** `lib/mizuhoQ1Earnings.ts` (data), `components/learn/MizuhoQ1Earnings.tsx`
+  (display — reuses the existing `Pill`/card/"Plain English" idiom from `BankEarnings.tsx`).
+  Charts are hand-drawn inline SVG, no new dependency — colors reference the theme CSS
+  variables directly (`style={{ stroke: "rgb(var(--stress))" }}`), the same pattern
+  `RiskGauge.tsx` already uses, so dark/light mode both work without extra handling.
+- Verified with `tsc --noEmit` and a full `next build` against the actual repo before
+  shipping — both compiled clean.

