# Global Risk Intelligence Dashboard — Engineering Reference (v5.14.2)

> Technical companion to `risk-dashboard-master-context-v5_14_2.md`. File-by-file map, data flows, storage schema, env vars, the Python extractor, validation workflow, and gotchas. Written so a fresh session can modify the codebase safely without re-reading chat history. Supersedes the v5.10.2 pair — twelve release-lines shipped since then (v5.10.3–v5.14.1): earnings-refresh diagnostics, a responsive iPad/macOS shell + iOS safe-area fix, a full app-icon/logo replacement saga (five iterations), the Research "Simple explanation / Original text" + Full-vs-Share PDF export feature and its five polish rounds, the Markets tab risk-themes merge, the Daily Risk Brief email pipeline (built, verified, then put on hold behind a switch), and a new Indian Market — Metals section on Markets. Produced this time by reading the live repository and git history directly (this session has real git/file access, unlike the constrained environment the v5.10.2 pair was written from) rather than from a prior doc pair or chat memory.

Repo: `github.com/krohit81-pixel/Risk_Dashboard` (public). Stack: Next.js 14 App Router · TypeScript · Tailwind (CSS-variable-based theming) · Vercel KV (Upstash) · **Supabase (Postgres)** · `@react-pdf/renderer` (server-side PDF, v5.11+) · `nodemailer` (SMTP send, v5.13+) · next-themes. Deploy: GitHub push → Vercel Pro (`vercel --prod`). Version single-sourced in `lib/version.ts` (`APP_VERSION`) + `package.json`. Current: **5.14.2**.

---

## 0. Build & validation workflow (every change)

```bash
npx tsc --noEmit     # the actual bar for "done" in this repo — see CLAUDE.md
npm run build         # requires live env vars or can hang on data-fetching in a sandboxed env
python3 -m py_compile api/cron-bloomberg.py   # Python extractor only
```

This session's working pattern (Claude Code, not the constrained `/mnt/user-data/outputs` bundle workflow the v5.5.2/v5.10.2 doc pairs were written under): edit files directly in the working tree, verify with `tsc --noEmit` (`rm -rf .next` first if a stale build-info cache produces false errors from deleted test routes), then the standard git pipeline — feature branch → commit (multi-paragraph message) → `git checkout main` → `git merge --no-ff` → re-verify `tsc --noEmit` → `git push origin main` → delete the branch → `vercel --prod --yes`.

**Verification for server-only code with no local LLM/Supabase keys**: build a temporary, **non-underscore-named** API route (`app/api/_foo/route.ts` is silently excluded from Next.js routing — hit this twice this session) that exercises the real code path against `curatedSnapshot()` (no-network fallback data), hit it via `curl` against `npm run dev`, inspect the result (the `Read` tool parses PDFs directly), then delete the test route before committing.

**`components/ui.tsx` is a file, not a folder** — don't create `components/ui/`, it collides (carried forward from the v5.10.2 doc, still true).

---

## 1. Repo layout (parts that matter, changes since v5.10.2 marked)

```
app/api/
  dashboard/route.ts                    # Today snapshot to client; NOW also fetches indianMetals (v5.14.0)
  bloomberg/route.ts                    # ingested newsletter digests → Research panel
  research/analyze/route.ts             # POST: analyze pasted/URL/image/story
  saved/route.ts                        # saved-items CRUD (Supabase) + ?id= single lookup
  runs/route.ts                         # generation history
  cron/editorial/route.ts               # daily snapshot; NOW also best-effort builds+emails the
                                         #   Daily Risk Brief PDF after a successful save (v5.13,
                                         #   ON HOLD by default since v5.13.2 — see §3o)
  cron/weekly/route.ts                  # weekly markets re-rate
  admin/seed-mizuho/route.ts            # one-time: seed Mizuho repository into KV
  admin/migrate-saved/route.ts          # one-time: migrate saved items KV → Supabase
  concepts/route.ts                     # user-concept CRUD (Supabase)
  concepts/analyze/route.ts             # Gemini: pasted text → draft concept
  briefing/generate/route.ts            # compile a briefing book (query + 2 LLM calls)
  bank-earnings/route.ts                # GET: curated baseline + KV overlay, merged
  bank-earnings/refresh/route.ts        # POST refresh (now returns per-bank skip reasons, v5.10.3)
app/print/
  item/page.tsx                         # single saved-item print view; NOW reads ?mode=full|share
                                         #   (v5.11.1) to set the export version at the point of action
  book/page.tsx                         # briefing-book print view
  [id]/page.tsx                         # LEGACY redirect to /print/item?id=
  layout.tsx                            # forces light theme under /print
app/icon.png, app/apple-icon.png        # v5.11.5 "RisK Intel" mark (radar/magnifying-glass), white bg
public/icons/                           # icon-192.png, icon-512.png — same v5.11.5 mark;
                                         #   logo-header.png DELETED v5.10.8 (header is text-only now)
api/
  cron-bloomberg.py                     # PYTHON Vercel Function — newsletter IMAP ingestion
requirements.txt                        # ROOT — Python deps
supabase/                               # schema.sql, grants_fix.sql, add_user_concepts.sql
documents/                              # architecture docs + Mizuho knowledge-card source markdown
lib/                                    # engine + data + stores (§4)
components/                             # UI (§5)
vercel.json                             # cron schedules — UNCHANGED since v5.5.2 (§2)
lib/version.ts                          # APP_VERSION
```

**New top-level additions since v5.10.2**: `lib/dailyBriefPdf.tsx` + `lib/dailyBriefEmail.ts` (Daily Risk Brief, §3o) and `lib/indianMetals.ts` + `components/IndianMetals.tsx` (Indian Market — Metals, §3p). No new Supabase tables, no new top-level directories, no new dependencies beyond `@react-pdf/renderer` and `nodemailer` (both added for the Daily Risk Brief feature — see §3o).

---

## 2. Cron schedules (`vercel.json`, UTC)

| Path | UTC | IST | Purpose |
|---|---|---|---|
| `/api/cron/editorial?slot=morning` | `30 22 * * *` | 04:00 | daily snapshot (+ Daily Risk Brief email attempt, gated — §3o) |
| `/api/cron-bloomberg` | `0 0 * * *` | 05:30 | newsletter ingest (AM) |
| `/api/cron-bloomberg` | `30 13 * * *` | 19:00 | newsletter ingest (PM) |
| `/api/cron/weekly` | `30 0 * * 6` | Sat 06:00 | weekly markets re-rate (Anthropic-forced) |

**Unchanged since v5.5.2 — re-verified against the current `vercel.json` for this refresh.** Worth flagging explicitly (came up this session, user-facing question): there is genuinely only **one** scheduled editorial run per day (morning). `lib/snapshotStore.ts`'s `slotForNow()`/`slotLabel()` and the cron route's own header comment still say "two slots/day" — that's stale wording from an earlier design, not a live evening trigger; flagged to the user as a minor doc inconsistency, not yet cleaned up (offered, not actioned — see §10).

---

## 3. Data flows

*(§3a–§3n carried forward unchanged from the v5.10.2 doc — daily snapshot, markets, What Changed/Top Developments, Research analysis, Mizuho Knowledge Repository, saved items, briefing books, print/PDF, concept system, theming, app icon/logo, newsletter ingestion, Bank Earnings suite, Mizuho Q1 Earnings. Re-verified spot-checks below where this refresh cycle touched them; full detail in the v5.10.2 doc if not repeated here.)*

### 3c-update. Top Developments now shares one function with the Daily Risk Brief PDF
`buildDevelopments(indicators)`, extracted from `app/api/dashboard/route.ts` into `lib/riskEngine.ts` (v5.13.0) — data-derived first (`deriveDevelopments`, up to 4), then the same 2 curated geopolitics/banking filler items, capped at 5. Both the live Home tab and the emailed PDF now call this one function, so "Top Developments" can no longer drift between the two surfaces (previously the PDF would have needed its own hand-copy).

### 3m-update. Bank Earnings — v5.10.3 diagnostics fix
A live refresh once returned "15 checked · 6 with news · 0 updated" with no way to tell why real news for a bank (DBS) didn't produce an update. Root cause: the extraction prompt told the model to **omit** any bank it couldn't confirm from the `results` array entirely, so a reason (if the model even formed one) was structurally unreachable. Fixed by requiring the model to return every qualified bank either way — `hasNewQuarter: boolean` + a short `notConfirmedNote` when false — and giving the separate "returned true but failed schema validation" path its own `explainInvalid()` reason instead of a silent drop. Both reasons now flow into `RefreshSummary.skipped` → `RunRecord.detail` → a secondary line under the run row in `RunHistory.tsx` (truncated, hover tooltip — same guard shape as `ReactionPill`). **General lesson recorded in CLAUDE.md**: any engine in this repo that can silently accept-or-drop a per-item result should always capture *why* a drop happened, not just that it happened.

### 3o. Daily Risk Brief email (v5.13.0 → v5.13.2, currently ON HOLD)
New pipeline: after the daily cron (`app/api/cron/editorial/route.ts`) saves a snapshot successfully, `sendDailyBriefBestEffort()` best-effort-builds a PDF covering the same content as the Home tab — Daily Risk Brief, What Changed, Top Developments, CRO Conversation (full "Go deeper" layer as of v5.13.1), Editorial Intelligence, Japan & Asia Watch, Also on the Radar (hyperlinked to source as of v5.13.1) — and emails it via `lib/dailyBriefEmail.ts` to `DAILY_BRIEF_RECIPIENT_EMAIL`.

- **PDF engine is `@react-pdf/renderer`, not headless Chromium** — explicitly chosen (via a scoped `AskUserQuestion` at build time) over Puppeteer to avoid a ~50MB Chromium dependency and a browser-launch step in a serverless cron function. `lib/dailyBriefPdf.tsx` is a **separate** layout in react-pdf's own `StyleSheet.create()` API (points-based, camelCase), hand-matched to `app/globals.css`'s `.light` theme RGB tokens — no shared source with the Tailwind app, a future palette change must be mirrored here by hand.
- **Content depth (v5.13.1 fix)**: the first version matched a card's default-open state only (Go Deeper content omitted, to keep the email shorter) — reverted after explicit feedback that the omission wasn't wanted. A new `GoDeeperBlock` component now renders the full nested layer (lenses, signals-to-watch chips, questions leadership may ask, talking-point/follow-up, what-to-understand) for both CRO Conversation and Japan & Asia Watch, always fully expanded — matching this app's collapsed-in-app/expanded-in-print convention everywhere else. Also v5.13.1: "Also on the Radar" items hyperlink to `RadarItem.url` via react-pdf's `Link` component when present, plain text otherwise.
- **Sender identity**: reuses `IMAP_EMAIL`/`IMAP_PASSWORD` (fallback `AOL_EMAIL`/`AOL_APP_PASSWORD`) — the SAME mailbox `api/cron-bloomberg.py` already fetches newsletters from — for SMTP send instead of provisioning separate credentials. `lib/dailyBriefEmail.ts` fails soft (`{ok:false, reason}`, never throws) — a PDF/email problem must never turn an already-successful snapshot save into a failed cron run.
- **`pdfSafeText()` gotcha**: `lib/overnight.ts`'s `fmtDelta()` uses the proper Unicode minus sign (U+2212) for negative deltas — correct for the live app's Inter webfont, but react-pdf's standard Helvetica silently **drops the glyph entirely**, rendering "6 bps" instead of "−6 bps". Fixed locally in `dailyBriefPdf.tsx` only via `pdfSafeText()` — don't "fix" it in `overnight.ts` itself, the live app renders correctly. Any future field with unusual Unicode (rare symbols, dashes) will hit the same silent-drop failure mode.
- **`.env.local.example` gotcha**: was silently excluded from git by the repo's broad `.env*` gitignore pattern (pre-existing bug, unrelated to this feature) — fixed with a `!.env.local.example` negation while documenting the new vars.

**v5.13.2 — parked, not deleted.** Explicit request to hold the feature before deciding whether to keep it, with the option to test again later. Gated by a single check at the top of `sendDailyBriefBestEffort()`: `process.env.DAILY_BRIEF_ENABLED !== "true"` short-circuits with `{attempted:false, ok:false, note:"on hold..."}` before touching the PDF or email at all — daily snapshot generation itself is completely unaffected either way. Resume by setting `DAILY_BRIEF_ENABLED=true` in Vercel env vars and redeploying — no code edits needed. `DAILY_BRIEF_RECIPIENT_EMAIL`/`IMAP_*` stay configured either way. If ever confirmed permanently unwanted, the deletable surface is documented in CLAUDE.md: `lib/dailyBriefPdf.tsx`, `lib/dailyBriefEmail.ts`, the helper + call site in the cron route, the `nodemailer`/`@react-pdf/renderer` deps, and the `DAILY_BRIEF_*`/`SMTP_*` env vars (`IMAP_*` only if the Python extractor stops needing them too — shared mailbox, check first).

Manual "Regenerate" (`/api/regenerate`) deliberately does **not** send this email — only the actual scheduled cron does — so re-running editorial generation from the UI can't spam the recipient even while the feature is enabled.

### 3p. Research/Learn export — "Simple explanation" + "Original text" + Full-vs-Share PDF (v5.11.0 → v5.11.5)
`analyzeContent()` (`lib/analyze.ts`) now persists the full original source content (pasted text / fetched URL text / image transcript, untruncated) as `ResearchAnalysis.originalText` → `SavedItem.originalText` (`lib/savedMappers.ts`). This, plus the existing `layman.whatHappened`/`detail.whatToUnderstand`, feed a "Simple explanation" + "Original text" pair rendered via one shared `CollapsibleNote` component (exported from `ResearchWorkspace.tsx`, reused identically by `SavedList.tsx`'s `SavedCard` — deliberately, so Learn can't drift out of sync with Research the way it initially did in v5.11.0). Collapsed by default in-app, always fully expanded in print/PDF (same convention as §3o).

`components/print/PrintItem.tsx` takes `mode: "full" | "share"`. `"full"` is the original always-everything render. `"share"` (new) is deliberately minimal — title/date/source, Simple explanation, Original text, nothing else (no category/severity chips, no bank risk, no Mizuho framing) — for sharing outside the bank without exposing Mizuho-specific content. The choice is **two explicit links** at the export point (`?mode=full` / `?mode=share`, both the Research result card and the Learn saved-card action row), not a toggle discovered only after landing on the print page — the first version shipped as exactly that toggle (v5.11.0) and, per the general lesson recorded in CLAUDE.md, was indistinguishable from the feature not existing because nobody ever saw a real choice; fixed in v5.11.1 by moving the decision to the point of action.

Five further polish rounds (v5.11.2–v5.11.5, condensed — full detail in CLAUDE.md if needed): `stripLeadingUrl()` (`lib/format.ts`) strips a redundant leading URL-only line from Original Text's display (render-time only, stored text stays verbatim); bolder PDF section-header styling; a simplified print/PDF footer ("Prepared by Rohit Kohli" + a paywall/re-sharing caveat, replacing the live-app data-provider credits which are meaningless for a single-article export); confirmed the reported "footer with the vercel link" is the **browser's own** print header/footer (no `@page` rule exists anywhere in this codebase) — not fixable from app code, a print-dialog toggle instead; a full visual redesign of `PrintItemShare` (large colored Simple-Explanation card, nested Mechanics box, receded Original-Article-Text) with `print-color-adjust: exact` forced (Chrome/Safari default "Background graphics" off, silently drops bg-colors otherwise); and a meaningful mobile type-scale bump for Share mode specifically (body 12px→16px, Simple-Explanation card to 19px) since these PDFs are opened on a phone and fit-to-page-width shrinks a print-point size far more than a laptop-width preview suggests — `PrintItemFull` stays at its original compact size (internal reference document).

`siteNameFromUrl()` (`lib/format.ts`, v5.12.0) fixed a related bug: `savedFromAnalysis()` used to store `sourceLabel || originalUrl || "Pasted text"`, so a blank manual source-name field on a URL-mode analysis surfaced the raw URL verbatim in the source pill. The in-app source chip already derived a friendly name (`siteName()`) — extracted to `lib/format.ts` and applied at both the mapper (new saves) and every display site (`PrintItem.tsx`'s `SourceLine`, `SavedList.tsx`'s "Source:" line) so already-saved items with the old raw-URL value get rescued too, not just new saves.

### 3q. Markets tab — Emerging Risks & Implications merged (v5.12.0)
Two separately-scrolled sections, `EmergingRisks.tsx` (id `"emerging"`) and `BankImplications.tsx` (id `"implications"`), always covered the exact same 5 themes — `BankImplication.riskId` is a documented 1:1 link to `EmergingRisk.id`, guaranteed by `lib/weeklyEngine.ts`'s `mergeMarkets()`. Both retired; `components/MarketsRiskThemes.tsx` renders one card per theme (risk read up top, its five bank-implication lenses underneath), under a **new** CollapsibleSection id `"riskthemes"` (neither of the two old ones — see the id gotcha, §9). Same release added the section's first Learning path: `EmergingRisk.noteLayman` and `BankImplication.layman.*` existed on the type but were unused — now populated by the weekly re-rate prompt, with every field falling back model → curated base's own layman → executive text so a cell is never blank; `IMPLICATIONS_BASE` (`lib/fallbackData.ts`) rewritten from 3 generic un-keyed entries into the same 5-entry risk-keyed shape `mergeMarkets()` produces. `MarketsRiskThemes` owns its own local Executive/Learning toggle (matches `ResearchWorkspace`/`SavedList` — the header toggle deliberately doesn't reach Markets, see §3j/master-context §3).

### 3r. Markets tab — Indian Market: Metals (v5.14.0 → v5.14.1)
New section 05, `components/IndianMetals.tsx`, rendering gold/silver/copper/aluminium/uranium in the exact same card/grid format as section 01's Market Indicators — `components/CroDashboard.tsx`'s `Grid` is now **exported** specifically so this section reuses it instead of duplicating card markup.

**Data source**: no free/no-key Indian commodity-exchange (MCX) feed exists. `lib/indianMetals.ts` reuses the same no-key Yahoo Finance `quote()` (`lib/markets.ts`) the rest of the app already relies on — COMEX Gold (`GC=F`), COMEX Silver (`SI=F`), COMEX Copper (`HG=F`), COMEX Aluminum (`ALI=F`), a thin CME/UxC Uranium U3O8 assessment (`UX=F`) — plus a live USD/INR quote (`INR=X`), converted to the units India's metal market quotes in (gold ₹/10g, everything else ₹/kg). A single latest FX rate is applied uniformly across value/previous/history (isolates the metal's own price move, doesn't change % deltas or trend direction). This tracks the international benchmark MCX prices are set off of, but is **not** the literal MCX print — real domestic prices run higher once import duty, GST and dealer premium stack on top; said plainly in the section's own copy.

Kept deliberately **out of** the main `Indicator[]`/`data.indicators` — these aren't risk-engine inputs (`computeScore` etc. never touch them), so they travel as their own `DashboardData.indianMetals` field. `riskUpIsBad`: gold/silver `true` (flight-to-safety, matches the existing global-spot `gold` indicator), copper/aluminium/uranium `false` ("Dr. Copper" convention — rising industrial/energy commodities reads as demand/risk-on). New `Indicator.unit` value `"inr"` (₹ prefix, `lib/format.ts`) alongside the existing `"usd"`/`"yen"`.

**Uranium's caveat is stronger than the standard one above**: India has **no open retail/commodity market for uranium at all** (government-controlled, Dept. of Atomic Energy — never traded on MCX like the other four), so its row is labelled "(global, ₹/kg equiv.)" rather than "(India, …)" to avoid implying a real domestic price exists. The only working ticker (`UX=F`) is thin — `regularMarketVolume` was 1 on inspection, no daily close history, only a single `chartPreviousClose` fallback — so its sparkline is legitimately absent even when the row is live.

**Tin was requested but has no working free ticker** — neither `SN=F` nor `TIN=F` resolve on Yahoo's chart endpoint (tin is LME-only, no COMEX/CME contract this no-key source can reach). Left out rather than faked; would need a paid metals-data provider.

**v5.14.1 overflow fix (applies to the whole app, not just this section)**: six-figure INR values (₹100,000+) overflowed past the card's own rounded border in the 2-column grid — `IndicatorCard`'s top row (`CroDashboard.tsx`) packed the value + a fixed-width 56px sparkline + trend arrow onto one unwrapped flex line, sized fine for shorter US-market values but not six-digit rupee figures. Fixed generically with `flex-wrap` on both rows and `shrink-0` on the sparkline/arrow group — a value that doesn't fit now drops that group to its own line at full size instead of spilling outside the card. Benefits every section using this shared component.

---

## 4. `lib/` modules (roles, new/changed since v5.10.2 marked)

`snapshotEngine.ts` (daily) · `llm.ts` (Gemini→Anthropic escalation) · `weeklyEngine.ts` (weekly, now also emits the merged Markets risk-themes shape + layman twins, §3q) · `marketData.ts`/`fred.ts`/`markets.ts` (markets — `markets.ts`'s `quote()` is now also reused by `indianMetals.ts`) · `riskEngine.ts` (`withTrends`, `deriveDevelopments`, **new**: `buildDevelopments()` shared by the dashboard route and the Daily Risk Brief PDF, §3c-update) · `overnight.ts` (`buildOvernight`) · `fallbackData.ts` (curated scaffolds, `IMPLICATIONS_BASE` rewritten §3q) · `mizuhoTopRisks.ts` · `analyze.ts` (`analyzeContent`, now also persists `originalText`, §3p) · `focus.ts`/`focusProfile.ts` · `mizuhoKnowledgeData.ts`/`mizuhoKnowledge.ts` · `supabase.ts` · `savedStore.ts` · `savedMappers.ts` (source-name fix, §3p) · `userConcepts.ts` · `conceptAnalyze.ts` · `briefingBook.ts`/`briefingPacks.ts` · `concepts.ts` · `researchQuota.ts` · `runStore.ts` · `intelligence.ts` · `relevanceConfig.ts` · `newsAdapter.ts` · `format.ts` (**new**: `stripLeadingUrl()`, `siteNameFromUrl()`, `"inr"` unit case, §3p/§3r) · `types.ts` (**new**: `Indicator.unit: "inr"`, `DashboardData.indianMetals`) · `bankEarnings.ts` · `bankEarningsStore.ts` · `bankEarningsRefresh.ts` (diagnostics fix, §3m-update) · `bankEarningsMetrics.ts` · `mizuhoQ1Earnings.ts` · **`dailyBriefPdf.tsx`** (new, §3o) · **`dailyBriefEmail.ts`** (new, §3o) · **`indianMetals.ts`** (new, §3r).

---

## 5. `components/` (key ones, changes since v5.10.2 marked)

**Bottom nav unchanged: 4 tabs (Home / Markets / Research / Learn) + Settings via header hamburger.**

**Home** (n="01"–"06", unchanged numbering and files).

**Markets** (n="01"–"**05**", one new section) — `CroDashboard.tsx` (`Grid` now **exported**, §3r; overflow fix in `IndicatorCard`, §3r), `JapanWatch.tsx`, `RiskHeatMap.tsx`, **`MarketsRiskThemes.tsx`** (new, §3q — replaces the now-deleted `EmergingRisks.tsx`/`BankImplications.tsx`), **`IndianMetals.tsx`** (new, §3r, section 05).

**Research** (single section, mechanics changed) — `research/ResearchWorkspace.tsx`, now exports `CollapsibleNote` for reuse by `SavedList.tsx` (§3p).

**Learn — still 4 sections** (unchanged since v5.6.0's restructure) — `SavedList.tsx` (now renders `CollapsibleNote`, source-name fix, §3p), `ConceptLibrary.tsx`, `intel/WeeklyLearning.tsx`.

**Settings — still 7 sections** (unchanged numbering since v5.9.0).

**Print** — `print/PrintItem.tsx` (now `PrintItemFull` + redesigned `PrintItemShare`, `mode` prop, §3p), `print/PrintBook.tsx`, `print/PrintActionBar.tsx`. **`app/print/item/page.tsx`** now reads `?mode=` from the URL (§3p).

**App-icon/header (v5.10.5 → v5.11.5, five iterations — condensed, full narrative in CLAUDE.md)**: the header lost its logo entirely in v5.10.8 (text-only "Risk Intelligence" title, deliberate visual-cleanup request — `public/icons/logo-header.png` deleted, no other consumer) after several rounds (a glow-on-black source image with genuinely corrupted alpha data — verified via numpy histogram, not just eyeballed; a "sharp globe+R+chart" attempt) that predate the final asset. **v5.11.5** is current: `app/icon.png`/`app/apple-icon.png`/`public/icons/icon-192.png`/`icon-512.png` all sourced from a supplied "RisK Intel" radar/magnifying-glass mark — the glyph was cropped out of a combined icon+wordmark source image (bbox-detected via row-density scanning, since the wordmark text is illegible at icon sizes and the source's own pre-baked rounded card would double up against the OS's own corner-mask), re-padded onto a plain white square (white, not black — a deliberate reversal of the earlier "black by default" call, specific to this asset's dark-navy/red mark needing a light backdrop), only that gets OS-mask-rounded.

**Shared/cross-cutting (unchanged roles)**: `intel/MizuhoLensBlock.tsx`, `shared/AppFooter.tsx`, `shared/ProgressRing.tsx`, `shared/ThemeProvider.tsx`, `ui.tsx` (a file, not a folder), `CollapsibleSection.tsx`.

**Responsive shell (v5.10.4, applies everywhere)**: the app was fixed-width (`max-w-app`, 560px) at every viewport including iPad/macOS Safari — zero `md:`/`lg:`/`xl:` classes existed anywhere before this. `SHELL_WIDTH` in `app/page.tsx` (`"max-w-app md:max-w-2xl lg:max-w-4xl xl:max-w-5xl"`) now widens progressively. Three places must all use this exact string or they visually misalign: `<main>` and `<nav>` in `app/page.tsx`, and `ConceptLibrary.tsx`'s full-screen overlay (duplicated as a literal since it's a separate client component). Same release: `.safe-bottom-nav`/`.safe-bottom-content` split into two classes (`globals.css`) — they used to be one shared class applied to both the fixed tab bar and the scrollable content wrapper, stacking an extra 1.5rem onto the nav's own `env(safe-area-inset-bottom)` padding, an oversized gap below the tab labels on notched iPhones in standalone mode.

---

## 6. Supabase (`risk_dashboard` schema)

**Unchanged since v5.5.2 — no new tables this refresh cycle either.** The Daily Risk Brief and Indian Metals features both deliberately avoid new Postgres surface area (KV overlay pattern / no persistence needed respectively).

---

## 7. Python extractor — `api/cron-bloomberg.py`

Unchanged since v5.5.2. Shares its IMAP mailbox credentials (`IMAP_EMAIL`/`IMAP_PASSWORD`, fallback `AOL_EMAIL`/`AOL_APP_PASSWORD`) with the new Daily Risk Brief email sender (`lib/dailyBriefEmail.ts`, §3o) — same Vercel project, same env vars, no duplication. If the Daily Risk Brief feature is ever permanently deleted, check whether this script still needs those vars before removing them.

---

## 8. Environment variables (re-verified by grepping the current codebase for this refresh)

**New since v5.10.2**: `DAILY_BRIEF_RECIPIENT_EMAIL`, `DAILY_BRIEF_ENABLED` (must be exactly `"true"` to send — unset/anything else = on hold, §3o), `SMTP_HOST` (default `smtp.aol.com`), `SMTP_PORT` (default `465`), `IMAP_HOST` (Python extractor default `imap.aol.com` — was previously undocumented in `.env.local.example` despite being required, fixed alongside the Daily Risk Brief work). No new *indicator-data* env vars — Indian Metals reuses the existing no-key Yahoo Finance path with zero new configuration.

**Next app:** `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_RETRY_MS`, `GEMINI_TIMEOUT_MS`, `DISABLE_GEMINI`, `ANTHROPIC_API_KEY`, `ANTHROPIC_TIMEOUT_MS`, `LLM_MODEL`, `FRED_API_KEY`, `FINNHUB_API_KEY`, `MARKETAUX_API_KEY`, `NEWSDATA_API_KEY`, `ALPHAVANTAGE_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `MIGRATION_SECRET`, `RESEARCH_DAILY_CAP`, `ONBOARDING_PHASE`, `IMAP_EMAIL`, `IMAP_PASSWORD`, `AOL_EMAIL`, `AOL_APP_PASSWORD`, `DAILY_BRIEF_RECIPIENT_EMAIL`, `DAILY_BRIEF_ENABLED`, `SMTP_HOST`, `SMTP_PORT`.

**Python extractor:** `GEMINI_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` (required). `IMAP_HOST`/`IMAP_EMAIL`/`IMAP_PASSWORD` (fallback `AOL_EMAIL`/`AOL_APP_PASSWORD`). `INGEST_SENDERS`, `EXTRA_NEWSLETTERS`, `LOOKBACK_HOURS`. `ANTHROPIC_API_KEY` + `LLM_MODEL`. `CRON_SECRET`.

`.env.local.example` gitignore gotcha (fixed this cycle): the broad `.env*` pattern was silently excluding the example/template file from git entirely, despite it being referenced as the canonical reference throughout both doc pairs — fixed with a `!.env.local.example` negation.

---

## 9. Gotchas / learnings (carried forward from v5.10.2 + new this cycle)

*(All 5.10.2-era gotchas — Unicode-escape trap in JSX text, `components/ui.tsx` file/folder collision, non-public Postgres schema exposure, whitelist-fragility, dynamic-path-segment id mangling, time-based progress UI, binary-asset manual-apply misses, `table-layout:auto` fights, word-boundary keyword matching, IMAP `\Seen` flag, dedupe TTL, short-label-becomes-long-text, overlay-needs-a-reset-path, curated-companion-dataset-drift — remain valid and unrepeated.)*

- **`_`-prefixed Next.js route folders are silently excluded from routing.** Hit twice this cycle building temporary verification routes (`app/api/_test-daily-brief/`, later `app/api/_foo/`) — both routes 404'd with no error. Fixed by dropping the underscore (`app/api/testdailybrief/`). Always name a scratch verification route without a leading underscore.
- **A default that silently wins whenever a control goes unnoticed is indistinguishable from that control not existing.** The Full-vs-Share PDF export choice first shipped as a toggle discoverable only after already landing on the print page (defaulting to Full) — in practice nobody ever saw a real choice, so it shipped invisible. General lesson: for a real choice, decide at the point of action, not after (§3p).
- **A component reused for visual consistency inherits that component's edge cases too.** Reusing `CroDashboard.tsx`'s `Grid`/`IndicatorCard` for Indian Metals (deliberately, "same format as Market Indicators") also imported its fixed-width-sparkline overflow bug the moment a value got wide enough (six-figure INR). Fixing it in the shared component rather than working around it locally benefited every section using that card, not just the new one (§3r).
- **A no-key data source's coverage is uneven per symbol, not just per provider.** Yahoo Finance's public chart endpoint serves rich daily history for liquid COMEX/LME-adjacent futures (gold, silver, copper, aluminium) but returns a valid quote with **zero history** for a thin, rarely-traded symbol (uranium, `UX=F`, volume 1) — and returns nothing at all for a metal with no matching contract on any exchange Yahoo tracks (tin). Check a candidate ticker's actual response shape (`regularMarketVolume`, the `quote.close` array length) before trusting it, don't assume "the symbol resolves" means "the data is good" (§3r).
- **Verify a unit-conversion function's constants against a *concrete example value*, not just algebraically.** A conversion-factor helper for Indian Metals had a real bug on first write — gold and silver's `gramsWanted` argument was passed as `troyOzToGrams * 10` instead of `10`, off by ~31x — caught only by manually computing an expected sample number and comparing (₹114,400/10g plausible; the buggy formula would have produced a nonsense value) before it shipped. General lesson: for any new unit-conversion code, sanity-check with one concrete plausible number before wiring it into fetch logic.

---

## 10. Backlog (queued; not built) — re-verified against current code for this refresh

*(Carried forward, all still open, unchanged status: Mizuho Knowledge Repository lens into daily CRO Conversation; static Top Developments filler items; Concept Studio detection/Linkify merge; reconcile the two Mizuho Top-Risks systems; wire Compare Banks to the live Refresh Earnings overlay; backfill category/severity on pre-v4.2 saved items; the v4.6 "unified intelligence framework".)*

- **Clean up the stale "two slots/day" wording** in `lib/snapshotStore.ts`'s `slotForNow()`/`slotLabel()` and the cron route's header comment — there is genuinely only one scheduled cron run per day (§2). Offered to the user this cycle, not yet actioned.
- **Decide the permanent fate of the Daily Risk Brief email** (§3o) — currently parked behind `DAILY_BRIEF_ENABLED`, fully built and previously verified sending real emails. Needs a decision: resume, keep on hold indefinitely, or delete the surface (documented in CLAUDE.md).
- **Tin has no free data path** for Indian Market — Metals (§3r) — would need a paid metals-data provider (LME coverage) to add for real; flagged to the user, not pursued further absent a decision to pay for one.
- **`bankEarningsMetrics.ts` still not wired to the live Refresh Earnings overlay** — unchanged status from v5.10.2, not touched this cycle.

---

## 11. Version history (since v5.10.2 — see the v5.10.2 doc for 5.2.0–5.10.2)

**5.10.3** earnings-refresh diagnosability fix (every qualified bank now returns a reason either way) · **5.10.4** responsive iPad/macOS shell (`SHELL_WIDTH` breakpoints) + iOS bottom-nav safe-area split · 5.10.5–5.10.7 three app-icon/header-logo iterations (glow-on-black with corrupted alpha → transparent header logo → sharp globe+R+chart mark) · **5.10.8** header logo removed entirely, app renamed "Risk Intelligence" · **5.11.0** Research "Simple explanation"/"Original text" sections + Full-vs-Share PDF export (first version — export choice not yet discoverable) · 5.11.1 export choice moved to two explicit links at the point of action + Learn brought to Research's format parity · 5.11.2 layout/dedup-URL/PDF-header polish · 5.11.3 Share PDF visual redesign (colored Simple-Explanation card) + clarified the browser-footer non-issue · 5.11.4 Share PDF type scale sized for phone reading · **5.11.5** new "RisK Intel" app icon (final asset, browser tab/home-screen) · **5.12.0** Markets tab Emerging-Risks+Implications merge (`MarketsRiskThemes.tsx`) + layman support + source-name display bug fix · **5.13.0** Daily Risk Brief PDF, emailed after the daily cron · 5.13.1 added the "Go deeper" layer + Radar item hyperlinks to that PDF · 5.13.2 Daily Risk Brief put ON HOLD behind `DAILY_BRIEF_ENABLED` (built, verified, parked pending a keep/delete decision) · **5.14.0** Markets tab — Indian Market: Metals section (gold/silver/copper, global spot converted to INR) · 5.14.1 fixed a card-overflow bug (six-figure INR values) in the shared indicator card + added aluminium/uranium (tin has no free data source) · **5.14.2** this documentation refresh (docs-only, no code change).
