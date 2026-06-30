# Global Risk Intelligence Dashboard — Engineering Reference (v4.8.4)

> Technical companion to `risk-dashboard-master-context-v4_8_4.md`. File-by-file map, data flows, KV schema, env vars, the Python extractor, the validation workflow, and gotchas. Written so a fresh session can modify the codebase safely without re-reading chat history. Supersedes the v4.7.4 pair.

Repo: `github.com/krohit81-pixel/Risk_Dashboard` (public). Stack: Next.js 14 App Router · TypeScript · Tailwind · Vercel KV (Upstash) · recharts. Deploy: GitHub push → Vercel Pro. Version single-sourced in `lib/version.ts` (`APP_VERSION`) + `package.json`, shown in the Today header. Current: **4.8.4**.

---

## 0. Build & validation workflow (every change)

Dev env has **no Gemini / Anthropic / FRED keys** → live model/FRED output can't be validated here; **say so** when a change touches those paths.

```bash
npx tsc --noEmit          # must pass
npm run build             # must pass
python3 -m py_compile api/cron-bloomberg.py   # must pass (Python extractor)
```

Deliverables → `/mnt/user-data/outputs/v4_x_y/` + a `CHANGES_v4.x.y.md`. User applies manually and pushes. Bundle files named `*-route.ts` must be renamed to `route.ts` in their folder by the user.

---

## 1. Repo layout (parts that matter)

```
app/api/
  dashboard/route.ts            # Today snapshot to client
  bloomberg/route.ts            # ingested newsletter digests → Research panel
  research/analyze/route.ts     # POST: analyze pasted/URL/image/story (extractLeadingUrl lives here)
  saved/route.ts                # Learn saved-items CRUD
  runs/route.ts                 # generation history
  cron/editorial/route.ts       # daily snapshot
  cron/weekly/route.ts          # weekly markets re-rate
api/
  cron-bloomberg.py             # PYTHON Vercel Function — newsletter IMAP ingestion
requirements.txt                # ROOT — Python deps: google-genai, beautifulsoup4, upstash-redis, anthropic
lib/                            # engine + data + stores (§4)
components/                     # UI (§5)
vercel.json                     # cron schedules
lib/version.ts                  # APP_VERSION
```

⚠️ **Python deps live in ROOT `requirements.txt`.** Never create `api/requirements.txt` — it shadows the root and breaks the function's deps.

---

## 2. Cron schedules (`vercel.json`, UTC)

| Path | UTC | IST | Purpose |
|---|---|---|---|
| `/api/cron/editorial?slot=morning` | `30 22 * * *` | 04:00 | daily snapshot |
| `/api/cron-bloomberg` | `0 0 * * *` | 05:30 | newsletter ingest (AM) |
| `/api/cron-bloomberg` | `30 13 * * *` | 19:00 | newsletter ingest (PM) |
| `/api/cron/weekly` | `30 0 * * 6` | Sat 06:00 | weekly markets re-rate (Anthropic-forced) |

---

## 3. Data flows

### 3a. Daily snapshot (`lib/snapshotEngine.ts`)
`generateSnapshot()` → gather → cluster → **`interpretClusters(clusters, indicators, opts)`** (rejects if `themes.length < 3`) → `alignToMizuho()` → `translateLayman()` → persist.
- Theme count bound to cluster count; editorial cards optional only when `clusterCount > 3`.
- `opts.sharpen` (corrective re-ask), `opts.forceProvider:"anthropic"`.
- Escalation: Gemini → re-ask Gemini once (sharpen) → escalate to Anthropic.
- `lib/llm.ts`: `ANTHROPIC_MODEL = process.env.LLM_MODEL || "claude-haiku-4-5-20251001"`; Gemini-first, transient retry.

### 3b. Markets (`lib/marketData.ts` `fetchIndicators()`)
FRED (`lib/fred.ts`) + Yahoo (`lib/markets.ts`) → `Indicator[]` via `withTrends` (`lib/riskEngine.ts`, spreads `...i`). `fred.ts`: `yoyHistory` (min-threshold, degrades), `levelHistory`, `latestReleaseDate` (release ids CPI 10 / PCE 21 / Employment 50). `Indicator` carries `cadence`, `section`("market"|"release"), `history`, `releaseDateISO`, `observationDate`. Curated scaffolds in `lib/fallbackData.ts` (5 emerging-risk ids, heat map, implications).

### 3c. Weekly re-rate (`lib/weeklyEngine.ts`)
`buildWeekContext` (indicator lines include `prev` / `Δ` / `w/w` for daily series) + `reRateMarkets` (spine ratings = last week's, re-evaluate from evidence, don't rubber-stamp; ids/regions fixed) + `mergeMarkets` (stamps `reviewedISO` on every region + emerging risk) → `weekly:markets` / `weekly`.

### 3d. Research analysis (`lib/analyze.ts` `analyzeContent(text, meta)`)  ← reshaped in v4.8
Single Gemini/Anthropic call returns the **editorial-shaped** object, then dedicated `alignToMizuho` + `generateFocus` calls (≈2 LLM calls/analysis). Produced + validated fields:
- `title`, `articleDate` (v4.8.4 — ISO; normalized via `normalizeDate`, else `dateFromUrl(originalUrl)`, else undefined → UI falls back to analyzed date), `category`, `severity` (`normalizeSeverity`), `horizon` (`normalizeHorizon`), `confidence` (`normalizeConfidence`).
- `whatHappened` (sourced), `whyItMatters` (interpretation), `firstOrder`, `secondOrder`, `bankRiskKind` (`canonRiskKind` → Credit/Market/Liquidity & funding/Capital/Operational/Strategic), `bankRisk`, `keyTakeaway`, `whatToUnderstand` (learning), layman twins.
- Derived: `bankingImpact` combined string (`{kind}: {risk}`) for back-compat/alignment input; `bankingImpactAreas` single entry; `mizuhoAlignment`; `relatedConcepts` (`detectConcepts`, curated only); `focus` (v4.4, "What should I focus on").
- Helpers in `analyze.ts`: `normalizeDate` (rejects bare numbers / <6 chars / junk), `dateFromUrl` (`/YYYY/MM/DD/`), `canonRiskKind`, `normalizeSeverity/Horizon/Confidence`.
- Route `app/api/research/analyze/route.ts`: `extractLeadingUrl(text)` pulls the first http(s) URL from the first ~600 chars of pasted text → `meta.originalUrl`; daily cap via `lib/researchQuota.ts` `RESEARCH_DAILY_CAP` (default **20**, env-overridable).

### 3e. Newsletter ingestion → §6.

---

## 4. `lib/` modules

`snapshotEngine.ts` (daily) · `llm.ts` (providers) · `weeklyEngine.ts` (weekly) · `marketData.ts`/`fred.ts`/`markets.ts` (markets) · `riskEngine.ts` (`withTrends`) · `fallbackData.ts` (curated scaffolds) · `mizuhoTopRisks.ts` (taxonomy) · **`analyze.ts`** (shared `analyzeContent` + `alignToMizuho`; editorial-shaped output) · `focus.ts` (`generateFocus`) · `snapshotStore.ts` (KV: `kvGet/kvSet/kvSetEx`, Bloomberg readers incl. `getBloombergAll` reading `bloomberg:type_index`, weekly readers, saved helpers) · `savedStore.ts` (`SavedItem`, `SavedDetail`) · **`savedMappers.ts`** (`savedFromAnalysis` maps editorial fields into `detail` + `articleDate`; `savedFromEditorial`) · `concepts.ts` · `layman.ts` · `researchQuota.ts` · `types.ts`.

**`ResearchAnalysis` (types.ts)** now carries: `title, articleDate?, category?, severity?, horizon?, confidence?, whatHappened, whyItMatters, firstOrder?, secondOrder?, bankRiskKind?, bankRisk?, keyTakeaway?, whatToUnderstand?, bankingImpact, bankingImpactAreas?, mizuhoAlignment, relatedConcepts, focus, layman, sourceType, sourceLabel?, originalUrl?, analyzedISO, truncated?, provider`.
**`SavedItem`** gained `articleDate?` (v4.8.4); `BloombergStory` gained `url?` (v4.8.0); `BloombergRun` gained `skipped?` (v4.8.2).

---

## 5. `components/`

- `intel/CroConversation.tsx` — theme cards (collapsed default; header `justify-between`, `HorizonPill inline` + `PersistenceBadge` top-right). `intel/intelUi.tsx` — `HorizonPill({horizon, inline})` (inline drops `ml-auto`), `UnderstandBlock`. `intel/EditorialIntelligence.tsx`, `intel/JapanAsiaWatch.tsx`.
- `CroDashboard.tsx` — Markets split. `JapanWatch.tsx` — separate. `EmergingRisks.tsx`/`RiskHeatMap.tsx` — render `reviewedISO`. `ui.tsx` — `Sparkline`, `Card`, `SeverityPill`, `Chip`.
- **`research/ResearchWorkspace.tsx`** —
  - Two collapse states: `bbOpen` (Newsletters panel, **default false** v4.8.4), `wsOpen` ("Analyze your own content" workspace, **default true** v4.8.4).
  - Analysis result rendered in the **Editorial card format** + source/published date line at top (`articleDate ? "Published …" : "Analyzed …"`) + "What should I focus on" (`FocusBlock`) + Mizuho alignment below + disclaimer.
  - `BloombergPanel` header "Newsletters — today"; `BloombergGroup` per-briefing collapsible (default collapsed), `shortLabel()` trims briefing names ("Evening Briefing — Americas" → "Americas — Eve"), staleness keyed off `ingested_at` (≥48h muted), date-only label.
  - `BloombergStoryRow` shows "Analyze this →" + "Read article ↗" when `story.url` present.
- **`saved/SavedList.tsx`** — `sourceChip()`: Bloomberg (from `sourceLabel`||`sources`) → site-name URL tag when `originalUrl` present (covers pasted-with-URL) → Screenshot → Pasted. Saved analysis renders editorial format (via `detail`), a "Read article ↗" link + source/published date line; footer shows only the analyzed date.
- **`RunHistory.tsx`** — `BloombergRunHistory`: heading **"Newsletter ingestion"**, badge **"newsletter"**, line shows `processed/found · N skipped · N failed`.

---

## 6. Python extractor — `api/cron-bloomberg.py`

**Flow:** authorize → IMAP connect → per-sender `UNSEEN FROM <sender> SINCE <date>` union → fetch each with **`BODY.PEEK[]`** (never sets `\Seen`) → drop too-old by `LOOKBACK_HOURS` cutoff → **dedupe** (KV) → classify (`detect_newsletter`) → extract links (`extract_article_links`) → LLM extract → store per-briefing in KV → mark `\Seen` only on process/dedupe/junk → log run.

- **Classification** (`detect_newsletter`, 3-tier on RAW email): footer subscription line `subscribed to bloomberg's (.+?) newsletter` → subject+image alt → body. `NEWSLETTER_TYPES` = 5 built-in Bloomberg keys + env extras + `bloomberg_other`.
- **Extraction prompt** (source-agnostic "Financial Newsletter Extraction Agent"): main featured stories 5-10, include articles dated before send date (finews bundles a week), drop ads. Story schema includes **`url`** (v4.8.0); `links_block` of `(anchor_text → href)` from `extract_article_links` is appended so the model attaches each story's URL.
- **`_extract_with_retry(ai_client, system, user, anth_client=None)`**: Gemini (`gemini-2.5-flash`, JSON) with `TRANSIENT_BACKOFF=[15,35]`s on 503/429/5xx; fail-fast on permanent; **Anthropic fallback** (`_extract_with_anthropic`, `ANTHROPIC_MODEL`) once if Gemini exhausts; on total give-up raises → email left unread → next run retries. Anthropic client init is guarded (needs `ANTHROPIC_API_KEY` + `anthropic` package).
- **Config / flags:** `?force=true` bypasses dedupe (backfills). `EXTRA_NEWSLETTERS` parser accepts `,` or `;` separators (`Label=phrase|phrase`) or JSON. Extractor publishes its key set to `bloomberg:type_index`.
- **Logging (v4.8.2):** `[bloomberg] N unread candidate(s) … lookback=Xh`; per-candidate `skip — already processed (use ?force=true)` / `skip — empty body` / `extracting "<subject>" → <label>`; `run done: processed=X skipped=Y failed=Z`. Run record includes `processed`, `skipped`, `failed`, `newsletter_types`.

---

## 7. KV keyspace (Upstash)

| Key | TTL | Contents |
|---|---|---|
| `bloomberg:type:{key}` | 36h | per-briefing digest (morning/evening coexist) |
| `bloomberg:type_index` | — | JSON list of published type keys (incl. env-added) |
| `bloomberg:analyzed` | 48h | analyzed-headlines persistence |
| `bloomberg:runs` | capped 15 | run records `{run_time, emails_found, processed, skipped, failed, newsletter_types[]}` |
| `processed_msg:{message_id}` | 30d | dedupe |
| `weekly:markets`, `weekly` | — | weekly re-rate artifacts |
| `snapshot:latest`, `snapshot:index` | — | daily snapshot |
| `saved:items` | — | Learn saved items |

⚠️ **Dedupe TTL (30d) > digest TTL (36h):** an email ingested >~1.5 days ago is "done" (deduped) but its digest has expired — it won't redisplay and a normal re-run **skips it silently** (now logged). Use `?force=true` (+ mark unread) to re-ingest. Fine in steady state because each day's briefing is a new message-id.

---

## 8. Environment variables

**Next app:** `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `LLM_MODEL` (opt), `FRED_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `CRON_SECRET`, `RESEARCH_DAILY_CAP` (opt; default 20 — **env overrides code**).

**Python extractor:** required `GEMINI_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`. IMAP: `IMAP_HOST` (default `imap.aol.com`), `IMAP_EMAIL`/`IMAP_PASSWORD` (fallback `AOL_EMAIL`/`AOL_APP_PASSWORD`). `INGEST_SENDERS` (comma-sep From substrings; default Bloomberg; IMAP search unions). `EXTRA_NEWSLETTERS` (current: `Bloomberg Weekend=bloomberg weekend,finews=finews|where finance meets`). `LOOKBACK_HOURS` (default 24; IMAP `SINCE` = now − (LOOKBACK_HOURS+24h)). `ANTHROPIC_API_KEY` + `LLM_MODEL` (extractor fallback). `CRON_SECRET`.

---

## 9. Gotchas / learnings

- **IMAP `RFC822` fetch sets `\Seen`** — use **`BODY.PEEK[]`**; mark `\Seen` only on explicit process/dedupe/junk.
- **Dedupe outlives the digest** (30d vs 36h) → "picked but not processed" = silent dedupe skip. Now logged; `?force=true` re-ingests.
- **Newsletter subjects are unreliable**; the **footer subscription line** is source-of-truth; mastheads are often **images** (use alt text).
- **finews-style bundles:** "today only" extraction yields one story → prompt captures all featured articles.
- **Display staleness keys off ingestion, not content date** (weekly briefings are legitimately a few days old; 36h TTL is the real gate).
- **Exact-count hard-fails are fragile** (FRED) → use minimum thresholds.
- **Interpret theme/editorial math:** bind theme count to cluster count to avoid under-production + needless Anthropic escalation.
- **Alignment needs its own call** — folding into interpret under-produces.
- **Gemini reasoning-token trap** can truncate JSON; account for it in budget/prompt.
- **Recurring Gemini 503 spikes** are expected; extractor + app both have Anthropic fallback; on total failure mail is left unread to self-heal.
- **UI anti-patterns:** per-card repeated caveats; accidental affordances near common controls; empty/N/A sections; redundant expand/collapse; **double `ml-auto`** in a flex row (floats the middle element — caused the risk-horizon mis-align).
- **Date parsing** (`normalizeDate`): reject bare numbers / <6-char / junk so a stray token can't masquerade as a publication date.
- **Python deps in ROOT `requirements.txt`** only.

---

## 10. Version history (since v4.5.3)

4.5.4 transient backoff · 4.5.5 edition labels/collapsible groups · 4.5.6 saved collapsed · **4.6.0** live CPI+Core PCE / Markets-Releases split / sparklines · 4.6.1 Japan sparkline + Learn colours · **4.7.0** weekly deltas + reviewed dates + CRO collapse/align + source labels + configurable ingest + fewer escalations · 4.7.1 horizon inline + comma parsing + configurable lookback · 4.7.2 `BODY.PEEK` · 4.7.3 ingestion-based staleness + `force` · 4.7.4 "Newsletters — today" + multi-story extraction + extractor Anthropic fallback · **4.8.0** newsletter per-article URLs + collapse + quota 20 + **Research → Editorial format** · 4.8.1 saved research keeps editorial format + trimmed headers + footer date · 4.8.2 dedupe/empty skip logging + skipped count · 4.8.3 pasted-URL capture (Read article + tag) + workspace collapse · **4.8.4** collapse defaults + "Newsletter ingestion" rename + **article source date**.
