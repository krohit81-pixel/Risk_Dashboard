# Global Risk Intelligence Dashboard — Engineering Reference (v5.5.2)

> Technical companion to `risk-dashboard-master-context-v5_5_2.md`. File-by-file map, data flows, storage schema, env vars, the Python extractor, validation workflow, and gotchas. Written so a fresh session can modify the codebase safely without re-reading chat history. Supersedes the v5.2.0 pair.

Repo: `github.com/krohit81-pixel/Risk_Dashboard` (public). Stack: Next.js 14 App Router · TypeScript · Tailwind (CSS-variable-based theming, v5.4+) · Vercel KV (Upstash) · **Supabase (Postgres)** · recharts · next-themes. Deploy: GitHub push → Vercel Pro. Version single-sourced in `lib/version.ts` (`APP_VERSION`) + `package.json`. Current: **5.5.2**.

---

## 0. Build & validation workflow (every change)

Dev env has **no Gemini / Anthropic / FRED / Supabase** live access — those paths are validated by build/logic only; **say so** when a change touches them. No headless browser either — visual/contrast changes (theming, icon crops) can't be self-verified; say so too.

```bash
npx tsc --noEmit
npm run build
python3 -m py_compile api/cron-bloomberg.py   # Python extractor only
```

Deliverables → `/mnt/user-data/outputs/v5_x_y/` + a `CHANGES_v5.x.y.md`. Bundle files that would collide by name are renamed with the real destination path noted in CHANGES. **Binary assets (PNGs, etc.) are easy to miss when the user manually applies a mixed bundle** — flag them explicitly and, ideally, suggest `git status` after applying to confirm they landed (this has already caused one real bug — v5.5.2's logo fallback exists because of it).

**Verify claims against actual code before answering, don't rely on memory** — this app has a long history and several bugs/doc errors have come from assuming rather than checking (a mislabeled CHANGES line about where `SavedItem` lives; guessing at why text was wrapping instead of reading the render code first).

**Watch for the JSX-text Unicode-escape trap**: `\uXXXX` only decodes inside an actual JS string/template-literal context. It does **not** decode in raw JSX text between tags, or in a bare JSX attribute (`label="...\u00b7..."`). It's been hit repeatedly across many files (MizuhoLensBlock, PrintItem, PrintBook, BriefingBooks, the print pages, PrintActionBar) — always grep new/edited files for `\\u[0-9a-fA-F]{4}` before shipping and confirm each hit is inside a real string context (`"..."`/`` `...` `` within `{}`), not raw text.

**`components/ui.tsx` is a file, not a folder** — don't create `components/ui/`, it collides.

---

## 1. Repo layout (parts that matter)

```
app/api/
  dashboard/route.ts              # Today snapshot to client
  bloomberg/route.ts              # ingested newsletter digests → Research panel
  research/analyze/route.ts       # POST: analyze pasted/URL/image/story
  saved/route.ts                  # saved-items CRUD (Supabase) + ?id= single lookup
  runs/route.ts                   # generation history
  cron/editorial/route.ts         # daily snapshot
  cron/weekly/route.ts            # weekly markets re-rate
  admin/seed-mizuho/route.ts      # one-time: seed Mizuho repository into KV
  admin/migrate-saved/route.ts    # one-time: migrate saved items KV → Supabase (own MIGRATION_SECRET, fails closed)
  concepts/route.ts               # user-concept CRUD (Supabase, separate from curated library)
  concepts/analyze/route.ts       # Gemini: pasted text → draft concept
  briefing/generate/route.ts      # compile a briefing book (query + 2 LLM calls)
app/print/
  item/page.tsx                   # single saved-item print view (query-string: ?id=)
  book/page.tsx                   # briefing-book print view (query-string: ?pack=)
  [id]/page.tsx                   # LEGACY — thin client-side redirect to /print/item?id=
  layout.tsx                      # forces light theme for everything under /print, independent of app theme
app/icon.png, app/apple-icon.png  # Next.js file-convention favicon/apple-touch-icon (auto-detected, no metadata needed)
api/
  cron-bloomberg.py               # PYTHON Vercel Function — newsletter IMAP ingestion
requirements.txt                  # ROOT — Python deps
supabase/
  schema.sql                      # saved_items DDL + risk_dashboard schema + grants — run once
  grants_fix.sql                  # standalone grants fix (if schema.sql was run before grants existed)
  add_user_concepts.sql           # user_concepts DDL — run once
public/manifest.json              # PWA manifest — now has a proper icons array (v5.5.1; had none before)
public/icons/                     # icon-192.png, icon-512.png, logo-header.png
lib/                              # engine + data + stores (§4)
components/                       # UI (§5)
vercel.json                       # cron schedules
lib/version.ts                    # APP_VERSION
```

---

## 2. Cron schedules (`vercel.json`, UTC)

| Path | UTC | IST | Purpose |
|---|---|---|---|
| `/api/cron/editorial?slot=morning` | `30 22 * * *` | 04:00 | daily snapshot |
| `/api/cron-bloomberg` | `0 0 * * *` | 05:30 | newsletter ingest (AM) |
| `/api/cron-bloomberg` | `30 13 * * *` | 19:00 | newsletter ingest (PM) |
| `/api/cron/weekly` | `30 0 * * 6` | Sat 06:00 | weekly markets re-rate (Anthropic-forced) |

`admin/*` and one-time SQL files are **not** scheduled — hit manually with `?secret=`.

---

## 3. Data flows

### 3a. Daily snapshot (`lib/snapshotEngine.ts`)
Gather → cluster → `interpretClusters` (theme count bound to cluster count) → `alignToMizuho` (Top-Risks) → `translateLayman` → persist. Escalation: Gemini → sharpened re-ask → Anthropic. **Does not** call `interpretThroughMizuho` (the newer Knowledge Repository lens) — Research-only currently; wiring it in is deferred (master-context §7).

### 3b. Markets (`lib/marketData.ts`, `lib/fred.ts`, `lib/markets.ts`, `lib/riskEngine.ts`)
FRED + Yahoo → `Indicator[]` via `withTrends`. Curated scaffolds in `lib/fallbackData.ts`.

### 3c. What Changed / Top Developments (`lib/overnight.ts`, `lib/riskEngine.ts`, `app/api/dashboard/route.ts`)
- **`buildOvernight(indicators)`** (`lib/overnight.ts`) — ranks ALL tracked indicators by relative magnitude, keeps only `id/label/deltaText/tone` (discards prev/now). `RISK_ON_RISE` map defines the full tracked universe (16 ids: cpi, japancpi, unrate, fedfunds, ust10y, jgb10y, hyspread, vix, move, brent, usdjpy, sp500, nasdaq, nikkei, gold, curve2s10s) and whether a rise is risk-bad/good/neutral per indicator.
- **`components/WhatChanged.tsx`** — the "Show All Indicators" table. Had a **stale hardcoded 7-item whitelist** (`TRACK`) that excluded 9 indicators the movers list already surfaces — fixed in v5.5.1 to the full 16-item set, grouped (rates & inflation / curve / vol & credit / FX & commodities / equities). Also fixed in v5.5.2: `whitespace-nowrap` on the indicator-label and change cells (a table with `table-layout:auto` sizing across many more rows was wrapping some cells), plus an `overflow-x-auto` wrapper as a safety net.
- **`deriveDevelopments(indicators)`** (`lib/riskEngine.ts`) — up to 4 **dynamic**, rules-based "Top Developments" (CPI/UST10Y/HY-spread templates reacting to live values, `derived:true`).
- **`app/api/dashboard/route.ts`** — appends exactly **2 permanently static** curated developments (`dev-geo`, `dev-bank`, `derived:false`, verbatim text) to pad the list to 5. This is the precise, code-verified answer to "are Top Developments static": partially, by design, not a bug.

### 3d. Research analysis (`lib/analyze.ts` `analyzeContent`)
One Gemini/Anthropic call for the editorial-shaped object, then 3 further dedicated calls (non-fatal individually): `alignToMizuho` (Top-Risks), `generateFocus` ("What should I focus on"), **`interpretThroughMizuho`** (the Knowledge Repository lens, §3e).

### 3e. Mizuho Knowledge Repository (`lib/mizuhoKnowledgeData.ts` + `lib/mizuhoKnowledge.ts`) — multi-card since v5.2.1
**Split module**: `mizuhoKnowledgeData.ts` is pure data/types/retrieval, **no server imports**, safe for client components (the Learn reference view imports it directly). `mizuhoKnowledge.ts` is server-only (KV read, the LLM interpret call), re-exports the data module's symbols.

`MIZUHO_KNOWLEDGE = { version, institution, last_updated, cards: MizuhoKnowledgeCard[], executive_questions }`. Four cards currently:
- `core_disclosures` — capital/financials/strategy/risk_philosophy (the original v5.0 content).
- `risk_governance` — Board/Risk Committee/Three Lines/governance cycle (from an uploaded Integrated Report excerpt).
- `risk_management` — RAF cycle + Top Risks by category (Macro&Geopolitical/Operational/Conduct/ESG) + second-order reasoning chains — **note: this is a different, more authoritative Top Risks list than `lib/mizuhoTopRisks.ts`'s curated approximation; the two are not reconciled, flagged as an open nuance.**
- `business_model` — 5 business lines (Retail, Corporate Banking, GCIB, Global Markets, Asset & Wealth Mgmt) + a News→Business mapping table.

**13 domains** (`MIZUHO_DOMAINS`): the original 12 + **Governance** (added with the governance/RAF cards). Each card declares which domains it's tagged to (`card.domains`). `retrieveMizuhoSections(text, knowledge)`: STEP 1 keyword-classify into domains (`DOMAIN_KEYWORDS`) → STEP 2 gather every card tagged to a matched domain (`DOMAIN_CARD_IDS`, derived from `card.domains`) → **the `business_model` card is special-cased to always join once ANY domain matches** (its whole purpose is business-line mapping, relevant regardless of which specific domain triggered). Zero domain matches → skip the LLM call, return an honest "does not map to a disclosed domain" gap.

STEP 3-5 (`interpretThroughMizuho`, server-only): gathers `leadershipQuestions` from every matched card (richer than one fixed list) and grounds `businesses` in the `business_model` card's actual business-line names (not a generic list). Prompt instructed to use ONLY the retrieved card excerpts, prefer disclosure over generic banking knowledge, state a `gap` rather than invent.

Render: `components/intel/MizuhoLensBlock.tsx` — collapsible (default closed), one-line header with a trimmed `v{version} · {month year}` tag, FACT/CONTEXT/INTERPRETATION-styled body. Reused identically on the live Research card and the saved-item card (`SavedList.tsx`) — not duplicated.

Learn reference view: `components/learn/MizuhoReference.tsx` (section 06) — reads `MIZUHO_CARDS` directly (client-safe), renders each card as structured cards (Capital & Liquidity, Financial Profile, Strategy & Targets, Risk Philosophy, Risk Governance, Risk Appetite & Top Risks, Business Model, Executive Questions).

Seeding: `app/api/admin/seed-mizuho/route.ts` (GET, `?secret=<CRON_SECRET>`) idempotently writes `MIZUHO_KNOWLEDGE` (embedded, git-versioned) to KV (`mizuho:knowledge:master`). Re-run after editing the embedded object + deploying, to push a content update without touching every read path.

### 3f. Saved items (`lib/savedStore.ts` + `lib/supabase.ts`)
`getSaved()` / `addSaved()` / `saveUserConcept()`-style upsert / `removeSaved()` / **`getSavedById(id)`** (added for the print view; **throws** on a real Supabase error rather than silently returning null, so a genuine "no such id" is distinguishable from an infra error — v5.3.3) / **`getSavedInRange(from, to)`** (for period-based briefing books, uses the indexed `saved_at` column). Table: `risk_dashboard.saved_items`, structured columns (kind/category/severity/dates) + one authoritative `payload jsonb` (closes the whitelist-fragility bug class — see §9).

### 3g. Briefing books (`lib/briefingBook.ts`, `lib/briefingPacks.ts`, `app/api/briefing/generate/route.ts`)
`BRIEFING_PACKS`: 2 period packs (Monthly = trailing 30 days, Quarterly = trailing 90 days — deliberately not strict calendar boundaries, always has content) + 4 theme packs (Credit Risk / Market Risk / Japan Macro / AI & Technology — keyword-matched via `matchesTheme()` against `category + title + interpretation + whatHappened`, word-boundary-aware for short tokens like "ai" so it doesn't false-positive inside "maintain"/"detail"). `generateBriefingBook(packId)`: query matching items → **two separate dedicated LLM calls** (`generatePreface`, `generateActionItems` — "Actions on me": toLearn/toAsk/toInvestigate) → returns a `BriefingBook`. Not cached — regenerates every open. Rendered at `/print/book?pack=<id>` via `components/print/PrintBook.tsx` (compact per-item entries; full per-item depth is left to that item's own `/print/item` page, to keep a 40-item book readable).

### 3h. Print/PDF (`components/print/*`, `app/print/*`)
Browser-native Print → Save as PDF, not a server-rendered pipeline (deliberate — avoids Puppeteer-class infra on Vercel serverless). `app/print/layout.tsx` forces a light theme (`bg-white text-neutral-900`) independent of the app's dark/light toggle — plain `neutral-*` Tailwind colors, untouched by the theming system. `components/print/PrintActionBar.tsx` — bottom-fixed (not top — collided with the iOS Dynamic Island originally), safe-area-aware, present on **every** page state (loading/error/success) with a working "← Back" (`<a href="/">`, not `window.close()` — unreliable in PWA/standalone contexts) + Print button. `/print/item?id=` (was `/print/[id]/<id>` — moved after ids with colons/dots were failing lookups through the dynamic segment; the old route now redirects). `/print/book?pack=`.

### 3i. Concept Studio (`lib/userConcepts.ts`, `lib/conceptAnalyze.ts`, `app/api/concepts/*`, `components/learn/ConceptStudio.tsx`)
`analyzeConceptText(rawText, termHint?)` — dedicated Gemini call, converts pasted text into the standard `Concept` shape (term/formal/category/aliases/layman/risk/cro), category normalized against the 6 fixed values with a safe fallback (`"Market"`). Full CRUD in `lib/userConcepts.ts` against `risk_dashboard.user_concepts` (own table, own store, mirrors `savedStore.ts`'s pattern). **Deliberately not wired into** `detectConcepts()`, `Linkify`, or the read-only `ConceptLibrary.tsx` — additive-only for this iteration. The list card was originally a display bug (only showed `layman`, though everything was saved correctly — confirmed since Edit correctly reloaded every field) — fixed in v5.5.1 to show formal/risk/cro/aliases too.

### 3j. Dark/Light theming (`components/shared/ThemeProvider.tsx`, `components/learn/AppearanceToggle.tsx`, `tailwind.config.ts`, `app/globals.css`)
Every color token (`ink-*`, `fg`/`fg-muted`/`fg-faint`, `line`/`line-soft`, `calm`/`elevated`/`stress`/`steel`/`mizuho`/`amber`) is a CSS custom property in **RGB-triplet format** (space-separated, no `#`) — required for Tailwind's `bg-x/50`-style opacity modifiers (used extensively) to keep working with variable-based colors. Two blocks in `globals.css`: `.dark` (matches the original look exactly) and `.light` (new, role-preserving design — see master-context §3/§6 for the reasoning). `next-themes` (`attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}` — manual toggle only, no system-follow) toggles the class on `<html>`; `suppressHydrationWarning` is required on `<html>` for this pattern. Toggle UI: Learn → 08 Appearance.

**`amber` token**: discovered during the theming audit that several components referenced `bg-amber/10`/`text-amber` classes that were never actually defined in the original Tailwind config — a pre-existing latent no-op bug, fixed incidentally by defining `amber` (aliased to the same family as `elevated`).

**22 hardcoded dark-only surface colors** were found and fixed during the same pass — whole card backgrounds/borders/text hardcoded to one-off hex (e.g. `bg-[#161226]` for the entire Mizuho lens card) rather than the token system. Left alone these would've rendered as broken dark islands in light mode. Fixed by routing through the existing theme-aware tokens + Tailwind's opacity modifier (`bg-mizuho/10 border-mizuho/25`) instead of inventing new tokens. One deliberately-left exception: `CroConversation`'s "NEW" badge text color is pinned dark against its own solid bright-green fill (self-contained regardless of page theme, correctly left alone). Decorative/categorical accent colors (Mizuho-lens chips, Learn-section dots, briefing-pack colors, ~70 occurrences) are deliberately left constant across themes — normal practice for category branding, not a gap.

**SVG chart colors** (`components/ui.tsx` Sparkline stroke, `components/RiskGauge.tsx` status colors + track fill) can't use Tailwind classes on `stroke`/`fill` attributes — reference the CSS vars directly via `style={{ stroke: "rgb(var(--stress))" }}`.

**Known minor gap**: `viewport.themeColor` (layout.tsx) and the PWA manifest's `theme_color`/`background_color` are static (match dark), can't easily follow a client-side-only theme choice without server-side cookie detection — cosmetic only (iOS status-bar area stays dark-styled even in light mode).

### 3k. App icon / logo (v5.5.1, fallback added v5.5.2)
Source: a 1024×1024 transparent PNG uploaded by Rohit, cropped tightly to its actual content bounding box (there was significant empty margin in the original canvas) before resizing. `app/icon.png` (512, favicon) and `app/apple-icon.png` (180×180, **full-bleed, corners filled with the artwork's own near-black** rather than left transparent — Apple's touch-icon convention expects a solid square since iOS applies its own corner mask; a transparent-cornered source can render oddly) both use Next.js's **file-convention auto-detection** — no manual `<link>`/metadata needed. `public/manifest.json` got a proper `icons` array (192/512, transparent is fine for Android/Chrome) — it had none before v5.5.1. In-app header logo: `public/icons/logo-header.png`, rendered with an **`onError` fallback** to the old "R" badge (added v5.5.2 after the PNG was missed when a bundle was manually applied — a real risk with binary assets in a manual-apply workflow; flag these loudly in future CHANGES docs).

### 3l. Newsletter ingestion → §7 (Python).

---

## 4. `lib/` modules (roles)

`snapshotEngine.ts` (daily) · `llm.ts` (`interpretWithProvider`, Gemini→Anthropic escalation) · `weeklyEngine.ts` (weekly) · `marketData.ts`/`fred.ts`/`markets.ts` (markets) · `riskEngine.ts` (`withTrends`, `deriveDevelopments`) · `overnight.ts` (`buildOvernight`, the risk-direction map) · `fallbackData.ts` (curated scaffolds) · `mizuhoTopRisks.ts` (curated Top-Risks taxonomy — distinct from the repository) · `analyze.ts` (`analyzeContent`) · `focus.ts`/`focusProfile.ts` (`generateFocus`) · `mizuhoKnowledgeData.ts` (client-safe repository data + retrieval) · `mizuhoKnowledge.ts` (server-only reader/interpreter) · `supabase.ts` (server-only client, schema-scoped) · `savedStore.ts` (`SavedItem` CRUD) · `savedMappers.ts` (4 mappers → `SavedItem`) · `userConcepts.ts` (user-concept CRUD) · `conceptAnalyze.ts` (Gemini concept-drafting) · `briefingBook.ts`/`briefingPacks.ts` (compilation) · `concepts.ts` (curated static library — untouched by any of the above) · `researchQuota.ts` · `runStore.ts` · `intelligence.ts` · `relevanceConfig.ts` · `newsAdapter.ts` · `format.ts` · `types.ts`.

---

## 5. `components/` (key ones, roughly by tab/feature)

**Today**: `WhatChanged.tsx` (16-indicator table, nowrap+scroll), `WhatChangedOvernight.tsx`, `TopDevelopments.tsx`, `RiskGauge.tsx`, `intel/CroConversation.tsx`, `intel/EditorialIntelligence.tsx`, `intel/JapanAsiaWatch.tsx`, `intel/RadarSection.tsx`, `RunHistory.tsx`.

**Markets**: `CroDashboard.tsx`, `JapanWatch.tsx`, `RiskHeatMap.tsx`, `EmergingRisks.tsx`, `BankImplications.tsx`.

**Research**: `research/ResearchWorkspace.tsx` (analysis card, progress ring, newsletter panel, print link).

**Learn**: `learn/ConceptLibrary.tsx` (curated, read-only) · `learn/ConceptStudio.tsx` (new, CRUD prototype) · `learn/Linkify.tsx` (term auto-detection in text — curated concepts only) · `intel/WeeklyLearning.tsx` · `learn/MizuhoReference.tsx` · `learn/BriefingBooks.tsx` (the picker) · `learn/AppearanceToggle.tsx` · `saved/SavedList.tsx` (saved-item cards, print link, Mizuho lens).

**Shared/cross-cutting**: `intel/MizuhoLensBlock.tsx` (reused Research + Saved), `shared/AppFooter.tsx` (single source of the footer credits, reused in-app + print), `shared/ProgressRing.tsx` (`theme: "dark"|"light"` prop, time-estimate based), `shared/ThemeProvider.tsx`, `ui.tsx` (Sparkline, Card, SeverityPill, Chip — **a file, not a folder**), `CollapsibleSection.tsx`.

**Print** (own light theme, isolated): `print/PrintItem.tsx`, `print/PrintBook.tsx`, `print/PrintActionBar.tsx`.

---

## 6. Supabase (`risk_dashboard` schema)

**Isolation**: shared Supabase account with another tool ("Orbit") → own Postgres schema, not `public`. Requires **Project Settings → API → Exposed schemas → add `risk_dashboard`** (PostgREST only serves explicitly-exposed schemas) AND explicit grants (`grant all on ... to service_role`, plus `alter default privileges` so future tables in the schema auto-inherit — creating a schema does NOT auto-grant API-role access; this caused a real "permission denied for schema risk_dashboard" incident once, now baked into `schema.sql`/`grants_fix.sql`).

**Tables**:
- `saved_items` — structured columns (kind/category/severity/source_type/saved_at/snapshot_at/analysis_at/article_at) + authoritative `payload jsonb`. The `payload`-as-source-of-truth design is deliberate: closes a bug class hit twice under the old KV approach (a hand-maintained field whitelist silently dropped new `SavedItem` fields — `mizuhoLens`, `articleDate` both did this before the migration).
- `user_concepts` — term/formal/category/aliases(jsonb)/layman/risk/cro/source_text. Simpler, no heavy indexing needed (small personal list).

**Client** (`lib/supabase.ts`): lazy singleton, service-role key only, server-only, never imported into a `"use client"` component. `supabaseAvailable()` gate. If unconfigured, both stores degrade to an **in-memory list** for that server instance (does NOT silently fall back to reading old KV data — avoids two stores quietly diverging).

**Migration route** (`app/api/admin/migrate-saved/route.ts`): idempotent, copies (not moves) the legacy KV `saved:items` blob into Supabase. Uses its **own** `MIGRATION_SECRET` (not `CRON_SECRET`) and **fails closed** if unset — deliberately different from the other admin routes' "allow if unconfigured" convenience, since this one writes real data.

---

## 7. Python extractor — `api/cron-bloomberg.py`

Flow: authorize → IMAP connect → per-sender union search → fetch with **`BODY.PEEK[]`** (never sets `\Seen`) → drop too-old by `LOOKBACK_HOURS` → dedupe (KV, logged on skip) → classify (footer subscription line → subject/alt → body, 3-tier) → extract links + LLM extract (Gemini, Anthropic fallback with `max_tokens=8192` — 4096 truncated large briefings' JSON) → store per-briefing in KV → mark `\Seen` only on process/dedupe/junk → log run. `?force=true` bypasses dedupe. `EXTRA_NEWSLETTERS`/`INGEST_SENDERS`/`LOOKBACK_HOURS` env-driven.

---

## 8. Environment variables (full list, verified against actual `process.env.*` references)

**Next app:** `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_RETRY_MS`, `GEMINI_TIMEOUT_MS`, `DISABLE_GEMINI`, `ANTHROPIC_API_KEY`, `ANTHROPIC_TIMEOUT_MS`, `LLM_MODEL`, `FRED_API_KEY`, `FINNHUB_API_KEY`, `MARKETAUX_API_KEY`, `NEWSDATA_API_KEY`, `ALPHAVANTAGE_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `MIGRATION_SECRET` (own, fail-closed), `RESEARCH_DAILY_CAP` (default 20), `ONBOARDING_PHASE`.

**Python extractor:** `GEMINI_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` (required). `IMAP_HOST`/`IMAP_EMAIL`/`IMAP_PASSWORD` (fallback `AOL_EMAIL`/`AOL_APP_PASSWORD`). `INGEST_SENDERS`, `EXTRA_NEWSLETTERS`, `LOOKBACK_HOURS`. `ANTHROPIC_API_KEY` + `LLM_MODEL`. `CRON_SECRET`.

---

## 9. Gotchas / learnings (don't re-discover these)

- **JSX-text Unicode escapes** (`\uXXXX`) only decode in real JS string contexts — hit repeatedly, always grep before shipping (see §0).
- **A file and a same-named folder collide** (`components/ui.tsx` vs `components/ui/`).
- **Non-public Postgres schemas need explicit API exposure + grants** — two separate failure modes, both hit once (§6).
- **Whitelist-fragility is a recurring bug class** — hand-maintained field lists silently drop new fields. Closed for saved items via `payload jsonb`; watch for the same pattern anywhere else a "reconstruct object from named fields" approach exists (the concept-card display bug was a milder version — fields WERE saved, just not rendered, because the render code independently enumerated fields).
- **Dynamic path segments mangle special-character ids** — ids with colons/dots (ISO timestamps) failed through `/print/[id]/<id>` but worked fine through a query string; moved to `?id=` to match the already-proven pattern.
- **A partial UX fix can reproduce the exact bug it was meant to solve** — the print action-bar fix initially only covered the success state; loading/error states still had no way back. Apply UI-state fixes to *every* state of a page, not just the common path.
- **Time-based progress UI must be labelled honestly** — can't reflect real backend completion for a non-streamed multi-call round-trip.
- **Verify "is X static/dynamic" and "why does Y look wrong" against actual code**, not memory — this has directly produced better, more precise answers than guessing (the Top Developments clarification, the indicator-table bug, the concept-card bug were all diagnosed this way, not assumed).
- **Binary assets get missed in manual-apply workflows** — flag them loudly; add graceful fallbacks (onError) where feasible regardless.
- **`table-layout: auto` column-width fights** — a table gains many more/longer rows and a previously-fine cell can start wrapping; force `whitespace-nowrap` on cells that must stay single-line, add `overflow-x-auto` as a safety net.
- **Word-boundary-aware keyword matching** needed for short tokens ("ai") to avoid false positives inside unrelated words ("maintain", "detail").
- **IMAP `RFC822` fetch sets `\Seen`** — use `BODY.PEEK[]`.
- **Dedupe outlives the digest TTL** (30d vs 36h) — use `?force=true` to re-ingest something already deduped.
- **Repository domain gaps are correct, not bugs** — a domain with no card content yet should surface an honest gap, never an invented context.
- **Python deps in ROOT `requirements.txt`** only.
- **Two categories of limitation Claude cannot work around**: no live Gemini/Anthropic/FRED/Supabase access (validated by build/logic only), and no way to visually verify rendering/contrast (theming, icon crops) — both require the user to run the real thing and report back.

---

## 10. Backlog (queued; not built)

- Wire the Mizuho Knowledge Repository lens into the daily CRO Conversation themes (deferred, master-context §7).
- Make the 2 static "Top Developments" filler items dynamic — rules-based extension vs. new LLM call, Rohit's call pending.
- Merge Concept Studio's user-added concepts into `detectConcepts()`/`Linkify`/the curated Concept Library display.
- Reconcile the two Mizuho Top-Risks systems (curated approximation vs. disclosed-positions repository).
- Optional: backfill `category`/`severity` on saved items from before v5.2 (only new saves are tagged).
- v4.6 "unified intelligence framework" — long-deferred, partially converged via v4.8.0 and the shared Mizuho-lens components.

## 11. Version history (since v5.2.0)

**5.2.1** Mizuho multi-card repository (governance/RAF/business-model cards, 13th domain) · **5.3.0** Print/PDF export + Briefing Books (combined release) · 5.3.1 bottom action bar + print link in Research + back navigation · 5.3.2 print-link placement fix (was buried at card bottom) · 5.3.3 action bar on every print-item state + distinguish real errors from not-found · 5.3.4 `/print/item?id=` (fixes special-char id lookups) · **5.4.0** dark/light theming · **5.5.0** Concept Studio prototype · 5.5.1 concept-card display fix + indicator-table completeness fix + new app logo/icons + Top Developments clarification · 5.5.2 icon fallback + indicator-table nowrap/scroll + Learn section reorder.
