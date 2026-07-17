-- Global Risk Intelligence Dashboard — add user_concepts table (v5.5)
-- Run this ONCE in Supabase → SQL Editor (safe to re-run, idempotent).
--
-- Scope decision: this is a SEPARATE table from the curated concept library in
-- lib/concepts.ts (which stays a static, hand-written TS constant, untouched). User-added
-- concepts from the new "Add Concept" screen live here. Merging the two into one detection/
-- rendering pipeline (Linkify, detectConcepts, etc.) is a deliberate follow-up, not done here.

create table if not exists risk_dashboard.user_concepts (
  id           text primary key,
  term         text not null,
  formal       text,
  category     text not null,          -- Market | Credit | Capital | Liquidity | Macro | Japan
  aliases      jsonb not null default '[]'::jsonb,
  layman       text not null,
  risk         text not null,
  cro          text not null,
  source_text  text,                    -- the original pasted text, kept for reference/audit
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists user_concepts_category_idx on risk_dashboard.user_concepts (category);
create index if not exists user_concepts_term_idx on risk_dashboard.user_concepts (term);

create or replace function risk_dashboard.user_concepts_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_concepts_touch on risk_dashboard.user_concepts;
create trigger user_concepts_touch
  before update on risk_dashboard.user_concepts
  for each row execute function risk_dashboard.user_concepts_set_updated_at();

alter table risk_dashboard.user_concepts enable row level security;

-- Explicit grant (belt-and-suspenders alongside the schema-level default privileges already
-- set up for risk_dashboard — see the earlier "permission denied for schema" fix).
grant all on risk_dashboard.user_concepts to service_role;
