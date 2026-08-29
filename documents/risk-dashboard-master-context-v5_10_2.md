# Global Risk Intelligence Dashboard — Master Context (v5.10.2)

> Self-describing project context so a fresh session can pick up cold without the full chat history.
> Pair with `engineering-reference-v5_10_2.md` (file-by-file/technical). This doc = product, purpose, principles, architecture at a conceptual level. Supersedes the v5.5.2 pair — five release-lines shipped since (a tab/screen restructuring, and the entire Bank Earnings subsystem: baseline, live refresh, recovery, Compare Banks, plus a standalone Mizuho Q1 Earnings deep-dive). The v5.5.2 doc pair had gone genuinely stale — the gap was five versions, not the one previously assumed, and this refresh corrects that against the actual repository rather than prior notes.

---

## 1. What this is & who it's for

A personal **CRO morning-briefing dashboard** built by **Rohit** ahead of joining **Mizuho as Head of Risk, India** (Aug 2026; onboarding via **Mizuho Americas**). A curated daily read that translates global risk/market/banking news into a Chief Risk Officer's lens, with Mizuho-specific framing, to accelerate role readiness and prep for discussions with senior risk leadership (e.g. Tim Healy, Shinohara-san).

**Working relationship & rhythm**
- Rohit is **not a developer**. He architects and directs; he does **not** write code. Deploys via **GitHub → Vercel** (push-to-deploy); no local build on his side. He applies file bundles manually — including binary assets like icon PNGs, which have been missed before, so bundles should flag non-code files explicitly.
- Strict **recommend → approve → build**. For anything large or invasive, Claude proposes a phased plan with honest trade-offs *before* writing code, and asks for explicit scope/sequencing decisions rather than assuming them.
- **Diagnose before fixing**: explain root cause clearly before shipping changed code. Verify claims against actual code rather than guessing from memory — this refresh itself was produced this way (cloned repo, read commit diffs and file headers, grep'd for actual behavior) rather than extrapolated from the prior doc pair.
- Scope-creep pushback is expected and valued.
- Deferred/parked scope is a **hard stop** — don't build it speculatively.
- When something is explicitly framed as a **"prototype"**, scope it deliberately smaller/additive rather than reworking existing systems — validate the workflow first, integrate later once approved. (The Bank Earnings screen followed exactly this arc: v5.7.0 shipped as an explicitly-not-live static prototype, and only got a live-data layer in v5.8.0 once the static version was in hand.)

**Audience framing for content:** the reader onboards with Mizuho **Americas**, so editorial prioritisation ranks **US-relevant** developments first (Fed/FOMC, Treasury market & funding, US credit, US banking sector, US capital markets & regulation), with **Japan/BOJ/JGB/USDJPY** as important secondary context, Europe/EMEA tertiary.

---

## 2. Sacrosanct principles

1. **Translate, don't regenerate.** Translate real source material into the CRO lens; never invent news.
2. **Never invent risk mappings.** The Mizuho Top Risks taxonomy (`lib/mizuhoTopRisks.ts`) is a **curated approximation**, not a verified internal document or Mizuho's own view/exposure. The UI says so. Distinct from the more authoritative **Mizuho Knowledge Repository** (real disclosed positions) — the two systems still coexist, not merged (unchanged status, §7). A **third**, unrelated Mizuho data source now also exists — the **Mizuho Q1 Earnings** deep-dive (v5.9.0), sourced straight from the actual results filing — see §3.
3. **Curated "spine" is sacrosanct.** Fewer, better signals.
4. **No placeholder / empty content ever renders.** A section with nothing real either hides or shows an honest muted note.
5. **Zero hardcoded *interpretation*; keep curated *reference*.** Interpretations are generated each cycle; reference scaffolding stays curated. (The Bank Earnings baseline and the Compare Banks metrics dataset are both **deliberately curated reference**, not generated — this is by design, not a gap, though see §7 for a genuine gap in how the two relate to each other.)
6. **Credibility separation.** Sourced facts vs. AI interpretation are visually distinguished.
7. **Quality and relevance over quantity.**

**Persistent honesty caveats:** the Mizuho-taxonomy disclaimer; the dev/build environment has no live Gemini/Anthropic/FRED/Supabase access; progress/estimate UI is labelled honestly as a time-based estimate; and **claims about "is X static/dynamic" or "why does Y look wrong" get verified against actual code**, not answered from memory.

---

## 3. The product: four tabs + Settings + ingestion + three knowledge/data systems

**Bottom nav is unchanged since the earliest versions: 4 tabs, plus a Settings panel reached from the header hamburger.** What changed substantially in **v5.6.0** is *what lives where* — this is the most important structural correction in this refresh; the prior doc's "Learn — 8 sections" description no longer matches the shipped app.

**Today** — flagship morning read. Six sections (numbering unchanged):
- **What Changed** (01) — biggest movers, risk-ranked, plus an expandable full indicator table (16 tracked series).
- **Top Developments** (02) — up to 5 items: up to 4 genuinely dynamic (`deriveDevelopments()`, rules-based off live indicator values) plus **exactly 2 permanently static filler items** (geopolitics, CRE/private-credit) — re-verified against current code for this refresh, still true, still an open decision (rules-based vs. new LLM call, Rohit's call pending).
- **Today's CRO Conversation** (03) — ranked themes, collapsible cards.
- **Editorial Intelligence** (04), **Japan & Asia Watch** (05), **Also on the Radar** (06).

**Markets** — Key CRO Dashboard, Japan Watch, Global Risk Heat Map, Top Emerging Risks, Implications for a Global Bank. Live FRED/Yahoo data. Unchanged.

**Research** — the ephemeral analysis workspace. Unchanged since v5.5.2: paste/URL/image analysis, progress-ring, Editorial-Intelligence-mirrored output plus Mizuho Top-Risks alignment and "Through Mizuho's lens," print/export, newsletter panel.

**Learn — now the growing personal repository, 4 sections** (was 8 before v5.6.0's restructure moved half of them into Settings):
- 01 Saved Analyses · 02 Saved for Later · **03 Concept Library** (now merges curated terms *and* your own added concepts into one browsable, searchable list — the display half of a merge that's still only half-done, see §7) · 04 Weekly Summary.

**Settings ("More," via header hamburger) — now the maintenance/configuration + reference panel, 7 sections** (grew substantially from a thin panel across v5.6.0–v5.9.0):
- 01 Appearance (dark/light toggle) · 02 Briefing Books · 03 Add Concept (the create/edit form — paste/analyze/save; browsing your saved concepts happens in Learn → Concept Library instead) · 04 Mizuho Reference (structured cards of the disclosed-positions repository) · **05 Bank Earnings** (latest-quarter data for 15 banks, with a live "Refresh Earnings" layer and a nested Compare Banks chart view) · 06 Generation History (today's runs, plus the Refresh/Reset Earnings controls) · **07 Mizuho Q1 Earnings** (a full-detail, primary-source read of Mizuho's actual Q1 FY2026 results).

**Three distinct "Mizuho" data systems now exist — don't conflate them:**
1. **Mizuho Top Risks** (`lib/mizuhoTopRisks.ts`) — curated approximation, theme/analysis alignment, explicit "not Mizuho's own view" disclaimer.
2. **Mizuho Knowledge Repository** (multi-card, real disclosed positions — Basel Pillar 3, financial statements, investor presentations, risk governance, RAF/Top Risks, business model) — Research + Saved + Learn/Settings reference view.
3. **Mizuho Q1 Earnings** (new, v5.9.0) — a standalone, single-purpose deep-dive built directly from the actual Q1 FY2026 results filing (not a curated approximation, not the general repository). Resolves specific gaps the compact Bank Earnings entry for Mizuho explicitly flags as unconfirmed (credit costs, NPL ratio). Reused by Compare Banks for Mizuho's USD figures, so the two newer earnings screens stay internally consistent with each other even though they're visually separate.

**Bank Earnings (Settings 05, new v5.7.0 → v5.10.1)** — the other major addition since the last doc refresh, in brief (full detail in engineering reference §3m):
- Started (v5.7.0) as an explicitly static, curated 15-bank baseline — a deliberate "prototype first" scoping choice matching the working-rhythm principle above.
- Gained (v5.8.0) a live "Refresh Earnings" layer: on demand, the app checks real news for each bank, and only accepts a genuinely newer confirmed quarter via a grounded LLM call — the curated baseline is never overwritten, only supplemented.
- Gained (v5.9.0) the separate Mizuho Q1 deep-dive described above.
- Gained (v5.10.0) **Compare Banks** — USD-converted bar charts across all 15 banks, reached via a button inside the Bank Earnings screen. Built from a **separately curated** numeric dataset that traces back to the same source figures but is **not currently wired to the live refresh overlay** — a real, newly-surfaced gap (§7).
- Gained (v5.10.1) a bug fix (a UI pill was leaking a full sentence instead of a short label) and a "Reset Earnings" recovery action, so a bad live-refreshed entry can be manually reverted to the curated baseline rather than sitting there indefinitely.

**Briefing Books** — unchanged since v5.3. Now reached from Settings 02 rather than Learn.

**Concept system** — unchanged mechanics, changed location: the create/edit form ("Add Concept") lives in Settings 03; browsing curated + your own concepts together happens in Learn → Concept Library. See §7 for the precise, corrected status of how far the merge between the two actually goes.

**Dark/Light theming** — unchanged since v5.4. Now reached from Settings 01 rather than Learn 08.

---

## 4. How a day flows

1. **Editorial cron** (04:00 IST) builds the snapshot: news → cluster → interpret into themes → align to Mizuho Top-Risks → layman → persist. Gemini primary, Anthropic fallback. **Still does not** call the Mizuho Knowledge Repository lens (Research-only so far) — re-verified for this refresh, unchanged, still deferred (§7).
2. **Newsletter cron** (05:30 & 19:00 IST) ingests into KV.
3. **Weekly cron** (Sat 06:00 IST, Anthropic-forced) re-rates the Markets spine.
4. Reader opens **Today**, reads CRO Conversation, checks Markets, triages Research (with the Mizuho lens), saves to Learn (Supabase-backed), occasionally compiles a Briefing Book, checks Bank Earnings / Compare Banks / the Mizuho Q1 deep-dive in Settings, or exports a saved item to PDF. On demand (not scheduled), can trigger **Refresh Earnings** from Settings → Generation History to pull in any bank's newly reported quarter.

---

## 5. Stack (conceptual)

Next.js (App Router) + TypeScript + Tailwind on **Vercel Pro**, GitHub push-to-deploy.
**Vercel KV (Upstash Redis)** — daily snapshot, weekly re-rate, newsletter digests, Mizuho-repository cache, **and now the Bank Earnings live-refresh overlay** (new since v5.8.0 — deliberately KV, not Supabase, to reuse the same proven pattern rather than add new database surface area).
**Supabase (Postgres)** — saved items and user-added concepts only, unchanged since v5.5.2, isolated `risk_dashboard` schema.
**LLMs:** Gemini 2.5 Flash (primary) + Anthropic claude-haiku (fallback) — the roster of callers grew with Bank Earnings' refresh engine (one batched grounded call per refresh run, same escalation pattern as everything else).
**Data:** FRED + Yahoo + IMAP newsletter ingestion + Finnhub/Marketaux/NewsData/AlphaVantage — the Bank Earnings refresh engine deliberately reuses these same adapters rather than adding new ones.
A separate **Python Vercel Function** (`api/cron-bloomberg.py`) does newsletter ingestion, unchanged.

See the engineering reference for exact files, keys, env vars, flows.

---

## 6. State at v5.10.2 (build history since the last doc refresh, v5.5.2)

**5.6.0** — Tab/screen restructuring. Add Concept (form), Mizuho Reference, Briefing Books, and Appearance all moved out of Learn and into a substantially expanded Settings panel; Concept Studio itself split into the create/edit form (stays conceptually with Settings) and a new browsing list component that moved *into* Learn's Concept Library instead. This is the single change most likely to make old screenshots or muscle memory misleading.

**5.6.1** — Concept Library overhaul: curated and user-added concepts now render in one merged, searchable list (previously users had to go looking for their own concepts separately).

**5.6.2** — Visual pass: `RiskGauge.tsx` rewritten, two new small shared components added (`NavIcons.tsx` for the bottom tab bar, `ToneTile.tsx` for risk-direction-styled tiles).

**5.6.3–5.6.5** — Bug fixes across the CRO Conversation card, the concept library, and a markets-data fix.

**5.7.0** — Bank Earnings screen introduced: a curated, static 15-bank latest-quarter reference, explicitly not yet live — a deliberate "ship the prototype, validate, then wire live data" sequencing choice.

**5.8.0** — Bank Earnings goes semi-live: a "Refresh Earnings" action that checks real news per bank and only accepts a genuinely-confirmed newer quarter via a grounded LLM call, layered on top of (never overwriting) the curated baseline. Plain-English summaries added. Mizuho's compact baseline entry updated for Q1 FY26.

**5.9.0** — Mizuho Q1 Earnings: a standalone, full-detail deep-dive built directly from Mizuho's actual results filing, distinct from and more complete than the compact Bank Earnings entry for Mizuho.

**5.10.0** — Compare Banks: USD-converted comparison charts across all 15 banks, built from a separately curated (not live-overlay-wired) numeric dataset.

**5.10.1** — A UI bug (a short pill label leaking a full explanatory sentence for one bank) fixed, and a "Reset Earnings" recovery path added so a bad live-refreshed entry can be manually reverted.

**5.10.2** — Documentation-only: `CLAUDE.md`/`README.md` brought current (this master-context/engineering-reference pair was the piece that had been missed, until this refresh).

---

## 7. Open / deferred threads — re-verified against current code for this refresh

- **Wire the Mizuho Knowledge Repository lens into the daily CRO Conversation themes** — Research-only so far; confirmed unchanged by reading `snapshotEngine.ts` directly. Same shared components already exist (`interpretThroughMizuho`, `MizuhoLensBlock`), reuse not rebuild. Waiting on Rohit's confidence from Research usage before adding a model call to the daily critical path.
- **Make the 2 static "Top Developments" filler items dynamic** — confirmed unchanged by reading `app/api/dashboard/route.ts` directly. Rules-based extension vs. a new LLM call, Rohit's call pending.
- **Merge Concept Studio's user-added concepts into the curated detection/rendering pipeline** — **status corrected by this refresh, was previously tracked as a single unbuilt item and is actually half-done**: the Concept Library *display* now merges curated + user concepts (v5.6.1, done). The *auto-detection/inline-linking* engine (`detectConcepts()`/`Linkify`, which highlights concept terms as you read briefing prose) still scans curated terms only — a user-added concept won't get auto-linked in text yet. This is the part that remains a genuine open item.
- **Reconcile the two Mizuho Top-Risks systems** (curated approximation vs. the more authoritative disclosed-positions Knowledge Repository) — unchanged, still just flagged, not acted on.
- **Wire Compare Banks to the live Refresh Earnings overlay** — **new item, surfaced by this refresh, not previously documented.** `bankEarningsMetrics.ts` (the Compare Banks numeric dataset) was hand-built from the same source figures as the curated Bank Earnings baseline, but has no live connection to it — a bank refreshed via the "Refresh Earnings" button updates its list-card text but not its Compare Banks chart bars, until someone hand-revises the metrics file too. The Compare screen's own caption already flags this to the reader; the underlying gap itself is untouched.
- **v4.6 "unified intelligence framework"** — long-deferred; still not converged, unchanged status.

## 8. De-hardcoding status

- **Generated each cycle:** themes, Mizuho Top-Risks alignment, layman text, weekly heat/emerging ratings, bank implications, all Research analysis fields, the Mizuho-lens interpretation, briefing-book prefaces/action-items, Concept Studio drafts, **Bank Earnings entries that a Refresh Earnings run has confirmed** (the overlay layer only — the baseline stays curated).
- **Curated by design:** Mizuho Top Risks taxonomy, the static concept library (detection layer), indicator definitions, emerging-risk list, seed themes, the Mizuho Knowledge Repository's underlying disclosed content, the 2 static Top Developments filler items, **the Bank Earnings curated baseline** (by design — the overlay supplements it, never replaces it wholesale), **the Compare Banks metrics dataset** (by design, though currently disconnected from the overlay in a way that's a genuine gap rather than an intentional boundary — see §7), **the Mizuho Q1 Earnings deep-dive** (point-in-time, sourced from one filing — will need a refresh convention once a later quarter's results are out, not yet designed).
