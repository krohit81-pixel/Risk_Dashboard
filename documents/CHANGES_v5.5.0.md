# v5.5.0 — Concept Library "Add Concept" prototype (paste → Gemini analyze → review → save)

New Learn section 08. ✅ tsc + build clean. No env changes (reuses Supabase creds from v5.2).

## Apply map
```
add_user_concepts.sql              → supabase/add_user_concepts.sql   (NEW — run once in SQL Editor)
lib/userConcepts.ts                → lib/userConcepts.ts               (NEW)
lib/conceptAnalyze.ts              → lib/conceptAnalyze.ts             (NEW)
app_api_concepts/route.ts          → app/api/concepts/route.ts         (NEW)
app_api_concepts_analyze/route.ts  → app/api/concepts/analyze/route.ts (NEW)
components_learn/ConceptStudio.tsx → components/learn/ConceptStudio.tsx (NEW)
page.tsx                           → app/page.tsx                      (replaces)
```

## The workflow, exactly as you described it
Learn → section 08 "Add Concept":
1. Paste any text (a term, a paragraph copied from an article, a rough note). An optional "term hint" field helps if the text is ambiguous about what it's defining.
2. Tap **Analyze** — calls Gemini via a dedicated prompt that converts the pasted text into the app's standard concept format: term, formal name, category, aliases, a plain-English explanation, the CRO-language version, and why a CRO specifically cares. Grounded in your pasted text, not inventing claims it doesn't support.
3. The draft appears as an **editable form** — every field can be changed before saving.
4. Tap **Save to library** — persists it. The list below ("Your concepts") shows everything you've added, each with **Edit** (reloads it into the form above) and **Delete**.

Full CRUD: Create (via analyze+save), Read (the list), Update (edit), Delete — all working end to end.

## Scope decision — flagging explicitly, this is the "prototype" framing
This is **additive, not a rework of the existing Concept Library**. Your curated `lib/concepts.ts` (the hand-written static list, 5 files depend on it — `ConceptLibrary.tsx`, `Linkify.tsx`, `detectConcepts()`, `analyze.ts`, `snapshotEngine.ts`) is completely untouched. User-added concepts live in their own new Supabase table (`risk_dashboard.user_concepts`) and their own screen. They do **not** yet feed into auto-detection (Linkify won't highlight your new terms inside theme/analysis text) or the read-only Concept Library display — that merge is a deliberate follow-up once you've used this and are happy with the workflow itself, not done here. Wanted this visible as a choice, not a silent limitation.

Also not built in this pass: the `visual` field (the little "chain" diagram some curated concepts have, e.g. carry-trade's borrow→invest→unwind steps) — Gemini isn't asked to generate this; it's a nice-to-have for later if you want it.

## New Supabase table
`risk_dashboard.user_concepts` — same schema/pattern as `saved_items` (v5.2): structured columns (category, term — indexed) is unnecessary here since it's a small personal list, so this one's simpler; one row per concept with `term`, `formal`, `category`, `aliases` (jsonb array), `layman`, `risk`, `cro`, and `source_text` (the original pasted text, kept for reference/audit — also reloaded automatically if you edit that concept later).

## Deploy — order matters
1. **Run the SQL once**: Supabase → SQL Editor → paste `supabase/add_user_concepts.sql` → Run. (Grants are included explicitly in the file, on top of the schema-level default privileges already set up — belt and suspenders, given the permission-denied round we went through earlier.)
2. Deploy the code.
```
npm run build
git add . && git commit -m "v5.5.0: Add Concept prototype — paste, Gemini analyze, review, CRUD"
git push
```

## What I couldn't test
Same limitation as every LLM-path feature in this app — no live Gemini access from my sandbox, so the analyze prompt is validated by build/logic only, not against real output. Paste something like "Net Interest Income" (your own example) or a paragraph from an article and see how the draft reads — the fields you'll most want to sanity-check are `category` (is Gemini picking sensible buckets from the fixed six?) and `cro` (is it actually CRO-flavored, or generic?).

## Test
1. Learn → 08 "Add Concept" → paste "Net Interest Income" → Analyze → review the draft → adjust anything → Save.
2. Confirm it shows up in "Your concepts" below.
3. Tap Edit on it → change something → Update → confirm the change stuck.
4. Delete it → confirm it's gone.
