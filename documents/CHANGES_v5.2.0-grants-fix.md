# v5.2.0 — fix: "permission denied for schema risk_dashboard"

No code changes — this is a **database permissions** fix, not an app bug. Two SQL files:
- `supabase/grants_fix.sql` — run this **now** to unblock your existing setup, no re-run of the full schema needed.
- `supabase/schema.sql` — updated for anyone setting this up fresh from now on (the grants are baked in, so this exact error won't happen on a new install).

## Root cause
Creating a Postgres schema does **not** automatically grant any API role access to it — only Supabase's default `public` schema comes pre-granted to `service_role`/`anon`/`authenticated`. My original `schema.sql` created the `risk_dashboard` schema and table but never granted `service_role` (the role your app's key maps to) permission to actually read/write it. That's the single biggest gotcha of using a non-public schema in Supabase, and I missed it the first time — should have been in there from the start.

Good news buried in the error: `"permission denied for schema risk_dashboard"` (not a "schema must be one of the following" PostgREST error) confirms your **"Exposed schemas" step worked correctly**. This is one level deeper — pure Postgres GRANTs.

## Fix — run this once
Supabase dashboard → SQL Editor → paste and run **`supabase/grants_fix.sql`**:
```sql
grant usage on schema risk_dashboard to service_role;
grant all on all tables in schema risk_dashboard to service_role;
grant all on all sequences in schema risk_dashboard to service_role;
grant all on all functions in schema risk_dashboard to service_role;
alter default privileges in schema risk_dashboard grant all on tables to service_role;
alter default privileges in schema risk_dashboard grant all on sequences to service_role;
alter default privileges in schema risk_dashboard grant all on functions to service_role;
```
Idempotent — safe to run more than once. The `alter default privileges` lines mean any table/sequence/function added to this schema *in the future* is automatically granted too, so this won't recur as the schema grows.

## Then re-run the migration
```
https://<your-app>/api/admin/migrate-saved?secret=<MIGRATION_SECRET>
```
No redeploy needed — this was a database-level fix, not a code fix, so your current deployment is fine. Expect `{ ok: true, found: 50, migrated: 50, failed: 0 }` this time.
