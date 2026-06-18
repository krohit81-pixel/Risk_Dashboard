// lib/fred.ts
// Server-side FRED fetching. Runs only inside the API route.
// No key? Every function returns null and the route uses fallback data.

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

interface Obs {
  date: string;
  value: string;
}

async function series(seriesId: string, limit = 14): Promise<Obs[] | null> {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  const url =
    `${FRED_BASE}?series_id=${seriesId}&api_key=${key}` +
    `&file_type=json&sort_order=desc&limit=${limit}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { observations?: Obs[] };
    const obs = (json.observations ?? []).filter((o) => o.value !== ".");
    return obs.length ? obs : null;
  } catch {
    return null;
  }
}

/** Latest level + the immediately prior reading. */
export async function levelPair(
  seriesId: string
): Promise<{ value: number; previous: number } | null> {
  const obs = await series(seriesId, 6);
  if (!obs || obs.length < 2) return null;
  const value = Number(obs[0].value);
  const previous = Number(obs[1].value);
  if (Number.isNaN(value) || Number.isNaN(previous)) return null;
  return { value, previous };
}

/** Year-over-year % change for an index series (e.g. CPI), latest vs prior month's YoY. */
export async function yoyPair(
  seriesId: string
): Promise<{ value: number; previous: number } | null> {
  const obs = await series(seriesId, 14); // 13 months + buffer, newest first
  if (!obs || obs.length < 14) return null;
  const nums = obs.map((o) => Number(o.value));
  if (nums.some((n) => Number.isNaN(n))) return null;
  // nums[0]=latest ... nums[12]=12 months ago, nums[13]=13 months ago
  const value = ((nums[0] - nums[12]) / nums[12]) * 100;
  const previous = ((nums[1] - nums[13]) / nums[13]) * 100;
  return { value: round(value, 1), previous: round(previous, 1) };
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
