# Risk Dashboard — Master Context (v3.9)

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

## 3. Current Version Snapshot — v3.9

**Major capabilities.** Live market data layer (17 indicators); frozen daily AI editorial layer; live news ingestion (4 adapters) + LLM interpretation (Gemini-first, Anthropic backup); **whole-screen plain-English Learning view**; **personal concept library (Learn tab)**; **Mizuho Risk Alignment on every theme** (chip in Executive view, "Why Mizuho cares" twin in Learning view); theme persistence (NEW / Day-N / seen N×) with stable-id tracking; three-tab mobile UI; full provider-selection diagnostics; degradation visibility.

**What changed across 3.4 → 3.9.**
- **3.4** — Built-in "Explain simply" (per-term Layman + Risk-language), grounded; header overlap fix. *(Superseded by 3.6; now retired.)*
- **3.5** — **Learn tab became a concept library**: ~24 curated CRO concepts (Layman · Risk-language · why-a-CRO-cares · visual chain · "where seen"), auto-collected as themes mention them, pinnable, searchable; theme terms link into Learn.
- **3.6** — **Learning view became a whole-screen plain-English rewrite**: every prose field swaps to a pre-generated layman twin. The toggle is now a *language switch*, not a "show more" switch. "Explain simply" retired.
- **3.7** — Polish: toggle scoped to **Today** tab and sections 03+ only; persistence fixed via **topicId normalisation**; "Explain This" removed everywhere; footer is name-only. Provider-selection diagnostics added.
- **3.9** — **Mizuho Risk Alignment.** Each theme is mapped to Mizuho's published **Top Risks** (and the specific published *scenario* under each) by a grounded interpretation step. Renders as a purple alignment chip in Executive view and a *"Why Mizuho cares"* narrative twin in Learning view — anchored to the published scenario, with derived confidence, and **allowed to return no match**. Backed by a curated, locally-held Top Risks framework refreshed on a **quarterly** diff-check.

**User workflow.** Open app → **Today** tab (brief → what changed → themes) for a 2-minute read; on each theme, scan the **Mizuho alignment chip**; flip **Learning view** to read the conversation/editorial/Japan sections in plain English *and* expand each alignment into "why Mizuho cares"; tap **Go deeper** for mechanics/talking points; tap a risk term to jump to its **Learn** entry; **Markets** tab for the numbers; **Learn** tab to browse/pin/search.

---

## 4. Architecture Overview

**Stack.** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · Recharts. Hosted on **Vercel Pro** (300s function ceiling; `maxDuration=180`). Persistence via **Vercel KV (Upstash Redis)**. Deployed via **GitHub → Vercel** (push auto-deploys).

**Frontend.** Single client page (`app/page.tsx`) with three tabs; section components wrapped in `CollapsibleSection` (state persisted in `localStorage`). Learning view resolves a plain-English twin client-side (`lib/layman.ts`). The Mizuho alignment chip/narrative is a field on the theme card, gated by the same toggle. Dark institutional theme.

**Backend.** Two API routes: `/api/dashboard` (read path — live data + last snapshot, never calls the LLM) and `/api/cron/editorial` (generation — news → LLM → validated snapshot → KV). Secured by `CRON_SECRET`.

**Two-clock model (core architectural decision).** The **data layer** (indicators) is live on every load. The **editorial layer** (themes/narratives/layman twins/Mizuho alignments) is generated on a schedule, frozen all day, read from KV. They must stay decoupled.

**Data flow.**
```
FRED + Yahoo ─▶ indicators ─▶ /api/dashboard ─▶ UI (live each load)
News adapters ─▶ dedupe ─▶ cluster ─▶ relevance+source-tier rank
            ─▶ LLM interpret (grounded) ─▶ validate
            ─▶ LLM Mizuho alignment (grounded; against curated Top Risks; may be empty)
            ─▶ LLM layman translation (grounded twin)
            ─▶ concept auto-collect ─▶ KV snapshot
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
6. **Japan & Asia Watch** — daily Japan narrative; plain-English twin; curated fallback. **Mature.**
7. **CRO Dashboard** — 17 indicators grouped. Reference. **Mature.** Future: sparklines.
8. **Japan Watch** — USD/JPY, JGB10Y, BOJ, Nikkei, Japan CPI. **Mature.**
9. **Regional Heat Map** — tappable RAG + one-line read. **Mature.**
10. **Emerging Risks / Bank Implications** — watchlist + CRO playbook (curated). **Mature.** *(On Markets tab; not toggled.)*
11. **Concept Library (Learn tab)** — ~24 curated CRO concepts; auto-collected, pinnable, searchable; linked from theme terms. Deps: `concepts.ts`, KV, localStorage pins. **Mature/evolving.** Future: editable + Supabase (V4).
12. **Weekly Learning** — lessons + concepts (secondary to the library). **Mature.**
13. **Snapshot Header** — provenance: timestamp, provider, sources, coverage, **degrade reason**. **Mature.**
14. **Mizuho Top Risks framework + Risk Alignment** — *purpose:* map each theme to Mizuho's Board-named top risks and their published scenarios. *Value:* the durable learning spine — rehearses the event→Mizuho-taxonomy→balance-sheet move the role requires. *Inputs → outputs:* curated Top Risks file + theme → 0..n alignments `{riskId, scenarioId, confidence, why}`. *Renders inside the theme card* (chip in Exec, "Why Mizuho cares" in Learning) — **not** as its own section. *Deps:* `lib/mizuhoTopRisks.ts` (curated), interpretation step. **New (v3.9).** Future: banded relevance weighting; per-risk "where seen" history.

---

## 6. Information Hierarchy

**First:** Daily Risk Brief (posture) and **What Changed** (the deltas). **Second:** Today's CRO Conversation themes — each now carrying its Mizuho alignment. **Supporting:** editorial/Japan narratives, then Markets-tab reference and Learn-tab library. Consumption is top-down: posture → changes → themes (with Mizuho lens) → (optionally) depth → (optionally) study a concept. Learning view does not change the hierarchy; it changes the *language* and *expands the alignment into its narrative*.

---

## 7. Design System

**Layout philosophy.** Mobile-first (iPhone), executive-first: minimal scrolling, progressive disclosure, three tabs separating daily read from reference and learning.

**Typography.** System fonts (proxy-safe); tight hierarchy; tabular numerals.

**Colour philosophy.** Dark institutional base. Semantic accents: **steel/blue = structure**, **amber = elevated/interpretation/pinned**, **teal (calm) = learning/positive**, **purple = Mizuho / concept links**, **red = stress**. Risk colour encodes *direction of risk*, not direction of number. The Mizuho alignment block is the one purple-signed element on a theme card.

**Component patterns.** `Card`, `CollapsibleSection`, severity/horizon pills, anchor chips, source/confidence footers, concept link (`Linkify`), concept detail overlay, visual "chain" diagrams, **Mizuho alignment chip + "Why Mizuho cares" twin**. Consistent theme-card field order: title · persistence/horizon pills · what changed · why it matters · banking impact · **Mizuho Risk Alignment** · go-deeper · provenance footer.

**Interaction principles.** Tap to reveal detail; persisted collapse state; tap a term to learn it; one glance answers "what changed / what matters / what's new / what needs attention / what Mizuho risk this touches."

**Readability.** Executive view = expert wording + alignment chips; Learning view = whole-screen plain English + expanded alignment narrative.

---

## 8. AI & Intelligence Layer

**Existing.** Provider-agnostic LLM interpretation: **Gemini-first** (`gemini-2.5-flash`, free), **Anthropic backup** (Haiku), else curated. The generation run makes grounded LLM calls: (1) interpret news clusters → themes + editorial + (conditional) Japan narrative; (2) **map each theme to the curated Mizuho Top Risks** → 0..n `{riskId, scenarioId, confidence, why}`; (3) **translate** every prose field (including the "why Mizuho cares" text) into a plain-English twin. Each step validated and isolated so its failure never breaks the briefing.

**Mizuho alignment — grounding rules.** The model maps *only* to the supplied curated risks/scenarios (no invented risk names); anchors each "why" to a specific published **scenario**, not the headline risk (the repetition guard); states the transmission path from *this* event, never the definition of the risk; and **returns an empty array when nothing maps cleanly** — a no-match is a valid, expected output, not a failure. Confidence is derived (High/Med/Low), never model-stamped.

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
- **Gemini vs Anthropic provider stability** — diagnostics added; confirm runtime key binding on a live run.
- **No automated tests / monitoring** beyond cron logs and degrade reasons.
- **Single daily snapshot** (evening cron removed) — acceptable by decision.

---

## 13. Roadmap

**Completed:** v1 → v2 → v3 (CRO intelligence layer) → v3.1 (two-clock, KV, cron) → v3.2 (live news + LLM) → v3.3 (robustness, persistence, tabs, Go-deeper) → v3.4 (Explain simply) → v3.5 (Learn library) → v3.6 (whole-screen Learning view) → v3.7 (toggle scope, persistence normalisation, diagnostics) → **v3.9 (Mizuho Risk Alignment: theme → Top Risks/scenario mapping, chip + "why Mizuho cares" twin, curated quarterly-refresh framework, fact/interpretation provenance).**

**Next — V4 (specced, staged):** **V4.0** cleanups + cross-section dedupe; **V4.1** "Regenerate Editorial" UI button; **V4.2** Supabase migration + editable concept library + concept history, then **"Ask a follow-up"** (single-turn, context-scoped, grounded). The Mizuho lens deliberately lands *before* follow-up: thinking in Mizuho's taxonomy sharpens the questions the user will ask.

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
13. **Map to published scenarios, not headline tags — and allow no match.** A lens that maps every event to some top risk is astrology; the willingness to return "no clean alignment" is what makes the mapping credible. Anchor each alignment to a specific published *scenario* (the transmission path), which also prevents the narratives converging into repetitive risk-definitions. (Worked example: private-credit/NBFI stress maps to a *scenario under "US slowdown"* — there is no standalone "NBFI" top risk; mapping to the real published scenario is both more accurate and more teachable than inventing a tag.)

---

## 16. Current Project State

**What exists today.** A working, deployed personal CRO briefing: live 17-indicator data layer; daily AI editorial layer with a grounded plain-English twin; whole-screen Learning view; a curated, auto-collecting, pinnable concept library; **Mizuho Risk Alignment on every theme (chip + "why Mizuho cares" twin), backed by a curated quarterly-refresh Top Risks framework with fact/interpretation provenance**; theme persistence with stable-id counts; full provider diagnostics; honest, fail-safe degradation.

**Working well.** Two-clock reliability; fail-safe fallback; learning-first framing; the Learning view reads as plain English across the daily sections.

**Open / watched.** (1) Gemini-vs-Anthropic provider selection on unattended runs — confirm runtime key binding on the next run. (2) Mizuho alignment "why" text quality — watch for generic, risk-definition-restating prose and tighten the prompt/scenario-anchoring if it appears. (3) Persistence history settles over a few days post-normalisation.

**Prioritise next.** (1) Wire the v3.9 alignment into the live snapshot (curated `mizuhoTopRisks.ts` + interpretation step + card field), using the prototype as the visual reference. (2) Confirm provider diagnostics on a live run. (3) Use the Mizuho lens and Learning view for several days; tune scenario-anchoring and translation level by feel. (4) Begin **V4.0** (cleanups + cross-section dedupe), then V4.1, then V4.2. Keep resisting feature sprawl; quality and learning value over expansion.
