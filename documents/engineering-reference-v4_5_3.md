# Engineering Reference

**Version:** V4.5.3
**Last Updated:** Current Release
**Audience:** Future Claude sessions (and any engineer) picking this project up cold.
**Companion doc:** `risk-dashboard-master-context-v4_5_3.md` (product/context). Read that first, then this.

> How to read this document. This is durable engineering knowledge, not a code listing. Where something is a verified fact about the implementation it is stated plainly. Where something is a judgement, assumption, or recommendation it is marked **(judgement)** or **(assumption)**. Do not treat recommendations as constraints the user has approved — re-confirm scope with the user before building.

---

## 1. System Overview

**Purpose.** A personal "Global Risk Intelligence Dashboard": a daily CRO-style risk briefing plus a learning tool, for one user (Rohit Kohli) preparing for and onboarding into a risk-leadership role at Mizuho (a Japanese global bank). It is explicitly **a personal decision-support and learning aid** — *not* a production banking platform, *not* board/management reporting, *not* a Bloomberg/Reuters replacement. Keep that framing; it justifies many "good enough, lightweight" choices and forbids over-engineering.

**Target user.** A single primary user, onboarding **Mizuho Americas first (~6–12 months) → EMEA → Japan/global**. The tool is therefore tuned for US-relevance now, with Japan and Mizuho always present as first-class lenses. The user is a **non-developer** who deploys via GitHub→Vercel and works in a **recommend-before-build** rhythm: propose, get approval, then build. He wants honest caveats and scope-creep pushback.

**Primary workflows.**
1. **Morning briefing (read).** Open the app → live market data + a frozen daily editorial (themes, editorial cards, Japan watch, radar) → optionally flip "Learning view" for plain-English twins.
2. **Learn (retain).** Concept library, saved items, saved analyses, weekly summary.
3. **Research (interpret any content — V4.0).** Paste text or a URL → same interpretation framework as the editorial → optionally Save to Learn.

**Core value proposition.** A single, consistent **CRO interpretation framework** — *What happened · Why it matters · Banking impact · Why Mizuho cares · plain-English twin · linked concepts* — applied both to auto-ingested news and to any content the user brings. The value is the framework and the Mizuho/Japan lens, not data volume. Guiding principle throughout: **fewer, better signals; tutor not terminal; executive-first and mobile-first.**

---

## 2. Current Architecture

The system is a **Next.js 14 App Router** application (React 18, TypeScript, Tailwind, Recharts) deployed on **Vercel Pro**, with **Vercel KV (Upstash Redis)** as the only persistent store. There is no separate backend service; "backend" is Next.js route handlers + library modules running in serverless functions.

```
                       ┌──────────────────────────── CLIENT (mobile-first) ────────────────────────────┐
                       │  app/page.tsx — 4 tabs: Today · Markets · Research · Learn                      │
                       │  Executive ↔ Learning toggle · CollapsibleSection shell · components/*          │
                       └───────────────▲───────────────────────────────────▲──────────────▲────────────┘
                                       │ GET /api/dashboard                 │ POST          │ GET/POST/DELETE
                                       │ (read path, every load)            │ /api/research │ /api/saved /api/runs
                                       │                                    │ /analyze      │ /api/regenerate
        ┌──────────────────────────────┴─────────────┐        ┌────────────┴───────────┐  │
        │ DATA LAYER (live each load)                 │        │ RESEARCH (ephemeral)   │  │
        │ marketData/markets/fred → indicators        │        │ analyzeContent()       │  │
        └─────────────────────────────────────────────┘        │ (isolated; no snapshot)│  │
        ┌─────────────────────────────────────────────┐        └────────────────────────┘  │
        │ EDITORIAL LAYER (generated daily, frozen)   │                                     │
        │ cron → snapshotEngine.generateSnapshot()    │──────────── writes ────────────────►│ KV
        │ ingest→cluster→interpret→align→layman       │                                     │ snapshot, saved,
        │ → KV snapshot (read all day)                │◄─────────── reads ──────────────────┘ runs, concepts
        └─────────────────────────────────────────────┘
```

**Frontend.** One client page (`app/page.tsx`) holds tab + toggle + saved/runs state and fetches `/api/dashboard` once per load. Sections are rendered inside a `CollapsibleSection` shell. Mobile-first: `max-w-app` (560px), dark institutional theme, semantic color tokens (no raw green/red). The "Learning view" toggle swaps executive prose for pre-generated plain-English twins on the Today tab.

**Backend.** Next.js route handlers under `app/api/*`. They are thin: validate input, call a `lib/*` module, return JSON. Heavy logic lives in `lib/`. Long-running routes (`cron/editorial`, `regenerate`, `research/analyze`) set `maxDuration` (180 / 180 / 60) and `dynamic = "force-dynamic"`. The `research/analyze` route is additionally gated by the **Research reservation cap** (`lib/researchQuota.ts`) before it ever calls the model — see §Research quota below.

**Data layer.** Live market/macro indicators fetched on every dashboard load (FRED macro, Yahoo markets). This is the *fast clock* — never cached into the daily snapshot.

**Editorial layer.** The *slow clock*. A daily cron runs the generation pipeline and writes a frozen snapshot to KV; the read path serves that snapshot all day. This is the heart of the system (see §5).

**Learning layer.** Plain-English "twins" generated alongside the editorial (whole-screen Learning view), a curated Concept Library with auto-collection, saved items, and saved Research analyses (see §6).

**AI layer.** Provider-agnostic LLM interpretation (Gemini-first, Anthropic fallback, curated last resort). Two grounded calls in the editorial run (interpret, layman) plus a dedicated alignment call; Research reuses the same primitives (see §9).

**Deployment layer.** GitHub push → Vercel auto-deploy. **Environment variables bind at build time** — changing a key requires a redeploy. Cron configured in `vercel.json` (~`30 22 * * *` UTC ≈ early IST morning). Pro plan needed for the 180s function ceiling.

**Monitoring layer.** Deliberately lightweight: structured `[gen]`/`[cron]`/`[regen]` console logs (visible in Vercel logs), a `degradeReason` surfaced in the UI, and a **Generation History** ring buffer (last 15 runs: time · scheduled/manual · ok/fail · provider · fallback). No metrics/alerting stack — and that's intentional for a single-user tool.

**How they interact.** The two clocks are decoupled by design: data is live, editorial is frozen. Research is a deliberate *third, ephemeral path* that reuses the editorial's interpretation primitives but never reads or writes the snapshot. Everything persistent goes through KV via a small set of store modules.

---

## 3. Repository Map

```
app/
  page.tsx              Single client page: tabs, toggle, saved/runs state, section composition
  layout.tsx, globals.css
  api/
    dashboard/          READ path — assembles indicators + frozen snapshot + conceptSeen (every load)
    cron/editorial/     WRITE path — scheduled daily generation (maxDuration 180)
    regenerate/         WRITE path — manual re-run, busy-guarded, last-good-safe (maxDuration 180)
    research/analyze/   EPHEMERAL — analyze pasted text / best-effort URL (maxDuration 60); POST gated by daily cap, GET returns remaining quota
    cron/weekly/        (V4.2) weekly Markets + Weekly Learning refresh — Anthropic-only, CRON_SECRET, Sat ~06:00 IST
    saved/              CRUD for saved items (KV)
    runs/               READ generation history (KV ring buffer)

lib/                    All heavy logic lives here (keep it this way)
  snapshotEngine.ts     ★ Editorial pipeline orchestrator (ingest→cluster→interpret→align→layman→persist)
  snapshotStore.ts      ★ KV helpers (kvGet/kvSet), date keys, topicId normalisation, save/load snapshot
  llm.ts                ★ Provider-agnostic LLM (interpretWithProvider), JSON recovery, system prompt, diagnostics
  analyze.ts            ★ Shared interpretation primitives: alignToMizuho() + analyzeContent() (editorial + Research)
  researchQuota.ts      ★ Research daily-cap reservation guard (V4.1): getResearchQuota / incrementResearchCount, RESEARCH_DAILY_CAP
  savedMappers.ts       ★ (V4.1a) raw source item → full SavedItem (exec + layman twins + deeper detail)
  weeklyEngine.ts       ★ (V4.2) weekly Markets re-rate + Weekly Learning, Anthropic-forced, spine-locked, fail-soft
  focusProfile.ts       ★ (V4.4) curated role/priority profile (reference config; never generated)
  focus.ts              ★ (V4.4) generateFocus() — dedicated personalized 'what should I focus on?' call, allowed-empty
  snapshotStore.ts      ...+ (V4.5) getBloombergAll / getBloombergAnalyzed / addBloombergAnalyzed / getBloombergRuns, kvSetEx, BLOOMBERG_TYPE_KEYS
api/
  cron-bloomberg.py     ★ (V4.5) Python Vercel Function — Bloomberg email → Gemini extract → shared KV (root /api, NOT app/api)
requirements.txt        ★ (V4.5) Python deps for the extractor (google-genai, beautifulsoup4, upstash-redis)
app/api/bloomberg/      ★ (V4.5) GET → per-briefing digests + analyzed set for the Research panel
  mizuhoTopRisks.ts     ★ Curated Mizuho Top Risks taxonomy + scenario paths + id validation
  newsAdapter.ts        News ingestion adapters, relevance scoring, source tiers, junk filter
  relevanceConfig.ts    Phase-aware four-lens weighting (US/macro/Japan/Europe), ONBOARDING_PHASE knob
  intelligence.ts       Curated fallback editorial (THEMES, JAPAN_ASIA, EDITORIAL, WEEKLY) + builder
  layman.ts             Plain-English resolution helpers for Learning view
  concepts.ts           Curated Concept Library + detectConcepts/linkifyConcepts
  fallbackData.ts       Hand-authored fallback content (emerging risks, implications, laymans)
  savedStore.ts         Saved items (KV, capped 50), incl. analysis kind + metadata
  runStore.ts           Generation history ring buffer (KV, capped 15)
  marketData.ts, markets.ts, fred.ts   Live indicator fetchers
  riskEngine.ts, overnight.ts          Indicator-derived risk computations / overnight drift
  types.ts              Shared TypeScript types (the contract between layers)
  format.ts             Formatting helpers

components/
  CollapsibleSection.tsx, ui.tsx       Layout shell + shared UI atoms
  intel/                Editorial UI: CroConversation, EditorialIntelligence, JapanAsiaWatch,
                        MizuhoAlignment, RadarSection, SnapshotHeader, intelUi (shared blocks), …
  learn/                ConceptLibrary, Linkify
  research/             ResearchWorkspace (V4.0; bulleted impact + cap UI V4.1)
  saved/                SaveButton, SavedList
  RunHistory.tsx        Generation history list
  (note: some top-level components are legacy from earlier dashboards; intel/ is the current set)
```

Star (★) modules are the **stable foundation** (see §4). Treat changes to them as high-risk.

> **(assumption)** Several top-level `components/*.tsx` (e.g. `CroDashboard`, `MorningBrief`, `RiskHeatMap`) predate the current `intel/` set and may be partially or wholly unused. Verify usage before relying on or deleting any; do not assume.

---

## 4. Core Components

For each: purpose · responsibilities · deps · inputs/outputs · extension points · risk of modification.

### `lib/snapshotEngine.ts` — Editorial pipeline orchestrator — **STABLE FOUNDATION**
- **Purpose:** turn raw news + indicators into a complete, grounded daily editorial snapshot.
- **Responsibilities:** ingest → junk-filter → dedupe → cluster → relevance/source-tier rank → interpret (LLM) → re-anchor numbers to live data → dedupe editorial vs themes → Japan empty-state handling → **dedicated Mizuho alignment** → layman translation → radar build → concept auto-collect → persist to KV. Throws on hard failure so the caller keeps the prior snapshot.
- **Deps:** `llm`, `analyze` (alignToMizuho), `newsAdapter`, `relevanceConfig`, `mizuhoTopRisks` (indirectly via analyze), `intelligence` (curated fallback), `concepts`, `snapshotStore`, `types`.
- **Inputs:** slot ("morning"), live indicators. **Outputs:** an `EditorialSnapshot` persisted to KV.
- **Extension points:** add a new section by (a) extending the interpret schema, (b) adding a curated fallback, (c) adding a render component. Prefer attaching new lenses to existing cards over new sections.
- **Risk of modification:** **HIGH.** This is the spine. The interpret prompt and JSON schema are fragile; changing them risks truncation/parse failures and silent quality regressions.

### `lib/llm.ts` — Provider-agnostic LLM — **STABLE FOUNDATION**
- **Purpose:** single choke point for all model calls.
- **Responsibilities:** `interpretWithProvider<T>()` (Gemini-first → Anthropic fallback → none), JSON parsing with fence-strip + string-aware recovery (`parseLlmJson`/`extractJson`), per-branch diagnostics (never logs key values), timeouts, the shared `CRO_SYSTEM_PROMPT`. **Gemini thinking is disabled** (`thinkingConfig.thinkingBudget: 0`).
- **Inputs:** system + user strings, generic `T`. **Outputs:** `{ data, provider, reason }`.
- **Extension points:** new prompts call `interpretWithProvider`; do not call providers directly elsewhere.
- **Risk of modification:** **HIGH.** Token limits, thinking config, and JSON recovery are the result of hard-won debugging (see §10).

### `lib/analyze.ts` — Shared interpretation primitives — **STABLE FOUNDATION (new in V4.0)**
- **Purpose:** the reusable interpretation logic shared by editorial and Research.
- **Responsibilities:** `alignToMizuho(items)` — **dedicated** grounded call mapping items → curated Top-Risk scenario tags (ids only; invalid rejected; "why" = curated scenario path/pathLayman). `analyzeContent(content, meta)` — one grounded call producing the standard framework + plain-English twin, then alignment + concept linking; input capped (~4k words) and labelled when truncated.
- **Banking impact is structured (V4.1).** `analyzeContent` now asks for `bankingImpact` as an **array of areas** — `{ area, impact, layman }` — restricted to a fixed vocabulary (`Credit risk`, `Market risk`, `Liquidity & funding`, `Capital`, `Operational risk`), **only those that genuinely apply** (no N/A padding), **each with its own plain-English twin**. The result is exposed as `ResearchAnalysis.bankingImpactAreas: BankingImpactArea[]`. A defensive normaliser canonicalises area labels, de-dupes, and **falls back to wrapping a single string** if the model returns the old shape. Back-compat: a combined `bankingImpact` string and `layman.bankingImpact` string are still derived (consumed by `savedStore`, the alignment input, and the UI fallback render).
- **Deps:** `llm`, `concepts`, `mizuhoTopRisks`, `types`.
- **Extension points:** any new "interpret some content" feature should route through here, not a new pipeline.
- **Risk of modification:** **MEDIUM-HIGH.** Both editorial and Research depend on `alignToMizuho`; a regression hits both.

### `lib/mizuhoTopRisks.ts` — Curated risk taxonomy — **STABLE FOUNDATION (data)**
- **Purpose:** the durable "spine" the system maps events onto.
- **Responsibilities:** the curated Top Risks (8 risks, ~19 scenarios, each with `path` + `pathLayman`), versioned `MIZUHO_TOP_RISKS_ASOF`, lookups, and `isValidAlignment`/`topRisksForPrompt`.
- **Risk of modification:** **MEDIUM.** Editing the taxonomy changes every alignment. **(fact)** This taxonomy is a *curated approximation* assembled from how Mizuho/Japanese megabanks typically disclose top risks; it has **not been byte-verified against Mizuho's published page.** Verify on a quarterly cadence and update + redeploy on change.

### `lib/snapshotStore.ts` — KV + persistence — **STABLE FOUNDATION**
- **Purpose:** all KV access and snapshot persistence; date-keying; `topicId` normalisation (the basis of correct NEW/Day-N counts).
- **Risk of modification:** **MEDIUM-HIGH.** `normalizeTopicId` underpins day-over-day theme identity; breaking it inflates "new theme" counts.

### `lib/newsAdapter.ts` — Ingestion + relevance
- **Purpose:** fetch raw stories (4 adapters), score relevance, classify source tier, drop junk.
- **Extension points:** add an adapter to `ADAPTERS`; extend `JUNK`/`SUPPRESS`/tier lists; tune `relevanceScore`.
- **Risk of modification:** **MEDIUM.** Junk and relevance lists are heuristic; expect occasional maintenance.

### `lib/relevanceConfig.ts` — Phase-aware weighting
- **Purpose:** US-first (Americas onboarding) editorial weighting, shiftable via `ONBOARDING_PHASE` without a rebuild of logic.
- **Risk of modification:** **LOW-MEDIUM.** Keyword-lensed, not semantic; safe to tune.

### UI: `components/intel/*`, `components/research/ResearchWorkspace.tsx`, `components/saved/*`, `CollapsibleSection`
- **Purpose:** render sections; flip executive/learning; save; analyze.
- **Extension points:** new sections plug into `page.tsx` as a `CollapsibleSection`; reuse `intelUi` blocks and `MizuhoAlignmentBlock`.
- **Risk of modification:** **LOW-MEDIUM.** Mostly presentational; respect the toggle contract and color tokens.

**Treat as stable foundation:** `snapshotEngine`, `llm`, `analyze`, `mizuhoTopRisks`, `snapshotStore`, `types`. Changes here ripple system-wide and have historically caused the hardest bugs.

---

## 5. Editorial Intelligence System

**Purpose.** Produce a daily, grounded, executive-first risk briefing: ranked CRO conversation themes, a small number of editorial cards, a Japan & Asia watch, and an "Also on the Radar" near-miss list — each with a plain-English twin and (where it maps) a Mizuho Top-Risk alignment.

**Architecture & data flow.**
```
ingest (4 news adapters) → junk filter → dedupe → cluster → rank (relevance + source tier + phase lens)
  → INTERPRET (LLM, grounded): clusters → themes + editorial + (conditional) Japan narrative
  → re-anchor any numbers to live indicators (model must not invent numbers)
  → editorial deduped against themes (one story → one slot)
  → Japan empty-state guard (collapse degenerate "no Japan news" to one line)
  → ALIGN (LLM, dedicated): themes → curated Mizuho scenarios (tags → validated → curated why)
  → LAYMAN (LLM, grounded): plain-English twins for every prose field
  → build Radar (deterministic near-misses) → auto-collect concepts → PERSIST snapshot to KV
```

**Refresh logic (two-clock model).** Indicators are live per load. The editorial is generated once daily by the cron and **frozen in KV**; the read path serves the same snapshot all day. A **manual Regenerate** button re-runs the pipeline on demand (busy-guarded via a KV flag; preserves last-good on failure). **Generation never overwrites a good snapshot with a bad one** — the engine throws and the caller keeps the prior snapshot ("graceful staleness").

**Interpretation generation.** A single grounded interpret call returns themes + editorial + (only when genuine Japan news exists) a Japan object. Grounding rules: interpret *only* supplied content, never invent facts/numbers; numbers re-anchored to the live data spine; rank by CRO relevance, **US-first** for Mizuho Americas; one story → one output slot.

**Editorial controls.** `ONBOARDING_PHASE` (relevance weighting), `DISABLE_GEMINI` (force Anthropic), manual Regenerate, Generation History for visibility. Radar is quality-gated (relevance floor + credible source + real CRO signal; unclassifiable dropped; empty if nothing qualifies).

**Lessons learned (critical — see also §10).**
- The cron's catastrophic failure was **truncation, not call count**: `gemini-2.5-flash` is a reasoning model whose hidden thinking tokens consumed `maxOutputTokens`, truncating JSON (`finishReason=MAX_TOKENS`) and forcing slow Anthropic fallbacks that overran 180s. Fix: `thinkingBudget: 0`. **Always instrument `finishReason`.**
- **Don't collapse calls to save time if it starves quality.** Folding alignment into the interpret call (as inline tagging) silently cut coverage to ~1 theme; a **dedicated** alignment call restores reliability.
- **Empty/degenerate states need robust detection.** The model phrases "no Japan news" many ways; literal phrase-matching missed it. Detect the *absence signal* broadly (and verify it doesn't fire on real narratives).
- **Radar must be quality-gated**, never a leftover bin; a new surface can expose an upstream leak (loose ingestion) — fix the root cause.

**Future extensions.** Per-section regeneration; smarter clustering; additional curated fallbacks; richer radar lensing. Attach new lenses to existing cards rather than adding sections.

---

## 6. Learning System

**Learning View architecture.** A whole-screen **Executive ↔ Learning** toggle (Today tab, sections 03+). Learning view does not call the model at read time — it swaps in **pre-generated plain-English twins** produced during the daily run. This keeps reads fast and the two-clock model intact.

**Simplification / translation pipeline.** During generation, `translateLayman()` makes one grounded LLM call that translates every prose field (theme/editorial/Japan) into a plain-English twin and attaches it (`layman`). Resolution at render time is via `lib/layman.ts`. Mizuho alignment "why" text does **not** go through translation — its plain-English form is the curated `pathLayman` (no model prose to translate).

**Interpretation framework (shared everywhere).** *What happened · Why it matters · Banking impact · Why Mizuho cares · plain-English twin · linked concepts.* The same framework is used by editorial themes and by Research analyses — that consistency is the product.

**Concept Library.** Curated concepts (`lib/concepts.ts`) with aliases; `detectConcepts`/`linkifyConcepts` link risk terms in text into the library; concepts are **auto-collected** (recorded as "seen") but **never auto-created/defined** — curated-core only. Saved items and saved Research analyses also live under Learn.

**UX principles.** Tutor-not-terminal; executive-first then plain-English on demand; mobile-first; no jargon in Learning view; retention is a feature (save the *interpretation*, not the raw article).

**Lessons learned.** Earlier per-term "Explain simply" was replaced by the whole-screen twin (cleaner, fewer controls). Saving the interpreted asset (not a bookmark) is what makes Learn useful over time. Keep Learning view free of read-time LLM calls.

**Future extensions.** "Ask About This" (single-turn, context-scoped, grounded follow-up on a saved analysis/theme) is the next natural step — deferred. Editable concept library + personal notes require a real datastore (Supabase) — deferred. Learn is intended to grow into: Concepts · Saved Analyses · Saved Articles · Weekly Learnings.

---

## 7. Risk Intelligence Framework

**Risk taxonomy.** Mizuho's published **Top Risks** (curated locally in `mizuhoTopRisks.ts`): 8 top risks, each with published-style **scenarios** carrying a transmission `path` (executive) and `pathLayman` (plain-English). This is the durable spine.

**Risk scoring (relevance).** `newsAdapter.relevanceScore` = source-tier + CRO-topic hits − suppression + **phase lens bonus** (`relevanceConfig`). Phase 1 (Americas) weights US ≫ macro > Japan > Europe, with extra bonus for US banking/credit/regulatory specificity. Junk (entertainment/sports/local-crime/lifestyle) is dropped at ingestion.

**Scenario mapping (alignment).** `alignToMizuho` (dedicated LLM call) maps each theme/analysis to 0–2 curated scenarios. The model returns **ids + confidence only**; invalid ids are rejected (no invented risks); the displayed "why" is the curated scenario path. **A no-match is valid and expected** — never force a mapping.

**Signal interpretation & narrative generation.** Themes/editorial/Japan narratives come from the grounded interpret call; numbers are re-anchored to live indicators. Japan is a protected first-class lens (its own section) regardless of phase weighting.

**Confidence handling.** Confidence is **derived, not model-stamped**: anchored + multi-source → High; single-source/no-anchor → Medium; else Low. Alignment confidence is normalised to High/Med/Low. Avoid false precision everywhere (no spurious numeric scores).

**Future extensions.** Quarterly diff-check of the Top Risks taxonomy; finer scenario granularity; per-region weighting as phases advance.

---

## 8. Data Ecosystem

> **KV keyspace (V4.5 additions):** `bloomberg:type:{evening_briefing_americas|morning_briefing_americas|evening_briefing_asia|morning_briefing_asia|markets_daily|bloomberg_other}` (digests, 36h TTL) · `bloomberg:analyzed` (analyzed headlines, 48h) · `bloomberg:runs` (last 15 ingestion runs) · `processed_msg:{message_id}` (email dedupe, 30d). Written by the Python extractor, read by the dashboard.

For each source: purpose · usage · refresh · failure handling · fallback · limitations.

- **FRED (macro indicators).** Purpose: macro spine (rates, CPI, spreads, JGB, etc.). Usage: live each load + anchoring numbers in editorial. Refresh: per load. Failure: indicator omitted/last-known; never blocks the page. Fallback: curated/empty indicator. Limits: API key required; rate limits.
- **Yahoo Finance / markets (`markets.ts`, `marketData.ts`).** Purpose: market levels for Markets tab + anchors. Usage: live each load. Failure: graceful omission. Limits: unofficial endpoints can change.
- **News adapters (Marketaux, NewsData, Finnhub, AlphaVantage) via `newsAdapter.ts`.** Purpose: raw stories for editorial. Usage: ingestion at generation time only. Refresh: per generation (cron/regenerate). Failure: each adapter wrapped — a slow/failed source can't stall others; results simply reduced. Fallback: curated editorial if too few usable stories. Limits: free-tier quotas; variable quality (hence junk filter + relevance gate).
- **URL fetch (Research, V4.0).** Purpose: best-effort article extraction. Usage: on demand in `research/analyze`. Failure: timeout/403/JS-rendered → graceful 422 with "paste the text instead" + `fallbackToText`. Fallback: paste-text (the reliable tier). Limits: **premium/paywalled sites (Reuters/FT/Nikkei/WSJ) routinely block** — expected, not a bug. No PDF/DOCX/OCR yet (PDF/DOCX → V4.2; OCR/screenshots after).

### Research quota — reservation guard (`lib/researchQuota.ts`, V4.1)

- **Purpose.** Cap user-driven Research analyses per IST day so they can **never starve the daily editorial of Gemini quota**. Enforces the product principle: *Today must always win; Research degrades first.*
- **Mechanism.** A KV counter keyed `research:count:<IST-date>` (in-memory fallback when KV is absent). `getResearchQuota()` reads `{ used, cap, remaining, date }`; `incrementResearchCount()` is called **only after `analyzeContent` succeeds** (failed URL fetches / model errors never burn a slot). `RESEARCH_DAILY_CAP` env var sets the cap (**default 5**).
- **Route wiring.** `research/analyze` `POST` checks the cap first and returns **HTTP 429** `{ ok:false, capped:true, quota, error }` when exhausted; on success it increments and returns `quota` alongside the analysis. A new `GET` returns the quota cheaply so the UI can show remaining budget without spending one.
- **Reservation by construction.** Only the Research route touches the counter. `cron/editorial` and `regenerate` **never** call it, so they cannot be blocked by it. At the cap there is **no Anthropic fallback for Research** — the backup is deliberately reserved for editorial. (The editorial cron retains its own Gemini→Anthropic→curated chain.)
- **Cost model.** Editorial generation ≈ 3 Gemini calls (4 with a retry); each Research analysis = 2 calls. Free-tier ceiling is **20 RPD** (confirmed; 5 RPM / 250K TPM). cap=5 ⇒ ≤10 Research calls/day, leaving comfortable editorial headroom. Raise the cap on a paid tier.
- **Reset offset (watch).** The counter resets at **IST midnight**; Google’s RPD resets at **midnight Pacific (~12:30 IST)**. The conservative cap absorbs the offset; revisit if the cap is raised aggressively.

### Saved items — full-piece capture (`lib/savedStore.ts` + `lib/savedMappers.ts`, V4.1a)

- **Why.** Until 4.1, `SavedItem` stored only flat executive strings (`interpretation`, one `bankingImpact` string, `whyMizuho`). After 4.1 added bulleted impact + per-area layman to the live views, saved items looked degraded — no bullets, no Learning view. 4.1a brings saved items to parity and captures the **whole piece**.
- **Schema.** `SavedItem` gains `whatHappened?`, `bankingImpactAreas?: BankingImpactArea[]`, a `layman?` block (whatHappened / interpretation / bankingImpact / whyMizuho twins), and `detail?: SavedDetail` — the deeper sections (lenses, signals, questions [+layman], talkingPoint [+layman], followUp [+layman], whatToUnderstand [+layman]; editorial firstOrder / secondOrder / keyTakeaway [+layman]). All optional → existing saved records remain valid.
- **Mappers.** `savedMappers.ts` exposes `savedFromAnalysis / savedFromTheme / savedFromEditorial / savedFromJapan`. **Critical:** themes/editorial/japan must be mapped from the **RAW (unresolved)** object. `resolveIntelligence()` overwrites the main fields with layman text when the Learning view is active (it preserves `.layman` but discards the executive original), so mapping a *resolved* item would lose the executive variant. `page.tsx` therefore passes `data.intelligence.*` (raw) as `rawThemes` / `rawCards` / `raw` alongside the resolved objects used for display; components map from raw. Research maps from the `ResearchAnalysis` directly (it already holds both variants).
- **Render.** `SavedList` owns a Learning/Executive toggle (**default Learning**, per product preference) and a per-card *Full detail* expander. Impact renders as bullets from `bankingImpactAreas`, falling back to the combined string. Every field shows its layman twin when Learning is on.
- **Storage decision.** Stays on **Vercel KV** — records are text-only and small; no relational/auth/concurrency need. Supabase remains the eventual home for multi-device + editable concepts + notes + search (separate workstream). Single-key `saved:items` array, cap 50, last-write-wins.

### Weekly Markets refresh + Weekly Learning (`lib/weeklyEngine.ts` + `app/api/cron/weekly`, V4.2)

- **Why a separate weekly job.** Markets sections 03–05 (heat map, emerging risks, implications) and Weekly Learning are structural — daily regeneration is noise and burns the scarce Gemini RPD. Refreshing them **weekly on Anthropic** keeps them current without touching the daily Gemini budget. Standing rule: **Gemini = daily editorial + Research; Anthropic = weekly.**
- **Provider override.** `interpret(...)` / `interpretWithProvider(...)` now take `{ forceProvider?: "anthropic" }`. When set, the Gemini block is skipped entirely and the call goes straight to Anthropic; on failure it returns `none` (NO Gemini fallback — the whole point is to spare Gemini). Diagnostics log `forced=anthropic` / `skipped reason=forced_anthropic`.
- **Engine.** `generateWeekly()` builds a compact week context from `getRecentSnapshots(7)` (theme titles + severities) + live indicators, then makes **two forced-Anthropic calls in parallel**: (1) re-rate the Markets spine, (2) Weekly Learning. Each is independently fail-soft.
- **Spine-locked re-rate.** The Markets call is seeded with the curated spine JSON (`HEAT_MAP_BASE` / `EMERGING_RISKS` / `IMPLICATIONS_BASE`) and instructed to keep every region/id/development label fixed, updating only ratings + reads. `mergeMarkets()` enforces this: it iterates the curated base, overlays re-rated values **only** when they match a known region/id/development and pass enum/non-empty validation, and discards anything else. The model cannot invent or drop risks. Whole heat map refreshed (severity included).
- **Artifacts (KV).** `saveWeeklyMarkets()` → `weekly:markets` (`WeeklyMarkets`: generatedISO + heatMap + emergingRisks + implications); `saveWeekly()` → `weekly` (Weekly Learning). The dashboard route reads both: when `weekly:markets` exists it serves the **frozen** heat map / emerging / implications (the daily live US overlay is bypassed) and sets `weeklyRefreshedISO`; when `weekly` exists it overrides `intelligence.weekly`. Absent either, the curated path (with live US cell) is served unchanged.
- **Cron + logging.** `app/api/cron/weekly` (CRON_SECRET, `maxDuration` 180) calls `generateWeekly()` and records a run with `job: "weekly"`. `vercel.json` schedule `30 0 * * 6` = Sat 00:30 UTC = **06:00 IST Saturday** (ready for weekend review; runs after that morning's daily editorial). RunHistory shows a `weekly` tag.
- **Fail-soft.** A missed/failed weekly run leaves the previous artifact in place (graceful staleness) and logs `weekly_failed_last_good_retained` / `partial_weekly_refresh`. Never throws to break the cron. **Caveat:** re-rate *content* quality is unmonitored — sanity-check the first weekend run.

### V4.3 — reliability, theme hygiene, risk↔implication linkage

- **Transient Gemini retry (`lib/llm.ts`).** `interpretWithProvider` now retries a failed Gemini call **once** when the failure is *transient* — `isTransient()` = reason `timeout`, or `http_error` with status 429 / 5xx. Gap `GEMINI_RETRY_MS` (default 35000, env-tunable), a single attempt, then the existing Anthropic fallback. Permanent failures (`no_key`, `invalid_json`, 4xx other than 429) skip the retry. Forced-Anthropic calls (weekly) never reach this path. Sized to stay under the 180s function budget (one ~35s wait, not a loop).
- **Robust theme persistence (`resolveTopicId`, `lib/snapshotStore.ts`).** Replaces blind trust of the model's `topicId`. A closed `TOPIC_VOCAB` (canonical id + keywords) is matched against the theme **title**: a model-claimed canonical id is kept only if the title supports it; otherwise the best title-keyword match wins; otherwise a specific title slug is minted (collision-resistant). Used in `snapshotEngine` in place of `normalizeTopicId` for the persistence key. Fixes the “new story shows Day N” collision and the reverse drift.
- **“What’s new” (`computeWhatsNew`, `lib/snapshotEngine.ts`).** For recurring themes, a **deterministic, LLM-free** diff vs the prior snapshot (fetched via `getRecentSnapshots(3)`, first earlier-day match by `topicId`): surfaces a severity change and/or a newly added signal into `CroTheme.whatsNew`, rendered as a green callout in `CroConversation`. Returns nothing when unchanged. No quota cost.
- **Risks ↔ Implications link (`BankImplication.riskId`, `lib/weeklyEngine.ts`).** Bank Implications are keyed 1:1 to Emerging Risks. The weekly Markets call now asks for **one implication per emerging risk** (by `riskId`); `mergeMarkets` builds a `BankImplication` for each of the 5 risks (`development` = risk name, `riskId`/`riskName` set, per-area reads from the model, falling back to the risk note so no cell is empty). `BankImplications` shows the linked risk name. **Cold-start:** before the first weekly run the dashboard still serves the curated 3 (`IMPLICATIONS_BASE`, unlinked) — full 1:1 linkage appears after a weekly run.
- **Saved-card colour fix.** `amber` is not a defined Tailwind token; SavedList used `text-amber`/`border-amber` → no colour → white text. Switched to the real tokens: meeting block `elevated` (gold), “what I should understand” `calm` (green), matching the Today tab.

### V4.4 — screenshot input + personalized focus

- **Gemini Tier 1.** 10,000 RPD / 1,000 RPM / 1M TPM; `RESEARCH_DAILY_CAP`=10. Quota is no longer the binding constraint — reservation cap, provider split and transient retry remain as hygiene. A single image analysis = ~4 Gemini calls (extract + interpret + align + focus); immaterial.
- **Image transcription (`extractFromImage`, `lib/llm.ts`).** Multimodal Gemini call: `contents.parts` = `[{text: strict transcribe-verbatim instruction}, {inline_data:{mime_type,data}} ×N]`, temp 0, thinkingBudget 0. Returns plain transcript text (not JSON). Gemini-only (no Anthropic image fallback in v1). Input type `ImageInput { mimeType, data(base64) }`, up to 4 images.
- **Two-step Research image pipeline (`app/api/research/analyze`).** New `mode:"image"`; body `images: ImageInput[]`. Flow: same reservation-cap check → `extractFromImage` → if transcript <60 chars, graceful 422 (`fallbackToText`) → else `analyzeContent(transcript, {sourceType:"image"})` → increment → return analysis + **transcript**. The analysis path is unchanged — image is just a third text source. `ResearchWorkspace` shows the transcript in a collapsible 'Transcribed text' block for auditability, plus client-side upload (file/photo/paste), ≤4 images, ≤5MB each, base64 in JSON (no multipart).
- **Personalized focus (`generateFocus`, `lib/focus.ts` + `lib/focusProfile.ts`).** Dedicated call AFTER alignment (separate by design — overloading the interpret/align call regressed quality in v4.0; quota no longer argues for merging). Fed `FOCUS_PROFILE` (role + 6 priorities, curated reference config) and the alignment result, instructed to NOT restate the institutional mapping and to return an **empty** array when nothing applies. Output `FocusItem[] { kind: attention|conversation|learning, text }`, 0–5 items. Stored on `ResearchAnalysis.focus`, persisted via `savedFromAnalysis` + the `/api/saved` route + rendered by the shared `FocusBlock` (exported from `ResearchWorkspace`, reused in `SavedList`). Renders only when non-empty.
- **Plumbing.** `sourceType` unions gain `"image"` (ResearchAnalysis + SavedItem). No exec/layman toggle on focus (already plain/actionable).

### Post-V4.4 — editorial reliability + non-array hardening

- **Anthropic escalation (`lib/snapshotEngine.ts`).** `interpretClusters` rejects valid JSON with `themes.length < 3` (under-production) and labels it `invalid_json`. The generate loop's retry now calls `interpretClusters(..., { forceProvider: "anthropic" })` — escalating to the backup model rather than re-trying Gemini — before serving last-good. `interpretClusters` gained a `forceProvider` option passed straight to `interpretWithProvider`. Log: `usable-theme check failed: N themes (<3)`.
- **Non-array hardening (three layers).** The model can return a theme list field (`questions`/`lenses`/`signals`/`mizuho`) as a non-array, which threw (`.forEach`/`.map` is not a function) — crashing "Go deeper" and skipping `translateLayman`. Fixes: (1) theme assembly in `interpretClusters` defaults each list to `[]` and each string field to `""` via `Array.isArray` checks; (2) `translateLayman` coerces every iterated list with a local `asArray()` helper; (3) the `components/intel/intelUi.tsx` list components guard with `Array.isArray(x) && x.length` (a bare `?.length` passes a string through to `.map`). Defence in depth: even a malformed save can't crash the saved-detail view.

### V4.5 — Bloomberg ingestion pipeline (in-repo, polyglot)

- **Extractor (`api/cron-bloomberg.py`, Python Vercel Function).** Root `/api` + `requirements.txt` makes Vercel build it as a Python Function alongside Next.js; reachable at `/api/cron-bloomberg`. Flow: IMAP (AOL) `UNSEEN FROM bloomberg SINCE <yesterday>` → precise 24h `LOOKBACK_HOURS` filter → sort oldest→newest → per email: dedupe (`processed_msg:{message_id}`, 30d), `clean_html`, **deterministic briefing detection**, Gemini extract (JSON, temp 0.1, 3-retry, extraction-only prompt) → write `bloomberg:type:{key}` (36h TTL). Marks mail `\Seen`. Logs a run to `bloomberg:runs`.
- **Briefing detection (`detect_newsletter`, V4.5.3).** Priority: (1) footer line `subscribed to bloomberg's (.+?) newsletter` (regex on RAW text — survives because detection does NOT use the header/footer-stripped `cleaned_text`); (2) subject + image `alt` (masthead); (3) full body. Curly apostrophes normalized. Fixed vocabulary `NEWSLETTER_TYPES` (evening/morning × americas/asia, markets_daily, + `bloomberg_other`). The subscription line is authoritative, beating the "More from Bloomberg" promo list that name-drops other newsletters.
- **Shared KV (no glue).** Same Vercel project → `KV_REST_API_URL/TOKEN` already present. Extractor `redis.set(key, json.dumps(...))`; dashboard `kvGet` does `GET` + `JSON.parse` — directly compatible. Keys: `bloomberg:type:{key}` (digests, 36h), `bloomberg:analyzed` (string[] of analyzed headlines, 48h), `bloomberg:runs` (last 15 run records), `processed_msg:{id}` (dedupe, 30d).
- **Dashboard read side.** `lib/snapshotStore.ts`: `getBloombergAll()` MGETs the fixed `BLOOMBERG_TYPE_KEYS` and returns present digests (expired ones return null), freshest-first by `ingested_at`; `getBloombergAnalyzed()`/`addBloombergAnalyzed()` (via `kvSetEx`); `getBloombergRuns()`. Route `app/api/bloomberg` GET → `{ digests, analyzed }`. Dashboard route adds `bloombergRuns` to its payload.
- **Research panel (`ResearchWorkspace.tsx`).** Fetches `/api/bloomberg`; renders one **group per briefing** (label + lead editorial + stories), freshest first, each with its own freshness/staleness guard (≥2 days → muted note). Each story: one-tap "Analyze this" → posts `{ mode:"text", text, bloombergHeadline }` to the existing analyze route; on success the headline is recorded in `bloomberg:analyzed`. `bbAnalyzed` is initialised from the fetched analyzed set so ✓ persists across reloads.
- **Run history UI.** `BloombergRunHistory` (in `components/RunHistory.tsx`) renders `data.bloombergRuns` as a distinct sub-list under Today's Generation History (fields differ from the editorial run log, so not interleaved).
- **Cron (`vercel.json`).** Two slots: `0 0 * * *` (05:30 IST, Americas evening brief) and `30 13 * * *` (19:00 IST, Americas morning brief), plus `maxDuration: 300` for the Python function. The 24h window + dedupe make double-runs safe.
- **Caveats.** Email scraping is inherently fragile to Bloomberg HTML changes. The Python function runs only on Vercel (validated by `py_compile` + detection simulation locally, not full execution). Mixed Node+Python is supported; clean fallback is a separate project with the same KV vars.
- **Vercel KV (Upstash Redis).** Purpose: the only persistent store — frozen snapshot, saved items (cap 50), run history (cap 15), concept-seen, regen/busy flags. Usage: write on generation/save; read on load. Failure: store-unavailable falls back to in-memory where possible; reads degrade. Limits: single store; no migrations; not a relational DB (Supabase deferred for when a feature truly needs it).

**Provider data (LLM):** Gemini 2.5 Flash (primary, free), Anthropic Haiku (fallback, paid). See §9.

---

## 9. AI Architecture

**LLM usage.** All model access goes through `llm.interpretWithProvider<T>()`. **Gemini-first** (`gemini-2.5-flash`, free) → **Anthropic** (Haiku, paid) fallback → **curated** content if both fail. The editorial run makes **two grounded calls (interpret, layman) plus a dedicated alignment call**; Research makes **one analyze call plus the dedicated alignment call**. `explainThemes` exists but is **dead code** (legacy "Explain simply"); the live path does not call it.

**Prompt patterns.** A shared `CRO_SYSTEM_PROMPT` framing the analyst role. Prompts demand **JSON-only** output with an explicit shape, strict grounding ("interpret only supplied content; never invent facts/numbers"), US-first ranking, and one-story-one-slot dedupe. Alignment prompt asks for **ids + confidence only** against the curated catalogue, allowing an empty match.

**Structured outputs.** `responseMimeType: application/json` + robust parsing: fence-strip, string-aware brace extraction (`extractJson`), and validation (theme count, valid alignment ids). Invalid/empty → treated as `invalid_json` for fallback/visibility.

**Guardrails.** Grounded-only; numbers re-anchored to live data; alignment ids validated (no invented risks); confidence derived not stamped; curated fallbacks for every section; each LLM step isolated (its failure never breaks the briefing); Research fully isolated from the snapshot; input length cap with truncation labelling.

**Fallbacks.** Provider fallback (Gemini→Anthropic→curated); per-section curated fallback; graceful staleness (keep last-good snapshot on failure); graceful URL→text fallback.

**Cost considerations.** Gemini-first keeps cost ~free; Anthropic is a small paid backstop. Single-user, on-demand Research is cheap **provided input is capped**. An uncapped long PDF/report would be where cost/latency spikes — hence the cap.

**Reliability considerations.** **Disable reasoning-model thinking** (`thinkingBudget: 0`) so output isn't truncated. Keep calls small and structured. Watch `finishReason=STOP` on Gemini as the health signal. Respect the 180s Pro ceiling; keep total calls modest.

**Known issues.** Gemini quality varies; occasional fallback to Anthropic is normal. URL extraction is heuristic (no readability lib). Empty-state and junk detection are heuristic and may need list/pattern maintenance. **(assumption)** Live LLM output quality for Research is unverified in this environment (no key in sandbox); validate on real runs.

---

## 10. Design Decisions

The reasoning behind the architecture — preserve this.

1. **Two-clock model (live data vs frozen editorial).** *Why:* an executive briefing must be stable through the day, and LLM calls are slow/variable. *Alternative:* generate on every load (rejected — slow, costly, non-deterministic). *Trade-off:* editorial can be up to a day stale (acceptable; mitigated by manual Regenerate). **Never put an LLM call on the default read path.**
2. **Grounded-AI-only.** *Why:* a risk tool that invents numbers is worse than useless. *Decision:* translate/interpret supplied content only; re-anchor numbers to live data; label provenance and degradation. *Trade-off:* less "creative" output; far higher trust.
3. **Provider-agnostic, Gemini-first.** *Why:* cost (free primary) + resilience. *Alternative:* single provider (rejected — fragility/cost). *Trade-off:* must reconcile two providers' quirks behind one interface.
4. **Disable Gemini "thinking."** *Why:* hidden thinking tokens consumed `maxOutputTokens` and truncated JSON, cascading into fallback-driven 180s timeouts. *Lesson:* know your model's token accounting; instrument `finishReason`. **(This was the single most consequential bug.)**
5. **Dedicated alignment call (not inline tagging).** *Why:* inline tagging in the big interpret call was deprioritised by the model → ~1 theme aligned. *Decision:* a focused, dedicated call gives reliable coverage. *Trade-off:* one extra (free, fast) call — worth it. *Refinement:* the "why" is curated (scenario path), so no hallucinated mapping prose and nothing extra to translate.
6. **Curated Top Risks as a durable spine; map to published scenarios, allow no-match.** *Why:* anchors interpretation in Mizuho's own framework and teaches transmission mechanisms. *Trade-off:* the taxonomy is a curated approximation needing periodic verification.
7. **Reuse the framework, not the engine (V4.0 Research).** *Why:* Research's value is the interpretation framework; a second pipeline would duplicate and drift. *Decision:* shared `analyzeContent`/`alignToMizuho`; Research is a new *entry point*. *Trade-off:* breaks the "no interactive LLM" purity — contained by full isolation.
8. **Research isolation.** *Why:* user-driven analyses must never pollute editorial history/snapshots. *Decision:* ephemeral; persists only on explicit Save. *Trade-off:* none significant.
9. **Input reliability tiers (text ≫ URL ≫ PDF).** *Why:* premium sites block fetching; treating inputs as equals would make the feature feel broken. *Decision:* paste-text primary, URL best-effort with graceful fallback, PDF/DOCX staged to V4.1.
10. **KV-only persistence; defer Supabase.** *Why:* simplest store that meets current needs; avoid premature infrastructure. *Trade-off:* caps (50 saved / 15 runs), no relational queries — revisit only when a feature truly needs it.
11. **Quality over quantity (radar, themes, signals).** *Why:* "fewer, better" beats volume for a learning/briefing tool. *Decision:* relevance floors, junk filters, near-miss radar, no slot-filling. *Trade-off:* sometimes empty sections (acceptable, even preferable).
12. **Derived confidence, no false precision.** *Why:* model-stamped confidence is noise. *Decision:* derive from anchoring + source count; High/Med/Low only.

---

## 11. Technical Debt

- **Curated Top Risks taxonomy is unverified** against Mizuho's published page (a curated approximation). *Workaround:* labelled as AI-interpretation provenance in the UI. *Action:* quarterly diff-check; correct + redeploy.
- **Heuristic detectors** (junk filter, Japan empty-state, relevance lenses) are keyword/pattern-based and need occasional maintenance as the model/news drift. *Refactor opportunity:* have generation return explicit structured flags (e.g. `hasJapanContent: false`) instead of inferring from prose.
- **Dead code:** `explainThemes` in `snapshotEngine` (legacy). *Action:* safe to remove in a cleanup pass; verify no import first.
- **Possibly-unused legacy components** at `components/*` top level (pre-`intel/`). *Action:* audit and prune carefully.
- **URL extraction is naive** (regex HTML→text, no readability). *Concern:* mediocre extraction on complex pages. *Action:* consider a readability lib only if/when it earns its weight (and watch serverless size).
- **KV caps (50/15)** and no migrations. *Concern:* library growth. *Action:* Supabase only when a feature requires it.
- **Three LLM calls per editorial run within 180s.** *Concern:* headroom if prompts grow. *Mitigation:* thinking disabled keeps calls fast; keep prompts lean; monitor `finishReason`.
- **No automated tests.** *Concern:* regressions. *Mitigation today:* targeted `tsx` smoke checks during builds + logs + degradeReason. *Action:* add lightweight tests around `alignToMizuho` validation, `isDegenerateJapan`, relevance ranking, parsing.
- **Env vars bind at build time.** *Gotcha:* changing a key requires redeploy — document at the point of change, not in chat.

---

## 12. Extension Framework

How to add features without eroding the architecture.

**Evaluate every new feature against:**
1. Does it reuse the existing interpretation framework / primitives, or create a parallel engine? (Prefer reuse.)
2. Which clock does it touch — live data, frozen editorial, or a new ephemeral path? (Keep the two clocks decoupled; isolate ephemeral paths.)
3. Does it add a section, or attach a lens to an existing card? (Prefer attaching.)
4. Does it add an LLM call to the read path? (Almost never acceptable.)
5. Does it need new persistence beyond KV? (Defer Supabase until truly required.)
6. Can it degrade gracefully and stay grounded? (Mandatory.)

**Where things integrate.**
- New interpretation of content → through `analyze.ts` (reuse `analyzeContent`/`alignToMizuho`).
- New editorial section → extend the interpret schema in `snapshotEngine`, add a curated fallback in `intelligence.ts`, add a render component, plug into `page.tsx` as a `CollapsibleSection`.
- New model call → through `llm.interpretWithProvider` only.
- New persisted data → a small store module mirroring `savedStore`/`runStore` (KV, capped, in-memory fallback).
- New risk mapping → extend `mizuhoTopRisks` (and re-verify provenance).

**Manage complexity.** Stage releases; prototype before building; resist scope creep; "fewer, better." Keep route handlers thin and logic in `lib/`. Keep prompts lean (token budget + truncation risk).

**Reuse these patterns:** provider-agnostic LLM choke point; grounded-only prompting with curated fallback; derived confidence; dedicated focused calls for structured sub-tasks; curated reference text instead of generated prose where accuracy matters; isolation for interactive features; KV stores with caps + in-memory fallback; graceful degradation with a visible reason.

**Avoid these patterns:** LLM calls on the read path; inline-tagging a structured sub-task into a big call; literal single-phrase detection of fuzzy states; slot-filling sections with low-quality content; inventing numbers/risks; one-provider lock-in; premature infrastructure; large multi-purpose prompts.

---

## 13. Future Build Rules (explicit instructions for future Claude)

1. **Read context first.** `risk-dashboard-master-context-v4_5_3.md`, then this document, before proposing anything.
2. **Recommend before building.** This user works propose→approve→build. Present a plan and trade-offs; get explicit approval. Prototype (throwaway HTML) before large builds when UI is involved.
3. **Preserve executive-first + mobile-first.** One screenful matters; minimal formatting; semantic color tokens; `max-w-app`.
4. **Preserve learning-first philosophy.** Plain-English twins, tutor-not-terminal, no read-time LLM calls in Learning view.
5. **Prefer enhancement over rewrite.** Attach lenses to existing cards; reuse primitives; don't duplicate the engine.
6. **Stay grounded.** Never invent facts/numbers/risk-mappings. Re-anchor numbers to live data. Label provenance and degradation. Allow no-match.
7. **Protect the two clocks + isolate ephemeral paths.** No LLM on the default read path; Research-style features must not pollute snapshots/history.
8. **Keep Japan and Mizuho first-class** regardless of phase weighting.
9. **Mind the model's token accounting.** Keep Gemini thinking disabled; keep prompts lean; instrument `finishReason`; respect 180s.
10. **Use dedicated calls for structured sub-tasks**; don't inline-tag them into big calls.
11. **Minimise tokens & complexity.** Lean prompts, small structured outputs, fewer better signals.
12. **Document the decision before implementing**, and update the master-context + this reference on each release (rename to the new version). **The user must manually upload updated docs to Project Knowledge** (the sandbox cannot write there).
13. **Never violate guardrails:** no read-path LLM, no ungrounded output, no false precision, no scope creep into deferred items (PDF/DOCX, OCR, Ask-About-This, Supabase, notes, multi-turn chat) without explicit approval.
14. **When something looks broken, check for an upstream cause** (e.g. radar exposed loose ingestion). Fix root causes.
15. **Verify, don't infer, on debugging.** Add diagnostics at decision points; read logs; don't guess provider behaviour (a past failure mode was guessing quota/429 with no evidence).

---

## 14. Current State Snapshot

**V4.5.3:** Next.js dashboard + in-repo Python Bloomberg extractor, one Vercel project, one shared KV. Gemini Tier 1 primary (daily editorial + Research + Bloomberg extract); Anthropic fallback/weekly/escalation. Twice-daily Bloomberg cron; daily editorial cron; Saturday weekly cron.

**What exists today (V4.5.3).** A 4-tab mobile dashboard (Today · Markets · Research · Learn): live indicators; a daily frozen editorial (US-first themes, editorial cards, Japan watch with robust empty-state, quality-gated radar); whole-screen Learning twins; curated Concept Library with auto-collect; Save-for-Later + Saved Analyses with metadata; manual Regenerate; Generation History; **Mizuho Top-Risk alignment** via a dedicated call; and a **Research workspace** (paste-text primary, best-effort URL) on a shared `analyzeContent` pipeline, fully isolated from the daily snapshot, with a **daily reservation cap** and **bulleted per-area banking impact** (each with a plain-English twin) added in V4.1.

**What is stable.** The two-clock architecture; `llm` provider abstraction (with thinking disabled); `snapshotEngine` pipeline; `analyze` primitives; `snapshotStore`/KV pattern; curated taxonomy/fallbacks; the interpretation framework and UI shell.

**What is experimental / newer.** Research URL extraction (best-effort, heuristic); Research analysis output quality (validate on real runs); the curated Top Risks taxonomy's exact fidelity to Mizuho's published page.

**What is likely to change next.** PDF/DOCX upload for Research (V4.1); then OCR; then "Ask About This" (single-turn grounded follow-up); later Supabase + editable concepts + notes. Phase knob will move from Americas (1) toward EMEA (2) as onboarding advances.

**What developers should know before changing anything.** The biggest historical bugs were (a) reasoning-model token truncation and (b) starving the alignment by merging its call. Both are fixed; don't reintroduce them. Heuristic detectors need occasional maintenance. The Top Risks taxonomy needs human verification. Keep the read path LLM-free and the two clocks decoupled.

---

## 15. Future Claude Startup Guide

When starting a fresh session on this project, in order:

1. **Read `risk-dashboard-master-context-v4_5_3.md`** (product, history, scope, principles).
2. **Read `engineering-reference-v4_5_3.md`** (this document — architecture, decisions, guardrails).
3. **Review the repository**, prioritising the ★ stable-foundation modules in §3/§4. Confirm current state rather than assuming; verify which components are live (some top-level legacy components may be unused).
4. **Summarise your understanding back to the user** before proposing changes — state what you believe the task is, which layer it touches, and any risks. Distinguish facts from assumptions.
5. **Design before implementing.** Produce a plan: where it integrates, which patterns it reuses, what it must not break, trade-offs. For UI, offer a throwaway prototype. Get explicit approval (this user works recommend→approve→build).
6. **Implement with minimal architectural disruption.** Reuse primitives; keep route handlers thin; keep prompts lean; stay grounded; degrade gracefully.
7. **Verify.** Build clean; run targeted smoke checks (e.g. alignment id validation, empty-state detection, relevance ranking); confirm no read-path LLM and no snapshot pollution.
8. **Update docs.** Refresh the master-context + this reference to the new version, and remind the user to upload them to Project Knowledge (the sandbox can't write there).

**Golden rules to carry into every change:** grounded-only; two clocks decoupled; executive-first + learning-first; fewer better signals; dedicated calls for structured tasks; reuse the framework not the engine; recommend before building; verify don't infer; honest caveats and scope-creep pushback.

---

*End of Engineering Reference v4.5.3. Treat §10 (Design Decisions), §12 (Extension Framework), and §13 (Future Build Rules) as the most important sections to preserve across versions — they encode why the system is the way it is and how to extend it without repeating past mistakes.*
