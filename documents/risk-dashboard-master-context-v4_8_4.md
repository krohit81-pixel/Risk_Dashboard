# Global Risk Intelligence Dashboard — Master Context (v4.8.4)

> Self-describing project context so a fresh session can pick up cold without the full chat history.
> Pair with `engineering-reference-v4_8_4.md` (file-by-file/technical). This doc = product, purpose, principles, architecture at a conceptual level. Supersedes the v4.7.4 pair.

---

## 1. What this is & who it's for

A personal **CRO morning-briefing dashboard** built by **Rohit** ahead of joining **Mizuho as Head of Risk, India** (Aug 2026; onboarding via **Mizuho Americas**). It is a learning + readiness tool: a curated daily read that translates global risk/market/banking news into a Chief Risk Officer's lens, with Mizuho-specific framing, to accelerate role readiness and prep for discussions with senior risk leadership (e.g. Tim Healy, Shinohara-san).

**Working relationship & rhythm**
- Rohit is **not a developer**. He architects and directs; he does **not** write code. He deploys via **GitHub → Vercel** (push-to-deploy); no local build on his side.
- Strict **recommend → approve → build** rhythm. Proposals + honest trade-offs come *before* any code. Scope-creep pushback is expected and welcomed. Quality over efficiency.
- **Diagnose before fixing:** when something breaks, explain the root cause clearly *before* shipping changed code.
- Deferred scope is a **hard stop**.

**Audience framing for content:** the reader onboards with Mizuho **Americas**, so editorial prioritisation ranks **US-relevant** developments first (Fed/FOMC, Treasury market & funding, US credit, US banking sector, US capital markets & regulation), with **Japan/BOJ/JGB/USDJPY** as important secondary context (also in a dedicated Japan section), Europe/EMEA tertiary.

---

## 2. Sacrosanct principles

1. **Translate, don't regenerate.** Translate real source material into the CRO lens; never invent news.
2. **Never invent risk mappings.** The Mizuho Top Risks taxonomy is a **curated approximation** of Mizuho's published framework (Mar 2025), not a verified internal document or Mizuho's own view/exposure. The UI says so.
3. **Curated "spine" is sacrosanct.** Fewer, better signals. The emerging-risk list, indicator set, concepts, seed themes are deliberately curated and stable.
4. **No placeholder / empty content ever renders.** A section with nothing real either hides or shows an honest muted note.
5. **Zero hardcoded *interpretation*; keep curated *reference*.** Interpretations (ratings, notes, themes, implications) are generated each cycle; reference scaffolding (definitions, taxonomy, which indicators/risks exist) stays curated.
6. **Credibility separation.** Sourced facts vs. AI interpretation are visually distinguished ("What happened · sourced" vs "Why it matters · interpretation").
7. **Quality and relevance over quantity.**

**Persistent honesty caveats:** the Mizuho-taxonomy disclaimer; and that the dev environment has no Gemini/Anthropic/FRED keys, so live model/FRED paths are validated by build/logic only — the first live run is eyeballed.

---

## 3. The product: four tabs + ingestion

**Today** — flagship morning read. Risk gauge / overnight change / morning brief; **Today's CRO Conversation** (ranked themes, collapsible cards collapsed by default, each with category·severity·horizon, why it matters, banking impact, Mizuho bullets + alignment, and a "Go deeper" teaching layer); **Editorial Intelligence** (secondary cards); **Japan/Asia Watch**; **Generation History** (snapshot runs + a separate **Newsletter ingestion** sub-list — renamed from "Bloomberg" in v4.8.4 — showing processed/skipped/failed per run).

**Markets** — live data. **Market Indicators** (daily) vs **Economic Releases** (monthly/quarterly: CPI headline + Core PCE, "Last released"). Inline sparklines. **Risk Heat Map** (by region) + **Emerging Risks**, each with a "Reviewed <date>" stamp from the weekly job. Payrolls/GDP deliberately excluded.

**Research** — an **ephemeral workspace** (the v4.8 focus area).
- **"Analyze your own content"** workspace: paste text / URL / image, or one-tap analyse a newsletter story. Open by default (v4.8.4).
- **Output now mirrors Editorial Intelligence** (v4.8.0): a card with category·severity·horizon, **What happened · sourced**, **Why it matters · interpretation**, **First-order / Second-order**, **Bank risk · {kind}**, **Key takeaway**, **What to understand** (learning), then **What should I focus on** (the v4.4 personalized focus), with **Mizuho alignment** kept below + the framework disclaimer, and related concepts.
- **Source/publication date** shown at the top of each analysis (v4.8.4): "Published {date}" when the article's own date is found (from URL/text/screenshot), else "Analyzed {date}".
- **Pasted-with-URL** (v4.8.3): a link pasted at the top is captured → saved card gets a "Read article ↗" link + a site-name source tag ("CNBC URL").
- **"Newsletters — today"** panel groups ingested newsletter briefings (Bloomberg editions, finews, …). Collapsed by default (v4.8.4); per-briefing groups also collapsible; headers trimmed ("Evening Briefing — Americas" → "Americas — Eve"); per-article **"Read article ↗"** links (v4.8.0).
- Daily analysis **quota = 20** (v4.8.0), env-overridable.

**Learn** — the **growing repository**. Concepts · Saved Analyses · Saved Articles · Weekly Learnings. Saved cards collapsed by default; colour-accented; per-source chips. Saved Research analyses preserve the full Editorial format (v4.8.1).

**Newsletter ingestion (cron + Python):** an in-repo Python Vercel Function pulls financial newsletters from an IMAP inbox, classifies each into a briefing type, extracts structured stories (with per-article URLs) via the LLM, and stores them per-briefing in KV. Surfaced in the Research "Newsletters — today" panel and the Today ingestion history.

---

## 4. How a day flows

1. **Editorial cron** (04:00 IST) builds the snapshot: news → cluster → interpret clusters into themes → align to Mizuho → layman → persist. Gemini primary, Anthropic fallback.
2. **Newsletter cron** (05:30 & 19:00 IST) ingests newsletters into KV.
3. **Weekly cron** (Sat 06:00 IST, Anthropic-forced) re-rates the Markets spine against the week's evidence (fed week-over-week deltas) and stamps "Reviewed".
4. Reader opens **Today**, reads the CRO Conversation, checks Markets, triages newsletters + analyses own content in Research, saves keepers to Learn.

---

## 5. Stack (conceptual)

Next.js (App Router) + TypeScript + Tailwind on **Vercel Pro**, GitHub push-to-deploy. **Vercel KV (Upstash Redis)** for persistence. **LLMs:** Gemini 2.5 Flash (primary) + Anthropic claude-haiku (fallback / weekly / and the newsletter-extractor fallback). **Data:** FRED + Yahoo + IMAP newsletter ingestion. A separate **Python Vercel Function** does ingestion. See the engineering reference for exact files, KV keys, env vars, flows.

---

## 6. State at v4.8.4 (recent build history)

**4.6.x** — live CPI + Core PCE; Market Indicators vs Economic Releases split; sparklines; Learn colours; clarified emerging-risk list is curated/static.

**4.7.x** — weekly re-rate fed week-over-week deltas + loosened anchor; "Reviewed <date>" stamps; CRO cards collapsible/aligned; saved-source chips (Bloomberg relabel, site-name URLs); **configurable ingestion** env; fewer morning Anthropic escalations; ingestion hardening (`BODY.PEEK[]`, comma-tolerant keyword parsing, ingestion-based staleness, `?force=true`); **"Newsletters — today"** rename; source-agnostic multi-story extraction; **Anthropic fallback inside the extractor**.

**4.8.x** —
- 4.8.0: newsletter **per-article URLs**; newsletter sub-sections collapsed; **research quota → 20**; **Research output reshaped to the Editorial format** + "What should I focus on".
- 4.8.1: saved Research analyses **keep the editorial format**; trimmed newsletter headers; saved footer shows just the analyzed date.
- 4.8.2: **dedupe/empty skips now logged** + "skipped" count in ingestion history (diagnosing "picked but not processed" = dedupe).
- 4.8.3: **pasted leading URL captured** (Read article + site-name tag); research workspace collapsible.
- 4.8.4: collapse defaults (Newsletters collapsed, workspace open); **"Newsletter ingestion"** rename; **article source/publication date** on analyses (with analyzed-date fallback).

---

## 7. Open / deferred threads

- **v4.6 "unified intelligence framework"** — explicitly **deferred** by Rohit. Gist: one canonical intelligence object → one renderer → many generators; schema designed top-down from the richest object (CRO Conversation); uniform frame + variable depth; keep source-provenance chip; stage via adapters. *Note:* v4.8.0 already moved Research onto the Editorial card shape — a concrete step toward this convergence, though the full single-schema/single-renderer refactor remains deferred.
- Continued Markets evolution within the curated boundary (no payrolls/GDP).
- Ongoing ingestion reliability tuning.

## 8. De-hardcoding status

- **Generated each cycle:** themes, Mizuho alignment, layman text, weekly heat/emerging ratings + notes, bank implications, all Research analysis fields.
- **Curated by design:** Mizuho Top Risks taxonomy, concept library, indicator definitions/which-series, emerging-risk list, seed themes.
