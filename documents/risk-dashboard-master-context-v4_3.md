# Risk Dashboard — Master Context (v4.3)

> Permanent reference for all future development. Read this first. It tells you what the app is, why it exists, how it works, what is built, the principles that must never break, the lessons we learned the hard way, and how to extend it. **Facts** are stated plainly; inferences are marked **[Assumption]**.

---

## 1. Executive Summary

**Purpose.** The Global Risk Intelligence Dashboard is a daily morning briefing that explains what is happening across global markets and macro, what risks are emerging, what senior CROs are likely discussing, and how developments translate into bank risk implications — **and how they map onto the risks Mizuho's own Board has named as its top risks.**

**Target audience.** A single primary user: **Rohit Kohli**, incoming **Head of Risk India at Mizuho** (joining 10 Aug 2026). It is a *personal learning and decision-support tool* — explicitly **not** a production banking platform, **not** for board/management reporting, and **not** a Bloomberg/Reuters replacement.

**Business value.** Accelerates Rohit's fluency in CRO-level thinking and the language of senior risk executives and Japanese leadership, reducing the first-6–12-month learning curve in the new role.

**Key differentiators.** Interpretation over data density; "what changed / why it matters / why CROs care / why Mizuho cares"; **events mapped to Mizuho's published Top Risks taxonomy** as the durable learning spine; grounded AI commentary tied to live market anchors; a whole-screen plain-English **Learning view**; an accumulating personal **concept library**; honest provenance and degradation labelling.

---

## 2. Product Vision

**Long-term vision.** Evolve from a market-data display into a system that *interprets and teaches* — translating news and data into CRO-level insight and conversation readiness, with Japan/Mizuho relevance foregrounded, and compounding the user's knowledge over time.

**Success criteria.** Rohit can walk into a senior risk discussion fluent in current themes; the tool reliably produces a trustworthy daily briefing; learning compounds; the user increasingly does *not* need to leave the app to understand a story.

**Strategic objectives.** (1) Practical, executive-level understanding (not academic). (2) Conversation readiness. (3) Japan/Mizuho specificity. (4) Durable, low-maintenance reliability. (5) Self-directed learning and retention.

**12–24 month evolution [Assumption].** Editable knowledge base (V4); in-context follow-up questions ("chat with this topic"); possible GCC/operating-model planning module (separate future phase in the vision doc). Multi-user productisation is *not* a current goal.

---

## 3. Current Version Snapshot — v4.3

**Major capabilities.** Live market data layer (17 indicators); frozen daily AI editorial layer; live news ingestion (4 adapters) + LLM interpretation (Gemini-first, Anthropic backup); **whole-screen plain-English Learning view**; **personal concept library (Learn tab)**; **Mizuho Risk Alignment on every theme** (chip in Executive view, "Why Mizuho cares" twin in Learning view); theme persistence (NEW / Day-N / seen N×) with stable-id tracking; four-tab mobile UI (Today · Markets · Research · Learn); **Research Workspace with a daily-cap reservation guard and bulleted, per-area banking-impact (each with a plain-English twin)**; **Saved items capture the full piece — deeper sections included — and render in Learn with a Learning/Executive toggle (Learning default)**; **weekly Markets refresh (heat map + emerging risks + implications) and Weekly Learning, generated Saturday mornings on Anthropic off the Gemini quota**; **Bank Implications linked 1:1 to Emerging Risks (weekly-generated)**; **robust theme persistence + a “what’s new” delta on recurring themes**; **single transient-retry on Gemini before the Anthropic fallback**; full provider-selection diagnostics; degradation visibility.

**What changed across 3.4 → 3.9.**
- **3.4** — Built-in "Explain simply" (per-term Layman + Risk-language), grounded; header overlap fix. *(Superseded by 3.6; now retired.)*
- **3.5** — **Learn tab became a concept library**: ~24 curated CRO concepts (Layman · Risk-language · why-a-CRO-cares · visual chain · "where seen"), auto-collected as themes mention them, pinnable, searchable; theme terms link into Learn.
- **3.6** — **Learning view became a whole-screen plain-English rewrite**: every prose field swaps to a pre-generated layman twin. The toggle is now a *language switch*, not a "show more" switch. "Explain simply" retired.
- **3.7** — Polish: toggle scoped to **Today** tab and sections 03+ only; persistence fixed via **topicId normalisation**; "Explain This" removed everywhere; footer is name-only. Provider-selection diagnostics added.
- **4.0** — **Research Workspace.** A new **Research** tab (Today · Markets · Research · Learn) turns the dashboard from "tell me what happened today" into "help me understand any risk content." The user pastes text (primary) or a URL (best-effort) and gets the SAME framework as editorial — What Happened · Why It Matters · Banking Impact · Why Mizuho cares · Learning twin · linked existing concepts — via a **shared `analyzeContent()` pipeline**. Actions: **Save to Learn** / **Analyze another**. Saved analyses become a content type in Learn (with source-type, analysis-date, save-date, original-URL metadata). Research is **fully isolated** from the daily snapshot (ephemeral; persists nothing unless saved). This release also **restored the dedicated Mizuho alignment call** (inline tagging in 3.9a under-produced — only ~1 theme aligned; a focused call restores reliable coverage). PDF/DOCX/OCR, Ask-About-This, Supabase, notes and chat remain out of scope.
- **3.9** — **Mizuho Risk Alignment.** Each theme is mapped to Mizuho's published **Top Risks** (and the specific published *scenario* under each) by a grounded interpretation step. Renders as a purple alignment chip in Executive view and a *"Why Mizuho cares"* narrative twin in Learning view — anchored to the published scenario, with derived confidence, and **allowed to return no match**. Backed by a curated, locally-held Top Risks framework refreshed on a **quarterly** diff-check.
- **4.1** — **Research hardening + bulleted impact.** Two coordinated changes. (1) **Research reservation guard:** a configurable per-IST-day cap on Research analyses (`RESEARCH_DAILY_CAP`, default **5**) enforced in `lib/researchQuota.ts` + the analyze route. The cron and manual regenerate are **exempt by construction** (they never touch the counter), so Research can never starve the daily briefing of Gemini quota — Research degrades first, editorial never does. At the cap the UI disables with a visible reason; there is **no silent Anthropic fallback for Research** (the backup is reserved for editorial). The UI also shows remaining budget for the day. (2) **Bulleted banking impact:** the Research analysis now returns banking impact as discrete **areas** (Credit risk · Market risk · Liquidity & funding · Capital · Operational risk), only those that genuinely apply (no N/A padding), **each with its own plain-English twin** so the Learning view reaches Today-tab parity on impact. Driven by the standard `analyzeContent()` pipeline — not an optional enhancement. Context that informed the cap: the live Gemini key is confirmed on the **free tier (5 RPM / 250K TPM / 20 RPD)**, with observed peak 12/20 RPD; cap=5 keeps comfortable editorial headroom under that ceiling.
- **4.1a** — **Save parity + full-piece capture.** Closes a gap left by 4.1: saved items previously stored only a flat executive summary, so Learn lost the bullets and the plain-English view. Now the save schema (`SavedItem` + `SavedDetail`) carries the **structured banking-impact areas, every layman twin, and the deeper sections** (lenses, signals, leadership questions, talking point, follow-up, what-to-understand; editorial first/second-order + key takeaway). Learn renders the full piece behind a **Learning/Executive toggle (Learning default)** with a *Full detail* expander. Capture is centralised in `lib/savedMappers.ts`, which maps the **raw** (unresolved) source item so BOTH variants survive regardless of the view active at save time. Storage stays on **Vercel KV** (decision below) — Supabase deferred.
- **4.1b** — **Save persistence fix + Learn cosmetics.** Fixed a real bug: the `/api/saved` POST route was rebuilding each item from only the old v4.0 fields, silently dropping `whatHappened` / `bankingImpactAreas` / `layman` / `detail` before writing to KV — so saved content looked complete until a refresh re-fetched the stripped record. Route now persists the full shape. (Items saved before the fix remain stripped — re-save to repair.) Cosmetics: Concept Library made collapsible; each saved card collapsible; saved-card labels recoloured to match the Today/Research palette (interpretation amber, sourced/structural steel, Mizuho purple).
- **4.2** — **Weekly Markets refresh + Weekly Learning (Anthropic).** A dedicated weekly cron (Saturday ~06:00 IST) refreshes Markets sections 03–05 and the Weekly Learning summary, grounded on the week's daily snapshots + live indicators. **Always Anthropic** via a new per-call `forceProvider` override, so it never touches the free-tier Gemini quota (standing rule: *Gemini = daily editorial + Research; Anthropic = weekly*). **Whole heat map** is refreshed (severity included — the daily live US overlay is replaced by the weekly-frozen artifact when present). Emerging Risks + Implications **re-rate a curated spine** (region/id/development labels fixed; only ratings + reads change — never invents risks). Fail-soft: a missed run keeps last week's artifact. Markets shows a *last refreshed* stamp; the weekly run is logged in Generation History tagged `weekly`.
- **4.3** — **Reliability + linkage + theme hygiene.** Four coordinated fixes. (1) **Transient Gemini retry:** the provider layer now retries a Gemini call **once** (~35s gap, `GEMINI_RETRY_MS`) for *transient* failures only — 503 high-demand, 429, 5xx, timeout — before falling back to Anthropic; permanent failures (bad key, invalid JSON) skip the retry. Single attempt, capped to stay under the 180s function budget. (2) **Robust theme persistence:** `resolveTopicId` maps a theme to a canonical topic only when the *title* supports it (closed keyword vocabulary), else mints a specific title slug — fixing the bug where a new story reused a broad slug (e.g. `geopolitical-tail`) and wrongly showed “Day 5”, and the reverse drift. (3) **“What’s new”:** recurring themes carry a deterministic, quota-free delta vs the prior snapshot (severity change / newly added signal), shown as a green callout. (4) **Risks ↔ Implications linked:** Bank Implications are now keyed 1:1 to Emerging Risks (`riskId`); the weekly job generates one implication per risk, so all five risks get a linked bank implication (was 5 risks / 3 unrelated implications). Cold-start fallback still shows the curated set until the first weekly run.

**User workflow.** Open app → **Today** tab (brief → what changed → themes) for a 2-minute read; on each theme, scan the **Mizuho alignment chip**; flip **Learning view** to read the conversation/editorial/Japan sections in plain English *and* expand each alignment into "why Mizuho cares"; tap **Go deeper** for mechanics/talking points; tap a risk term to jump to its **Learn** entry; **Markets** tab for the numbers; **Learn** tab to browse/pin/search.

---

## 4. Architecture Overview

**Stack.** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · Recharts. Hosted on **Vercel Pro** (300s function ceiling; `maxDuration=180`). Persistence via **Vercel KV (Upstash Redis)**. Deployed via **GitHub → Vercel** (push auto-deploys).

**Frontend.** Single client page (`app/page.tsx`) with three tabs; section components wrapped in `CollapsibleSection` (state persisted in `localStorage`). Learning view resolves a plain-English twin client-side (`lib/layman.ts`). The Mizuho alignment chip/narrative is a field on the theme card, gated by the same toggle. Dark institutional theme.

**Backend.** Two API routes: `/api/dashboard` (read path — live data + last snapshot, never calls the LLM) and `/api/cron/editorial` (generation — news → LLM → validated snapshot → KV). Secured by `CRON_SECRET`.

**Two-clock model (core architectural decision).** The **data layer** (indicators) is live on every load. The **editorial layer** (themes/narratives/layman twins/Mizuho alignments) is generated on a schedule, frozen all day, read from KV. They must stay decoupled.

**Research is a deliberate third path (ephemeral).** The Research workspace makes an on-demand, interactive LLM call the user waits on. It is **completely isolated** from the two clocks: it never reads or writes the daily snapshot, never records runs, never affects theme generation/persistence. It computes, displays, and discards — persisting only when the user explicitly *Saves to Learn* (into the same `saved:items` store, as a new `analysis` kind). The two clocks stay intact; Research sits beside them.

**Data flow.**
```
FRED + Yahoo ─▶ indicators ─▶ /api/dashboard ─▶ UI (live each load)
News adapters ─▶ dedupe ─▶ cluster ─▶ junk-filter + relevance/source-tier rank
            ─▶ LLM: interpret (grounded) ─▶ DEDICATED Mizuho alignment call (tags → validated → curated why) ─▶ layman twin
            ─▶ concept auto-collect ─▶ KV snapshot (frozen daily)
User content (paste / URL) ─▶ /api/research/analyze ─▶ shared analyzeContent()
            ─▶ interpret (grounded) + DEDICATED alignment + layman + link existing concepts
            ─▶ returned to UI (ephemeral; saved to Learn only on request)
            ─▶ /api/dashboard reads snapshot ─▶ UI (frozen daily)
```

**External integrations.** FRED (macro), Yahoo Finance (markets), Marketaux + NewsData.io + Finnhub + Alpha Vantage (news, key-gated), Google Gemini (primary LLM), Anthropic (backup LLM). **Mizuho Top Risks framework** is held locally (`lib/mizuhoTopRisks.ts`), not fetched at runtime.

---

## 5. Dashboard Module Catalogue

Format: *purpose · value · inputs → outputs · deps · maturity · future.*

1. **Daily Risk Brief** — narrative + risk gauge. Indicators → one-paragraph plain-English read. Deps: riskEngine. **Mature.**
2. **What Changed (merged)** — top risk-ranked movers + "show all" table. Deps: `overnight.ts`. **Mature.** *(Not toggled.)*
3. **Top Developments** — 24–72h headline cards. **Mature.** *(Not toggled.)*
4. **CRO Conversation (themes)** — ranked themes with NEW/Day-N/seen + Go-deeper; risk terms link into Learn; **Mizuho Risk Alignment field**; full plain-English twin in Learning view. The product's core. Deps: snapshotEngine, llm, layman, concepts, mizuhoTopRisks, KV. **Mature/evolving.**
5. **Editorial Intelligence** — other sourced developments (first/second-order); plain-English twin. **Mature.**
6. **Japan & Asia Watch** — daily Japan narrative; plain-English twin; curated fallback. When there is no genuine Japan news (or the model returns a degenerate N/A object), the card collapses to a single explanatory line — no empty sub-sections, no save action. **Mature.**
7. **CRO Dashboard** — 17 indicators grouped. Reference. **Mature.** Future: sparklines.
8. **Japan Watch** — USD/JPY, JGB10Y, BOJ, Nikkei, Japan CPI. **Mature.**
9. **Regional Heat Map** — tappable RAG + one-line read. Whole map **refreshed weekly** (Anthropic) when an artifact exists; else curated spine + live US cell. **Mature; weekly (v4.2).**
10. **Emerging Risks / Bank Implications** — watchlist + CRO playbook. **Re-rated weekly** (Anthropic); **Implications keyed 1:1 to Emerging Risks via `riskId`, weekly-generated per risk (v4.3)**; else curated. **Mature; weekly re-rate (v4.2); linked (v4.3).**
11. **Concept Library (Learn tab)** — ~24 curated CRO concepts; auto-collected, pinnable, searchable; linked from theme terms. Deps: `concepts.ts`, KV, localStorage pins. **Mature/evolving.** Future: editable + Supabase (V4).
12. **Weekly Learning** — lessons + concepts (secondary to the library). **Mature.**
13. **Snapshot Header** — provenance: timestamp, provider, sources, coverage, **degrade reason**. **Mature.**
15. **Research Workspace (Research tab)** — analyze any pasted text or URL through the editorial framework; Executive/Learning toggle; Save to Learn / Analyze another. *Inputs → outputs:* content → one `ResearchAnalysis` (framework + alignment + linked concepts). Banking impact renders as **bulleted areas, each with a plain-English twin** (v4.1). Guarded by a **configurable daily reservation cap** (`RESEARCH_DAILY_CAP`, default 5) so it can never starve the daily editorial of Gemini quota; shows remaining budget and disables-with-reason at the cap. *Deps:* `analyze.ts`, `researchQuota.ts`, `llm`, `mizuhoTopRisks`, `concepts`, `savedStore`. **Isolated; ephemeral.** **New (v4.0); hardened + bulleted impact (v4.1).** Future: PDF/DOCX, then OCR/screenshots, then Ask-About-This.
16. **Saved items (Learn tab)** — saved Research analyses + saved themes/editorial/Japan, each capturing the **full piece** (deeper sections) plus a **Learning/Executive toggle** (Learning default) and bulleted impact. Built via `savedMappers.ts`; rendered by `SavedList`. **New (v4.0); full-piece + Learning view (v4.1a).**
14. **Mizuho Top Risks framework + Risk Alignment** — *purpose:* map each theme to Mizuho's Board-named top risks and their published scenarios. *Value:* the durable learning spine — rehearses the event→Mizuho-taxonomy→balance-sheet move the role requires. *Inputs → outputs:* curated Top Risks file + theme → 0..n alignments `{riskId, scenarioId, confidence, why}`. *Renders inside the theme card* (chip in Exec, "Why Mizuho cares" in Learning) — **not** as its own section. *Deps:* `lib/mizuhoTopRisks.ts` (curated), interpretation step. **New (v3.9).** Future: banded relevance weighting; per-risk "where seen" history.

---

## 6. Information Hierarchy

**First:** Daily Risk Brief (posture) and **What Changed** (the deltas). **Second:** Today's CRO Conversation themes — each now carrying its Mizuho alignment. **Supporting:** editorial/Japan narratives, then Markets-tab reference and Learn-tab library. Consumption is top-down: posture → changes → themes (with Mizuho lens) → (optionally) depth → (optionally) study a concept. Learning view does not change the hierarchy; it changes the *language* and *expands the alignment into its narrative*.

---

## 7. Design System

**Layout philosophy.** Mobile-first (iPhone), executive-first: minimal scrolling, progressive disclosure, four tabs: daily read · reference · research workspace · learning.

**Typography.** System fonts (proxy-safe); tight hierarchy; tabular numerals.

**Colour philosophy.** Dark institutional base. Semantic accents: **steel/blue = structure**, **amber = elevated/interpretation/pinned**, **teal (calm) = learning/positive**, **purple = Mizuho / concept links**, **red = stress**. Risk colour encodes *direction of risk*, not direction of number. The Mizuho alignment block is the one purple-signed element on a theme card.

**Component patterns.** `Card`, `CollapsibleSection`, severity/horizon pills, anchor chips, source/confidence footers, concept link (`Linkify`), concept detail overlay, visual "chain" diagrams, **Mizuho alignment chip + "Why Mizuho cares" twin**. Consistent theme-card field order: title · persistence/horizon pills · what changed · why it matters · banking impact · **Mizuho Risk Alignment** · go-deeper · provenance footer.

**Interaction principles.** Tap to reveal detail; persisted collapse state; tap a term to learn it; one glance answers "what changed / what matters / what's new / what needs attention / what Mizuho risk this touches."

**Readability.** Executive view = expert wording + alignment chips; Learning view = whole-screen plain English + expanded alignment narrative.

---

## 8. AI & Intelligence Layer

**Existing.** Provider-agnostic LLM interpretation: **Gemini-first** (`gemini-2.5-flash`, free), **Anthropic backup** (Haiku), else curated. **Gemini "thinking" is disabled (`thinkingBudget: 0`)** — as a reasoning model its hidden thinking tokens were consuming `maxOutputTokens`, truncating JSON (`finishReason=MAX_TOKENS`) and forcing slow fallbacks that overran the 180s cron.

**Shared pipeline (`lib/analyze.ts`).** Both entry points reuse the same primitives:
- `alignToMizuho(items)` — a **DEDICATED** grounded call mapping items → 0..n curated Top-Risk scenarios. The model returns **tags only** (riskId/scenarioId/confidence); invalid ids are rejected; the displayed "why" is the **curated scenario `path`/`pathLayman`** (no hallucinated mapping prose). Restored as a dedicated call in 4.0 after inline tagging (3.9a) under-produced — a focused call gives reliable coverage. With thinking disabled it is small and fast.
- `analyzeContent(content, meta)` — one grounded call producing the standard framework + plain-English twin, then `alignToMizuho` + link to existing curated concepts. Input is capped (~4k words) and labelled when truncated.

The **editorial run** = interpret clusters → `alignToMizuho(themes)` → layman twin → concept collect → KV. The **Research run** = `analyzeContent` (interpret + alignment + concepts), returned and discarded unless saved. Each step validated and isolated so failure never breaks the briefing.

**Mizuho alignment — grounding rules.** The model only *tags* with the supplied curated risk/scenario **ids** (invalid ids are rejected, never invented); it writes no mapping prose. The displayed "why Mizuho cares" is the curated scenario **path** (the transmission mechanism) — accurate by construction and immune to hallucination. A theme may tag **0–2** scenarios; an **empty set is valid and expected** when nothing maps cleanly. Confidence is normalised to High/Med/Low.

**Prompting strategy.** Strict grounding — interpret/translate only supplied content; numbers re-anchored to the live data spine; rank by CRO relevance; cross-section de-duplication; Japan section only when genuine Japan news exists.

**Provider selection + diagnostics.** `interpretWithProvider` logs every decision point (booleans only, never key values). `DISABLE_GEMINI=1` forces the Anthropic path.

**Explainability & provenance.** Derived confidence; provider shown; **degrade reason** surfaced; retry-once on bad JSON; last-good snapshot preferred over curated on failure. **Provenance split is explicit on every alignment: the Top Risks framework is *sourced fact* (curated from Mizuho's published page); the event→risk *mapping* is *AI interpretation*.** The mapping is never presented as Mizuho's own view or as knowledge of Mizuho's actual exposure.

**Compliance.** Personal decision-support only — "not investment advice, not Mizuho output." No real Mizuho positions/exposures are asserted; Mizuho relevance is strategic context derived from public disclosures only.

---

## 9. Data Ecosystem

| Source | Purpose | Frequency | Reliability / Fallback |
|---|---|---|---|
| FRED | Macro | Monthly/daily | Key-gated; sample fallback |
| Yahoo Finance | Markets, rates, FX | Live per load | Sample fallback |
| Marketaux | Finance news + sentiment | 100/day | Key-gated |
| NewsData.io | Business + Japan news | 200/day | Key-gated |
| Finnhub | Market news | 60/min | Key-gated |
| Alpha Vantage | News + sentiment | 25/day | Optional |
| Gemini / Anthropic | Interpretation, alignment, layman translation | On cron | Gemini→Anthropic→curated chain |
| **Mizuho Top Risks framework** | **Event→risk alignment reference** | **Curated; quarterly diff-check** | **Held locally (`lib/mizuhoTopRisks.ts`); no runtime fetch; update only on published change** |
| Vercel KV | Snapshot, topic + concept persistence | Per generation | In-memory fallback |

Premium wires (Reuters/FT/Nikkei/WSJ) have **no free API** — ranked up when they appear, not fetched directly. The **Mizuho Top Risks framework is reference data, not event data**: it is versioned, not streamed. Source: `mizuhogroup.com/who-we-are/governance?tab=management-of-top-risks` (framework "As of March 2025", FY2025). Real-world cadence is roughly **annual** (set via the Risk Committee's top-risk selection / integrated report); the **quarterly** check is a conservative margin whose job is to catch the annual refresh without manual vigilance, not to chase freshness. Owner of all keys/config: the user. **Env vars bind at build/deploy time — change a key, then redeploy.**

---

## 10. User Personas

**Primary — Rohit (the only real user).** Goal: become fluent and conversation-ready for Head of Risk India. Questions: *what changed, why does it matter, why do CROs/Mizuho care?* Needs: plain-English interpretation, Japan specificity, daily brevity, knowledge that accumulates — now framed against Mizuho's own top-risk taxonomy.

The CRO / Risk Committee / Japan Leadership / Global Bank roles are **simulated institutional lenses**, not actual users. **[Clarification]:** this is **not** a management/board tool; do not redesign it as multi-user without an explicit decision.

---

## 11. Development Principles (must never break)

1. **Tutor, not terminal** — prioritise learning, understanding, context, conversation readiness over data density.
2. **Executive-first, mobile-first** — minimise scrolling; progressive disclosure.
3. **Preserve the two-clock model** — live data vs frozen editorial stay decoupled.
4. **Grounded AI only** — never invent facts/numbers or risk mappings; anchor to live data and to the curated framework; translate rather than re-generate; label provenance and degradation honestly.
5. **No false precision** — High/Med/Low bands, never artificial numeric scores. An alignment may be "no match."
6. **Fewer, better-interpreted signals** — resist adding indicators/sections. New lenses attach to existing cards, not new sections.
7. **Enhancement over rewrite** — extend existing modules; keep visual language consistent.
8. **Explain before implementing** — review/recommend, prototype structural changes, then build; challenge complexity.
9. **Fail safe** — never show broken/empty editorial; degrade gracefully with a visible reason; isolate new LLM steps.
10. **Japan/Mizuho relevance is a first-class lens** — and Mizuho's published Top Risks taxonomy is its durable spine: map events to it, anchored to published scenarios, as sourced-fact-plus-labelled-interpretation.

---

## 12. Technical Debt Register

- **Persistence cold start** — Day-N/seen counts accumulate from first deploy; the topicId-normalisation fix can't retro-repair old history.
- **CPI YoY "sample"** — US/Japan CPI need 13+ months of FRED history; currently fall back to sample.
- **Cross-section dedupe is weak** for reworded stories. *(V4 item.)*
- **Concept auto-collect is curated-only** — novel terms not auto-defined (deliberate).
- **Concept library content is hardcoded** (`concepts.ts`); pins per-device. Editing + multi-device → Supabase (V4).
- **Mizuho Top Risks framework is hardcoded/curated** (`lib/mizuhoTopRisks.ts`). Quarterly diff-check against the governance page is currently a manual/cron reminder; real cadence is ~annual. A published change requires a manual edit + redeploy. Mapping quality depends on the model anchoring to scenarios — watch for generic, risk-definition-restating "why" text and tighten the prompt if it appears.
- **Gemini truncation (resolved 3.9a)** — `gemini-2.5-flash` thinking tokens were truncating JSON and forcing slow fallbacks (180s cron overrun); fixed by disabling thinking. Confirm on a live run that both calls finish `finishReason=STOP` on Gemini.
- **Research URL fetch is best-effort** — premium/paywalled sites (Reuters/FT/Nikkei/WSJ) routinely 403/JS-render; the route degrades gracefully to "paste the text instead." Text is the reliable tier. PDF/DOCX deferred to V4.2; OCR/screenshots after that.
- **Gemini free-tier quota is the binding constraint** — the live key is confirmed on the **free tier: 5 RPM / 250K TPM / 20 RPD** (RPD is the ceiling; TPM/RPM have ample slack). Per-day call cost: editorial generation ≈ 3 Gemini calls (4 with a retry); each Research analysis = 2 calls. The **Research reservation cap** (`RESEARCH_DAILY_CAP`, default 5) keeps editorial headroom under 20 RPD. **Note:** Gemini's own RPD resets at **midnight Pacific (~12:30 IST)**, not overnight IST — so evening Research counts against the *same* Gemini day the next 04:00 IST cron will draw from; the reservation cap is what prevents that from starving the briefing. Raise the cap once on a paid tier (Tier 1 lifts RPD into the thousands).
- **Research cap reset offset** — the cap counter resets at **IST midnight** (intuitive for the user) while Gemini resets at Pacific midnight; the conservative cap absorbs the offset. Revisit only if the cap is raised aggressively.
- **Research input is capped (~4k words)** and labelled when truncated — long BIS/IMF reports are summarised from the head, not silently whole-claimed.
- **Saved items share the `saved:items` cap (50)**, now stored as richer records (full piece + twins). Still text-only and small (~a few KB each); well inside KV limits. Single-key `saved:items` array, last-write-wins — fine at 50; revisit if the cap is raised to hundreds.
- **Storage stays on Vercel KV (decision, v4.1a).** A+B need no relational queries, auth or concurrency — KV is sufficient and avoids premature infrastructure (per the lightweight-solutions principle). **Supabase trigger** is a distinct future workstream: multi-device sync with auth, an *editable* concept library (CRUD), personal notes, and full-text search. Watch-signal: raising the saved cap to hundreds or adding notes/editing → move to per-item keys or Supabase.
- **Save-was-lossy (resolved v4.1a).** Saved items previously kept only flat executive strings, dropping bullets, layman twins and deeper sections. Fixed by extending the schema and mapping from the **raw** item (resolved items lose the executive original when Learning is active).
- **Save POST whitelist (resolved v4.1b).** The v4.1a schema/mappers/renderer shipped, but the `/api/saved` POST route still rebuilt items from old fields and dropped the new ones — the visible "loses content after refresh" bug. Now persists the full shape. Pre-fix records can't be backfilled.
- **Provider split (v4.2 standing rule).** Gemini runs the daily editorial + Research (free tier, 20 RPD). Anthropic runs the weekly job only (per-token, no daily ceiling). The weekly cron forces Anthropic via `forceProvider` and **never** falls back to Gemini — a failed weekly keeps last-good. This keeps the daily Gemini budget untouched by weekly work.
- **Heat map severity is weekly-frozen when a weekly artifact exists (v4.2 choice).** The user chose whole-map-weekly, so the daily live US-cell overlay is superseded by the weekly artifact; the map's colours move weekly, not daily. (Pre-artifact, the live US overlay still applies.)
- **Theme persistence is title-confirmed, not perfect.** `resolveTopicId` (v4.3) confirms canonical mapping against the title and mints specific slugs otherwise, which removes the broad-slug collision. Residual risk: keyword vocabulary is curated and finite; a genuinely-novel recurring theme outside the vocabulary persists by title slug, which can drift if the model rewords the title heavily. Acceptable; revisit if drift is observed.
- **Weekly re-rate quality is unmonitored.** The re-rate is grounded and spine-locked, but no automated check verifies the model's weekly ratings are sensible — eyeball the first weekend run. A bad/empty response fails soft to last-good.
- **No automated tests / monitoring** beyond cron logs and degrade reasons.
- **Single daily snapshot** (evening cron removed) — acceptable by decision.

---

## 13. Roadmap

**Completed:** v1 → v2 → v3 (CRO intelligence layer) → v3.1 (two-clock, KV, cron) → v3.2 (live news + LLM) → v3.3 (robustness, persistence, tabs, Go-deeper) → v3.4 (Explain simply) → v3.5 (Learn library) → v3.6 (whole-screen Learning view) → v3.7 (toggle scope, persistence normalisation, diagnostics) → **v3.9 (Mizuho Risk Alignment: theme → Top Risks/scenario mapping, chip + "why Mizuho cares" twin, curated quarterly-refresh framework, fact/interpretation provenance).**

**Completed in 4.0:** Research Workspace (paste-text + best-effort URL), shared `analyzeContent()`, dedicated alignment restored, Save to Learn, Saved Analyses in Learn.

**Completed in 4.1:** Research reservation cap (`RESEARCH_DAILY_CAP`, default 5; cron/regenerate exempt; disable-with-reason; remaining-budget indicator); bulleted per-area banking impact with a plain-English twin per area (Today-tab parity on impact). Gemini tier confirmed (free: 20 RPD) and the cap sized to it.

**Completed in 4.1a:** Save parity + full-piece capture — `SavedItem`/`SavedDetail` carry impact areas, all layman twins and deeper sections; centralised `savedMappers.ts` mapping from raw; Learn renders with a Learning/Executive toggle (Learning default) + Full-detail expander. Storage decision: stay on KV.

**Completed in 4.1b:** Save-persistence bug fix; Concept Library + saved-card collapsibles; saved-card colour match.

**Completed in 4.2:** Weekly Markets refresh + Weekly Learning on a Saturday-morning Anthropic cron; `forceProvider`; weekly KV artifacts; *last refreshed* stamp; weekly run logged.

**Completed in 4.3:** Transient Gemini retry (single, ~35s, transient-only); robust theme persistence (`resolveTopicId` + closed vocabulary); deterministic “what’s new” on recurring themes; Bank Implications linked 1:1 to Emerging Risks (weekly-generated per risk). Cosmetic: saved-card colours fixed to defined tokens (`elevated`/`calm`; `amber` was never a token → white text).

**Next — V4.2+ (staged):**
- **(DONE in 4.2 — see Completed) Markets-tab refresh** — implemented as a *weekly* Anthropic job rather than daily Gemini, which sidesteps the free-tier quota entirely. Original note kept for history: Make the **regional heat map** data-sensitive: extend the existing US-cell pattern (`usHeatFromData`) so every region gets an LLM-interpreted severity + one-line "today's read" grounded on that morning's refreshed indicators, generated once at cron and frozen in KV (two-clock), with `attachLiveDrift` flagging intraday moves. **Keep the curated spine:** the **Emerging Risks watchlist** and **Implications playbook** stay curated/slow-moving (manual or quarterly diff-check), *not* regenerated daily — daily churn on structural risks is noise, and free-generation would violate "translate, don't regenerate." **Sequencing caution:** every interpreted section adds calls to the *protected cron* workload — do not add this until the tier is confirmed and the cron's real call count has been observed for a few days post-4.1.
- **Weekly Learning cron** *(separate small item).* Today `intelligence.weekly` is the static `WEEKLY` constant — there is **no** weekly/Sunday cron (the `// Monday job` comment in `snapshotEngine.ts` was never wired). If wanted, add a genuine weekly cron to regenerate it grounded on the week's themes. Self-contained; keep out of the Research/Markets work.
- **Research input tiers:** PDF/DOCX upload + extraction (heavy, flaky), then OCR/screenshots (the natural paywall workaround — recommend a two-step *extract-then-`analyzeContent`* design via the multimodal model rather than an OCR library).
- **Ask About This** (single-turn, context-scoped, grounded follow-up on a saved analysis or theme); then Supabase + editable concept library + personal notes. Each remains out of current scope.

**Medium term:** banded Mizuho relevance weighting; per-top-risk "where seen" history (which risks recur); richer per-theme teaching; sharper Japan sourcing; sparklines.

**Long term:** GCC strategy / risk operating-model / talent / transformation module (per vision doc).

---

## 14. Future Build Guidance

**Evaluating features.** Ask: does it improve *CRO usefulness, Mizuho relevance, learning value, or mobile usability*? If it only adds data density or visual complexity, decline or defer. Challenge scope creep explicitly.

**Architecture decisions.** Preserve the two-clock split and the read-path/LLM-path separation. Keep generation idempotent and fail-safe; isolate new LLM steps. Prefer KV + simple structures; introduce new infrastructure only when genuinely required. Keep the LLM provider-agnostic and grounded. Keep curated reference data (concepts, Top Risks) local and versioned.

**UI changes.** Stay mobile-first within the dark institutional language and colour semantics. New lenses attach to existing cards in the consistent field order. **Prototype large structural/navigation changes (throwaway HTML) before real code.**

**Versioning & docs.** Increment vMAJOR.MINOR. On each release, update this master-context doc (rename to the new version) and the README. State facts vs assumptions. Keep this doc durable (~2,500 words).

**Working style with the user.** Non-developer; give clear deploy steps, honest caveats, and recommend before building. He approves a prototype/direction before large builds. Verify live runs via the snapshot timestamp + `[gen] …` log lines. Be willing to push back and admit when wrong.

---

## 15. Design Lessons Learned

1. **Features earn their place by use, not by spec.** "Where does the user still leave the tool?" is the most valuable signal — design toward closing that gap.
2. **Translate, don't re-generate.** Every explanatory layer is a *grounded translation of already-generated text*. The "why Mizuho cares" plain-English twin is a translation of the interpretation, not a fresh take.
3. **Pre-generate; avoid live device-side LLM calls.** Compute twins and alignments at cron time, frozen in the snapshot.
4. **Distinct job per section, by time horizon.** When two sections compete to say the same thing, separate them by *when*, not by *wording*. (This is why the Mizuho lens is a card *field*, not a new section.)
5. **Institutional lenses beat named individuals.** Durable institutional lenses (CRO, Risk Committee, Japan Leadership, Global Bank) keep the tool a rehearsal tool, not a person-tracker.
6. **Separate sourced fact from AI interpretation.** Explicit provenance and derived confidence are what make an AI briefing trustworthy enough to rehearse from. The Top Risks framework is fact; the event→risk mapping is interpretation — and they are labelled as such.
7. **Fail safe, visibly.** Never show a broken or empty briefing; degrade with a logged reason.
8. **Any day-over-day identity must be normalised, never trusted raw.** Normalise model-emitted ids to a stable slug.
9. **Instrument decision points; don't infer from outcomes.** When behaviour is surprising, add diagnostics before theories.
10. **Prototype structural changes before coding them.** Throwaway clickable HTML lets the user feel the flow on a phone first.
11. **Curated core + auto-collect, never auto-define.** Hand-author definitions (concepts) and curate reference frameworks (Top Risks) for accuracy; let the model collect *appearances* and propose *mappings*, but never invent the underlying facts.
12. **Resist scope creep; stage releases.** "Fewer, better" beats "more." Recommend-before-build.
14. **Know your model's token accounting.** A reasoning model spends hidden "thinking" tokens out of the same `maxOutputTokens` budget as the answer — which silently truncated our JSON and cascaded into fallback-driven timeouts. Disabling thinking (or budgeting for it) is mandatory when you need complete structured output. Instrument `finishReason`; don't assume the cap is about answer length.
16. **Reuse the framework, not the engine.** The Research workspace's value is the *interpretation framework*, not a second pipeline. Building it as a new entry point into shared primitives (`analyzeContent`, `alignToMizuho`, concept linking) kept it lightweight and guarantees identical output whether content comes from the cron or the user.
17. **Isolation is a feature.** Research had to be ephemeral and walled off from the daily snapshot — an interactive third path that never pollutes editorial history. Keeping it stateless-until-saved preserved the two-clock guarantees while adding an interactive surface.
18. **A merge that helps latency can starve quality — measure the feature, not just the clock.** Folding alignment into the interpret call (3.9a) fixed nothing the thinking-disable hadn't already fixed, and it quietly cut alignment coverage to ~1 theme. The dedicated call was restored. Reducing calls is only a win if the deprioritised step still does its job.
15. **Fold a call when its output can be curated.** The Mizuho mapping became a *tag* (ids only) once we realised the explanatory "why" should be curated reference text, not model prose. That removed a whole LLM round-trip AND a translation pass AND the hallucination surface. Ask whether a step's prose really needs to be generated, or can be looked up.
13. **Map to published scenarios, not headline tags — and allow no match.** A lens that maps every event to some top risk is astrology; the willingness to return "no clean alignment" is what makes the mapping credible. Anchor each alignment to a specific published *scenario* (the transmission path), which also prevents the narratives converging into repetitive risk-definitions. (Worked example: private-credit/NBFI stress maps to a *scenario under "US slowdown"* — there is no standalone "NBFI" top risk; mapping to the real published scenario is both more accurate and more teachable than inventing a tag.)

---

## 16. Current Project State

**What exists today.** A working, deployed personal CRO briefing: live 17-indicator data layer; daily AI editorial layer with a grounded plain-English twin; whole-screen Learning view; a curated, auto-collecting, pinnable concept library; **Mizuho Risk Alignment on every theme (chip + "why Mizuho cares" twin), backed by a curated quarterly-refresh Top Risks framework with fact/interpretation provenance**; theme persistence with stable-id counts; full provider diagnostics; honest, fail-safe degradation.

**Working well.** Two-clock reliability; fail-safe fallback; learning-first framing; the Learning view reads as plain English across the daily sections.

**Open / watched.** (1) Gemini-vs-Anthropic provider selection on unattended runs — confirm runtime key binding on the next run. (2) Mizuho alignment "why" text quality — watch for generic, risk-definition-restating prose and tighten the prompt/scenario-anchoring if it appears. (3) Persistence history settles over a few days post-normalisation.

**Prioritise next.** (1) Wire the v3.9 alignment into the live snapshot (curated `mizuhoTopRisks.ts` + interpretation step + card field), using the prototype as the visual reference. (2) Confirm provider diagnostics on a live run. (3) Use the Mizuho lens and Learning view for several days; tune scenario-anchoring and translation level by feel. (4) Begin **V4.0** (cleanups + cross-section dedupe), then V4.1, then V4.2. Keep resisting feature sprawl; quality and learning value over expansion.
