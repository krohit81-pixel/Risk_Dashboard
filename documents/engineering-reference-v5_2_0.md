# Global Risk Intelligence Dashboard — Engineering Reference (v5.2.0)

> Technical companion to `risk-dashboard-master-context-v5_2_0.md`. File-by-file map, data flows, storage schema, env vars, the Python extractor, the validation workflow, and gotchas. Written so a fresh session can modify the codebase safely without re-reading chat history. Supersedes the v4.9.0 pair.

Repo: `github.com/krohit81-pixel/Risk_Dashboard` (public). Stack: Next.js 14 App Router · TypeScript · Tailwind · Vercel KV (Upstash) · **Supabase (Postgres)** · recharts. Deploy: GitHub push → Vercel Pro. Version single-sourced in `lib/version.ts` (`APP_VERSION`) + `package.json`. Current: **5.2.0**.

---

## 0. Build & validation workflow (every change)

Dev env has **no Gemini / Anthropic / FRED / Supabase** live access — those paths are validated by build/logic only; **say so** when a change touches them. For Supabase specifically: the sandbox's network egress allowlist doesn't include Supabase's domain, so schema/migration code can be written and type-checked but never executed live here — the user runs the SQL and triggers the migration route themselves.

```bash
npx tsc --noEmit
npm run build
python3 -m py_compile api/cron-bloomberg.py   # Python extractor only
```

Deliverables → `/mnt/user-data/outputs/v5_x_y/` + a `CHANGES_v5.x.y.md`. Bundle files that would collide by name (e.g. two `route.ts`) are renamed in the bundle (`saved-route.ts`, `migrate-saved-route.ts`, …) with the real destination path noted in CHANGES.

---

## 1. Repo layout (parts that matter)

```
app/api/
  dashboard/route.ts              # Today snapshot to client
  bloomberg/route.ts              # ingested newsletter digests → Research panel
  research/analyze/route.ts       # POST: analyze pasted/URL/image/story
  saved/route.ts                  # saved-items CRUD (now Supabase-backed)
  runs/route.ts                   # generation history
  cron/editorial/route.ts         # daily snapshot
  cron/weekly/route.ts            # weekly markets re-rate
  admin/seed-mizuho/route.ts      # one-time: seed Mizuho repository into KV
  admin/migrate-saved/route.ts    # one-time: migrate saved items KV → Supabase
api/
  cron-bloomberg.py               # PYTHON Vercel Function — newsletter IMAP ingestion
requirements.txt                  # ROOT — Python deps: google-genai, beautifulsoup4, upstash-redis, anthropic
supabase/
  schema.sql                      # DDL — run ONCE in Supabase SQL Editor
lib/                               # engine + data + stores (§4)
components/                        # UI (§5)
vercel.json                        # cron schedules
lib/version.ts                     # APP_VERSION
```

⚠️ **Python deps live in ROOT `requirements.txt`.** Never create `api/requirements.txt` — it shadows the root and breaks the function's deps (hit once, v4.8.0).

⚠️ **`components/ui.tsx` is a file, not a folder.** Don't create a `components/ui/` directory — it collides with the existing `ui.tsx` and risks ambiguous module resolution (hit once while building the progress ring, v5.2.0 — moved to `components/shared/` instead).

---

## 2. Cron schedules (`vercel.json`, UTC)

| Path | UTC | IST | Purpose |
|---|---|---|---|
| `/api/cron/editorial?slot=morning` | `30 22 * * *` | 04:00 | daily snapshot |
| `/api/cron-bloomberg` | `0 0 * * *` | 05:30 | newsletter ingest (AM) |
| `/api/cron-bloomberg` | `30 13 * * *` | 19:00 | newsletter ingest (PM) |
| `/api/cron/weekly` | `30 0 * * 6` | Sat 06:00 | weekly markets re-rate (Anthropic-forced) |

`admin/seed-mizuho` and `admin/migrate-saved` are **not** scheduled — one-time routes, hit manually with `?secret=<CRON_SECRET>`.

---

## 3. Data flows

### 3a. Daily snapshot (`lib/snapshotEngine.ts`)
`generateSnapshot()` → gather → cluster → **`interpretClusters(clusters, indicators, opts)`** (rejects if `themes.length < 3`) → `alignToMizuho()` (Top-Risks) → `translateLayman()` → persist.
- Theme count bound to cluster count; editorial cards optional only when `clusterCount > 3`.
- Escalation: Gemini → re-ask Gemini once (sharpen) → escalate to Anthropic.
- **Does not** currently call `interpretThroughMizuho` — the Mizuho-lens interpretation is Research-only as of v5.2; wiring it into the daily themes is deferred (see master-context §7).

### 3b. Markets (`lib/marketData.ts` `fetchIndicators()`)
FRED (`lib/fred.ts`) + Yahoo (`lib/markets.ts`) → `Indicator[]` via `withTrends` (`lib/riskEngine.ts`). Curated scaffolds in `lib/fallbackData.ts`.

### 3c. Weekly re-rate (`lib/weeklyEngine.ts`)
`buildWeekContext` (week-over-week deltas) + `reRateMarkets` (evidence-driven, not rubber-stamped) + `mergeMarkets` (stamps `reviewedISO`) → `weekly:markets` / `weekly`.

### 3d. Research analysis (`lib/analyze.ts` `analyzeContent(text, meta)`)
One Gemini/Anthropic call returns the editorial-shaped object (title, articleDate, category, severity, horizon, confidence, whatHappened, whyItMatters, firstOrder, secondOrder, bankRiskKind, bankRisk, keyTakeaway, whatToUnderstand, layman twins), then **three further dedicated calls**, all non-fatal on individual failure:
1. `alignToMizuho` — Top-Risks curated-taxonomy alignment (unchanged since v3.9).
2. `generateFocus` — "What should I focus on" (v4.4).
3. **`interpretThroughMizuho`** (v5.0, `lib/mizuhoKnowledge.ts`) — the Mizuho-repository lens; see §3e.

Route `app/api/research/analyze/route.ts`: `extractLeadingUrl(text)` pulls a pasted URL from the first ~600 chars; daily cap via `lib/researchQuota.ts` (`RESEARCH_DAILY_CAP`, default 20).

### 3e. Mizuho Knowledge Repository (`lib/mizuhoKnowledgeData.ts` + `lib/mizuhoKnowledge.ts`) — v5.0/5.1
**Split module**, deliberate:
- **`mizuhoKnowledgeData.ts`** — pure data + types + retrieval logic. **No server-only imports** (no KV, no LLM SDK) — safe to import into client components. Exports: `MIZUHO_KNOWLEDGE` (embedded seed/fallback object), `MizuhoKnowledge` type, `MizuhoLens` type, `retrieveMizuhoSections()`.
- **`mizuhoKnowledge.ts`** — server-only. `getMizuhoKnowledge()` (KV read via `mizuho:knowledge:master`, embedded fallback if unseeded) and `interpretThroughMizuho(facts)` (the dedicated LLM call). Re-exports the data module's symbols so old imports still resolve.

**Flow** (STEP 1-5 per the original spec):
1. **Classify** — `retrieveMizuhoSections()` keyword-matches the article text against `DOMAIN_KEYWORDS` (12 domains: Capital, Liquidity, Credit, Market, Operational Risk, Corporate Banking, Treasury, Wealth Management, Asset Management, Strategy, Financial Results, Regulation, Japan Macro).
2. **Retrieve selectively** — `DOMAIN_SECTIONS` maps each domain to the repository section(s) that cover it; only those sections are pulled into `payload`. Zero domain matches → skip the LLM call entirely, return an honest "does not map to a disclosed domain" lens.
3. **Interpret** — dedicated system/user prompt instructed to use ONLY the retrieved excerpts for context, prefer Mizuho's disclosed positions over generic banking knowledge, and state a `gap` explicitly rather than invent. Returns `context`, `interpretation`, `businesses[]`, `riskStripes[]`, `executives[]`, `impacts[]`, `gap?`.
4. Render keeps **FACT** (the article, rendered above — "What happened · sourced") separate from **MIZUHO CONTEXT · repository** and **INTERPRETATION** (`MizuhoLensBlock`).
5. Repository version/date (`v{version} · {last_updated}`) shown so a stale figure is visibly stale.

Domains with **no dedicated repository section yet** (Operational Risk is the current example — `DOMAIN_SECTIONS["Operational Risk"] = []`) will surface as a repository gap even when the domain itself matches — this is correct behavior per the "never invent" principle, not a bug; it just means the repository needs more content over time.

**Seeding**: `MIZUHO_KNOWLEDGE` is embedded in code (git-versioned source of truth). `app/api/admin/seed-mizuho/route.ts` (GET, `?secret=`) idempotently writes it to KV (`mizuho:knowledge:master`). Re-run after editing `MIZUHO_KNOWLEDGE` + deploying, to push an update without a full redeploy touching every read path. Until seeded, `getMizuhoKnowledge()` transparently falls back to the embedded copy.

### 3f. Saved items (`lib/savedStore.ts` + `lib/supabase.ts`) — v5.2, migrated from KV
See §6 for the full schema/migration story. In short: `getSaved()`/`addSaved()`/`removeSaved()` now read/write a Supabase table (`risk_dashboard.saved_items`) instead of a single KV blob; call signatures are unchanged, so no downstream consumer needed edits.

### 3g. Newsletter ingestion → §7 (Python).

---

## 4. `lib/` modules

`snapshotEngine.ts` (daily) · `llm.ts` (`interpretWithProvider`, Gemini→Anthropic escalation) · `weeklyEngine.ts` (weekly) · `marketData.ts`/`fred.ts`/`markets.ts` (markets) · `riskEngine.ts` (`withTrends`) · `fallbackData.ts` (curated scaffolds) · `mizuhoTopRisks.ts` (curated Top-Risks taxonomy, distinct from the new repository) · **`analyze.ts`** (`analyzeContent`, editorial-shaped output, calls all 3 dedicated interpretation functions) · `focus.ts`/`focusProfile.ts` (`generateFocus`) · **`mizuhoKnowledgeData.ts`** (client-safe repository data + retrieval) · **`mizuhoKnowledge.ts`** (server-only reader/interpreter) · **`supabase.ts`** (server-only Supabase client) · **`savedStore.ts`** (`SavedItem` type + Supabase CRUD) · `savedMappers.ts` (4 mappers: theme/editorial/japan/analysis → `SavedItem`, now threading `category`/`severity`) · `concepts.ts` · `layman.ts` · `researchQuota.ts` · `runStore.ts` · `intelligence.ts` · `overnight.ts` · `relevanceConfig.ts` · `newsAdapter.ts` · `format.ts` · `types.ts`.

**`ResearchAnalysis` (types.ts)**: `title, articleDate?, category?, severity?, horizon?, confidence?, whatHappened, whyItMatters, firstOrder?, secondOrder?, bankRiskKind?, bankRisk?, keyTakeaway?, whatToUnderstand?, bankingImpact, bankingImpactAreas?, mizuhoAlignment, mizuhoLens? (v5.0), relatedConcepts, focus, layman, sourceType, sourceLabel?, originalUrl?, analyzedISO, truncated?, provider`.

**`SavedItem` (savedStore.ts — NOT types.ts; noted because a past CHANGES doc mis-stated this)**: `id, kind, title, category? (v5.2), severity? (v5.2), interpretation, bankingImpact, whyMizuho, sources, savedAtISO, snapshotISO?, sourceType?, sourceLabel?, analysisDateISO?, articleDate? (v4.8.4), mizuhoLens? (v5.0), originalUrl?, relatedConcepts?, focus?, whatHappened?, bankingImpactAreas?, layman?, detail? (SavedDetail)`.

---

## 5. `components/`

- `intel/CroConversation.tsx` — theme cards (collapsed default; `HorizonPill inline` + `PersistenceBadge` top-right). `intel/intelUi.tsx` — shared pills, `UnderstandBlock`. `intel/EditorialIntelligence.tsx`, `intel/JapanAsiaWatch.tsx`. **`intel/MizuhoLensBlock.tsx`** (v5.0/5.1) — "Through Mizuho's lens" render: collapsible (default closed), one-line header with a trimmed `v{version} · {month year}` tag, FACT/CONTEXT/INTERPRETATION-styled body, chip rows for businesses/stripes/impacts/executive-questions, honest gap message when nothing matched. Shared between the Research card and the saved card — reused, not duplicated.
- `CroDashboard.tsx`, `JapanWatch.tsx`, `EmergingRisks.tsx`/`RiskHeatMap.tsx` (render `reviewedISO`), `ui.tsx` (Sparkline, Card, SeverityPill, Chip — **a file, not a folder**, see §1 gotcha).
- **`research/ResearchWorkspace.tsx`** — Newsletters panel (`bbOpen`, default collapsed) + "Analyze your own content" workspace (`wsOpen`, default open). Analysis card in the Editorial format + source/published date + "What should I focus on" + Top-Risks alignment + **`MizuhoLensBlock`**. **v5.2**: renders `ProgressRing` while `loading` (see below). `BloombergPanel`/`BloombergGroup`/`shortLabel()`/newsletter publisher labelling per earlier versions.
- **`saved/SavedList.tsx`** — `sourceChip()` (publisher-aware, retroactively corrects legacy labels), saved analysis renders the editorial format via `detail` + **`MizuhoLensBlock`**, footer shows only the analyzed date.
- **`shared/ProgressRing.tsx`** (NEW, v5.2) — SVG circular progress ring + rotating stage label, used during Research analysis. **Time-estimate based, not a literal backend signal** — `analyzeContent()` is one non-streamed round-trip with several sequential calls inside it, so there's no real per-stage completion signal to read without a streaming refactor. Eases toward 92% over an expected duration (24s text / 34s image) via `92 * (1 - e^(-2.2t/T))`, holds there, snaps to 100% when the real response lands. Labels are timed to roughly track the actual call sequence (interpret → align/focus → Mizuho lens) for informativeness, not measured completion.
- **`learn/MizuhoReference.tsx`** (NEW, v5.1) — Learn section 05. Reads `MIZUHO_KNOWLEDGE` directly from the client-safe data module (no fetch needed) and renders it as structured cards: Capital & Liquidity, Financial Profile, Strategy & Targets, Risk Philosophy, Executive Questions.
- `RunHistory.tsx` — "Newsletter ingestion" heading, no per-run capsule (removed v5.1.0), line shows `processed/found · N skipped · N failed`.

---

## 6. Supabase — saved items (v5.2.0)

**Scope: saved items only.** Daily snapshot / weekly re-rate / newsletter digests remain in Vercel KV — deliberate decision, not yet migrated.

**Isolation**: the Supabase account is shared with another tool ("Orbit"), so everything lives in its own Postgres **schema** — `risk_dashboard` — not the default `public` schema, and not just a table-name prefix. Requires one manual dashboard step beyond running the SQL: **Project Settings → API → "Exposed schemas" → add `risk_dashboard`** (PostgREST only serves explicitly-exposed schemas; skipping this produces a "schema must be one of the following" error even though the table exists).

**Table**: `risk_dashboard.saved_items` (full DDL in `supabase/schema.sql`):
- Structured columns for filtering/sorting: `id (PK), kind, title, category, severity, source_type, saved_at, snapshot_at, analysis_at, article_at`.
- **One authoritative `payload jsonb` column** holding the complete `SavedItem` object, exactly as produced. This is the deliberate fix for a bug class hit twice under the old KV approach: a hand-maintained field whitelist in the save route silently dropped new `SavedItem` fields (`mizuhoLens` in v5.1.1, `articleDate` before that). With `payload` as the single source of truth, a field can't be silently dropped again — the structured columns are a *derived index* over the payload, never a second copy that can drift.
- Indexes on `kind`, `category`, `severity`, `saved_at desc` — the query shapes a future briefing book will need (`WHERE category = 'Credit Risk' AND saved_at > ...`).
- RLS enabled with no policies (defense in depth — blocks the anon/public key if ever exposed client-side; the app only ever uses the service-role key, server-side, which bypasses RLS by design).

**Client** (`lib/supabase.ts`): lazy singleton via `createClient(url, serviceRoleKey)`, `persistSession: false`. `supabaseAvailable()` checks both env vars are set. **Server-only** — never import into a `"use client"` component.

**`savedStore.ts`**: `table(sb)` helper = `sb.schema("risk_dashboard").from("saved_items")` — every query goes through this, not `sb.from(...)` directly, or it'd hit `public.saved_items` (doesn't exist). `itemToRow()`/`rowToItem()` do the structured-columns-derived-from-payload mapping; verified lossless via a round-trip test (a full item including `mizuhoLens` survives byte-for-byte). If Supabase isn't configured, degrades to an **in-memory list** for that server instance (matches the pre-existing `storeAvailable()` honest-degradation pattern) — deliberately does NOT silently fall back to reading the old KV blob, to avoid two stores quietly diverging.

**Migration** (`app/api/admin/migrate-saved/route.ts`, GET + `?secret=`): reads the legacy KV key `saved:items`, upserts (by id) every item into Supabase via `addSaved()`, returns `{found, migrated, failed, backend}`. **Idempotent** — safe to re-run. **Does not delete or modify the KV data** — it's a copy, kept as a backup, not a move.

**Safety cap**: `SAFETY_CAP = 5000` in `getSaved()` — a guard against a runaway save loop, not a real limit (Postgres handles the realistic scale fine). Replaces the old KV blob's hard `CAP = 50`.

---

## 7. Python extractor — `api/cron-bloomberg.py`

**Flow:** authorize → IMAP connect → per-sender `UNSEEN FROM <sender> SINCE <date>` union → fetch each with **`BODY.PEEK[]`** (never sets `\Seen`) → drop too-old by `LOOKBACK_HOURS` → **dedupe** (KV, logged on skip) → classify (`detect_newsletter`) → extract links (`extract_article_links`) → LLM extract (with per-article URL matching) → store per-briefing in KV → mark `\Seen` only on process/dedupe/junk → log run (`processed/skipped/failed`).

- **Classification**: footer subscription line → subject+image alt → body (3-tier, on RAW email). `NEWSLETTER_TYPES` = 5 built-in Bloomberg keys + env extras (`EXTRA_NEWSLETTERS`, comma/semicolon-tolerant) + `bloomberg_other`.
- **Extraction**: source-agnostic prompt, 5-10 main stories, includes articles dated before send date (finews-style bundles), drops ads, attaches `url` per story from `extract_article_links`.
- **`_extract_with_retry`**: Gemini with `TRANSIENT_BACKOFF=[15,35]`s on 503/429/5xx; **Anthropic fallback** (`max_tokens=8192` — 4096 truncated large briefings' dense JSON mid-string, fixed v4.9.0) once if Gemini exhausts; total failure → raise → email left unread → next run retries.
- **Config**: `?force=true` bypasses dedupe. `INGEST_SENDERS`, `EXTRA_NEWSLETTERS`, `LOOKBACK_HOURS`, `IMAP_HOST`/`IMAP_EMAIL`/`IMAP_PASSWORD` all env-driven.

---

## 8. KV keyspace (Upstash) — unchanged scope from v4.9.0, saved items now excluded

| Key | TTL | Contents |
|---|---|---|
| `bloomberg:type:{key}` | 36h | per-briefing digest |
| `bloomberg:type_index` | — | published type keys |
| `bloomberg:analyzed` | 48h | analyzed-headlines persistence |
| `bloomberg:runs` | capped 15 | run records incl. `skipped` |
| `processed_msg:{message_id}` | 30d | dedupe (outlives the 36h digest TTL — use `?force=true` to re-ingest something already deduped) |
| `weekly:markets`, `weekly` | — | weekly re-rate artifacts |
| `snapshot:latest`, `snapshot:index` | — | daily snapshot |
| `mizuho:knowledge:master` | — | the seeded Mizuho Knowledge Repository (v5.0) |
| ~~`saved:items`~~ | — | **legacy** — migrated to Supabase in v5.2; left in place as an untouched backup, no longer read/written by the app |

---

## 9. Environment variables

**Next app:** `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `LLM_MODEL` (opt), `FRED_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `CRON_SECRET`, `RESEARCH_DAILY_CAP` (opt, default 20), **`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`** (v5.2 — required for saved items to persist; app degrades to in-memory-only if absent).

**Python extractor:** `GEMINI_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` (required). `IMAP_HOST`/`IMAP_EMAIL`/`IMAP_PASSWORD` (fallback `AOL_EMAIL`/`AOL_APP_PASSWORD`). `INGEST_SENDERS`, `EXTRA_NEWSLETTERS`, `LOOKBACK_HOURS`. `ANTHROPIC_API_KEY` + `LLM_MODEL` (extractor fallback). `CRON_SECRET`.

---

## 10. Gotchas / learnings

- **Whitelist fragility is a recurring bug class** — hand-maintained field lists silently drop new fields (`mizuhoLens`, `articleDate` both did, v5.1.1). The Supabase `payload jsonb` design (§6) closes this permanently for saved items; be wary of the same pattern anywhere else a "reconstruct object from named fields" approach exists.
- **A file and a same-named folder collide** — don't create `components/ui/` alongside `components/ui.tsx` (hit while building `ProgressRing`; resolved by using `components/shared/` instead).
- **Non-public Postgres schemas need explicit exposure** in Supabase's API settings (Project Settings → API → Exposed schemas) or PostgREST 404s/schema-errors even though the table exists.
- **Time-based progress UI must be labelled honestly** — `ProgressRing` cannot reflect real backend completion for a non-streamed multi-call server round-trip; say so in code comments and don't let it imply more precision than it has.
- **IMAP `RFC822` fetch sets `\Seen`** — use `BODY.PEEK[]`; mark `\Seen` only on explicit process/dedupe/junk.
- **Dedupe outlives the digest** (30d vs 36h) → "picked but not processed" = silent dedupe skip; now logged; `?force=true` re-ingests.
- **Newsletter subjects are unreliable**; the footer subscription line is source-of-truth; mastheads are often images (use alt text).
- **Display staleness keys off ingestion, not content date.**
- **Exact-count hard-fails are fragile** (FRED) → use minimum thresholds.
- **Interpret theme/editorial math**: bind theme count to cluster count to avoid under-production + needless escalation.
- **Alignment/lens/focus each need their own call** — folding into the main interpret call under-produces (learned with Top-Risks alignment; deliberately kept the Mizuho-lens interpretation as a 4th dedicated call for the same reason).
- **Repository domain gaps are correct, not bugs** — a domain with no dedicated repository section (e.g. Operational Risk) should surface an honest gap, never an invented context.
- **Python deps in ROOT `requirements.txt`** only.
- **Two limitations Claude cannot work around from this environment**: no live Gemini/Anthropic/FRED calls, and (new in v5.2) no live Supabase access — schema/migration code is written and type-checked, never executed here. Both require the user to run the real thing and report back.

---

## 11. Backlog (queued; not built)

- **Print/PDF export for saved items** (v5.3, next) — dedicated print-styled route + browser print-to-PDF; explicitly not a server-rendered PDF pipeline initially (heavier infra, cold-start cost on Vercel serverless) — upgradeable later.
- **Briefing books** (v5.4) — Monthly Research Book, Quarterly Executive Brief, themed packs (Credit Risk, Market Risk, Japan Macro, AI & Technology, …) compiled from Supabase-queried saved items + a short AI-written preface (confirmed: not a straight compile). Depends on v5.3's render path and the category/severity/date columns from v5.2. "AI & Technology" is a new category to add, not in the current taxonomy.
- **Wire the Mizuho lens into the daily CRO Conversation themes** — v5.0's deferred half; reuse `interpretThroughMizuho` + `MizuhoLensBlock`. Waiting on Rohit's confidence from Research usage before adding a model call to the daily critical path.
- **Optional: backfill `category`/`severity` on saved items from before v5.2** — not built; only new saves are tagged.

## 12. Version history (since v4.9.0)

**5.0.0** Mizuho Knowledge Repository (Research path) · **5.1.0** lens collapsible/aligned + Learn "Mizuho Reference" + client/server data-module split + newsletter capsule removed · 5.1.1 bug fix — mizuhoLens/articleDate persistence · 5.1.2 cosmetic — Weekly Summary title · **5.2.0** Supabase migration (saved items, schema-isolated) + `category`/`severity` columns + circular progress ring.
