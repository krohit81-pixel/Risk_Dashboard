// lib/savedStore.ts
// "Save for Later" — persists the INTERPRETED snapshot of a theme/editorial/Japan
// item (not the raw article), so valuable content survives the next generation.
// Single-user, KV-backed, capped. No tags/folders (kept deliberately simple).
//
// V4.1a — full-piece capture: saved items now carry the deeper sections (lenses,
// signals, leadership questions, talking point, follow-up, what-to-understand,
// editorial first/second-order + key takeaway) AND a plain-English (layman) twin
// for every field, so Learn can reproduce the piece with a working Learning toggle.

import { kvGet, kvSet, storeAvailable } from "./snapshotStore";
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

const KEY = "saved:items";
const CAP = 50;
const mem: { list: SavedItem[] } = { list: [] };

export async function getSaved(): Promise<SavedItem[]> {
  if (!storeAvailable()) return mem.list;
  return (await kvGet<SavedItem[]>(KEY)) ?? [];
}

export async function addSaved(item: SavedItem): Promise<SavedItem[]> {
  const list = await getSaved();
  const deduped = [item, ...list.filter((x) => x.id !== item.id)].slice(0, CAP);
  mem.list = deduped;
  if (storeAvailable()) {
    try {
      await kvSet(KEY, deduped);
    } catch {
      /* ignore */
    }
  }
  return deduped;
}

export async function removeSaved(id: string): Promise<SavedItem[]> {
  const list = await getSaved();
  const next = list.filter((x) => x.id !== id);
  mem.list = next;
  if (storeAvailable()) {
    try {
      await kvSet(KEY, next);
    } catch {
      /* ignore */
    }
  }
  return next;
}
