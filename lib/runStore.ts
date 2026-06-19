// lib/runStore.ts
// Lightweight operational visibility for editorial generation. Not an admin console —
// just a short ring buffer of recent runs so the user can confirm what happened:
// when, scheduled vs manual, success/failure, and which model (primary vs fallback).

import { kvGet, kvSet, storeAvailable } from "./snapshotStore";

export interface RunRecord {
  ranISO: string;
  trigger: "scheduled" | "manual";
  ok: boolean;
  provider?: string; // gemini | anthropic | none
  fallbackUsed?: boolean; // true when the backup (anthropic) produced the result
  degradeReason?: string;
  themes?: number;
  error?: string;
}

const KEY = "runs:log";
const CAP = 15;
const mem: { list: RunRecord[] } = { list: [] };

export async function getRuns(): Promise<RunRecord[]> {
  if (!storeAvailable()) return mem.list;
  return (await kvGet<RunRecord[]>(KEY)) ?? [];
}

export async function recordRun(rec: RunRecord): Promise<void> {
  const list = await getRuns();
  const next = [rec, ...list].slice(0, CAP);
  mem.list = next;
  if (storeAvailable()) {
    try {
      await kvSet(KEY, next);
    } catch {
      /* ignore */
    }
  }
}
