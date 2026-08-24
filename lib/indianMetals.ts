// lib/indianMetals.ts
// V5.14 — "Indian Market — Metals" section on the Markets tab (components/IndianMetals.tsx).
// Same live-quote/curated-fallback pattern as lib/marketData.ts, but deliberately kept OUT of
// fetchIndicators()'s Indicator[] — these aren't risk-engine inputs (computeScore, the Mizuho
// CRO framing, etc. never touch them), just a standalone price ticker, so they travel as their
// own DashboardData.indianMetals field instead of getting mixed into the main indicator set.
//
// Data source: there's no free/no-key Indian commodity-exchange (MCX) feed. What IS available
// with the same no-key Yahoo Finance quote() this app already uses elsewhere (lib/markets.ts) is
// the global COMEX/LME benchmark in USD plus a live USD/INR rate — so these are the
// international spot price CONVERTED to INR at the live exchange rate, quoted in the units India's
// metal market actually uses (gold ₹/10g, silver & copper ₹/kg). That tracks the same
// international benchmark MCX prices off of, but it is NOT the literal MCX print — real domestic
// prices run higher once import duty, GST and dealer premium stack on top. Said plainly in the
// section's own copy (components/IndianMetals.tsx) rather than presented as an exact quote.

import { quote } from "./markets";
import { withTrends } from "./riskEngine";
import type { Indicator } from "./types";

const TROY_OZ_TO_G = 31.1034768;
const LB_TO_KG = 0.45359237;

// Sample placeholders — overwritten by live conversion when Yahoo + the USD/INR quote both
// resolve. Roughly current-order-of-magnitude so a no-live-data view still reads sensibly; the
// SampleTag in the shared IndicatorCard marks them as non-live regardless.
const SCAFFOLD: Omit<Indicator, "trend">[] = [
  { id: "in-gold", label: "Gold (India, ₹/10g)", group: "Commodities", section: "market", value: 114400, previous: 113200, unit: "inr", decimals: 0, cadence: "Daily", riskUpIsBad: true, live: false },
  { id: "in-silver", label: "Silver (India, ₹/kg)", group: "Commodities", section: "market", value: 131500, previous: 129800, unit: "inr", decimals: 0, cadence: "Daily", riskUpIsBad: true, live: false },
  // "Dr. Copper": rising copper reads as industrial-demand/risk-on, opposite of the precious metals above.
  { id: "in-copper", label: "Copper (India, ₹/kg)", group: "Commodities", section: "market", value: 882.0, previous: 875.0, unit: "inr", decimals: 1, cadence: "Daily", riskUpIsBad: false, live: false },
];

/**
 * USD/[troy oz | lb] global quote → the ₹ figure India's metal market actually quotes in.
 * `gramsPerSourceUnit`: grams in ONE unit of the source USD quote (troy oz or lb).
 * `targetGrams`: grams in the unit we want to express (10 for gold's ₹/10g, 1000 for a ₹/kg).
 */
function toInr(
  usd: { value: number; previous: number; history?: number[] } | null,
  usdInr: { value: number } | null,
  gramsPerSourceUnit: number,
  targetGrams: number
): { value: number; previous: number; history?: number[] } | null {
  if (!usd || !usdInr) return null;
  // A single (latest) FX rate applied uniformly to value/previous/history: isolates the metal's
  // own price move rather than compounding day-by-day FX drift, and keeps % change meaningful
  // (a constant multiplier doesn't change percentage deltas or trend direction).
  const factor = (usdInr.value / gramsPerSourceUnit) * targetGrams;
  return {
    value: usd.value * factor,
    previous: usd.previous * factor,
    history: usd.history?.map((h) => h * factor),
  };
}

function apply(scaffold: Omit<Indicator, "trend">, converted: ReturnType<typeof toInr>): Indicator {
  if (converted) {
    return { ...scaffold, ...converted, live: true, trend: "stable" };
  }
  return { ...scaffold, trend: "stable" };
}

/** Fetch gold/silver/copper (COMEX/LME, USD) + USD/INR, converted to Indian market units. */
export async function fetchIndianMetals(): Promise<Indicator[]> {
  const [gold, silver, copper, usdinr] = await Promise.all([
    quote("GC=F"), // COMEX Gold, USD/troy oz
    quote("SI=F"), // COMEX Silver, USD/troy oz
    quote("HG=F"), // COMEX Copper, USD/lb
    quote("INR=X"), // USD/INR
  ]);

  const goldInr = toInr(gold, usdinr, TROY_OZ_TO_G, 10); // USD/troy oz → ₹/10g
  const silverInr = toInr(silver, usdinr, TROY_OZ_TO_G, 1000); // USD/troy oz → ₹/kg
  const copperInr = toInr(copper, usdinr, LB_TO_KG * 1000, 1000); // USD/lb → ₹/kg

  const converted: Record<string, ReturnType<typeof toInr>> = {
    "in-gold": goldInr,
    "in-silver": silverInr,
    "in-copper": copperInr,
  };

  return withTrends(SCAFFOLD.map((s) => apply(s, converted[s.id])));
}
