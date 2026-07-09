# v5.2.0 — small update: dedicated MIGRATION_SECRET

One file: `app/api/admin/migrate-saved/route.ts` (staged as `migrate-saved-route.ts` → `app/api/admin/migrate-saved/route.ts`, replaces the earlier version). ✅ tsc + build clean.

## What changed
The migration route no longer reuses `CRON_SECRET`. It now checks its own dedicated env var, **`MIGRATION_SECRET`**.

One deliberate difference from the other admin routes (`seed-mizuho`, the crons): this one **fails closed**. If `MIGRATION_SECRET` isn't set, every request is rejected — there's no "allow if unconfigured" convenience fallback like the other routes have. Since this endpoint writes real data into Supabase, a stray unauthenticated hit shouldn't be able to silently succeed just because a var wasn't set yet.

## Deploy step, updated
1. Add a new Vercel env var: **`MIGRATION_SECRET`** — any value you choose (doesn't need to match `CRON_SECRET`; pick something you'll remember, or generate one).
2. Deploy.
3. Run the migration:
   ```
   https://<your-app>/api/admin/migrate-saved?secret=<MIGRATION_SECRET>
   https://global-risk-dashboard.vercel.app/api/admin/migrate-saved?secret=MIGRATION_SECRET
   ```
   If you forget to set the env var first, you'll get a clear `401 { error: "unauthorized — set MIGRATION_SECRET in Vercel env and pass ?secret=<it>" }` rather than a confusing failure.

Nothing else in the v5.2.0 bundle changes — apply this file in place of the earlier `migrate-saved-route.ts` (or if you've already applied that one, just overwrite it with this version before deploying).
