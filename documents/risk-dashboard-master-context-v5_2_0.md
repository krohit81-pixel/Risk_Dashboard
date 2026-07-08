# Global Risk Intelligence Dashboard — Master Context (v5.2.0)

> Self-describing project context so a fresh session can pick up cold without the full chat history.
> Pair with `engineering-reference-v5_2_0.md` (file-by-file/technical). This doc = product, purpose, principles, architecture at a conceptual level. Supersedes the v4.8.4 pair.

---

## 1. What this is & who it's for

A personal **CRO morning-briefing dashboard** built by **Rohit** ahead of joining **Mizuho as Head of Risk, India** (Aug 2026; onboarding via **Mizuho Americas**). A curated daily read that translates global risk/market/banking news into a Chief Risk Officer's lens, with Mizuho-specific framing, to accelerate role readiness and prep for discussions with senior risk leadership (e.g. Tim Healy, Shinohara-san).

**Working relationship & rhythm**
- Rohit is **not a developer**. He architects and directs; he does **not** write code. Deploys via **GitHub → Vercel** (push-to-deploy); no local build on his side.
- Strict **recommend → approve → build**. For anything large or invasive (e.g. the Supabase migration, v5.2), Claude proposes a phased plan with honest trade-offs *before* writing code, and asks for explicit sequencing/scope decisions rather than assuming them.
- **Diagnose before fixing**: explain root cause clearly before shipping changed code.
- Scope-creep pushback is expected and valued. When Claude adds something beyond the literal ask (e.g. `category`/`severity` columns during the Supabase migration), it says so explicitly and explains why.
- Deferred scope is a **hard stop**.

**Audience framing for content:** the reader onboards with Mizuho **Americas**, so editorial prioritisation ranks **US-relevant** developments first (Fed/FOMC, Treasury market & funding, US credit, US banking sector, US capital markets & regulation), with **Japan/BOJ/JGB/USDJPY** as important secondary context, Europe/EMEA tertiary.

---

## 2. Sacrosanct principles

1. **Translate, don't regenerate.** Translate real source material into the CRO lens; never invent news.
2. **Never invent risk mappings.** The Mizuho Top Risks taxonomy is a **curated approximation** of Mizuho's published framework, not a verified internal document or Mizuho's own view/exposure. The UI says so.
3. **Curated "spine" is sacrosanct.** Fewer, better signals. The emerging-risk list, indicator set, concepts, seed themes are deliberately curated and stable.
4. **No placeholder / empty content ever renders.** A section with nothing real either hides or shows an honest muted note.
5. **Zero hardcoded *interpretation*; keep curated *reference*.** Interpretations are generated each cycle; reference scaffolding stays curated.
6. **Credibility separation.** Sourced facts vs. AI interpretation are visually distinguished — "What happened · sourced" vs "Why it matters · interpretation" (Research/Editorial), and **FACT / MIZUHO CONTEXT · repository / INTERPRETATION** (the Mizuho lens, v5.0).
7. **Quality and relevance over quantity.**

**Persistent honesty caveats:** the Mizuho-taxonomy disclaimer; that the dev/build environment has no Gemini/Anthropic/FRED/**Supabase** live access, so those paths are validated by build/logic only — the first live run (or, for Supabase, the actual migration) is done and eyeballed by Rohit; and progress/estimate UI (e.g. the analysis progress ring, v5.2) is labelled honestly as an estimate, not a literal backend signal, when it isn't one.

---

## 3. The product: four tabs + ingestion + a knowledge repository

**Today** — flagship morning read. Risk gauge / overnight change / morning brief; **Today's CRO Conversation** (ranked themes, collapsible cards collapsed by default); **Editorial Intelligence** (secondary cards); **Japan/Asia Watch**; **Generation History** (snapshot runs + a "Newsletter ingestion" sub-list showing processed/skipped/failed per run — no redundant per-run badge).

**Markets** — live data. **Market Indicators** (daily) vs **Economic Releases** (monthly/quarterly: CPI headline + Core PCE, "Last released"). Sparklines. **Risk Heat Map** + **Emerging Risks**, each "Reviewed <date>" from the weekly job. Payrolls/GDP deliberately excluded.

**Research** — an **ephemeral workspace**, plus the newest major capability layer:
- **"Analyze your own content"** — paste text / URL / image, or one-tap analyse a newsletter story. Open by default. Shows a **circular progress ring** (v5.2) with a rotating stage label while analyzing — a time-based estimate (eases toward ~92%, snaps to 100% on completion), not a literal backend readout, since the analysis is one server round-trip with several sequential calls inside it.
- **Output mirrors Editorial Intelligence**: category·severity·horizon, **What happened · sourced**, **Why it matters · interpretation**, First-order/Second-order, Bank risk·{kind}, Key takeaway, What to understand, **What should I focus on** (personalized), **Mizuho Top-Risks alignment**, and — new in v5.0 — **"Through Mizuho's lens"**, collapsible/default-closed, showing the article interpreted through Mizuho's own disclosed positions (see §4).
- **Source/publication date** at the top ("Published {date}" from the article itself, else "Analyzed {date}").
- Pasted text with a leading URL is captured → saved card gets a "Read article ↗" link + site-name tag.
- **"Newsletters — today"** groups ingested briefings (Bloomberg editions, finews, The Daily Upside, …), collapsed by default, trimmed headers, per-article "Read article ↗" links, and a chip that shows the **real publisher** (not always "Bloomberg").
- Daily analysis quota = 20 (env-overridable).

**Learn** — the **growing repository**. Five sections: 01 Saved Analyses, 02 Saved for Later, 03 Concept Library, 04 Weekly Summary, **05 Mizuho Reference (v5.1)** — structured cards (Capital & Liquidity, Financial Profile, Strategy & Targets, Risk Philosophy, Executive Questions) summarising the same repository the lens draws on, for quick reference. Saved cards collapsed by default, colour-accented, per-source chips. Saved Research analyses preserve the full Editorial format, including the Mizuho lens.

**Newsletter ingestion (cron + Python)** — pulls financial newsletters from IMAP, classifies each into a briefing type, extracts structured stories (with per-article URLs) via the LLM (Gemini primary, Anthropic fallback), stores per-briefing in KV.

**Mizuho Knowledge Repository (v5.0/5.1)** — a static, versioned body of Mizuho's own disclosed positions (Basel Pillar 3, financial statements, investor presentations, risk appetite, governance): capital/liquidity metrics, financial profile, strategy & targets, risk philosophy, executive questions. Every Research analysis is interpreted through it: **STEP 1** classify the article into repository domains (Capital, Liquidity, Credit, Market, Operational Risk, Corporate Banking, Treasury, Wealth/Asset Management, Strategy, Financial Results, Regulation, Japan Macro) → **STEP 2** retrieve *only* the matched sections (never the whole repository) → **STEP 3-5** interpret through Mizuho's disclosed perspective, preferring disclosure over generic banking knowledge, never inventing facts, and stating explicitly when the repository has no supporting disclosure for a domain (e.g. Operational Risk currently has none). Kept **alongside**, not merged into, the existing curated Top-Risks alignment.

---

## 4. How a day flows

1. **Editorial cron** (04:00 IST) builds the snapshot: news → cluster → interpret clusters into themes → align to Mizuho Top-Risks → layman → persist. Gemini primary, Anthropic fallback.
2. **Newsletter cron** (05:30 & 19:00 IST) ingests newsletters into KV.
3. **Weekly cron** (Sat 06:00 IST, Anthropic-forced) re-rates the Markets spine against the week's evidence (fed week-over-week deltas) and stamps "Reviewed".
4. Reader opens **Today**, reads the CRO Conversation, checks Markets, triages newsletters + analyses own content in Research (now with the Mizuho lens), saves keepers to Learn (now durable in Supabase).

The daily CRO Conversation themes do **not** yet carry the Mizuho-lens interpretation — that's a deliberately deferred next step (v5.0 shipped Research + the shared components; wiring the same into the daily themes is queued, pending Rohit's confidence in lens quality from Research usage).

---

## 5. Stack (conceptual)

Next.js (App Router) + TypeScript + Tailwind on **Vercel Pro**, GitHub push-to-deploy.
**Vercel KV (Upstash Redis)** — daily snapshot, weekly re-rate, newsletter digests, Mizuho-repository cache (`mizuho:knowledge:master`).
**Supabase (Postgres)** — saved items only, as of v5.2. Isolated in its own schema (`risk_dashboard`) since the Supabase account is shared with another tool ("Orbit").
**LLMs:** Gemini 2.5 Flash (primary) + Anthropic claude-haiku (fallback — weekly job, newsletter extractor, and the main app's escalation ladder).
**Data:** FRED + Yahoo + IMAP newsletter ingestion.
A separate **Python Vercel Function** (`api/cron-bloomberg.py`) does ingestion.

See the engineering reference for exact files, keys, env vars, flows.

---

## 6. State at v5.2.0 (recent build history)

**4.6.x–4.9.x** — live Markets data; weekly deltas + reviewed dates; ingestion hardening (BODY.PEEK, comma-tolerant config, ingestion-based staleness, force re-ingest, dedupe/skip logging); Research reshaped to the Editorial format + quota 20 + newsletter per-article URLs; newsletter publisher labelling fixed; Anthropic-fallback token limit fixed (truncated JSON on large briefings).

**5.0.0** — **Mizuho Knowledge Repository**, wired into Research analyses. Domain classification → selective retrieval → dedicated interpretation call → FACT/CONTEXT/INTERPRETATION-separated render, alongside the existing Top-Risks alignment.

**5.1.x** —
- 5.1.0: newsletter capsule removed from generation history; Mizuho-lens header alignment fixed + collapsible (default closed); Learn section 05 "Mizuho Reference"; underlying `mizuhoKnowledge.ts` split into a client-safe data module (`mizuhoKnowledgeData.ts`) + a server-only module, so the Learn cards can read the repository directly.
- 5.1.1: bug fix — `mizuhoLens` (and `articleDate`) were being silently stripped from saved analyses by a hand-maintained field whitelist in the old KV save path; fixed by adding them to the whitelist (later made structurally impossible to recur — see v5.2).
- 5.1.2: cosmetic — "Weekly Learning Summary" section title shortened to "Weekly Summary" (was wrapping to two lines); re-included the 5.1.1 fix in case it hadn't deployed.

**5.2.0** — **Supabase migration for saved items.** Moved off the single `saved:items` KV blob onto a Postgres table (`risk_dashboard.saved_items`, schema-isolated for the shared Supabase account) with structured filter/sort columns (kind, category, severity, dates) plus one authoritative `payload` JSONB column holding the complete `SavedItem`. This structurally closes the whitelist-fragility bug class hit in 5.1.1 — a new field can never be silently dropped again, since the payload is the object itself, not a hand-reconstructed copy. `category`/`severity` added to `SavedItem` and threaded through all four save mappers (deliberate addition beyond pure migration, to support future briefing-book filtering). One-time idempotent migration route copies existing KV data into Supabase without deleting it. Also added a circular progress ring (time-estimate based, honestly labelled) to the Research analyze flow.

---

## 7. Open / deferred threads

- **v5.3 (next)** — print/PDF export for saved items. Planned approach: a dedicated print-styled route + the browser's native Print → Save as PDF, not a heavy server-rendered PDF pipeline (Puppeteer-class tooling is a real infra addition on Vercel serverless) — upgradeable later if needed.
- **v5.4 (after 5.3)** — briefing books: Monthly Research Book, Quarterly Executive Brief, and themed packs (Credit Risk, Market Risk, Japan Macro, AI & Technology, …), compiled from Supabase-queried saved items **plus a short AI-written preface/executive summary** tying the theme together (Rohit's call — not a straight compile). Built on the `category`/`severity`/date columns landed in v5.2. "AI & Technology" is a new category, not present in the current taxonomy — will need adding when this is built.
- **Wire the Mizuho lens into the daily CRO Conversation themes** — v5.0's deferred second half; same shared components (`interpretThroughMizuho`, `MizuhoLensBlock`) already built, reuse rather than rebuild. Waiting on Rohit having seen enough lens quality from Research before adding another model call to the daily critical path.
- **v4.6 "unified intelligence framework"** — long-deferred. One canonical intelligence object → one renderer → many generators; schema designed top-down from the richest object. *Note:* v4.8.0 (Research → Editorial format) and v5.0 (shared Mizuho-lens component across Research/future-CRO-Conversation) are concrete steps toward this convergence, though the full single-schema/single-renderer refactor remains deferred.
- Continued Markets evolution within the curated boundary (no payrolls/GDP).

## 8. De-hardcoding status

- **Generated each cycle:** themes, Mizuho Top-Risks alignment, layman text, weekly heat/emerging ratings + notes, bank implications, all Research analysis fields, the Mizuho-lens interpretation (context/businesses/stripes/impacts, grounded in retrieved repository sections).
- **Curated by design:** Mizuho Top Risks taxonomy, concept library, indicator definitions/which-series, emerging-risk list, seed themes, the Mizuho Knowledge Repository itself (point-in-time disclosure — ages, needs periodic re-seeding, not auto-updated).
