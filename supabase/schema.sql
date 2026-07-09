-- Global Risk Intelligence Dashboard — Supabase schema (v5.2)
-- Run this ONCE in Supabase → SQL Editor, on your shared project. Idempotent (IF NOT EXISTS).
--
-- ISOLATION: this project shares the Supabase account with another tool ("Orbit"), so
-- everything lives in its OWN Postgres schema — `risk_dashboard` — rather than the default
-- `public` schema. This can't collide with Orbit's tables even if they happen to also use a
-- name like "saved_items", and it's visually distinct in the Supabase table editor.
--
-- Design: a few structured columns for fast filtering/sorting (kind, category, severity,
-- dates — what a future "Credit Risk Pack" / "Japan Macro Pack" briefing book will query),
-- plus ONE authoritative `payload` JSONB column holding the complete SavedItem exactly as
-- the app produces it. This is deliberate: earlier versions had a bug where a hand-maintained
-- field whitelist silently dropped new SavedItem fields on save (mizuhoLens, articleDate both
-- did this). With `payload` as the source of truth, that class of bug can't recur — the
-- structured columns are a derived, queryable index over it, not a second copy of truth.

create schema if not exists risk_dashboard;

create table if not exists risk_dashboard.saved_items (
  id             text primary key,
  kind           text not null,                    -- theme | editorial | japan | analysis
  title          text not null,
  category       text,                              -- e.g. "Credit Risk", "Japan Macro" — for briefing packs
  severity       text,                              -- Low | Moderate | Elevated | High
  source_type    text,                               -- text | url | image | theme | editorial | japan
  saved_at       timestamptz not null default now(),
  snapshot_at    timestamptz,                        -- original daily-snapshot date, if applicable
  analysis_at    timestamptz,                        -- when a Research analysis was generated
  article_at     date,                               -- source article's own publication date
  payload        jsonb not null,                     -- the full SavedItem — authoritative
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Indexes for the query patterns briefing books will need: by kind/category/severity,
-- and by date range (monthly/quarterly compiles).
create index if not exists saved_items_kind_idx      on risk_dashboard.saved_items (kind);
create index if not exists saved_items_category_idx  on risk_dashboard.saved_items (category);
create index if not exists saved_items_severity_idx  on risk_dashboard.saved_items (severity);
create index if not exists saved_items_saved_at_idx  on risk_dashboard.saved_items (saved_at desc);

-- Keep updated_at current on every write.
create or replace function risk_dashboard.saved_items_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists saved_items_touch on risk_dashboard.saved_items;
create trigger saved_items_touch
  before update on risk_dashboard.saved_items
  for each row execute function risk_dashboard.saved_items_set_updated_at();

-- RLS: this app has no end-user auth — all access is server-side via the service-role key,
-- which bypasses RLS by design. Enabling RLS with no policies simply blocks the anon/public
-- key from touching this table (defense in depth in case that key is ever exposed client-side).
alter table risk_dashboard.saved_items enable row level security;

-- ── GRANTS — required for a non-public schema, easy to miss ──
-- Creating a schema does NOT automatically give any API role access to it. Only Supabase's
-- default `public` schema comes pre-granted. Without this block you'll hit
-- "permission denied for schema risk_dashboard" the moment the app tries to read/write,
-- even though the table exists and the schema is exposed to the API.
grant usage on schema risk_dashboard to service_role;
grant all on all tables in schema risk_dashboard to service_role;
grant all on all sequences in schema risk_dashboard to service_role;
grant all on all functions in schema risk_dashboard to service_role;
alter default privileges in schema risk_dashboard grant all on tables to service_role;
alter default privileges in schema risk_dashboard grant all on sequences to service_role;
alter default privileges in schema risk_dashboard grant all on functions to service_role;

-- ── IMPORTANT — one dashboard setting required for a non-public schema ──
-- PostgREST (what supabase-js talks to) only serves schemas you explicitly expose.
-- After running this file: Supabase dashboard → Project Settings → API → "Exposed schemas"
-- → add `risk_dashboard` to the list (alongside `public`) → Save.
-- Without this step the app will get a "schema must be one of the following" error even
-- though the table exists.
