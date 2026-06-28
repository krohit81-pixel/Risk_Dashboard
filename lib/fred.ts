// lib/fred.ts
// Server-side FRED fetching. Runs only inside the API route.
// No key? Every function returns null and the route uses fallback (sample) data.

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";
const FRED_RELEASES = "https://api.stlouisfed.org/fred/release/dates";

interface Obs {
  date: string;
  value: string;
}

/** Enriched reading: latest + prior value, a chronological history (for sparklines),
 *  and the latest observation's reference date. */
export interface Reading {
  value: number;
  previous: number;
  history?: number[]; // oldest → newest
  observationDate?: string; // latest obs date (YYYY-MM-DD) — the data's reference period
}

async function series(seriesId: string, limit = 16): Promise<Obs[] | null> {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    console.warn(`[fred] ${seriesId}: FRED_API_KEY not set — using sample data`);
    return null;
  }
  const url =
    `${FRED_BASE}?series_id=${seriesId}&api_key=${key}` +
    `&file_type=json&sort_order=desc&limit=${limit}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) {
      console.warn(`[fred] ${seriesId}: HTTP ${res.status} — using sample data`);
      return null;
    }
    const json = (await res.json()) as { observations?: Obs[] };
    const obs = (json.observations ?? []).filter((o) => o.value !== ".");
    if (!obs.length) {
      console.warn(`[fred] ${seriesId}: no usable observations — using sample data`);
      return null;
    }
    return obs;
  } catch (e) {
    console.warn(`[fred] ${seriesId}: fetch failed (${String(e).slice(0, 80)}) — using sample data`);
    return null;
  }
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** Latest level + prior reading + short history. Needs only 2 observations to be live. */
export async function levelHistory(seriesId: string, points = 13): Promise<Reading | null> {
  const obs = await series(seriesId, points + 3);
  if (!obs || obs.length < 2) return null;
  const nums = obs.map((o) => Number(o.value)).filter((n) => !Number.isNaN(n));
  if (nums.length < 2) return null;
  return {
    value: nums[0],
    previous: nums[1],
    history: nums.slice(0, points).reverse(),
    observationDate: obs[0].date,
  };
}

/** Year-over-year % for an index series (e.g. CPI). Computes a YoY history for the
 *  sparkline and degrades gracefully — one YoY point needs 13 monthly obs, not 14. */
export async function yoyHistory(seriesId: string): Promise<Reading | null> {
  const obs = await series(seriesId, 27); // ~25 needed for 13 YoY points, + buffer
  if (!obs || obs.length < 13) {
    if (obs) console.warn(`[fred] ${seriesId}: only ${obs.length} obs (<13) — using sample data`);
    return null;
  }
  const nums = obs.map((o) => Number(o.value)); // newest first
  const yoy: number[] = [];
  for (let i = 0; i + 12 < nums.length; i++) {
    const a = nums[i];
    const b = nums[i + 12];
    if (!Number.isNaN(a) && !Number.isNaN(b) && b !== 0) yoy.push(round(((a - b) / b) * 100, 1));
  }
  if (yoy.length < 1) return null;
  return {
    value: yoy[0],
    previous: yoy.length >= 2 ? yoy[1] : yoy[0],
    history: yoy.slice(0, 13).reverse(),
    observationDate: obs[0].date,
  };
}

/** Latest publication date for a FRED release (e.g. CPI = release 10) → "YYYY-MM-DD". */
export async function latestReleaseDate(releaseId: number): Promise<string | null> {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  const url =
    `${FRED_RELEASES}?release_id=${releaseId}&api_key=${key}` +
    `&file_type=json&sort_order=desc&limit=1&include_release_dates_with_no_data=false`;
  try {
    const res = await fetch(url, { next: { revalidate: 21600 } }); // 6h
    if (!res.ok) return null;
    const json = (await res.json()) as { release_dates?: { date: string }[] };
    const d = json.release_dates?.[0]?.date;
    return typeof d === "string" ? d : null;
  } catch {
    return null;
  }
}

// ── Back-compat thin wrappers (old call sites) ──
export async function levelPair(seriesId: string): Promise<{ value: number; previous: number } | null> {
  const r = await levelHistory(seriesId);
  return r ? { value: r.value, previous: r.previous } : null;
}
export async function yoyPair(seriesId: string): Promise<{ value: number; previous: number } | null> {
  const r = await yoyHistory(seriesId);
  return r ? { value: r.value, previous: r.previous } : null;
}
