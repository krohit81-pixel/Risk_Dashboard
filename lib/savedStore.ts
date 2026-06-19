// lib/savedStore.ts
// "Save for Later" — persists the INTERPRETED snapshot of a theme/editorial/Japan
// item (not the raw article), so valuable content survives the next generation.
// Single-user, KV-backed, capped. No tags/folders (kept deliberately simple).

import { kvGet, kvSet, storeAvailable } from "./snapshotStore";

export interface SavedItem {
  id: string; // stable id from the source item (topicId/editorial id/"japan")
  kind: "theme" | "editorial" | "japan";
  title: string;
  interpretation: string; // why it matters
  bankingImpact: string;
  whyMizuho: string[];
  sources: string;
  savedAtISO: string;   // when the user saved it
  snapshotISO?: string; // original snapshot date for timeline context
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
