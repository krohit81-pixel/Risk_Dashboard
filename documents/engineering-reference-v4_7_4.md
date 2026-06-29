# Global Risk Intelligence Dashboard — Engineering Reference (v4.7.4)

> Technical companion to `risk-dashboard-master-context-v4_7_4.md`. File-by-file map, data flows, KV schema, env vars, the Python extractor, the validation workflow, and hard-won gotchas. Written so a fresh session can modify the codebase safely without re-reading chat history.

Repo: `github.com/krohit81-pixel/Risk_Dashboard` (public). Stack: Next.js 14 App Router · TypeScript · Tailwind · Vercel KV (Upstash) · recharts. Deploy: GitHub push → Vercel Pro. App version single-sourced in `lib/version.ts` (`APP_VERSION`) + `package.json`, shown in the Today header.

---

## 0. Build & validation workflow (do this every change)

The dev environment has **no Gemini / Anthropic / FRED API keys**, so live model/FRED output cannot be validated here — only compile, build, and deterministic logic. **Always say so** when a change touches a model/FRED path; the user eyeballs the first live run.

```bash
npx tsc --noEmit          # must pass
npm run build             # must pass (Compiled successfully + static pages)
python3 -m py_compile api/cron-bloomberg.py   # must pass (Python extractor)
```

Deliverables are copied to `/mnt/user-data/outputs/v4_x_y/` and presented; the user applies them manually and pushes. Each version ships a `CHANGES_v4.x.y.md` apply guide. **Route files in bundles** named `*-route.ts` must be renamed to `route.ts` in their folder by the user.

---

## 1. Repo layout (the parts that matter)

```
app/api/
  dashboard/route.ts        # assembles + serves the Today snapshot to the client
  bloomberg/route.ts        # serves ingested newsletter digests to the Research panel
  research/analyze/route.ts # POST: run the shared CRO analysis on pasted/URL/image/story
  saved/route.ts            # saved-items CRUD (Learn)
  runs/route.ts             # generation history
  regenerate/route.ts       # manual snapshot regen
  cron/editorial/route.ts   # DAILY snapshot build (slot=morning)
  cron/weekly/route.ts      # WEEKLY markets re-rate
api/
  cron-bloomberg.py         # PYTHON Vercel Function — newsletter IMAP ingestion
requirements.txt            # ROOT — Python deps for the function (google-genai, beautifulsoup4, upstash-redis, anthropic)
lib/                        # engine + data + stores (see §4)
components/                 # UI (see §5)
vercel.json                # cron schedules
lib/version.ts              # APP_VERSION
```

⚠️ **Python deps live in ROOT `requirements.txt`**, not `api/requirements.txt`. Do not create `api/requirements.txt` — a stray one there will shadow the root and break the function's deps. (Bug hit + fixed in v4.7.4.)

---

## 2. Cron schedules (`vercel.json`, UTC)

| Path | Schedule (UTC) | IST | Purpose |
|---|---|---|---|
| `/api/cron/editorial?slot=morning` | `30 22 * * *` | 04:00 daily | Build the day's snapshot |
| `/api/cron-bloomberg` | `0 0 * * *` | 05:30 daily | Newsletter ingest (AM) |
| `/api/cron-bloomberg` | `30 13 * * *` | 19:00 daily | Newsletter ingest (PM) |
| `/api/cron/weekly` | `30 0 * * 6` | Sat 06:00 | Weekly markets re-rate (Anthropic-forced) |

---

## 3. Data flows

### 3a. Daily snapshot (`lib/snapshotEngine.ts`)
`generateSnapshot()` →
1. gather news (adapters) → **cluster**.
2. **`interpretClusters(clusters, indicators, opts)`** — the big editorial call. Returns `{ themes[], editorial[], japanAsia? }`. **Rejects** if `themes.length < 3` (`reason: "invalid_json"`).
   - **v4.7 prompt contract:** theme count is **bound to cluster count** ("one theme per cluster"). Editorial cards are optional and only when `clusterCount > 3` (else return `[]` and use every cluster as a theme). This prevents the old unsatisfiable "3-5 themes + editorial on different clusters" demand on low-cluster days.
   - `opts.sharpen` prepends a corrective instruction for the re-ask.
   - `opts.forceProvider:"anthropic"` forces the fallback.
3. **Escalation ladder (caller):** Gemini → on `invalid_json` from Gemini, **re-ask Gemini once with `sharpen:true`** → if still bad, **escalate to Anthropic** (`forceProvider`). Logs: `re-asking Gemini once (sharpened)`, `escalating to Anthropic`.
4. `alignToMizuho()` (dedicated call — folding alignment into interpret under-produces), `translateLayman()`, persist.

LLM plumbing in `lib/llm.ts` (`interpret` / `interpretWithProvider`): Gemini-first then Anthropic; `ANTHROPIC_MODEL = process.env.LLM_MODEL || "claude-haiku-4-5-20251001"`; transient retry.

### 3b. Markets (`lib/marketData.ts` `fetchIndicators()`)
FRED (`lib/fred.ts`) + Yahoo (`lib/markets.ts` `quote()`) → `Indicator[]` via `withTrends` (`lib/riskEngine.ts`, spreads `...i` so new fields survive).
- `lib/fred.ts`: `yoyHistory` (fetch 27, needs only 13 — **min-threshold, not exact-count**, degrades gracefully), `levelHistory`, `latestReleaseDate` (releases API; CPI release id 10, PCE 21, Employment 50). `Reading` = `{ value, previous, history, observationDate }`.
- `lib/fallbackData.ts`: `INDICATOR_SCAFFOLD` (+ `section: "market"|"release"`, Core PCE scaffold, sample histories), `EMERGING_RISKS` (5 curated ids: inflation/cre/china/geopolitics/privatecredit — intentionally stable), `HEAT_MAP_BASE`, `IMPLICATIONS_BASE`.
- `Indicator` (`lib/types.ts`): adds `cadence` ("Daily"|"Monthly"|"Quarterly"), `section`, `history`, `releaseDateISO`, `observationDate`.

### 3c. Weekly re-rate (`lib/weeklyEngine.ts`)
`generateWeekly()` → `buildWeekContext()` + `reRateMarkets()` + `mergeMarkets()` → `weekly:markets` / `weekly` KV. Anthropic-forced.
- **v4.7 deltas:** `buildWeekContext` indicator lines now include `prev`, `Δ`, and a `w/w` move for `cadence==="Daily"` series (from 4.6 history) — concrete evidence to re-rate against.
- **v4.7 loosened anchor:** `reRateMarkets` system prompt states the spine ratings are **last week's**, to re-evaluate from evidence (move when deltas warrant, don't rubber-stamp), and rewrite each one-line read. Ids/regions stay fixed (spine curated).
- **v4.7 reviewed date:** `mergeMarkets` stamps `reviewedISO` on every `RegionHeat` + `EmergingRisk`. The emerging-risk merge `if (!u) return base;` path intentionally leaves it unset (not reviewed).

### 3d. Newsletter ingestion → see §6 (Python).

---

## 4. `lib/` modules (roles)

- `snapshotEngine.ts` — daily editorial pipeline (§3a).
- `llm.ts` — provider selection + interpret wrappers (Gemini→Anthropic).
- `weeklyEngine.ts` — weekly markets re-rate (§3c).
- `marketData.ts` / `fred.ts` / `markets.ts` — Markets data assembly.
- `riskEngine.ts` — `withTrends` and trend/severity helpers.
- `fallbackData.ts` — curated scaffolds (indicators, emerging risks, heat map, implications).
- `mizuhoTopRisks.ts` — curated Mizuho Top Risks taxonomy (approximation; disclaimer shown in UI).
- `analyze.ts` — shared `analyzeContent()` + `alignToMizuho()` primitives (used by Research + snapshot).
- `snapshotStore.ts` — KV read/write: `kvGet/kvSet/kvSetEx`, Bloomberg readers (`getBloombergAll`, `getBloombergAnalyzed`, `addBloombergAnalyzed`, `getBloombergRuns`), weekly readers, saved-list helpers.
- `savedStore.ts` / `savedMappers.ts` — Learn saved items (`SavedItem`, mappers from theme/analysis incl. `sourceLabel`).
- `concepts.ts` — concept library (curated). `layman.ts` — layman translation. `types.ts` — all shared types.

---

## 5. `components/` (key ones)

- `intel/CroConversation.tsx` — CRO Conversation theme cards. **v4.7:** card collapsed by default (`cardOpen` useState(false)); header is `flex justify-between` with pills left (category/severity/`HorizonPill inline`) and `PersistenceBadge` pinned top-right; inner "Go deeper" toggle preserved.
- `intel/intelUi.tsx` — shared pills. `HorizonPill({ horizon, inline })`: default keeps `ml-auto` (Editorial/Japan rely on it); `inline` drops it (CRO card).
- `intel/EditorialIntelligence.tsx`, `intel/JapanAsiaWatch.tsx` — secondary cards (untouched right-aligned horizon).
- `CroDashboard.tsx` — Markets: "Market Indicators" (daily) vs "Economic Releases" (monthly, "Last released"). `JapanWatch.tsx` — separate component (needs its own sparkline/history wiring).
- `EmergingRisks.tsx` / `RiskHeatMap.tsx` — render `reviewedISO` as "Reviewed <Mon D>".
- `ui.tsx` — `Sparkline` (inline SVG; hex `#F2545B` / `#2DD4A7`), `Card`, etc.
- `research/ResearchWorkspace.tsx` — Research workspace. `BloombergPanel` header now **"Newsletters — today"** (v4.7.4). `BloombergGroup` staleness keys off **`ingested_at`** (≥48h muted; KV TTL is 36h so rarely fires), shows content-age hint `· Nd ago` (v4.7.3).
- `saved/SavedList.tsx` — `sourceChip()` reads `sourceLabel` OR `sources` (old saves) → Bloomberg; `url` → `siteName(originalUrl)` ("CNBC URL", friendly-name map); image → Screenshot; else Pasted. Cards collapsed by default; section accents; kind/source pills.
- `RunHistory.tsx` — `BloombergRunHistory` sub-list under Generation History.

---

## 6. Python extractor — `api/cron-bloomberg.py` (the ingestion engine)

**Flow:** authorize → IMAP connect → per-sender `UNSEEN FROM <sender> SINCE <date>` union → fetch each with **`BODY.PEEK[]`** (never sets `\Seen`) → drop too-old by precise `LOOKBACK_HOURS` cutoff → dedupe (KV) → classify (`detect_newsletter`) → LLM extract → store per-briefing in KV → mark `\Seen` only on process/dedupe/junk → log run.

**Newsletter classification — `detect_newsletter()`** (3-tier, runs on RAW email so masthead/footer survive):
1. **Footer subscription line** regex `subscribed to bloomberg's (.+?) newsletter` — authoritative (beats "More from Bloomberg" promo pollution). Normalises curly apostrophes.
2. Subject + image **alt** text (masthead).
3. Full body text.
`NEWSLETTER_TYPES` = 5 built-in Bloomberg keys (evening/morning × americas/asia + markets_daily), checked **before** env extras, + `bloomberg_other` catch-all.

**Extraction prompt (v4.7.4):** now a source-agnostic **"Financial Newsletter Extraction Agent"** (was Bloomberg-specific). Instructs: populate `today_stories` with the **main featured stories in order of prominence (5-10)**, include articles whose own date differs from the send date (finews bundles a week), drop `ANZEIGE`/`ADVERTORIAL`. Schema returns `source, newsletter_key, newsletter_type, edition, publication_date, subject, lead_editorial, today_stories[], tomorrow_watchlist[], commute_story`. Deterministic metadata (subject, date, key/label, `ingested_at`) is overwritten after the call.

**LLM call — `_extract_with_retry(ai_client, system, user, anth_client=None)`:**
- Gemini (`gemini-2.5-flash`, `response_mime_type=application/json`, temp 0.1) with **transient-aware backoff** `TRANSIENT_BACKOFF=[15,35]`s. `TRANSIENT_MARKERS` = 503/429/500/502/504/unavailable/overloaded/high demand/try again. Fails fast on non-transient.
- **v4.7.4 Anthropic fallback:** after Gemini exhausts (transient spike *or* permanent), if `anth_client` is present, try `_extract_with_anthropic` once (`ANTHROPIC_MODEL`, strips ``` fences, parses JSON). On total give-up, **raise** → caller leaves email **unread** → next run retries. Client init is **guarded**: only if `ANTHROPIC_API_KEY` set and `anthropic` importable, else degrades to no-fallback.

**Config & query flags:**
- `force` query param (`?force=true` / `force=1`) bypasses the dedupe check for backfills.
- `EXTRA_NEWSLETTERS` parser (`_load_extra_newsletters`): JSON array `[{key,label,match[]}]` **or** compact `Label=phrase|phrase` entries separated by **`,` or `;`** (v4.7.1 made it comma-tolerant). Appended to `NEWSLETTER_TYPES`.
- Extractor publishes its known keys to `bloomberg:type_index`; `getBloombergAll()` reads that index (falls back to the static `BLOOMBERG_TYPE_KEYS`) so env-added types render.
- Diagnostic logs: `[bloomberg] N unread candidate(s) … lookback=Xh`, `skipped N email(s) older than Xh`.

---

## 7. KV keyspace (Upstash)

| Key | TTL | Contents |
|---|---|---|
| `bloomberg:type:{key}` | 36h (`LATEST_TTL_HOURS`) | one per-briefing digest; morning/evening coexist; same briefing next day overwrites only its own key |
| `bloomberg:type_index` | — | JSON list of published type keys (incl. env-added) |
| `bloomberg:analyzed` | 48h | analyzed-headlines persistence (survives reload) |
| `bloomberg:runs` | capped 15 | ingestion run records `{run_time, emails_found, processed, failed, newsletter_types[]}` |
| `processed_msg:{message_id}` | 30d | dedupe |
| `weekly:markets`, `weekly` (+ `weekly:latest`) | — | weekly re-rate artifacts |
| `snapshot:latest`, `snapshot:index` | — | daily snapshot |
| `saved:items` | — | Learn saved items |

---

## 8. Environment variables

**Next app:** `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `LLM_MODEL` (optional, default `claude-haiku-4-5-20251001`), `FRED_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `CRON_SECRET`.

**Python extractor (`api/cron-bloomberg.py`):**
- Required: `GEMINI_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`.
- IMAP: `IMAP_HOST` (default `imap.aol.com`), `IMAP_EMAIL`/`IMAP_PASSWORD` (fall back to `AOL_EMAIL`/`AOL_APP_PASSWORD`).
- `INGEST_SENDERS` — comma-separated From-header substrings (default `noreply@news.bloomberg.com`). IMAP search **unions** across all.
- `EXTRA_NEWSLETTERS` — add classification entries (comma/semicolon-separated `Label=phrase|phrase`, or JSON). Current recommended value: `Bloomberg Weekend=bloomberg weekend,finews=finews|where finance meets`.
- `LOOKBACK_HOURS` (default 24) — precise age window; IMAP `SINCE` = `now − (LOOKBACK_HOURS + 24h)` margin.
- `ANTHROPIC_API_KEY` + `LLM_MODEL` — enable/the extractor's Anthropic fallback.
- `CRON_SECRET` — auth (`Authorization: Bearer <secret>` or `?secret=<secret>` in path).

---

## 9. Gotchas / learnings (don't re-discover these)

- **IMAP `RFC822` fetch sets `\Seen`** as a side effect → an email skipped by the age check still gets consumed. Use **`BODY.PEEK[]`**; mark `\Seen` only on explicit process/dedupe/junk. (v4.7.2.)
- **Newsletter subject lines are unreliable** (creative headlines like "AI freakout"); the **footer subscription line** is the source-of-truth. Mastheads are often **images** (`get_text` misses them; use alt text). (v4.5.3.)
- **finews-style multi-day bundles:** "today only" extraction yields one story; prompt must capture all featured articles. (v4.7.4.)
- **Display staleness must key off ingestion, not content date** — weekly briefings are legitimately a few days old. KV 36h TTL is the real freshness gate. (v4.7.3.)
- **Exact-count hard-fails are fragile** (FRED CPI needed exactly 14 obs → silent sample fallback). Use a **minimum threshold** (13 of 27). (v4.6.0.)
- **Gemini reasoning-token trap:** hidden reasoning tokens eat the output budget and truncate JSON → slow Anthropic fallbacks. Account for it in prompt/budget design.
- **Interpret theme/editorial math:** binding theme count to cluster count avoids unsatisfiable prompts that cause Gemini under-production + needless escalation. (v4.7.0.)
- **Alignment needs its own call** — folding it into interpret under-produces. (`alignToMizuho()`.)
- **Empty-state detection** of "no news" is highly variable phrasing → multi-pattern regex, tested against true-empty *and* real narratives (false-positive guards).
- **UI anti-patterns to avoid:** per-card repeated caveats; accidental affordances near frequently-used controls; sections rendering empty/N/A; redundant expand/collapse controls; double `ml-auto` in a flex row (floats the middle element — caused the risk-horizon mis-alignment).
- **Python deps in ROOT `requirements.txt`** only (no `api/requirements.txt`).
- **Recurring Gemini 503 high-demand spikes** are expected; the extractor now has an Anthropic fallback, and on total failure leaves mail unread to self-heal next run.

---

## 10. Versions since this doc's predecessor (v4.5.3)

4.5.4 transient backoff · 4.5.5 edition labels/collapsible groups · 4.5.6 saved collapsed · **4.6.0** live CPI+Core PCE / Markets-Releases split / sparklines · 4.6.1 Japan sparkline + Learn colours · **4.7.0** weekly deltas + reviewed dates + CRO collapse/align + source labels + configurable ingest + fewer escalations · 4.7.1 horizon inline + comma parsing + configurable lookback · 4.7.2 `BODY.PEEK` · 4.7.3 ingestion-based staleness + `force` · **4.7.4** "Newsletters — today" + multi-story extraction + extractor Anthropic fallback.
