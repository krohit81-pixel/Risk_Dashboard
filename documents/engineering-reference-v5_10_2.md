# Global Risk Intelligence Dashboard — Engineering Reference (v5.10.2)

> Technical companion to `risk-dashboard-master-context-v5_10_2.md`. File-by-file map, data flows, storage schema, env vars, the Python extractor, validation workflow, and gotchas. Written so a fresh session can modify the codebase safely without re-reading chat history. Supersedes the v5.5.2 pair — five release-lines shipped since then (tab/screen restructuring, the entire Bank Earnings subsystem including Compare Banks, Mizuho Q1 Earnings).

Repo: `github.com/krohit81-pixel/Risk_Dashboard` (public). Stack: Next.js 14 App Router · TypeScript · Tailwind (CSS-variable-based theming, v5.4+) · Vercel KV (Upstash) · **Supabase (Postgres)** · recharts · next-themes. Deploy: GitHub push → Vercel Pro. Version single-sourced in `lib/version.ts` (`APP_VERSION`) + `package.json`. Current: **5.10.2**.

---

## 0. Build & validation workflow (every change)

Dev env has **no Gemini / Anthropic / FRED / Supabase** live access — those paths are validated by build/logic only; **say so** when a change touches them. No headless browser either — visual/contrast changes (theming, icon crops) can't be self-verified; say so too.

```bash
npx tsc --noEmit
npm run build
python3 -m py_compile api/cron-bloomberg.py   # Python extractor only
```

Deliverables → `/mnt/user-data/outputs/v5_x_y/` + a `CHANGES_v5.x.y.md`. Bundle files that would collide by name are renamed with the real destination path noted in CHANGES. **Binary assets (PNGs, etc.) are easy to miss when the user manually applies a mixed bundle** — flag them explicitly and, ideally, suggest `git status` after applying to confirm they landed.

**Verify claims against actual code before answering, don't rely on memory** — this app has a long history and several bugs/doc errors have come from assuming rather than checking. This refresh itself is an example: prior notes had the doc gap at "one version behind" when it was actually five, and had "Concept Studio merge" as a flat unbuilt item when the display half is actually done and only detection/Linkify remains (§10).

**Watch for the JSX-text Unicode-escape trap**: `\uXXXX` only decodes inside an actual JS string/template-literal context. It does **not** decode in raw JSX text between tags, or in a bare JSX attribute. Hit repeatedly across many files historically — always grep new/edited files for `\\u[0-9a-fA-F]{4}` before shipping and confirm each hit is inside a real string context, not raw text.

**`components/ui.tsx` is a file, not a folder** — don't create `components/ui/`, it collides.

---

## 1. Repo layout (parts that matter)

```
app/api/
  dashboard/route.ts                    # Today snapshot to client; assembles Top Developments (§3c)
  bloomberg/route.ts                    # ingested newsletter digests → Research panel
  research/analyze/route.ts             # POST: analyze pasted/URL/image/story
  saved/route.ts                        # saved-items CRUD (Supabase) + ?id= single lookup
  runs/route.ts                         # generation history
  cron/editorial/route.ts               # daily snapshot
  cron/weekly/route.ts                  # weekly markets re-rate
  admin/seed-mizuho/route.ts            # one-time: seed Mizuho repository into KV
  admin/migrate-saved/route.ts          # one-time: migrate saved items KV → Supabase (own MIGRATION_SECRET, fails closed)
  concepts/route.ts                     # user-concept CRUD (Supabase, separate from curated library)
  concepts/analyze/route.ts             # Gemini: pasted text → draft concept
  briefing/generate/route.ts            # compile a briefing book (query + 2 LLM calls)
  bank-earnings/route.ts                # GET: curated baseline + KV overlay, merged (v5.7.0 / v5.8.0)
  bank-earnings/refresh/route.ts        # POST: run the "Refresh Earnings" engine; also handles Reset (v5.8.0 / v5.10.1)
app/print/
  item/page.tsx                         # single saved-item print view (query-string: ?id=)
  book/page.tsx                         # briefing-book print view (query-string: ?pack=)
  [id]/page.tsx                         # LEGACY — thin client-side redirect to /print/item?id=
  layout.tsx                            # forces light theme for everything under /print, independent of app theme
app/icon.png, app/apple-icon.png        # Next.js file-convention favicon/apple-touch-icon (auto-detected, no metadata needed)
api/
  cron-bloomberg.py                     # PYTHON Vercel Function — newsletter IMAP ingestion
requirements.txt                        # ROOT — Python deps
supabase/
  schema.sql                            # saved_items DDL + risk_dashboard schema + grants — run once
  grants_fix.sql                        # standalone grants fix (if schema.sql was run before grants existed)
  add_user_concepts.sql                 # user_concepts DDL — run once
public/manifest.json                    # PWA manifest — icons array present since v5.5.1
public/icons/                           # icon-192.png, icon-512.png, logo-header.png
documents/                              # architecture docs + Mizuho knowledge-card source markdown (§3e)
lib/                                    # engine + data + stores (§4)
components/                             # UI (§5)
vercel.json                             # cron schedules — UNCHANGED since v5.5.2 (§2)
lib/version.ts                          # APP_VERSION
```

**No new top-level directories or Supabase tables since v5.5.2.** The entire Bank Earnings subsystem (baseline + refresh + overlay + compare metrics) lives in `lib/`/`components/`/two new API routes and uses the **existing** Vercel KV store — not Supabase. This was a deliberate choice (see §3m) to keep the earnings prototype lightweight and reuse the same "curated baseline + on-demand overlay" pattern already proven for the daily snapshot, rather than stand up new infrastructure.

---

## 2. Cron schedules (`vercel.json`, UTC)

| Path | UTC | IST | Purpose |
|---|---|---|---|
| `/api/cron/editorial?slot=morning` | `30 22 * * *` | 04:00 | daily snapshot |
| `/api/cron-bloomberg` | `0 0 * * *` | 05:30 | newsletter ingest (AM) |
| `/api/cron-bloomberg` | `30 13 * * *` | 19:00 | newsletter ingest (PM) |
| `/api/cron/weekly` | `30 0 * * 6` | Sat 06:00 | weekly markets re-rate (Anthropic-forced) |

Unchanged since v5.5.2 — verified against the current `vercel.json`. `admin/*`, one-time SQL files, and **Refresh/Reset Earnings** are **not** scheduled — all three are triggered manually (the first two via `?secret=`, earnings refresh via the Settings UI button).

---

## 3. Data flows

### 3a. Daily snapshot (`lib/snapshotEngine.ts`)
Gather → cluster → `interpretClusters` (theme count bound to cluster count) → `alignToMizuho` (Top-Risks) → `translateLayman` → persist. Escalation: Gemini → sharpened re-ask → Anthropic. **Does not** call `interpretThroughMizuho` (the Knowledge Repository lens) — Research-only currently; wiring it in remains deferred (master-context §7, unchanged status as of this refresh — re-verified against `snapshotEngine.ts` directly).

### 3b. Markets (`lib/marketData.ts`, `lib/fred.ts`, `lib/markets.ts`, `lib/riskEngine.ts`)
FRED + Yahoo → `Indicator[]` via `withTrends`. Curated scaffolds in `lib/fallbackData.ts`.

### 3c. What Changed / Top Developments (`lib/overnight.ts`, `lib/riskEngine.ts`, `app/api/dashboard/route.ts`)
- **`buildOvernight(indicators)`** (`lib/overnight.ts`) — ranks all tracked indicators by relative magnitude, keeps only `id/label/deltaText/tone`. 16-indicator universe, unchanged since v5.5.1.
- **`components/WhatChanged.tsx`** — the "Show All Indicators" table, 16-item full set, `whitespace-nowrap` + `overflow-x-auto` (v5.5.2 fix, unchanged since).
- **`deriveDevelopments(indicators)`** (`lib/riskEngine.ts`) — up to 4 **dynamic**, rules-based Top Developments (`derived:true`).
- **`app/api/dashboard/route.ts`** — appends exactly **2 permanently static** curated developments (`dev-geo`, `dev-bank`, `derived:false`, verbatim text) to pad the list to 5 — **re-verified directly in the route source for this refresh, still hardcoded, still open** (backlog §10).

### 3d. Research analysis (`lib/analyze.ts` `analyzeContent`)
One Gemini/Anthropic call for the editorial-shaped object, then 3 further dedicated calls (non-fatal individually): `alignToMizuho` (Top-Risks, `lib/mizuhoTopRisks.ts`), `generateFocus`, `interpretThroughMizuho` (the Knowledge Repository lens, §3e).

### 3e. Mizuho Knowledge Repository (`lib/mizuhoKnowledgeData.ts` + `lib/mizuhoKnowledge.ts`) — multi-card since v5.2.1
Unchanged architecture since v5.5.2. Split module: `mizuhoKnowledgeData.ts` (pure data/types/retrieval, client-safe) + `mizuhoKnowledge.ts` (server-only reader/interpreter). Four cards (`core_disclosures`, `risk_governance`, `risk_management`, `business_model`), 13 domains, `business_model` always-joins. Render: `components/intel/MizuhoLensBlock.tsx`, reused on Research + `SavedList.tsx`. Reference view: `components/learn/MizuhoReference.tsx` (now Settings n="04", moved from Learn n="06" in the v5.6.0 restructure — see §5).

**Distinct from two newer, unrelated "Mizuho" additions** (do not conflate all three):
1. `lib/mizuhoTopRisks.ts` — the original curated Top-Risks approximation, used in `analyze.ts`/theme alignment.
2. The Knowledge Repository above — real disclosed positions, multi-card, used in Research/Saved/Learn reference.
3. **`lib/mizuhoQ1Earnings.ts` + `components/learn/MizuhoQ1Earnings.tsx`** (v5.9.0, new this refresh cycle) — a completely separate, single-purpose module: a full-detail read of Mizuho's actual Q1 FY2026 results deck. See §3n. It does not feed into, or draw from, either of the two systems above.

### 3f. Saved items (`lib/savedStore.ts` + `lib/supabase.ts`)
Unchanged since v5.5.2. `getSaved()` / `addSaved()` / `removeSaved()` / `getSavedById(id)` / `getSavedInRange(from, to)`. Table: `risk_dashboard.saved_items`, structured columns + authoritative `payload jsonb`.

### 3g. Briefing books (`lib/briefingBook.ts`, `lib/briefingPacks.ts`, `app/api/briefing/generate/route.ts`)
Unchanged since v5.3. 2 period packs + 4 theme packs, two separate LLM calls (`generatePreface`, `generateActionItems`). Rendered at `/print/book?pack=<id>`. **Now surfaced from Settings n="02"** (was Learn n="07" — see §5), same component (`components/learn/BriefingBooks.tsx`).

### 3h. Print/PDF (`components/print/*`, `app/print/*`)
Unchanged since v5.3.4. Browser-native Print → Save as PDF. `/print/item?id=`, `/print/book?pack=`, own forced-light layout.

### 3i. Concept system — curated library, user-added concepts, and detection (`lib/concepts.ts`, `lib/userConcepts.ts`, `lib/conceptAnalyze.ts`, `components/learn/ConceptLibrary.tsx`, `components/learn/UserConceptsList.tsx`, `components/learn/ConceptStudio.tsx`, `components/learn/Linkify.tsx`)

**Restructured in v5.6.0/5.6.1 — read this section fresh even if familiar with the v5.5.x design.**

- `lib/concepts.ts` — the curated, static concept library (`CONCEPTS`) and `detectConcepts(text)` / `linkifyConcepts(text)`, used by `Linkify.tsx` to auto-highlight terms in briefing prose. **Still untouched by user-added concepts** — see the merge status below.
- `lib/userConcepts.ts` + `lib/conceptAnalyze.ts` — unchanged CRUD/analyze engine against `risk_dashboard.user_concepts` (own Supabase table, mirrors `savedStore.ts`'s pattern).
- `components/learn/ConceptStudio.tsx` — **v5.6.0: now the create/edit form only.** Moved from Learn into **Settings n="03" ("Add Concept")**. Can be driven externally via an `editTarget` prop (a `UserConcept`) so tapping "Edit" from the Concept Library list routes here pre-filled.
- `components/learn/UserConceptsList.tsx` — **new in v5.6.0**, split out of the old `ConceptStudio.tsx`. The "Your concepts" browsing list, now living **inside Concept Library** (Learn n="03"), not Settings.
- `components/learn/ConceptLibrary.tsx` — **v5.6.1 overhaul**: fetches user concepts (`GET /api/concepts`) and merges them with the curated `CONCEPTS` set into **one combined, searchable, browsable list** — curated entries favor seen-then-alphabetical ordering, user entries are tagged `isUser: true` and show an "added" date instead of a seen-count. This is the **display half** of the Concept Studio → curated-pipeline merge.

**Merge status, precisely (re-verified against current code, corrects prior doc/notes which had this as a flat "not done")**:
- ✅ **Done (v5.6.1)**: user-added concepts appear alongside curated ones in the one Concept Library browse/search list.
- ❌ **Still not done**: `detectConcepts()` / `linkifyConcepts()` (`lib/concepts.ts`, consumed by `Linkify.tsx`) still only scans the curated `CONCEPTS` array. A user-added concept term appearing in briefing/analysis prose will **not** get auto-linked — only curated terms are tappable inline. This half of the merge remains a genuine open item (§10).

### 3j. Dark/Light theming (`components/shared/ThemeProvider.tsx`, `components/learn/AppearanceToggle.tsx`, `tailwind.config.ts`, `app/globals.css`)
Unchanged since v5.5.2. `next-themes`, manual toggle only, RGB-triplet CSS custom properties. Toggle UI: **Settings n="01"** (was Learn n="08" — see §5).

### 3k. App icon / logo
Unchanged since v5.5.2.

### 3l. Newsletter ingestion → §7 (Python).

### 3m. Bank Earnings — baseline, live refresh overlay, and recovery (`lib/bankEarnings.ts`, `lib/bankEarningsStore.ts`, `lib/bankEarningsRefresh.ts`, `app/api/bank-earnings/*`, `components/learn/BankEarnings.tsx`) — **new subsystem, v5.7.0 → v5.10.1**

This is the single largest addition since v5.5.2 and has no prior documentation. Built in four increments:

**v5.7.0 — curated baseline.** `lib/bankEarnings.ts` exports `BANK_EARNINGS: BankEarnings[]` — hand-compiled, free-text/display-oriented latest-quarter data for **15 banks**, each with headline metrics, a `riskWatch` list, and a `stockReaction` block (`direction`, `changeText`, `detail`). Rendered read-only by `components/learn/BankEarnings.tsx` (Settings n="05"). At this point explicitly **not connected to live data** (per the v5.7.0 commit message) — a static reference screen.

**v5.8.0 — the "Refresh Earnings" engine, adding a live layer on top of the static baseline.** Three new pieces, working together as a **two-clock design** (the same shape as the daily editorial job — frozen baseline, refreshable live-ish overlay):
1. `lib/bankEarningsRefresh.ts` — for each of the 15 banks: fetch real news via the **same existing adapters** already wired elsewhere in the app (Marketaux / NewsData.io / Finnhub — no new API keys); keep only articles that name the bank, carry a genuine earnings signal, **and** post-date the bank's currently-stored report date (i.e., real evidence of a newer quarter, not re-coverage of what's already on file); banks with no qualifying articles are left untouched, spending no LLM call; banks with qualifying articles go into **one batched, grounded LLM call** (Gemini-first/Anthropic-fallback via `interpretWithProvider`) that may only use the supplied article snippets and must say so rather than guess if it can't confirm a genuinely newer quarter.
2. `lib/bankEarningsStore.ts` — the KV overlay (`earnings:overlay` key). Each accepted refresh result is schema-validated before being written; **the curated baseline in `lib/bankEarnings.ts` is never overwritten** — the overlay sits on top and the read path (`app/api/bank-earnings/route.ts`) merges baseline + overlay, overlay winning per-bank where present.
3. `app/api/bank-earnings/refresh/route.ts` (POST) — triggers a refresh run. Surfaced in **Settings n="06" (Generation History)** as a "↻ Refresh Earnings" button, distinct from the daily editorial regenerate above it.

Also in v5.8.0: plain-English summaries added to the earnings cards, and the Mizuho entry in the 15-bank baseline was updated for Q1 FY26 (see §3e's distinction — this is the compact baseline card, not the deep-dive module below).

**v5.9.0 — Mizuho Q1 Earnings, a separate deep-dive module.** See §3n.

**v5.10.0 — Compare Banks.** `lib/bankEarningsMetrics.ts` — a typed, USD-converted numeric layer sitting behind `components/learn/BankEarningsCompare.tsx`'s charts. `lib/bankEarnings.ts` stays free-text/display-oriented; this file pulls the **same underlying figures** into typed numbers, converts non-USD figures at real FX rates (`FX_RATES`, `FX_AS_OF`), and is explicit about basis differences (net vs. pre-tax profit, quarter vs. half-year vs. full-year) rather than silently mixing them. One figure (Citigroup's absolute net-income, since Citi's card only carries EPS+revenue+YoY%) was sourced directly from the bank's own Q2 2026 results rather than left as a chart gap. Mizuho's USD profit/ROE reuse the primary-source figures from `lib/mizuhoQ1Earnings.ts` (§3n) for consistency between the two Mizuho screens.

**Important, explicitly flagged in the code itself**: `bankEarningsMetrics.ts` is a **curated, hand-maintained companion dataset — NOT wired to the live Refresh Earnings overlay.** A bank refreshed via the button will update its list-card text (`BankEarnings.tsx`) but will **not** automatically update its bars in Compare Banks until this file is hand-revised too. The Compare screen's own caption states this. **This is a real, current gap worth tracking** — not previously documented anywhere (see §10).

Compare Banks is reached via a "📊 Compare Banks" button **inside** the Bank Earnings screen (`view` state toggle in `BankEarnings.tsx` between `"list"` and `"compare"`) — it is not a separate top-level Settings section.

**v5.10.1 — bug fix + recovery path**:
- **Reaction-pill data leak, fixed.** `stockReaction.changeText` is meant to be a short pill label; one baseline entry (Deutsche Bank) had the full explanatory sentence ("Conflicting across sources") in `changeText` instead of a short label, so the UI pill rendered the whole sentence. Fixed to `"Mixed"`, with the explanation correctly living only in `detail`. See §9 for the generalized lesson.
- **`clearEarningsOverlay(id?)`** added to `lib/bankEarningsStore.ts` — a recovery path. Without it, a bad accepted refresh result would sit in the overlay indefinitely (only replaced by a *later* successful refresh for that same bank, which may not happen soon). Surfaced as "↺ Reset Earnings" next to the refresh button (Settings n="06"), with an `id`-less call resetting all 15 banks to baseline, confirmed via a browser `confirm()` dialog.

### 3n. Mizuho Q1 Earnings — standalone deep-dive (`lib/mizuhoQ1Earnings.ts`, `components/learn/MizuhoQ1Earnings.tsx`) — v5.9.0

A full-detail, USD-converted read of Mizuho's actual **Q1 FY2026 results**, sourced directly from the primary filing ("Summary of Financial Results for the First Quarter of FY2026 (Under Japanese GAAP)", Jul 30, 2026). Surfaced at **Settings n="07"**.

Explicitly distinct from the compact `"mizuho"` entry in `lib/bankEarnings.ts` (05 Bank Earnings): that entry is the fast-compiled 15-bank-baseline card and flags its own credit-cost/capital figures as "not cleanly confirmed." This module resolves those specific gaps (credit costs, NPL ratio) from the actual deck — CET1/capital ratio still isn't in this particular release and is left unstated rather than guessed.

**FX handling (worth knowing precisely, it's a recurring convention now used in two places)**: quarterly P&L and the Jun-2026 balance sheet convert JPY at the report's own disclosed spot rate, **USD/JPY 162.45**. Historical FY20–FY25 comparison figures use the **same current rate** (not each year's actual historical rate) deliberately, so the trend reflects business volume rather than currency moves — noted at each series. FY26 full-year outlook uses Mizuho's own **planned FY26 rate, USD/JPY 150.00**. Figures already disclosed natively in USD (international/"Non-JPY" balance sheet block, regional loan splits) are carried through unconverted. `Compare Banks` (§3m) reuses this module's USD profit/ROE for Mizuho rather than re-deriving them.

---

## 4. `lib/` modules (roles)

`snapshotEngine.ts` (daily) · `llm.ts` (`interpretWithProvider`, Gemini→Anthropic escalation) · `weeklyEngine.ts` (weekly) · `marketData.ts`/`fred.ts`/`markets.ts` (markets) · `riskEngine.ts` (`withTrends`, `deriveDevelopments`) · `overnight.ts` (`buildOvernight`) · `fallbackData.ts` (curated scaffolds) · `mizuhoTopRisks.ts` (curated Top-Risks taxonomy — distinct from the repository) · `analyze.ts` (`analyzeContent`) · `focus.ts`/`focusProfile.ts` (`generateFocus`) · `mizuhoKnowledgeData.ts` (client-safe repository data + retrieval) · `mizuhoKnowledge.ts` (server-only reader/interpreter) · `supabase.ts` (server-only client, schema-scoped) · `savedStore.ts` (`SavedItem` CRUD) · `savedMappers.ts` (4 mappers → `SavedItem`) · `userConcepts.ts` (user-concept CRUD) · `conceptAnalyze.ts` (Gemini concept-drafting) · `briefingBook.ts`/`briefingPacks.ts` (compilation) · `concepts.ts` (curated static library + `detectConcepts`/`linkifyConcepts` — still curated-only, §3i) · `researchQuota.ts` · `runStore.ts` · `intelligence.ts` (curated fallback themes incl. per-theme `mizuhoAlignment`) · `relevanceConfig.ts` · `newsAdapter.ts` · `format.ts` · `types.ts` · **`bankEarnings.ts`** (curated 15-bank baseline, §3m) · **`bankEarningsStore.ts`** (KV overlay + `clearEarningsOverlay`, §3m) · **`bankEarningsRefresh.ts`** (the refresh engine, §3m) · **`bankEarningsMetrics.ts`** (typed USD comparison layer for Compare Banks, §3m — curated separately, not overlay-wired) · **`mizuhoQ1Earnings.ts`** (Mizuho Q1 FY2026 deep-dive data, §3n).

---

## 5. `components/` (key ones, by tab/feature)

**Bottom nav is unchanged: 4 tabs (Today / Markets / Research / Learn) + Settings reached via header hamburger.** What moved is *what lives inside* Learn vs. Settings — this was the core of the v5.6.0 restructure and is the single most important correction in this refresh.

**Today** (n="01"–"06", unchanged numbering): `WhatChanged.tsx`, `WhatChangedOvernight.tsx` (visual pass, v5.6.4 — now built on the new `ToneTile.tsx`), `TopDevelopments.tsx`, `RiskGauge.tsx` (rewritten v5.6.2), `intel/CroConversation.tsx` (touched v5.6.2/5.6.3), `intel/EditorialIntelligence.tsx`, `intel/JapanAsiaWatch.tsx`, `intel/RadarSection.tsx`.

**Markets** (n="01"–"05", unchanged): `CroDashboard.tsx`, `JapanWatch.tsx`, `RiskHeatMap.tsx`, `EmergingRisks.tsx`, `BankImplications.tsx`.

**Research** (single section, unchanged): `research/ResearchWorkspace.tsx`.

**Learn — now only 4 sections** (was 8 in the v5.5.2 doc; Add Concept form, Mizuho Reference, Briefing Books, and Appearance all moved to Settings in v5.6.0):
- 01 Saved Analyses — `saved/SavedList.tsx`
- 02 Saved for Later — `saved/SavedList.tsx`
- 03 Concept Library — `learn/ConceptLibrary.tsx` (now merges curated + user concepts, §3i) + `learn/UserConceptsList.tsx` (nested "Your concepts" browse list)
- 04 Weekly Summary — `intel/WeeklyLearning.tsx`

**Settings ("More", via header hamburger) — now 7 sections, up from being a thin panel**:
- 01 Appearance — `learn/AppearanceToggle.tsx`
- 02 Briefing Books — `learn/BriefingBooks.tsx`
- 03 Add Concept — `learn/ConceptStudio.tsx` (create/edit form only, §3i)
- 04 Mizuho Reference — `learn/MizuhoReference.tsx`
- 05 Bank Earnings — `learn/BankEarnings.tsx` (+ nested `learn/BankEarningsCompare.tsx` via internal view toggle, §3m)
- 06 Generation History — `RunHistory.tsx` + the Refresh/Reset Earnings controls (§3m)
- 07 Mizuho Q1 Earnings — `learn/MizuhoQ1Earnings.tsx` (§3n)

**New shared components (v5.6.2)**: `shared/NavIcons.tsx` (minimal single-color `currentColor` line icons for the bottom tab bar — monochrome, inherits the tab button's own active/inactive text color rather than carrying per-icon color), `shared/ToneTile.tsx` (`Tone = "negative"|"positive"|"neutral"` styled tile, direction-of-risk not direction-of-number; used by the rewritten `RiskGauge.tsx` and `WhatChangedOvernight.tsx`).

**Shared/cross-cutting (unchanged roles)**: `intel/MizuhoLensBlock.tsx`, `shared/AppFooter.tsx`, `shared/ProgressRing.tsx`, `shared/ThemeProvider.tsx`, `ui.tsx` (a file, not a folder), `CollapsibleSection.tsx`.

**Print** (unchanged): `print/PrintItem.tsx`, `print/PrintBook.tsx`, `print/PrintActionBar.tsx`.

---

## 6. Supabase (`risk_dashboard` schema)

**Unchanged since v5.5.2 — re-verified, no new tables.** The entire Bank Earnings subsystem (§3m) deliberately uses Vercel KV, not Supabase, mirroring the daily-snapshot pattern instead of adding new Postgres surface area.

**Isolation**: shared Supabase account with another tool ("Orbit") → own Postgres schema, not `public`. Requires **Project Settings → API → Exposed schemas → add `risk_dashboard`** AND explicit grants (`grant all on ... to service_role`, plus `alter default privileges`).

**Tables**: `saved_items` (structured columns + authoritative `payload jsonb`) and `user_concepts` (term/formal/category/aliases(jsonb)/layman/risk/cro/source_text) — same two tables as v5.5.2.

**Client** (`lib/supabase.ts`): unchanged — lazy singleton, service-role key only, server-only, in-memory degrade if unconfigured.

**Migration route**: unchanged.

---

## 7. Python extractor — `api/cron-bloomberg.py`

Unchanged since v5.5.2. Flow: authorize → IMAP connect → per-sender union search → fetch with `BODY.PEEK[]` → drop too-old → dedupe (KV, logged on skip) → classify → extract links + LLM extract → store per-briefing in KV → mark `\Seen` only on process/dedupe/junk → log run. `?force=true` bypasses dedupe.

---

## 8. Environment variables (full list, re-verified against actual `process.env.*` references for this refresh)

**No new environment variables since v5.5.2** — confirmed by grepping the entire current codebase. The Bank Earnings refresh engine deliberately reuses the existing news-adapter keys (Marketaux/NewsData/Finnhub) and the existing Gemini/Anthropic keys rather than requiring new configuration.

**Next app:** `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_RETRY_MS`, `GEMINI_TIMEOUT_MS`, `DISABLE_GEMINI`, `ANTHROPIC_API_KEY`, `ANTHROPIC_TIMEOUT_MS`, `LLM_MODEL`, `FRED_API_KEY`, `FINNHUB_API_KEY`, `MARKETAUX_API_KEY`, `NEWSDATA_API_KEY`, `ALPHAVANTAGE_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `MIGRATION_SECRET` (own, fail-closed), `RESEARCH_DAILY_CAP` (default 20), `ONBOARDING_PHASE`.

**Python extractor:** `GEMINI_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` (required). `IMAP_HOST`/`IMAP_EMAIL`/`IMAP_PASSWORD` (fallback `AOL_EMAIL`/`AOL_APP_PASSWORD`). `INGEST_SENDERS`, `EXTRA_NEWSLETTERS`, `LOOKBACK_HOURS`. `ANTHROPIC_API_KEY` + `LLM_MODEL`. `CRON_SECRET`.

---

## 9. Gotchas / learnings (don't re-discover these)

- **JSX-text Unicode escapes** (`\uXXXX`) only decode in real JS string contexts — always grep before shipping (see §0).
- **A file and a same-named folder collide** (`components/ui.tsx` vs `components/ui/`).
- **Non-public Postgres schemas need explicit API exposure + grants** — two separate failure modes, both hit once (§6).
- **Whitelist-fragility is a recurring bug class** — hand-maintained field lists silently drop new fields. Closed for saved items via `payload jsonb`.
- **Dynamic path segments mangle special-character ids** — moved to `?id=` query strings.
- **A partial UX fix can reproduce the exact bug it was meant to solve** — apply UI-state fixes to *every* state of a page, not just the common path.
- **Time-based progress UI must be labelled honestly** — can't reflect real backend completion for a non-streamed multi-call round-trip.
- **Verify "is X static/dynamic" and "why does Y look wrong" against actual code**, not memory — reconfirmed by this very refresh (§0, §3c, §3i).
- **Binary assets get missed in manual-apply workflows** — flag them loudly; add graceful fallbacks (`onError`) where feasible.
- **`table-layout: auto` column-width fights** — force `whitespace-nowrap` on cells that must stay single-line, add `overflow-x-auto` as a safety net.
- **Word-boundary-aware keyword matching** needed for short tokens ("ai") to avoid false positives inside unrelated words.
- **IMAP `RFC822` fetch sets `\Seen`** — use `BODY.PEEK[]`.
- **Dedupe outlives the digest TTL** (30d vs 36h) — use `?force=true` to re-ingest.
- **Repository domain gaps are correct, not bugs** — a domain with no card content yet should surface an honest gap.
- **Python deps in ROOT `requirements.txt`** only.
- **Two categories of limitation Claude cannot work around**: no live Gemini/Anthropic/FRED/Supabase access (validated by build/logic only), and no way to visually verify rendering/contrast — both require the user to run the real thing and report back.
- **A short-label field can silently become a long-text field (new, v5.10.1).** `stockReaction.changeText` was designed as a short pill label but one hand-authored entry put a full explanatory sentence there instead, and nothing enforced the length — the UI pill just rendered whatever string it got. When a data shape has an implicit "this field is short, that field is long" convention, it's worth a length-sanity check (or a type-level distinction) rather than trusting every hand-written entry to honor an unstated convention. Applies to any curated dataset with a short-label + long-detail pair (the same shape recurs in `bankEarnings.ts` itself and could recur elsewhere).
- **An overlay that only improves on success needs an explicit way back to baseline (new, v5.10.1).** The Bank Earnings refresh overlay (§3m) had a write path (accept a good result) but no path to undo a bad accepted one — a flawed entry would sit there until a later successful refresh happened to replace it, which isn't guaranteed. Any "curated baseline + on-demand live overlay" design (a pattern now used at least twice — daily snapshot, bank earnings) should ship its reset/recovery path in the same release as the overlay itself, not as a follow-up fix.
- **A curated companion dataset built "from the same figures" as another curated dataset will still drift** unless it's actually wired to update together (new observation, §3m/§10). `bankEarningsMetrics.ts` was built by reading values out of `bankEarnings.ts`, not by importing/deriving from it programmatically — so the two are correct at the moment of writing but have no mechanism keeping them in sync as either one changes. Worth a conscious decision (derive programmatically vs. accept the drift and flag it, as currently done) any time a new curated file is built "from" an existing one rather than reading it directly.

---

## 10. Backlog (queued; not built) — re-verified against current code for this refresh

- **Wire the Mizuho Knowledge Repository lens into the daily CRO Conversation themes** — still Research/Saved-only; re-confirmed `snapshotEngine.ts` does not call `interpretThroughMizuho` (master-context §7).
- **Make the 2 static "Top Developments" filler items dynamic** — re-confirmed still hardcoded verbatim in `app/api/dashboard/route.ts`; rules-based vs. new LLM call, Rohit's call pending.
- **Merge Concept Studio's user-added concepts into `detectConcepts()`/`Linkify`** — **partially done**, more precise than previously tracked: the Concept Library *display* now merges curated + user concepts (v5.6.1); the *detection/auto-link* engine (`lib/concepts.ts`) still scans curated terms only (§3i).
- **Reconcile the two Mizuho Top-Risks systems** (curated approximation vs. disclosed-positions repository) — unchanged, still open.
- **Wire Compare Banks (`bankEarningsMetrics.ts`) to the live Refresh Earnings overlay** — **new item, surfaced by this refresh.** Currently a bank refreshed via the button updates its list-card text but not its Compare Banks bars; the Compare screen's caption flags this but nothing closes the gap. Worth a decision on whether to derive the chart figures from the overlay-merged data programmatically, or keep it curated with a clearer "as of" marker.
- Optional: backfill `category`/`severity` on saved items from before v5.2 (only new saves are tagged) — unchanged, still open.
- **v4.6 "unified intelligence framework"** — long-deferred, unchanged status.

---

## 11. Version history (since v5.2.0)

**5.2.1** Mizuho multi-card repository · **5.3.0** Print/PDF export + Briefing Books · 5.3.1–5.3.4 print UX fixes, query-string print route · **5.4.0** dark/light theming · **5.5.0** Concept Studio prototype · 5.5.1 concept-card/indicator-table fixes + new app logo/icons · 5.5.2 icon fallback + indicator-table nowrap/scroll + Learn section reorder · **5.6.0** tab/screen restructuring — Add Concept form, Mizuho Reference, Briefing Books, and Appearance moved from Learn into a new expanded Settings ("More") panel; Concept Studio split into form (Settings) + browse list (Learn, merged into Concept Library) · 5.6.1 Concept Library curated+user merge · 5.6.2 visual pass — `RiskGauge.tsx` rewrite, new `NavIcons.tsx`/`ToneTile.tsx` · 5.6.3–5.6.5 bug fixes, `markets.ts` fix · **5.7.0** Bank Earnings screen (curated 15-bank baseline, static) · **5.8.0** Refresh Earnings live engine (KV overlay, grounded batched LLM call) + plain-English summaries + Mizuho Q1 FY26 baseline update · **5.9.0** Mizuho Q1 Earnings deep-dive module (Settings n="07") · **5.10.0** Compare Banks (USD-converted charts across all 15 banks) · 5.10.1 reaction-pill data-leak fix + Reset Earnings recovery path · 5.10.2 CLAUDE.md/README refresh (docs-only, no code change).
