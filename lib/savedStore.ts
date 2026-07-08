// lib/savedStore.ts
// "Save for Later" — persists the INTERPRETED snapshot of a theme/editorial/Japan
// item (not the raw article), so valuable content survives the next generation.
//
// V5.2 — migrated from a single Vercel KV blob to Supabase (Postgres). Storage shape:
// a few structured columns for filtering/sorting (kind, category, severity, dates — what
// briefing books will query) + ONE authoritative `payload` JSONB column holding the full
// SavedItem. The structured columns are a derived index, not a second source of truth —
// this deliberately closes the "field silently dropped on save" bug class (mizuhoLens and
// articleDate both hit this under the old hand-maintained KV whitelist).
//
// V4.1a — full-piece capture: saved items carry the deeper sections (lenses, signals,
// leadership questions, talking point, follow-up, what-to-understand, editorial
// first/second-order + key takeaway) AND a plain-English (layman) twin for every field,
// so Learn can reproduce the piece with a working Learning toggle.

import { getSupabase, supabaseAvailable } from "./supabase";
import type { BankingImpactArea, FocusItem } from "./types";

/** Deeper "Go deeper" content captured for full-piece recall (V4.1a). Each field has an optional layman twin. */
export interface SavedDetail {
  lenses?: { label: string; question: string; questionLayman?: string }[];
  signals?: string[]; // factual watch-items; not translated
  questions?: string[];
  questionsLayman?: string[];
  talkingPoint?: string;
  talkingPointLayman?: string;
  followUp?: string;
  followUpLayman?: string;
  whatToUnderstand?: string;
  whatToUnderstandLayman?: string;
  // Editorial-only
  firstOrder?: string;
  firstOrderLayman?: string;
  secondOrder?: string;
  secondOrderLayman?: string;
  keyTakeaway?: string;
  keyTakeawayLayman?: string;
}

export interface SavedItem {
  id: string; // stable id from the source item (topicId/editorial id/"japan"/analysis id)
  kind: "theme" | "editorial" | "japan" | "analysis";
  title: string;
  category?: string; // V5.2 — for future filtering (briefing packs: Credit Risk, Japan Macro, ...)
  severity?: string;  // V5.2 — ditto
  interpretation: string; // why it matters (executive)
  bankingImpact: string;  // combined string (executive)
  whyMizuho: string[];    // executive
  sources: string;
  savedAtISO: string;   // when the user saved it
  snapshotISO?: string; // original snapshot date for timeline context
  // ── Research analyses (V4.0) — lightweight metadata so Learn stays useful over time ──
  sourceType?: "text" | "url" | "image" | "theme" | "editorial" | "japan";
  sourceLabel?: string;
  analysisDateISO?: string; // when the analysis was generated
  articleDate?: string; // V4.8.4 — source article publication date (falls back to analysisDateISO in UI)
  mizuhoLens?: import("./mizuhoKnowledgeData").MizuhoLens; // V5.0 — Mizuho-repository interpretation
  originalUrl?: string;     // source URL if analysed from a link
  relatedConcepts?: string[];
  focus?: FocusItem[];      // V4.4 — personalized focus (Research analyses)
  // ── V4.1a — full-piece + Learning-view parity in Learn ──
  whatHappened?: string;                    // factual summary (editorial / research)
  bankingImpactAreas?: BankingImpactArea[]; // bulleted impact, each with its own layman twin
  layman?: {
    whatHappened?: string;
    interpretation?: string; // why-it-matters twin
    bankingImpact?: string;  // combined impact twin
    whyMizuho?: string[];
  };
  detail?: SavedDetail;
}

const SCHEMA = "risk_dashboard"; // isolated from other tools sharing this Supabase project
const TABLE = "saved_items";
// Safety valve, not a real limit (Postgres handles scale fine) — guards against a runaway
// save loop rather than constraining normal use. The old KV blob was capped at 50.
const SAFETY_CAP = 5000;
const mem: { list: SavedItem[] } = { list: [] }; // dev/unconfigured fallback only

/** The saved_items table, scoped to the risk_dashboard schema (not `public`) — see supabase/schema.sql. */
function table(sb: NonNullable<ReturnType<typeof getSupabase>>) {
  return sb.schema(SCHEMA).from(TABLE);
}

/** Row → SavedItem. `payload` is authoritative; structured columns are not re-merged over it
 *  (they were derived FROM the payload on write, so they're always consistent with it). */
function rowToItem(row: { payload: SavedItem }): SavedItem {
  return row.payload;
}

/** SavedItem → the row to upsert: structured columns derived for querying + full payload. */
function itemToRow(item: SavedItem) {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    category: item.category ?? null,
    severity: item.severity ?? null,
    source_type: item.sourceType ?? null,
    saved_at: item.savedAtISO || new Date().toISOString(),
    snapshot_at: item.snapshotISO || null,
    analysis_at: item.analysisDateISO || null,
    article_at: item.articleDate || null,
    payload: item,
  };
}

export async function getSaved(): Promise<SavedItem[]> {
  const sb = getSupabase();
  if (!sb) return mem.list;
  const { data, error } = await table(sb).select("payload").order("saved_at", { ascending: false }).limit(SAFETY_CAP);
  if (error) {
    console.error("[savedStore] getSaved failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToItem);
}

export async function addSaved(item: SavedItem): Promise<SavedItem[]> {
  const withTimestamp: SavedItem = { ...item, savedAtISO: item.savedAtISO || new Date().toISOString() };
  const sb = getSupabase();
  if (!sb) {
    mem.list = [withTimestamp, ...mem.list.filter((x) => x.id !== item.id)];
    return mem.list;
  }
  const { error } = await table(sb).upsert(itemToRow(withTimestamp), { onConflict: "id" });
  if (error) {
    console.error("[savedStore] addSaved failed:", error.message);
    throw new Error(`Save failed: ${error.message}`);
  }
  return getSaved();
}

export async function removeSaved(id: string): Promise<SavedItem[]> {
  const sb = getSupabase();
  if (!sb) {
    mem.list = mem.list.filter((x) => x.id !== id);
    return mem.list;
  }
  const { error } = await table(sb).delete().eq("id", id);
  if (error) {
    console.error("[savedStore] removeSaved failed:", error.message);
    throw new Error(`Delete failed: ${error.message}`);
  }
  return getSaved();
}

/** For the admin/migrate-saved route and diagnostics only. */
export function savedStoreBackend(): "supabase" | "memory" {
  return supabaseAvailable() ? "supabase" : "memory";
}
