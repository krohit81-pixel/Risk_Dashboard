# Global Risk Intelligence Dashboard — Master Context (v4.7.4)

> Self-describing project context so a fresh session can pick up cold without the full chat history.
> Pair this with `engineering-reference-v4_7_4.md` (file-by-file/technical). This doc = product, purpose, principles, architecture at a conceptual level.

---

## 1. What this is & who it's for

A personal **CRO morning-briefing dashboard** built by **Rohit** ahead of joining **Mizuho as Head of Risk, India** (Aug 2026; onboarding via **Mizuho Americas**). It is a learning + readiness tool: a curated daily read that translates global risk/market/banking news into a Chief Risk Officer's lens, with Mizuho-specific framing, to accelerate role readiness and prep for discussions with senior risk leadership (e.g. Tim Healy, Shinohara-san).

**Working relationship & rhythm**
- Rohit is **not a developer**. He architects and directs; he does **not** write code. He deploys via **GitHub → Vercel** (push-to-deploy); no local build on his side.
- Strict **recommend → approve → build** rhythm. Proposals + honest trade-offs come *before* any code. Scope-creep pushback is expected and welcomed. Quality over efficiency.
- Deferred scope is a **hard stop**, not a soft suggestion.

**Audience framing for content:** the reader is onboarding with Mizuho **Americas**, so editorial prioritisation ranks **US-relevant** developments first (Fed/FOMC, Treasury market & funding, US credit, US banking sector, US capital markets & regulation), with **Japan/BOJ/JGB/USDJPY** as important secondary context (also surfaced in a dedicated Japan section), and Europe/EMEA tertiary.

---

## 2. Sacrosanct principles

These are treated as non-negotiable design constraints:

1. **Translate, don't regenerate.** Take real source material and translate it into the CRO lens. Do not invent news.
2. **Never invent risk mappings.** The Mizuho Top Risks taxonomy is a **curated approximation** of Mizuho's published framework (Mar 2025), *not* a verified internal document or Mizuho's own view/exposure. Alignment results say so on-screen.
3. **Curated "spine" is sacrosanct.** Fewer, better signals — not more. The emerging-risk list, indicator set, concepts, and seed themes are deliberately curated and stable.
4. **No placeholder / empty content ever renders.** A section with nothing real to show does not render (or shows an honest muted note), never an empty/N/A shell.
5. **Zero hardcoded *interpretation*; keep curated *reference*.** Interpretations (ratings, notes, themes, implications) are model-generated each cycle. Reference scaffolding (definitions, taxonomy, the list of which indicators/risks exist) stays curated.
6. **Quality and relevance over quantity.**

**Honesty caveats that must persist:** the Mizuho taxonomy disclaimer (above); and when a build can't be validated against the live model/FRED (the dev environment has no Gemini/Anthropic/FRED keys), that limitation is stated rather than glossed.

---

## 3. The product: four tabs + ingestion

**Today** — the flagship morning read.
- Risk gauge / "what changed overnight" / morning brief.
- **Today's CRO Conversation** — ranked *themes* (the editorial core), each a collapsible card (collapsed by default as of v4.7.0) with category · severity · risk-horizon, "why it matters", banking impact, Mizuho bullets, Mizuho-alignment, and a "Go deeper" teaching layer (lenses, signals, questions, talking points).
- **Editorial Intelligence** — secondary "other developments" cards.
- **Japan / Asia Watch** — dedicated Japan narrative.
- **Generation History** — snapshot runs + a separate **Bloomberg/Newsletter ingestion** sub-list (run records).

**Markets** — live market & macro data.
- Split into **Market Indicators** (daily; rates, FX, equity vol, credit proxies) and **Economic Releases** (monthly/quarterly; CPI headline + Core PCE, with a "Last released" date).
- Inline SVG sparklines on indicator cards; YoY history where relevant.
- **Risk Heat Map** (by region) and **Emerging Risks** cards, each carrying a "Reviewed <date>" stamp once the weekly job re-rates them.
- Scope boundary: payrolls and GDP are **deliberately excluded** (not an oversight).

**Research** — an **ephemeral workspace**.
- Paste text / URL / image, or one-tap analyse a **newsletter** story; everything runs the shared CRO analysis framework.
- **"Newsletters — today"** panel (renamed from "Bloomberg — today" in v4.7.4) groups ingested newsletter briefings (Bloomberg editions, finews, etc.), each group collapsible, with its own freshness state.
- Analyses can be saved into Learn.

**Learn** — the **growing repository**.
- Concepts · Saved Analyses · Saved Articles · Weekly Learnings.
- Saved cards collapsed by default; colour-accented sections; per-source chips (Bloomberg / site-name URL / screenshot / pasted).

**Newsletter ingestion (cron + Python):** an in-repo Python Vercel Function pulls financial newsletters from an IMAP inbox, classifies each into a briefing type, extracts structured stories via the LLM, and stores them in KV per-briefing. Surfaced in the Research "Newsletters — today" panel and the Today ingestion history.

---

## 4. How a day flows

1. **Editorial cron** (daily, 04:00 IST) builds the day's snapshot: gather news → cluster → **interpret clusters into themes** (the big editorial call) → align to Mizuho → layman translation → persist. Gemini primary, Anthropic fallback.
2. **Newsletter cron** (twice daily, 05:30 & 19:00 IST) ingests newsletters into KV.
3. **Weekly cron** (Sat 06:00 IST, Anthropic-forced) re-rates the Markets spine (heat map, emerging-risk ratings, implications) against the week's evidence — now fed **week-over-week deltas** — and stamps each region/risk "Reviewed".
4. Reader opens **Today**, reads the CRO Conversation, drills into Markets, triages newsletters in Research, saves keepers to Learn.

---

## 5. Stack (conceptual)

- **Next.js (App Router) + TypeScript + Tailwind**, deployed on **Vercel Pro**, GitHub push-to-deploy.
- **Vercel KV (Upstash Redis)** for persistence.
- **LLMs:** Gemini 2.5 Flash (primary) + Anthropic claude-haiku (fallback / weekly / and now the newsletter-extractor fallback).
- **Data:** FRED (economic indicators), Yahoo (market quotes), and IMAP newsletter ingestion.
- **Python Vercel Function** for newsletter ingestion (separate from the Next API routes).

See the engineering reference for exact files, KV keys, env vars, and data flow.

---

## 6. State at v4.7.4 (what's been built recently)

**4.6.x — live Markets + Learn polish**
- Live **CPI (headline) + Core PCE**; Market Indicators vs Economic Releases split; "Last released" labels; **sparklines** everywhere (incl. Japan Watch).
- Root-cause fix: CPI had shown sample data because a YoY fetch hard-failed on an exact observation count; rewritten to degrade gracefully on a minimum threshold.
- Learn tab colour accents + kind/source chips.
- Clarified the emerging-risk **list** is curated/static by design; ratings/notes refresh weekly.

**4.7.x — backlog + ingestion hardening**
- Weekly re-rate now fed **week-over-week deltas**; prompt anchor loosened (re-rate from evidence, don't rubber-stamp).
- **"Reviewed <date>"** on heat-map regions and emerging risks.
- CRO Conversation cards **collapsible, collapsed by default**; risk-horizon header alignment fixed.
- Saved-source chips: Bloomberg relabels old saves; URLs show **site name** ("CNBC URL").
- **Configurable ingestion** via env (provider, senders, extra newsletter keywords, lookback) — see engineering ref.
- Fewer morning Anthropic escalations: theme count bound to cluster count; Gemini sharpened re-ask before escalation.
- Ingestion bug fixes: `BODY.PEEK[]` so the date-check never marks mail read; comma-tolerant keyword parsing; ingestion-based (not content-age) staleness; `?force=true` re-ingest.
- v4.7.4: **"Newsletters — today"** rename; source-agnostic multi-story extraction (finews captured fully); **Anthropic fallback inside the extractor** for Gemini 503 spikes.

---

## 7. Open / deferred threads

- **v4.6 "unified intelligence framework"** brainstorm — explicitly **deferred** by Rohit ("let me think more"). Full critique is in the chat transcript; not committed work. Gist: one canonical intelligence object → one renderer → many generators; design schema top-down from the richest object (CRO Conversation); uniform frame + variable depth; keep source-provenance chip; stage via adapters, not a big-bang.
- Continued Markets evolution within the curated boundary (no payrolls/GDP).
- Ongoing ingestion reliability tuning as real-world data accumulates.

## 8. De-hardcoding status

- **Model-generated each cycle:** themes, Mizuho alignment, layman text, weekly heat/emerging ratings + notes, bank implications.
- **Curated by design (intentional):** Mizuho Top Risks taxonomy, concept library, indicator definitions/which-series, the emerging-risk list, seed themes.
