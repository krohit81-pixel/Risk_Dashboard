# v5.2.1 — Mizuho Knowledge Repository upgraded to a multi-card architecture

Adds your 3 uploaded documents (Risk Governance, Risk Management/RAF, Business Model) and restructures the repository so more cards can be added later without touching the retrieval logic. ✅ tsc + build clean. No new env, no DB changes (this is all KV-seeded content + code).

## One thing worth knowing about the upload
**`Mizuho_Business_Model.md` was raw RTF saved with a `.md` extension** (opens as `{\rtf1\ansi...` control codes, not plain markdown) — likely from an editor that defaulted to "Rich Text" on save. I decoded it fully by hand (bullets, arrows, the business-lines table, the News→Business mapping table all extracted correctly — nothing lost), but for future uploads, saving as plain text avoids this. The other two files were clean markdown.

## Why a restructure, not just "add the JSON"
The old repository was one flat object with 4 fixed keys (`capital`, `financials`, `strategy`, `risk_philosophy`). Your new documents don't fit that shape — governance and business-model content are genuinely different kinds of information — and the Business Model doc itself explicitly references two more cards not yet written (`mizuho_basel_pillar3_reference.md`, `mizuho_financial_statements_reference.md`). Bolting two more fixed keys onto the flat object would just recreate the same problem next time. Instead the repository is now a **list of self-describing cards** — the same shape your source documents already use (title, source, priority, retrieval triggers, structured content) — so adding a 5th or 6th card later is just appending to the list and tagging its domains; no retrieval-logic changes needed.

## What changed
- **`lib/mizuhoKnowledgeData.ts`** — `MIZUHO_KNOWLEDGE` is now `{ version, institution, last_updated, cards: MizuhoKnowledgeCard[] }`. 4 cards: `core_disclosures` (your original capital/financials/strategy/risk_philosophy content, unchanged, just repackaged), **`risk_governance`** (new), **`risk_management`** (new — RAF + Top Risks + second-order reasoning chains), **`business_model`** (new — 5 business lines + News→Business mapping table).
- **13th domain added**: **Governance** (alongside the original 12), with keywords from your documents' own "Retrieval Triggers" (governance, risk committee, RAF, stress testing, top risks, scenario analysis, …).
- **Retrieval logic changed**: STEP 1 (domain classification) is unchanged in spirit, but STEP 2 now pulls **all cards tagged to a matched domain** (a card can serve multiple domains) instead of 4 fixed object keys. The **Business Model card is always included whenever any domain matches** — deliberate, because its own stated purpose is mapping any event to the affected business, which is relevant regardless of which specific domain triggered the match.
- **`lib/mizuhoKnowledge.ts`** — the interpretation prompt now cites which cards matched (title + source, for traceability), gathers **leadership questions from every matched card** (governance and risk-management cards both have their own, richer than the old single fixed list), and grounds the `businesses` field in the **actual 5 Mizuho business lines** from the business-model card instead of a generic name list.
- **`components/learn/MizuhoReference.tsx`** (Learn section 05) — 3 new cards rendered: **Risk Governance** (structure, Three Lines, governance cycle, leadership questions), **Risk Appetite & Top Risks** (RAF cycle, Top Risks by category, second-order reasoning chains), **Business Model** (5 business lines with products, News→Business mapping table, strategic focus areas).

## What this changes in practice
A cyber-attack article, for example, previously only had the capital/financials disclosures to draw on. Now it correctly pulls in **Operational Risk + Governance** — the Three Lines model, which committee would review it, whether it becomes a Top Risk — because that's genuinely what the governance and risk-management cards are for. Verified the domain→card matching logic directly (Node simulation): CRE stress → Credit domain → core_disclosures + risk_management + business_model; cyber+RAF language → Operational Risk + Governance → risk_governance + risk_management + business_model; off-topic → no match, no cards, no model call.

## One interesting nuance, not acted on
The Risk Management card's own "Top Risks" list (Macro & Geopolitical / Operational / Conduct / ESG, from Mizuho's actual Integrated Report) is a **different, more authoritative list** than the app's existing curated `mizuhoTopRisks.ts` taxonomy used for the separate Top-Risks alignment feature (which carries an explicit "AI interpretation, not Mizuho's own view" disclaimer). I haven't merged or reconciled these — they're doing different jobs right now (one is disclosed source material inside the lens; the other is a curated approximation feeding a different UI feature) — but it's worth knowing they now both exist, in case you'd want to eventually replace the curated approximation with this more authoritative, sourced list.

## Deploy
```
npm run build
git add . && git commit -m "v5.2.1: multi-card Mizuho Knowledge Repository (governance, RAF/top risks, business model)"
git push
```
Then **re-seed KV** so the live lens uses the new cards (same as any repository content update):
```
https://<your-app>/api/admin/seed-mizuho?secret=<CRON_SECRET>
```

## Test
1. Learn → section 05 "Mizuho Reference" → 3 new cards render (Risk Governance, Risk Appetite & Top Risks, Business Model), alongside the original 4.
2. Analyze an operational-risk/cyber article → "Through Mizuho's lens" now cites governance/RAF context, not just capital metrics.
3. Analyze a trade/tariffs article → businesses field should name a real business line (e.g. "Corporate Banking"), not a generic list.
