-- Global Risk Intelligence Dashboard — Supabase GRANTS fix (v5.2.0 follow-up)
--
-- ROOT CAUSE of "permission denied for schema risk_dashboard": creating a schema does NOT
-- automatically give any API role access to it. Only Supabase's default `public` schema
-- comes pre-granted to `anon`/`authenticated`/`service_role`. A custom schema like
-- `risk_dashboard` needs its own explicit GRANTs — this file was missing from the original
-- schema.sql and is the actual fix. Safe to run standalone; idempotent; safe to re-run.
--
-- This app only ever uses the SERVICE ROLE key (server-side, no end-user auth), so we grant
-- only to service_role — anon/authenticated stay locked out, consistent with the RLS-enabled-
-- no-policies stance already in schema.sql.

grant usage on schema risk_dashboard to service_role;

grant all on all tables in schema risk_dashboard to service_role;
grant all on all sequences in schema risk_dashboard to service_role;
grant all on all functions in schema risk_dashboard to service_role;

-- So any FUTURE table/sequence/function created in this schema is also automatically
-- granted to service_role, without needing to remember to re-run this file.
alter default privileges in schema risk_dashboard
  grant all on tables to service_role;
alter default privileges in schema risk_dashboard
  grant all on sequences to service_role;
alter default privileges in schema risk_dashboard
  grant all on functions to service_role;
