# v5.0.0 — Mizuho Knowledge Repository (Research path)

Interpretation through Mizuho's **own disclosed** positions, alongside the existing Top-Risks alignment. This build wires it into **Research analyses**; the daily CRO Conversation is the next increment (same components reused). ✅ tsc + build clean.

## New files
- `lib/mizuhoKnowledge.ts` — embedded repository (seed source) + `getMizuhoKnowledge()` (KV read, embedded fallback) + `retrieveMizuhoSections()` (STEP 1/2 domain classification → selective section retrieval) + `interpretThroughMizuho()` (STEP 3-5 dedicated call).
- `app/api/admin/seed-mizuho/route.ts` — one-time KV seed (→ `app/api/admin/seed-mizuho/route.ts`).
- `components/intel/MizuhoLensBlock.tsx` — shared "Through Mizuho's lens" render (reused by CRO Conversation next).

## Changed
`lib/analyze.ts` (dedicated `interpretThroughMizuho` call, non-fatal) · `lib/types.ts` (`MizuhoLens` on `ResearchAnalysis`) · `lib/savedStore.ts` + `lib/savedMappers.ts` (persist lens on saves) · `components/research/ResearchWorkspace.tsx` + `components/saved/SavedList.tsx` (render).

## How it works (your 5 steps)
1. **Classify** — keyword match maps the article to repository domains (Capital, Liquidity, Credit, Market, Operational, Corporate Banking, Treasury, Wealth/Asset Mgmt, Strategy, Financial Results, Regulation, Japan Macro).
2. **Retrieve selectively** — only the matched sections are pulled and passed to the model; never the whole repository.
3. **Interpret through Mizuho** — a dedicated LLM call (separate from the main analysis, so it doesn't dilute quality) returns Mizuho context, a Mizuho-specific interpretation, and which businesses / risk stripes / executives / financial levers (capital·liquidity·earnings·funding·strategy) are affected.
4. **Prefer disclosed over generic** — the prompt is instructed to use Mizuho's disclosures over generic banking knowledge.
5. **Never invent** — MIZUHO CONTEXT is drawn strictly from the excerpts; when the repository has no relevant disclosure the block says so (e.g. Operational Risk has no dedicated section yet), and an off-topic article gets an honest "does not map to a disclosed domain" with no model call.

The card keeps **FACT** (the article's "What happened · sourced", above) distinct from **MIZUHO CONTEXT · repository** and **INTERPRETATION**. The block shows the repository `version · date` so a stale figure is visible as such. The existing Top-Risks alignment is unchanged and sits above it.

## Deploy — IMPORTANT: seed first
```
npm run build
git add . && git commit -m "v5.0.0: Mizuho Knowledge Repository (Research path)"
git push
```
After deploy, **seed the repository into KV once** (idempotent):
```
/api/admin/seed-mizuho?secret=<CRON_SECRET>
```
Returns `{ ok, action: "seeded", version, last_updated }`. (Until seeded, the code falls back to the embedded copy, so it still works — but seeding is how you'll update it later without a code deploy: edit `MIZUHO_KNOWLEDGE`, deploy, re-hit the route; or later we can add an editable-in-KV path.)

## Cost / behavior notes
- Adds **one LLM call per analysis** (only when a domain matches; off-topic articles skip the call). Fine on Tier 1.
- Repository is **point-in-time disclosure** (FY25; CET1 13.70%, etc.) — it will age; the version/date is shown, and the update path is edit-embedded-then-reseed.

## Next (v5.1, same components)
Wire `interpretThroughMizuho` + `MizuhoLensBlock` into the daily CRO Conversation themes (batched call to keep the snapshot to one extra request) — after you've eyeballed the lens quality on a few Research analyses.

## Test
1. Deploy, hit the seed route → confirm `version: "5.0"`.
2. Analyze a Fed/CRE or BOJ article → "Through Mizuho's lens" shows context grounded in the repo + affected businesses/stripes/moves.
3. Analyze something off-topic (e.g. a sports article) → honest "does not map to a disclosed Mizuho domain".
4. Save an analysis → the lens persists on the saved card.
