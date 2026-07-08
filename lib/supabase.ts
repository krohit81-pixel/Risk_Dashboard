// lib/supabase.ts
// V5.2 — Supabase (Postgres) client, server-only. Used for saved items ONLY — the daily
// snapshot / weekly / newsletter data stays in Vercel KV (deliberate scope decision).
// Uses the SERVICE ROLE key: this is a single-user personal tool with no end-user auth,
// so all access is server-side (API routes), never exposed to the browser. Do NOT import
// this file from a "use client" component.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/** True if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are configured. */
export function supabaseAvailable(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Lazily-created singleton server client. Returns null if not configured (caller degrades). */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!supabaseAvailable()) {
    client = null;
    return client;
  }
  client = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
