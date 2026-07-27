# Global Risk Intelligence Dashboard — Master Context (v5.5.2)

> Self-describing project context so a fresh session can pick up cold without the full chat history.
> Pair with `engineering-reference-v5_5_2.md` (file-by-file/technical). This doc = product, purpose, principles, architecture at a conceptual level. Supersedes the v5.2.0 pair — a great deal has shipped since (Mizuho multi-card rebuild, print/PDF + briefing books, dark/light theming, the Concept Studio prototype).

---

## 1. What this is & who it's for

A personal **CRO morning-briefing dashboard** built by **Rohit** ahead of joining **Mizuho as Head of Risk, India** (Aug 2026; onboarding via **Mizuho Americas**). A curated daily read that translates global risk/market/banking news into a Chief Risk Officer's lens, with Mizuho-specific framing, to accelerate role readiness and prep for discussions with senior risk leadership (e.g. Tim Healy, Shinohara-san).

**Working relationship & rhythm**
- Rohit is **not a developer**. He architects and directs; he does **not** write code. Deploys via **GitHub → Vercel** (push-to-deploy); no local build on his side. He applies file bundles manually — including binary assets like icon PNGs, which have been missed at least once (v5.5.2), so bundles should flag non-code files explicitly.
- Strict **recommend → approve → build**. For anything large or invasive (Supabase migration, the v5.3 print+briefing-books combo, v5.4 theming, the Concept Studio prototype), Claude proposes a phased plan with honest trade-offs *before* writing code, and asks for explicit scope/sequencing decisions rather than assuming them.
- **Diagnose before fixing**: explain root cause clearly before shipping changed code. Verify claims against actual code rather than guessing from memory, especially on long-running questions ("is X static?", "why does Y wrap?").
- Scope-creep pushback is expected and valued. When Claude adds something beyond the literal ask, it says so explicitly and explains why.
- Deferred/parked scope is a **hard stop** — don't build it speculatively.
- When something is explicitly framed as a **"prototype"**, scope it deliberately smaller/additive rather than reworking existing systems — validate the workflow first, integrate later once approved.

**Audience framing for content:** the reader onboards with Mizuho **Americas**, so editorial prioritisation ranks **US-relevant** developments first (Fed/FOMC, Treasury market & funding, US credit, US banking sector, US capital markets & regulation), with **Japan/BOJ/JGB/USDJPY** as important secondary context, Europe/EMEA tertiary.

---

## 2. Sacrosanct principles

1. **Translate, don't regenerate.** Translate real source material into the CRO lens; never invent news.
2. **Never invent risk mappings.** The Mizuho Top Risks taxonomy (`lib/mizuhoTopRisks.ts`) is a **curated approximation**, not a verified internal document or Mizuho's own view/exposure. The UI says so. Distinct from the newer, more authoritative **Mizuho Knowledge Repository** (v5.0+, real disclosed positions) — the two systems currently coexist, not merged.
3. **Curated "spine" is sacrosanct.** Fewer, better signals. The emerging-risk list, indicator set, curated concept library, seed themes are deliberately curated and stable.
4. **No placeholder / empty content ever renders.** A section with nothing real either hides or shows an honest muted note.
5. **Zero hardcoded *interpretation*; keep curated *reference*.** Interpretations are generated each cycle; reference scaffolding stays curated.
6. **Credibility separation.** Sourced facts vs. AI interpretation are visually distinguished — "What happened · sourced" vs "Why it matters · interpretation" (Research/Editorial), and **FACT / MIZUHO CONTEXT · repository / INTERPRETATION** (the Mizuho lens).
7. **Quality and relevance over quantity.**

**Persistent honesty caveats:** the Mizuho-taxonomy disclaimer; the dev/build environment has no live Gemini/Anthropic/FRED/**Supabase** access, so those paths are validated by build/logic only — the user runs the real thing and reports back; progress/estimate UI (the analysis progress ring) is labelled honestly as a time-based estimate, not a literal backend signal; and **claims about "is X static/dynamic" or "why does Y look wrong" get verified against actual code**, not answered from memory — this app has a long build history and fuzzy recall has caused real mistakes before (misdiagnosed bugs, doc inaccuracies).

---

## 3. The product: four tabs + ingestion + two knowledge systems

**Today** — flagship morning read.
- **What Changed** (01) — biggest movers, risk-ranked, plus an expandable **full indicator table** (16 tracked series: rates & inflation, curve, vol & credit, FX & commodities, equities — expanded from an original 7-item subset that silently excluded several movers, v5.5.1).
- **Top Developments** (02) — up to 5 items: **up to 4 are genuinely dynamic** (`deriveDevelopments()`, rules-based off live indicator values, e.g. "US CPI 3.7% — cooler than prior") plus **exactly 2 permanently static filler items** (geopolitics, CRE/private-credit — verbatim every day, `derived:false`) used to pad the list when fewer than 4 indicators moved meaningfully. Making the 2 static ones dynamic too is an open, deliberately-unbuilt fork (rules-based vs. a new LLM call) — see engineering reference backlog.
- **Today's CRO Conversation** (03) — ranked themes, collapsible cards.
- **Editorial Intelligence** (04), **Japan & Asia Watch** (05), **Also on the Radar** (06), **Generation History** (07 — snapshot + newsletter-ingestion sub-list, processed/skipped/failed).

**Markets** — Key CRO Dashboard, Japan Watch, Global Risk Heat Map, Top Emerging Risks, Implications for a Global Bank. Live FRED/Yahoo data. Payrolls/GDP deliberately excluded.

**Research** — the ephemeral analysis workspace, now the richest tab:
- Paste/URL/image analysis with a **circular progress ring** (time-estimate based, not literal backend progress — one non-streamed round-trip with several sequential calls inside it).
- Output mirrors Editorial Intelligence (What happened · sourced / Why it matters · interpretation / First-second order / Bank risk / Key takeaway / What to understand / What should I focus on), plus **Mizuho Top-Risks alignment** and **"Through Mizuho's lens"** (collapsible, default-closed — the Knowledge Repository interpretation).
- Print/Export PDF link, positioned prominently next to Read Article (was buried at the bottom of the card once, fixed).
- Newsletter ingestion panel ("Newsletters — today"), publisher-aware labelling, per-article links.

**Learn** — the repository, now 8 sections:
01 Saved Analyses · 02 Saved for Later · 03 Concept Library (curated, read-only) · **04 Add Concept** (new — paste/analyze/save CRUD prototype, separate store) · 05 Weekly Summary · 06 Mizuho Reference (structured cards of the disclosed-positions repository) · 07 Briefing Books (compiled documents with an AI preface + "Actions on me") · 08 Appearance (dark/light toggle).

**Two distinct "Mizuho" systems — don't conflate them:**
- **Mizuho Top Risks** (`lib/mizuhoTopRisks.ts`) — the original curated approximation, used for theme/analysis alignment, carries an explicit "not Mizuho's own view" disclaimer.
- **Mizuho Knowledge Repository** (v5.0+, restructured to a **multi-card architecture** in v5.2.1) — real disclosed positions (Basel Pillar 3, financial statements, investor presentations, risk governance, RAF/Top Risks, business model), organized as self-describing cards (`core_disclosures`, `risk_governance`, `risk_management`, `business_model`), each tagged to 1+ of 13 domains (the original 12 STEP-1 domains + **Governance**, added when governance/RAF source docs were uploaded). STEP 1 classify → STEP 2 retrieve only matched cards (the `business_model` card is special-cased to always join once *any* domain matches, since its whole purpose is business-line mapping) → STEP 3-5 interpret, never inventing beyond the excerpts, stating an honest gap when a domain has no card content yet (e.g. Operational Risk).

**Newsletter ingestion (cron + Python)** — pulls financial newsletters from IMAP (Bloomberg, finews, The Daily Upside), classifies, extracts structured stories with per-article URLs (Gemini primary, Anthropic fallback), stores per-briefing in KV.

**Print/PDF export (v5.3)** — dedicated light-themed routes (`/print/item?id=`, `/print/book?pack=`), browser-native Print → Save as PDF, not a server-rendered pipeline. Both routes have a bottom action bar (Back + Print) present on **every** state (loading/error/success) — this took two rounds to get right (a partial fix that only covered the success state reproduced the exact "stuck, had to kill the app" trap it was meant to solve).

**Briefing Books (v5.3)** — Monthly Research Book / Quarterly Executive Brief (trailing 30/90 days, not strict calendar boundaries) and 4 themed packs (Credit Risk, Market Risk, Japan Macro, AI & Technology — keyword-matched against category+title+interpretation, not exact category equality, since category is free LLM text). Each book = compiled matching saved items + a **dedicated AI-written preface** + a **dedicated "Actions on me" section** (What to learn / Ask leadership / Investigate further) — two separate LLM calls, not one, per the established "don't merge calls" lesson.

**Concept Studio (v5.5, "Add Concept")** — paste text → Gemini converts to the standard concept shape (term/formal/category/aliases/layman/risk/cro) → editable review → save. Full CRUD (create/read/update/delete). **Deliberately additive**: lives in its own Supabase table (`risk_dashboard.user_concepts`), does **not** feed into the curated static `lib/concepts.ts`, `detectConcepts()`, or `Linkify` auto-highlighting — that merge is an intentional, unbuilt follow-up once the workflow itself is validated.

**Dark/Light theming (v5.4)** — manual toggle only (no system-follow), Learn → 08 Appearance, `next-themes` + CSS-variable-based color tokens. The light palette preserves each surface's *role* (not a mechanical hex inversion) — card=white/"raised", pressed-state=gray (not lighter, since there's no headroom above white). Status colors (amber/purple especially) were deepened for text legibility on white. A real bug class was found and fixed during this work: ~22 places had entire card surfaces hardcoded to one-off dark hex (not the token system) — these would've rendered as broken dark islands in light mode.

---

## 4. How a day flows

1. **Editorial cron** (04:00 IST) builds the snapshot: news → cluster → interpret into themes → align to Mizuho Top-Risks → layman → persist. Gemini primary, Anthropic fallback. Does **not** yet call the Mizuho Knowledge Repository lens (Research-only so far — wiring it into daily themes is a known, deferred next step, waiting on Rohit's confidence in lens quality from Research usage).
2. **Newsletter cron** (05:30 & 19:00 IST) ingests into KV.
3. **Weekly cron** (Sat 06:00 IST, Anthropic-forced) re-rates the Markets spine against week-over-week deltas.
4. Reader opens **Today**, reads CRO Conversation, checks Markets, triages Research (with the Mizuho lens), saves to Learn (Supabase-backed), occasionally compiles a Briefing Book or exports a saved item to PDF.

---

## 5. Stack (conceptual)

Next.js (App Router) + TypeScript + Tailwind on **Vercel Pro**, GitHub push-to-deploy.
**Vercel KV (Upstash Redis)** — daily snapshot, weekly re-rate, newsletter digests, Mizuho-repository cache.
**Supabase (Postgres)** — saved items (`saved_items`) and user-added concepts (`user_concepts`), both in a dedicated `risk_dashboard` schema (isolated because the Supabase account is shared with another tool, "Orbit"). Requires the schema to be added to Supabase's "Exposed schemas" API setting, and explicit `service_role` grants (a real gotcha hit once — creating a schema does NOT auto-grant API-role access).
**LLMs:** Gemini 2.5 Flash (primary) + Anthropic claude-haiku (fallback — weekly job, newsletter extractor, main app's escalation ladder, and now Concept Studio's analyze call).
**Data:** FRED + Yahoo + IMAP newsletter ingestion + (per env vars found) Finnhub/Marketaux/NewsData/AlphaVantage for broader news sourcing.
A separate **Python Vercel Function** (`api/cron-bloomberg.py`) does newsletter ingestion.

See the engineering reference for exact files, keys, env vars, flows.

---

## 6. State at v5.5.2 (build history since the last doc refresh, v5.2.0)

**5.2.1** — Mizuho Knowledge Repository restructured from one flat object into a **multi-card architecture** (added 3 new cards from uploaded governance/RAF/business-model documents; 13th domain "Governance"; `business_model` card always-joins).

**5.3.x** — **Print/PDF export + Briefing Books**, combined into one release per Rohit's call. Then four rounds of UX fixes: bottom action bar for the iOS Dynamic Island (a top bar was unreachable), print link added directly to the live Research view (was only on saved items), print action bar applied to *every* page state (a first pass only covered the success state — reproduced the exact bug it was meant to fix), and the single-item print route moved from a dynamic path segment (`/print/[id]/<id>`) to a query string (`/print/item?id=`) after ids with colons/dots (`analysis-2026-07-08T03:40:11.845Z`) were mysteriously failing lookups — the old route now just redirects.

**5.4.0** — Dark/Light theming. Manual toggle, `next-themes`, CSS-variable token architecture, a deliberately-reasoned (not mechanical) light palette, and a real bug-class fix (hardcoded dark-only card surfaces that would've broken in light mode).

**5.5.0** — Concept Studio ("Add Concept") prototype: paste → Gemini analyze → review/edit → save, full CRUD, deliberately additive/separate from the curated concept system.

**5.5.1** — Bug fixes verified against actual code (not assumed): the concept card was only displaying `layman` despite saving everything correctly (display bug, not data loss); the indicator table was missing 9 tracked indicators due to a stale hardcoded whitelist; new app logo + icons (header, iOS home-screen, favicon, PWA manifest — manifest had no icons array before this); and a precise, code-verified answer to "are Top Developments static?" (partially — 2 of up to 5 items are permanently hardcoded).

**5.5.2** — Quick fixes: icon `onError` fallback (the logo PNG had been missed when applying the previous bundle — a recurring risk with binary assets in manual-apply workflows), indicator-table text wrapping fixed (`whitespace-nowrap` + horizontal scroll safety net now that the table carries 16 rows), Learn tab reordered (Add Concept moved next to Concept Library).

---

## 7. Open / deferred threads

- **Wire the Mizuho Knowledge Repository lens into the daily CRO Conversation themes** — Research-only so far; same shared components already exist (`interpretThroughMizuho`, `MizuhoLensBlock`), reuse not rebuild. Waiting on Rohit's confidence from Research usage before adding a model call to the daily critical path.
- **Make the 2 static "Top Developments" filler items dynamic** — a genuine fork (rules-based extension of `deriveDevelopments()` vs. a new LLM call similar to CRO Conversation), Rohit's call pending.
- **Merge Concept Studio's user-added concepts into the curated detection/rendering pipeline** (`detectConcepts()`, `Linkify`, the read-only Concept Library display) — deliberately not done in the prototype; a natural v2 once the workflow is validated.
- **Reconcile the two Mizuho systems** (curated Top-Risks approximation vs. the more authoritative disclosed-positions Knowledge Repository) — flagged as an interesting nuance when the repository was built, not acted on.
- **v4.6 "unified intelligence framework"** — long-deferred; v4.8.0 (Research→Editorial format) and the Mizuho-lens shared components are concrete steps toward it, full convergence still not done.

## 8. De-hardcoding status

- **Generated each cycle:** themes, Mizuho Top-Risks alignment, layman text, weekly heat/emerging ratings, bank implications, all Research analysis fields, the Mizuho-lens interpretation, briefing-book prefaces/action-items, Concept Studio drafts.
- **Curated by design:** Mizuho Top Risks taxonomy, the static concept library, indicator definitions, emerging-risk list, seed themes, the Mizuho Knowledge Repository's underlying disclosed content (point-in-time — ages, needs periodic re-seeding), the 2 static Top Developments filler items (see backlog).
