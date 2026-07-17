// lib/userConcepts.ts
// V5.5 — CRUD store for user-added concepts (Supabase, risk_dashboard.user_concepts).
// Separate from lib/concepts.ts (the curated, hand-written static list — untouched).

import { getSupabase, supabaseAvailable } from "./supabase";
import type { ConceptCategory, ConceptVisualStep } from "./concepts";

export interface UserConcept {
  id: string;
  term: string;
  formal?: string;
  category: ConceptCategory;
  aliases: string[];
  layman: string;
  risk: string;
  cro: string;
  sourceText?: string; // the original pasted text, kept for reference
  createdAtISO?: string;
  updatedAtISO?: string;
  visual?: ConceptVisualStep[]; // not AI-generated yet; editable later if ever added by hand
}

const SCHEMA = "risk_dashboard";
const TABLE = "user_concepts";
const mem: { list: UserConcept[] } = { list: [] }; // dev/unconfigured fallback only

function table(sb: NonNullable<ReturnType<typeof getSupabase>>) {
  return sb.schema(SCHEMA).from(TABLE);
}

function rowToConcept(row: Record<string, unknown>): UserConcept {
  return {
    id: row.id as string,
    term: row.term as string,
    formal: (row.formal as string) || undefined,
    category: row.category as ConceptCategory,
    aliases: Array.isArray(row.aliases) ? (row.aliases as string[]) : [],
    layman: row.layman as string,
    risk: row.risk as string,
    cro: row.cro as string,
    sourceText: (row.source_text as string) || undefined,
    createdAtISO: (row.created_at as string) || undefined,
    updatedAtISO: (row.updated_at as string) || undefined,
  };
}

function conceptToRow(c: UserConcept) {
  return {
    id: c.id,
    term: c.term,
    formal: c.formal ?? null,
    category: c.category,
    aliases: c.aliases ?? [],
    layman: c.layman,
    risk: c.risk,
    cro: c.cro,
    source_text: c.sourceText ?? null,
  };
}

export async function getUserConcepts(): Promise<UserConcept[]> {
  const sb = getSupabase();
  if (!sb) return mem.list;
  const { data, error } = await table(sb).select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[userConcepts] getUserConcepts failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToConcept);
}

/** Create or update (upsert by id). */
export async function saveUserConcept(c: UserConcept): Promise<UserConcept[]> {
  const sb = getSupabase();
  if (!sb) {
    mem.list = [c, ...mem.list.filter((x) => x.id !== c.id)];
    return mem.list;
  }
  const { error } = await table(sb).upsert(conceptToRow(c), { onConflict: "id" });
  if (error) {
    console.error("[userConcepts] saveUserConcept failed:", error.message);
    throw new Error(`Save failed: ${error.message}`);
  }
  return getUserConcepts();
}

export async function deleteUserConcept(id: string): Promise<UserConcept[]> {
  const sb = getSupabase();
  if (!sb) {
    mem.list = mem.list.filter((x) => x.id !== id);
    return mem.list;
  }
  const { error } = await table(sb).delete().eq("id", id);
  if (error) {
    console.error("[userConcepts] deleteUserConcept failed:", error.message);
    throw new Error(`Delete failed: ${error.message}`);
  }
  return getUserConcepts();
}

export function userConceptsBackend(): "supabase" | "memory" {
  return supabaseAvailable() ? "supabase" : "memory";
}
