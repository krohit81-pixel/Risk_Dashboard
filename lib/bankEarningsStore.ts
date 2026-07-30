// lib/bankEarningsStore.ts
// V5.8.0 — KV overlay for the Bank Earnings prototype. lib/bankEarnings.ts (BANK_EARNINGS)
// stays the curated, hand-maintained FALLBACK BASELINE. This store holds per-bank overlay
// entries produced by the "Refresh Earnings" action (lib/bankEarningsRefresh.ts) — same
// two-clock idea as the daily editorial snapshot: baseline is frozen/reliable, the overlay
// is the "live-ish" layer that can be refreshed on demand and never corrupts the baseline
// if a refresh run fails or finds nothing new.

import { kvGet, kvSet, storeAvailable } from "./snapshotStore";
import { BANK_EARNINGS, type BankEarnings } from "./bankEarnings";

export interface BankEarningsOverlayEntry extends BankEarnings {
  /** When this bank's entry was last accepted from a refresh run. */
  refreshedISO: string;
  /** Short human-readable provenance, e.g. "Reuters, Nikkei Asia (2 articles)". */
  sourceNote: string;
}

type OverlayMap = Record<string, BankEarningsOverlayEntry>;

const KEY = "earnings:overlay";
const mem: { map: OverlayMap } = { map: {} };

export async function getEarningsOverlay(): Promise<OverlayMap> {
  if (!storeAvailable()) return mem.map;
  return (await kvGet<OverlayMap>(KEY)) ?? {};
}

/** Merge one or more accepted refresh results into the overlay (existing entries preserved). */
export async function saveEarningsOverlayEntries(entries: BankEarningsOverlayEntry[]): Promise<void> {
  if (!entries.length) return;
  const map = await getEarningsOverlay();
  for (const e of entries) map[e.id] = e;
  mem.map = map;
  if (storeAvailable()) {
    try {
      await kvSet(KEY, map);
    } catch {
      /* ignore — refresh already logged the attempt; overlay just won't persist this run */
    }
  }
}

/** Baseline (lib/bankEarnings.ts) with any overlay entries applied on top, id-for-id. */
export async function getMergedBankEarnings(): Promise<BankEarnings[]> {
  const overlay = await getEarningsOverlay();
  return BANK_EARNINGS.map((b) => overlay[b.id] ?? b);
}

/** For the refresh engine: is this bank currently showing overlay (refreshed) data? */
export async function getOverlayMeta(): Promise<Record<string, { refreshedISO: string; sourceNote: string }>> {
  const overlay = await getEarningsOverlay();
  const out: Record<string, { refreshedISO: string; sourceNote: string }> = {};
  for (const [id, e] of Object.entries(overlay)) out[id] = { refreshedISO: e.refreshedISO, sourceNote: e.sourceNote };
  return out;
}
