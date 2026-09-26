# Global Risk Intelligence Dashboard — Master Context (v5.17.1)

> Self-describing project context so a fresh session can pick up cold without the full chat history.
> Pair with `engineering-reference-v5_17_1.md` (file-by-file/technical). This doc = product, purpose, principles, architecture at a conceptual level. Supersedes the v5.14.2 pair (older pairs kept as history). New since then: Stock Health, the Home simplification, and a fuller CLAUDE.md. Prior lead-in: supersedes the v5.10.2 pair — twelve release-lines shipped since (v5.10.3–v5.14.1). Produced this time from a live session with real repository and git-history access (Claude Code), reading actual commit diffs and current source rather than extrapolating from a prior doc pair.

---

## 1. What this is & who it's for

A personal **CRO morning-briefing dashboard** built by **Rohit** as **Head of Risk, India, Mizuho** (onboarded via **Mizuho Americas**, Aug 2026). A curated daily read that translates global risk/market/banking news into a Chief Risk Officer's lens, with Mizuho-specific framing, to accelerate role readiness and prep for discussions with senior risk leadership.

**Working relationship & rhythm**
- Rohit is **not a developer** — he architects and directs, doesn't write code. Deploys via **GitHub → Vercel** (push-to-deploy).
- Strict **recommend → approve → build**: for anything large/invasive, propose a plan with honest trade-offs before writing code, ask for explicit scope/sequencing decisions rather than assuming them. Example this cycle: the Daily Risk Brief email's PDF-rendering approach (react-pdf vs. headless Chromium) was put to an explicit `AskUserQuestion` before building, given the size/reliability trade-off in a serverless cron function.
- **Diagnose before fixing**: explain root cause clearly before shipping changed code. This session's own working style extended that further than the doc pair's constrained-environment predecessor — with live git/file access, claims get checked against the actual repository (grep, direct file reads, live `curl` against a running dev server, even reading rendered PDF output byte-for-byte) rather than reasoned about secondhand.
- Scope-creep pushback is expected and valued; deferred/parked scope is a **hard stop** — don't build it speculatively. The Daily Risk Brief email itself demonstrates the *reverse* discipline too: fully built and verified working, then explicitly paused (not deleted) on request, because "don't need it now but want to keep the option" is a legitimate parking state distinct from either "ship it" or "delete it."
- **Iterative feedback loops are normal and expected**, especially for anything visual (PDFs, logos, layout) — several features this cycle went through 4–6 rounds of "looks right → user tries it → specific correction → repeat" before landing (the Research export PDFs, the app icon, the Indian Metals card overflow). Each round fixes the *reported* thing precisely rather than re-litigating the whole feature.
- When something ships as a **prototype/first version**, later rounds correct it based on real usage rather than guessing every edge case up front — the Daily Risk Brief's "Go deeper" content was deliberately left out of v1 to keep the email shorter, then added back once real usage showed it was wanted; the Full-vs-Share export choice shipped as an undiscoverable toggle before being fixed to two explicit links once the failure mode became clear.

**Audience framing for content:** the reader onboards with Mizuho **Americas**, so editorial prioritisation ranks **US-relevant** developments first (Fed/FOMC, Treasury market & funding, US credit, US banking sector, US capital markets & regulation), with **Japan/BOJ/JGB/USDJPY** as important secondary context, Europe/EMEA tertiary. Unchanged since v5.5.2.

---

## 2. Sacrosanct principles

1. **Translate, don't regenerate.** Translate real source material into the CRO lens; never invent news.
2. **Never invent risk mappings.** Mizuho Top Risks (`lib/mizuhoTopRisks.ts`) is a curated approximation, not Mizuho's own view. Distinct from the Mizuho Knowledge Repository (real disclosed positions) and the standalone Mizuho Q1 Earnings deep-dive. Unchanged.
3. **Curated "spine" is sacrosanct.** Fewer, better signals.
4. **No placeholder / empty content ever renders.** A section with nothing real either hides or shows an honest muted note. Reinforced twice this cycle in new ways: the Japan & Asia Watch section legitimately doesn't appear in the Daily Risk Brief PDF when previewing against curated (no-network) data, because `curatedSnapshot()` never populates `radar` — not a bug, an honest absence; and Uranium's row in Indian Metals is labelled to make clear no real Indian market exists for it, rather than silently presenting a synthetic number as if it were a real domestic quote.
5. **Zero hardcoded *interpretation*; keep curated *reference*.** Unchanged.
6. **Credibility separation.** Sourced facts vs. AI interpretation are visually distinguished. Extended this cycle to a **data-provenance separation** too: the Indian Metals section explicitly labels itself as a global-benchmark conversion, not the literal domestic exchange print — the same "don't overclaim what the data actually is" instinct as #6, applied to a live-quote feature rather than an editorial one.
7. **Quality and relevance over quantity.**

**Persistent honesty caveats:** the Mizuho-taxonomy disclaimer; no live keys in some dev/test contexts; progress/estimate UI labelled honestly; claims about "is X static/dynamic" verified against actual code. New this cycle: **be explicit about what a converted/derived number is, and isn't** — the Indian Metals prices are real live data, correctly converted, but are not the literal MCX print (import duty/GST/dealer premium excluded), and uranium specifically has no real underlying Indian market at all. Both facts are stated in the section's own copy, not buried in a footnote.

---

## 3. The product: four tabs + Settings + ingestion + three knowledge/data systems + one parked email pipeline

**Bottom nav unchanged: 4 tabs, plus Settings via the header hamburger.**

**Home** — flagship morning read, simplified in v5.17.0 to four flat sections after the owner found it too dense: Morning Brief (risk meter) → 01 What Changed (top-5 movers only) → 02 Today's CRO Conversation (ranked themes, with any overflow Editorial cards appended under an "Also today" divider) → 03 Japan & Asia Watch (collapsed) → 04 Also on the Radar (collapsed). **Now also the content basis for an (on-hold) emailed PDF** — see §5.

**Markets** — now six sections (Top Developments moved here from Home in v5.17.0):
- 01 Key CRO Dashboard (live indicators) — the shared card component (`Grid`/`IndicatorCard`) that renders this got a real overflow-fix bug fix in v5.14.1 (see §7), benefiting every section that reuses it.
- **02 Top Developments** (moved from Home, v5.17.0 — live-indicator-derived headlines + 2 curated risk items).
- 03 Japan Watch.
- 04 Global Risk Heat Map.
- **05 Emerging Risks & Implications** (v5.12.0, was two separate sections — "Top Emerging Risks" and "Implications for a Global Bank" — that always covered the same 5 themes 1:1; merged into one card per theme, plus a first-ever Learning-view translation for this section).
- **06 Indian Market — Metals** (new, v5.14.0/5.14.1) — gold, silver, copper, aluminium, uranium, global spot converted to live INR, in the same visual card format as section 01. Explicitly a price ticker, not a risk-engine input — the app's Mizuho/CRO risk framing doesn't touch this section at all.

**Research** — gained **Stock Health mode** (v5.15–5.16): attach a screenshot of a stock's Key Statistics panel, pick "📊 Stock Statistics", and get a benchmarked assessment (Overall Risk Signal; Valuation/Profitability/Financial Risk/Shareholder Returns tables with tap-to-expand plain-English meaning, why-it-matters, typical range, how often the metric updates, what to check next; key positives/risks/things to investigate; what the screenshot can't tell you). Saves to Learn and exports to PDF. Needs `GEMINI_API_KEY`; educational screening only, not advice. Original workflow: unchanged (paste/URL/image analysis through the same CRO framework), but the output now carries two more fields any analysis can show: a plain-English "Simple explanation" and the untruncated "Original text" (v5.11.0+) — see §5.

**Learn — still 4 sections**, unchanged numbering, but Saved Analyses/Saved for Later now render the same Simple-explanation/Original-text pair as Research (fixed in v5.11.1 after initially only landing in Research).

**Settings — still 7 sections**, unchanged numbering. Generation History (06) still has the same four buttons (Refresh / Regenerate / Refresh Earnings / Reset Earnings); the Daily Risk Brief email is **not** one of them — it's tied to the scheduled cron only, deliberately, so manual regeneration during testing can't spam the recipient.

**Three distinct "Mizuho" data systems, unchanged**: Mizuho Top Risks (curated approximation) · Mizuho Knowledge Repository (real disclosed positions, multi-card) · Mizuho Q1 Earnings (standalone primary-source deep-dive). None touched this cycle.

**Bank Earnings (Settings 05)** — unchanged shape (curated 15-bank baseline + live refresh overlay + Compare Banks + Reset recovery), but the refresh engine's silent-failure mode got fixed (§7): a "0 updated" run used to give no reason why; now every qualified bank returns a confirmed update or an explicit reason it wasn't confirmed, surfaced in Generation History.

**Daily Risk Brief email (new subsystem, v5.13.0, currently ON HOLD as of v5.13.2)** — see §5 for the full arc. In one line: a PDF covering the entire Home tab, emailed automatically after the daily cron, from the same mailbox the newsletter-ingestion job already uses — built, verified sending real emails, then explicitly paused behind a switch pending a keep/delete decision. Not reachable or testable from the UI at all (by design) — only the scheduled cron can trigger it, and only when the switch is on.

---

## 4. How a day flows

1. **Editorial cron** (04:00 IST) builds the snapshot: news → cluster → interpret into themes → align to Mizuho Top-Risks → layman → persist. **Then, if `DAILY_BRIEF_ENABLED=true`** (currently false/unset), best-effort builds a PDF of the same content and emails it — failure here can never turn a successful snapshot save into a failed cron run.
2. **Newsletter cron** (05:30 & 19:00 IST) ingests into KV. Unchanged.
3. **Weekly cron** (Sat 06:00 IST, Anthropic-forced) re-rates the Markets spine — **now also generates the layman twin for Emerging Risks & Implications** (v5.12.0).
4. Reader opens **Home**, reads CRO Conversation, checks **Markets** (now including live Indian metal prices), triages **Research** (now producing a shareable-outside-the-bank export option alongside the full internal one), saves to **Learn**, occasionally compiles a Briefing Book, checks Bank Earnings/Compare Banks/Mizuho Q1 in Settings.

There is genuinely **only one** scheduled editorial cron run per day (morning) — worth stating plainly here because `lib/snapshotStore.ts`'s `slotForNow()`/`slotLabel()` and a route header comment still describe "two slots/day" from an earlier design that no longer reflects `vercel.json`. Came up as a direct user question this cycle (why didn't an evening email arrive) and was correctly diagnosed as expected behavior, not a bug — the stale wording is a minor doc-cleanliness item, not a functional gap (§7).

---

## 5. Two feature arcs worth understanding end-to-end (not just their current state)

Both of these shipped, then went through real correction cycles based on actual use — understanding the *arc*, not just the final state, matters for anticipating what kind of feedback might come next.

### 5a. Research/Learn export: from "one PDF" to "two audiences, two experiences"
Started (v5.11.0) as: add a plain-English summary + the original source text to any analysis, and let the export choose Full (internal, everything) vs. Share (external, minimal — no Mizuho framing). The *mechanism* was right but the *choice* wasn't reachable — it was a toggle only visible after already landing on the print page, defaulting to Full, so in practice nobody ever exercised it (v5.11.1 fix: two explicit links at the point of export instead). Then five rounds of what "Share" should actually look like once people were really using it: strip a redundant leading URL, make section headers bolder, simplify the footer, clarify a browser-chrome artifact wasn't an app bug, and — the biggest single correction — realize a "textually correct but visually dry" Share PDF wasn't something anyone would want to forward, leading to a full visual redesign (a prominent colored Simple-Explanation card) plus a mobile-specific type-scale bump once it became clear these are read on a phone, fit-to-width, where print-point sizing reads much smaller than a laptop preview suggests. **Lesson generalizable beyond this one feature**: a feature that's technically correct on first ship often needs a distinct "does this actually work for the real reading context" pass once real usage starts, and that pass is not optional polish — it can be the difference between shipped-but-unused and actually adopted.

### 5b. Daily Risk Brief email: built, verified, then deliberately parked
Requested as: take the daily cron's output and email a same-day PDF, reusing existing mailbox credentials, no new secrets. Built across v5.13.0–v5.13.2: PDF engine chosen deliberately (react-pdf over headless Chromium, explicit trade-off conversation first) · content matched to the live Home tab, then corrected once (the nested "Go deeper" layer was cut for length in v1, restored after explicit feedback that the cut wasn't wanted) · radar items made clickable to match in-app behavior · verified end-to-end, including a real send once the user set the recipient env var. Then, once live and working, explicitly put **on hold** — "don't need it now but want to test before deleting" — via a single env-var gate that leaves 100% of the built code in place, untouched, ready to resume with no redeploy of logic. This is a distinct end-state from either "keep shipping it" or "rip it out": a **reversible pause**, and the doc trail (CLAUDE.md, this pair) records both how to resume it and exactly what to delete if it's ever confirmed unwanted. Worth recognizing this pattern if a similar "I don't need this right now" request comes up again — a feature flag that gates the risky/costly part (external email send) while leaving generation logic untouched is usually the right shape, cheaper to reverse than either extreme.

---

## 6. Stack (conceptual, changes since v5.10.2 marked)

Next.js (App Router) + TypeScript + Tailwind on **Vercel Pro**, GitHub push-to-deploy.
**Vercel KV** — daily snapshot, weekly re-rate, newsletter digests, Mizuho-repository cache, Bank Earnings overlay. Unchanged role.
**Supabase (Postgres)** — saved items and user-added concepts. Unchanged, no new tables this cycle.
**LLMs:** Gemini 2.5 Flash (primary) + Anthropic claude-haiku (fallback). Unchanged roster/escalation pattern.
**Data:** FRED + Yahoo Finance + IMAP newsletter ingestion + Finnhub/Marketaux/NewsData/AlphaVantage. **Yahoo Finance's no-key quote endpoint is now also the sole data source for Indian Market — Metals** (v5.14.0) — no new provider, same free/no-key path the rest of the app's market data already uses, just pointed at different symbols (gold/silver/copper/aluminium/uranium futures + USD/INR) and run through a unit conversion.
**New dependencies (v5.13.0):** `@react-pdf/renderer` (server-side PDF generation for the Daily Risk Brief email) and `nodemailer` (SMTP send, reusing the newsletter mailbox's own credentials). Both are currently exercised only when `DAILY_BRIEF_ENABLED=true` (§5b) but remain installed either way.
A separate **Python Vercel Function** (`api/cron-bloomberg.py`) does newsletter ingestion, unchanged — and now shares its mailbox credentials with the Daily Risk Brief sender.

See the engineering reference for exact files, keys, env vars, flows.

---

## 7. State at v5.17.1 (build history since the last doc refresh, v5.10.2)

**5.10.3** — Bank Earnings refresh diagnosability fix: a "0 updated" run used to be a black box even when real qualifying news existed for a bank; the extraction prompt told the model to omit unconfirmed banks entirely rather than explain why, so the reason was structurally unreachable. Fixed to always return a reason, surfaced in Generation History.

**5.10.4** — Responsive shell: the app had been fixed at 560px width on every viewport, including iPad and macOS Safari, since the beginning — zero responsive breakpoints existed anywhere. Progressive widening added. Same release fixed an oversized gap below the bottom tab bar on notched iPhones (two padding sources were stacking instead of one being the inset and the other the clearance).

**5.10.5–5.10.8** — App identity, four rounds: a new logo/icon attempt with a source image whose alpha channel turned out to be genuinely corrupted (verified via pixel-level inspection, not assumed); a transparent-header attempt; a sharper replacement mark; and finally, per explicit request, **removing the header logo entirely** and renaming the app to "Risk Intelligence" — the header is now deliberately text-only.

**5.11.0–5.11.5** — Research/Learn export arc (see §5a for the full narrative). Ends with a final, durable app icon (v5.11.5, "RisK Intel" radar/magnifying-glass mark) that supersedes all four 5.10.x attempts.

**5.12.0** — Markets tab: two always-parallel sections (Emerging Risks, Bank Implications) merged into one per-theme card; first Learning-view support for that section; a source-attribution bug fixed both at the point new data is saved and at every place it's displayed, so already-saved items get corrected too, not just new ones.

**5.13.0–5.13.2** — Daily Risk Brief email arc (see §5b for the full narrative). Ends parked, not deleted, pending a decision.

**5.14.0–5.14.1** — Indian Market — Metals: a new live price-ticker section for gold/silver/copper (then aluminium/uranium), global benchmark converted to INR since no free domestic exchange feed exists; one real overflow bug in the shared indicator card fixed generically along the way (benefits every section using that card).

**5.14.2** — Documentation refresh (superseded by 5.17.1) (docs-only, no code change) — the same kind of release as 5.10.2 was for the prior gap.

**5.15.0–5.16.1** — Stock Health (see §3): built from an approved plan (placement inside Research, save/export yes, compact tap-to-expand table). First real screenshot failed because the model returned a number where a string was expected — fixed by coercing, after making the error logging field-exact and reading production logs. Then name + as-of date + per-metric update cadence, a title-extraction fallback (ticker sits outside the stats table), and a manual "Stock name or ticker" field for screenshots with no visible header. Two early nameless saves are unrecoverable.

**5.17.0** — Home simplification: Editorial Intelligence merged into CRO Conversation (they were depth tiers of the same coverage, not different article types — editorial cards are overflow generated only on busier days), the nested "Show all indicators" table deleted (Markets already shows all 18 indicators), Top Developments moved to Markets. Presentation-only; no generation/data changes.

**5.17.1** — This documentation refresh (docs-only). CLAUDE.md now also carries the working agreement, ship pipeline, hosting/env-var/backlog reference so a cold session has everything.

---

## 8. Open / deferred threads — re-verified against current code for this refresh

- **Wire the Mizuho Knowledge Repository lens into the daily CRO Conversation themes** — unchanged, still Research-only.
- **Make the 2 static "Top Developments" filler items dynamic** — unchanged, still hardcoded.
- **Merge Concept Studio's user-added concepts into the curated detection/rendering pipeline** — unchanged, display-only half done.
- **Reconcile the two Mizuho Top-Risks systems** — unchanged, still just flagged.
- **Wire Compare Banks to the live Refresh Earnings overlay** — unchanged, still a real, documented gap.
- **Clean up the stale "two slots/day" wording** (`lib/snapshotStore.ts`, cron route header comment) — new item, surfaced this cycle by a direct user question about a missing evening email; offered to the user, not yet actioned.
- **Decide the Daily Risk Brief email's permanent fate** — new item; currently parked (§5b), needs an explicit resume/keep-parked/delete decision from Rohit once he's had a chance to test it again.
- **Tin has no free data path** for Indian Market — Metals — would need a paid metals-data provider (LME coverage); not pursued absent a decision to pay for one.
- **v4.6 "unified intelligence framework"** — long-deferred, unchanged status.

- **Daily Risk Brief PDF still mirrors the pre-v5.17.0 Home layout** — align it if the email is ever resumed.
- **Vercel Pro is not needed** (checked Sep 2026: Hobby + Fluid Compute gives 300s functions; our crons are all once-a-day) — the owner may downgrade; only cost is looser cron timing (±59 min).
- **Stock Health**: live extraction is verifiable only in production; earlier nameless saves can't be repaired; consider a paid data path only if the owner wants live quotes (currently screenshot-only by design).

## 9. De-hardcoding status

- **Generated per request (on demand, ephemeral until saved):** Stock Health assessments (LLM over extracted screenshot values only).
- **Generated each cycle:** themes, Mizuho Top-Risks alignment, layman text, weekly heat/emerging ratings, bank implications (**now including their layman twins**, v5.12.0), all Research analysis fields, briefing-book prefaces/action-items, Concept Studio drafts, Bank Earnings entries a Refresh run has confirmed.
- **Live-fetched, not generated or curated:** Indian Metals prices (v5.14.0) — real-time data, but the *conversion methodology* (which units, which caveat language) is a fixed design decision, not something re-derived per cycle.
- **Curated by design:** Mizuho Top Risks taxonomy, the static concept library detection layer, indicator definitions, emerging-risk list, seed themes, the Mizuho Knowledge Repository's disclosed content, the 2 static Top Developments filler items, the Bank Earnings curated baseline, the Compare Banks metrics dataset, the Mizuho Q1 Earnings deep-dive.
- **Built but currently inert:** the entire Daily Risk Brief PDF/email pipeline (§5b) — code runs the exact same generation logic it always would, gated off before it reaches the PDF-build or send step.
