# v5.2.0 — Supabase migration (saved items only)

**Regenerated** — three revisions below since you hadn't deployed yet: (1) schema isolated to its own Postgres schema since Supabase is shared with Orbit, (2) a doc correction, (3) a circular progress indicator during analysis. Foundation for briefing books (v5.4) and PDF export (v5.3). Scope confirmed: **saved items only** — the daily snapshot / weekly re-rate / newsletter digests stay in Vercel KV. ✅ tsc + build clean.

## What changed since the first draft of this version

**1 · Schema isolated for your shared Supabase account.** Since your Supabase project is also used by "Orbit," everything now lives in its own Postgres **schema** — `risk_dashboard` — rather than the default `public` schema, not just a table-name prefix. This is the cleaner isolation: it can't collide with anything Orbit creates even if it happens to also use a name like `saved_items`, and it shows up as a visually distinct area in the Supabase table editor. `supabase/schema.sql` now does `create schema if not exists risk_dashboard;` and creates everything inside it; `lib/savedStore.ts` targets it via `sb.schema("risk_dashboard").from("saved_items")`.
   ⚠️ **One extra one-time dashboard step this requires** (noted in the SQL file too): Supabase → Project Settings → API → **"Exposed schemas"** → add `risk_dashboard` alongside `public` → Save. PostgREST (what the Supabase client talks to) only serves schemas you explicitly expose — skip this and you'll get a "schema must be one of the following" error even though the table exists.

**2 · Doc correction.** The earlier CHANGES said `SavedItem` gained `category?`/`severity?` in "`lib/types.ts`/`savedStore.ts`" — that was **my error, not a missed file**. `SavedItem` has only ever lived in `lib/savedStore.ts`; there's no `SavedItem` in `lib/types.ts` and nothing was dropped. Fixed the wording below.

**3 · Circular progress indicator during analysis.** New `components/shared/ProgressRing.tsx` — an SVG ring with a percentage in the middle and a rotating stage label underneath, shown while Research is analyzing. Note on honesty: `analyzeContent()` is one server round-trip containing several sequential LLM calls (interpret → align/focus → Mizuho lens), not a streamed process, so this **cannot be a literal readout of backend completion** without a bigger streaming refactor. What it does instead: eases toward ~92% over the expected duration (24s for text, 34s for image) and holds there — never claims 100% until the real response actually lands, then snaps to it. Stage labels are timed to roughly track the real call sequence, so it reads as informative rather than purely decorative. I didn't have access to your "vitals project" reference (that's a separate Claude Project I can't search into) — if it uses a meaningfully different pattern, point me at specifics and I'll adjust.

---

## New files
- `lib/supabase.ts` — server-only Supabase client (service-role key; single-user tool, no end-user auth, never imported into a client component).
- `supabase/schema.sql` — **run this once** in Supabase → SQL Editor before deploying (now schema-isolated, see above).
- `app/api/admin/migrate-saved/route.ts` (staged as `migrate-saved-route.ts` → `app/api/admin/migrate-saved/route.ts`) — one-time, idempotent migration from the old KV blob into Supabase.
- `components/shared/ProgressRing.tsx` — the analysis progress ring.

## Changed
- `lib/savedStore.ts` — rewritten to read/write Supabase (`risk_dashboard.saved_items`) instead of the single `saved:items` KV blob. Same function signatures (`getSaved`/`addSaved`/`removeSaved`), so every consumer (SavedList, ResearchWorkspace, CroConversation, EditorialIntelligence, JapanAsiaWatch, page.tsx) needed **zero changes**. `SavedItem` gained `category?`/`severity?` (only file — see correction above).
- `app/api/saved/route.ts` (staged as `saved-route.ts`) — simplified: minimal validation only, no more hand-maintained field whitelist.
- `lib/savedMappers.ts` — threads `category`/`severity` into every saved item.
- `components/research/ResearchWorkspace.tsx` — wires in `ProgressRing` during analysis; button text simplified (the ring now carries the "how long" signal instead of a static "(~20–30s)" string).

## The schema (see `supabase/schema.sql` for full DDL)
One table, `risk_dashboard.saved_items`:
- **Structured columns** for filtering/sorting: `kind`, `category`, `severity`, `source_type`, `saved_at`, `snapshot_at`, `analysis_at`, `article_at` — exactly what a future "Credit Risk Pack" / "Japan Macro Pack" / "Monthly Research Book" query will need (`WHERE category = 'Credit Risk' AND saved_at > ...`).
- **One authoritative `payload` JSONB column** holding the complete `SavedItem` object, exactly as the app produces it.

This design deliberately closes a bug class we hit twice under the old KV approach: a hand-maintained field whitelist silently dropped new `SavedItem` fields on save (`mizuhoLens` in v5.1.1, `articleDate` before that). With `payload` as the single source of truth, a new field can never be silently dropped again. Verified with a round-trip test: a full item (including `mizuhoLens`) survives `itemToRow` → `rowToItem` byte-for-byte.

## Bonus (flagging explicitly — scope I added, not purely a migration)
`category`/`severity` are now captured on every saved item — themes and editorial cards already generate them; Research analyses have carried them since v4.8.0; Japan Watch gets a fixed `"Japan Macro"` category. Not strictly required for a like-for-like data swap, but exactly the filter key the briefing-book work will need, and far cheaper to add now than backfill later. Items saved before this build won't have `category`/`severity` populated — only new saves get them.

## What did NOT change
- Daily snapshot, weekly markets, newsletter ingestion (`bloomberg:*`, `weekly:*`, `snapshot:*`) — still Vercel KV, per your call.
- The "Save"/"Remove" UI and behavior — identical from the user's side, aside from the new progress ring while analyzing.

## ⚠️ Deploy — order matters, and I could not execute any of this myself
Same limitation as the live Gemini/FRED paths — my sandbox's network egress doesn't reach Supabase, so I wrote and validated this code (types, build, a mocked round-trip of the row↔item mapping) but **could not run it against a real Supabase project**. Steps, in order:

1. **Create a Supabase project** (supabase.com → New project). Free tier is plenty.
2. **Run the schema once**: Supabase dashboard → SQL Editor → paste the contents of `supabase/schema.sql` → Run. This creates the `risk_dashboard` schema and everything in it.
3. **Expose the schema to the API**: Project Settings → API → **"Exposed schemas"** → add `risk_dashboard` → Save. (New step vs. the first draft — required because the table isn't in `public` anymore.)
4. **Get your credentials**: Project Settings → API → copy the **Project URL** and the **`service_role` secret key** (not `anon` — this app runs entirely server-side).
5. **Add to Vercel env** (Production + Preview): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
6. **Deploy this code.**
7. **Migrate your existing saved items** (one-time):
   ```
   https://<your-app>/api/admin/migrate-saved?secret=<CRON_SECRET>
   ```
   Returns `{ ok, found, migrated, failed, backend: "supabase" }`. Idempotent — safe to re-run. Old KV data (`saved:items`) is **left untouched** as a backup.
8. **Verify**: Learn tab → Saved Analyses / Saved for Later should show the same items and counts as before (expect `found: 50` based on your last screenshot — 44 + 6).

If `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` aren't set, the app does **not** silently fall back to KV — it degrades to an in-memory list for that server instance, so a misconfiguration is obvious rather than risking two stores quietly diverging.

## Test
1. Save a new analysis → close/reopen the app → still there (also re-confirms the v5.1.1 mizuhoLens fix, now structurally guaranteed rather than whitelist-dependent).
2. Delete a saved item → confirm it's gone after reload.
3. Hit the migrate route a second time → `migrated` should match `found` again (idempotent, no duplicates).
4. Analyze an article → the progress ring appears, eases up toward ~90%, and completes to 100% when the result arrives.

## Next
- **v5.3** — print/PDF export for saved items (browser print-to-PDF via a dedicated print-styled route, not a heavy server-side renderer).
- **v5.4** — briefing books (Monthly Research Book, Quarterly Executive Brief, Credit Risk Pack, Japan Macro Pack, etc.), built on the `category`/`severity`/date columns landed here, with a short AI-written preface per your call.
