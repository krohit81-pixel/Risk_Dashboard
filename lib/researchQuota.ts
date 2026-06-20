// lib/researchQuota.ts
// V4.1 — Research daily-cap "reservation" guard.
//
// Principle: the Today tab must ALWAYS win. Research is the on-demand, user-driven
// workload; the daily editorial cron (and manual regenerate) must never be starved
// of Gemini quota by Research. This module enforces a small daily cap on Research
// analyses so that the editorial path always keeps headroom under the (free-tier,
// 20 RPD) Gemini limit.
//
// Reservation by construction: ONLY the Research route calls this counter. The cron
// (/api/cron/editorial) and manual regenerate (/api/regenerate) never touch it, so
// they can never be blocked by it — Research degrades first, editorial never does.
//
// Cost model: 1 editorial generation = ~3 Gemini calls (4 with a retry); 1 Research
// analysis = 2 calls. With cap=5 that's 10 Research calls, leaving comfortable room
// for the cron + occasional regen under a 20 RPD ceiling.
//
// Configurable: set RESEARCH_DAILY_CAP (default 5). Raise it once you confirm a paid
// Gemini tier (Tier 1 lifts RPD into the thousands).
//
// Reset: the counter is keyed by IST date, so it resets at IST midnight. (Google's own
// RPD resets at midnight Pacific ~12:30 IST; the conservative cap absorbs that offset.)

import { kvGet, kvSet, storeAvailable, istDateKey } from "./snapshotStore";

/** Daily Research analysis cap. Env-configurable; defaults to 5 for free-tier (20 RPD). */
export const RESEARCH_DAILY_CAP = (() => {
  const n = parseInt(process.env.RESEARCH_DAILY_CAP || "5", 10);
  return Number.isFinite(n) && n >= 0 ? n : 5;
})();

const key = (date: string) => `research:count:${date}`;

// In-memory fallback when KV is not configured (dev / preview).
const mem: { date: string; count: number } = { date: "", count: 0 };

export interface ResearchQuota {
  used: number;
  cap: number;
  remaining: number;
  date: string; // IST date key the counter applies to
}

/** Read today's Research usage against the cap (no side effects). */
export async function getResearchQuota(): Promise<ResearchQuota> {
  const date = istDateKey();
  let used = 0;
  if (storeAvailable()) {
    used = (await kvGet<number>(key(date))) ?? 0;
  } else {
    used = mem.date === date ? mem.count : 0;
  }
  const cap = RESEARCH_DAILY_CAP;
  return { used, cap, remaining: Math.max(0, cap - used), date };
}

/** True when Research still has budget today. */
export async function researchAllowed(): Promise<boolean> {
  const q = await getResearchQuota();
  return q.remaining > 0;
}

/**
 * Record one successful Research analysis. Call AFTER analyzeContent() succeeds,
 * so failed URL fetches / model errors never burn a slot. Returns the new count.
 */
export async function incrementResearchCount(): Promise<number> {
  const date = istDateKey();
  const current = (await getResearchQuota()).used;
  const next = current + 1;
  if (storeAvailable()) {
    try {
      await kvSet(key(date), next);
    } catch {
      /* best-effort; a missed increment fails open, never blocks editorial */
    }
  } else {
    mem.date = date;
    mem.count = next;
  }
  return next;
}
