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
// metal market actually uses (gold ₹/10g, everything else ₹/kg). That tracks the same
// international benchmark MCX prices off of, but it is NOT the literal MCX print — real domestic
// prices run higher once import duty, GST and dealer premium stack on top. Said plainly in the
// section's own copy (components/IndianMetals.tsx) rather than presented as an exact quote.
//
// V5.14.1 — added aluminium (COMEX ALI=F, reliable daily data, same treatment as copper) and
// uranium, which needed its OWN caveat rather than the standard one above:
//   - India has no open retail/commodity market for uranium at all — it's a government-controlled
//     strategic material (Dept. of Atomic Energy), never traded on MCX like the other four. Its
//     row is a global-benchmark-converted-to-INR figure shown for reference only, not an
//     approximation of a real domestic price the way gold/silver/copper/aluminium are — labelled
//     "(global, ₹/kg equiv.)" rather than "(India, …)" specifically to avoid implying one.
//   - The only working Yahoo ticker (UX=F, the CME/UxC U3O8 assessment) is thin: regularMarketVolume
//     was 1 on inspection and it carries NO daily close history (Yahoo's `quote.close` array is
//     empty for it), only a single meta.chartPreviousClose fallback — so its sparkline will be
//     absent most of the time even when the row is live, and the price is a periodic industry
//     assessment, not a continuously-traded print. Not a bug if it looks static for days.
// Tin was requested too but has NO working free ticker: neither SN=F nor TIN=F resolve on Yahoo's
// chart endpoint (tin has no COMEX/CME futures contract; it's LME-only, which this no-key source
// doesn't carry). Left out rather than faked — would need a paid metals-data provider to add it.

import { quote } from "./markets";
import { withTrends } from "./riskEngine";
import type { Indicator } from "./types";

const TROY_OZ_TO_G = 31.1034768;
const LB_TO_KG = 0.45359237;
const TONNE_TO_G = 1_000_000;

// Sample placeholders — overwritten by live conversion when Yahoo + the USD/INR quote both
// resolve. Roughly current-order-of-magnitude so a no-live-data view still reads sensibly; the
// SampleTag in the shared IndicatorCard marks them as non-live regardless.
const SCAFFOLD: Omit<Indicator, "trend">[] = [
  { id: "in-gold", label: "Gold (India, ₹/10g)", group: "Commodities", section: "market", value: 114400, previous: 113200, unit: "inr", decimals: 0, cadence: "Daily", riskUpIsBad: true, live: false },
  { id: "in-silver", label: "Silver (India, ₹/kg)", group: "Commodities", section: "market", value: 131500, previous: 129800, unit: "inr", decimals: 0, cadence: "Daily", riskUpIsBad: true, live: false },
  // "Dr. Copper" and industrial metals generally: rising reads as demand/risk-on, opposite of the
  // precious metals above.
  { id: "in-copper", label: "Copper (India, ₹/kg)", group: "Commodities", section: "market", value: 882.0, previous: 875.0, unit: "inr", decimals: 1, cadence: "Daily", riskUpIsBad: false, live: false },
  { id: "in-aluminium", label: "Aluminium (India, ₹/kg)", group: "Commodities", section: "market", value: 296.0, previous: 293.0, unit: "inr", decimals: 1, cadence: "Daily", riskUpIsBad: false, live: false },
  { id: "in-uranium", label: "Uranium (global, ₹/kg equiv.)", group: "Commodities", section: "market", value: 16160, previous: 16350, unit: "inr", decimals: 0, cadence: "Daily", riskUpIsBad: false, live: false },
];

/**
 * USD/[troy oz | lb | tonne] global quote → the ₹ figure the target unit expresses.
 * `gramsPerSourceUnit`: grams in ONE unit of the source USD quote (troy oz, lb, or tonne).
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

/** Fetch gold/silver/copper/aluminium/uranium (COMEX/LME, USD) + USD/INR, converted to Indian
 *  market units (uranium: global-benchmark units — see the file header caveat). */
export async function fetchIndianMetals(): Promise<Indicator[]> {
  const [gold, silver, copper, aluminium, uranium, usdinr] = await Promise.all([
    quote("GC=F"), // COMEX Gold, USD/troy oz
    quote("SI=F"), // COMEX Silver, USD/troy oz
    quote("HG=F"), // COMEX Copper, USD/lb
    quote("ALI=F"), // COMEX Aluminum, USD/metric tonne
    quote("UX=F"), // CME/UxC Uranium U3O8, USD/lb — thin, often no history (see header caveat)
    quote("INR=X"), // USD/INR
  ]);

  const goldInr = toInr(gold, usdinr, TROY_OZ_TO_G, 10); // USD/troy oz → ₹/10g
  const silverInr = toInr(silver, usdinr, TROY_OZ_TO_G, 1000); // USD/troy oz → ₹/kg
  const copperInr = toInr(copper, usdinr, LB_TO_KG * 1000, 1000); // USD/lb → ₹/kg
  const aluminiumInr = toInr(aluminium, usdinr, TONNE_TO_G, 1000); // USD/tonne → ₹/kg
  const uraniumInr = toInr(uranium, usdinr, LB_TO_KG * 1000, 1000); // USD/lb → ₹/kg equiv.

  const converted: Record<string, ReturnType<typeof toInr>> = {
    "in-gold": goldInr,
    "in-silver": silverInr,
    "in-copper": copperInr,
    "in-aluminium": aluminiumInr,
    "in-uranium": uraniumInr,
  };

  return withTrends(SCAFFOLD.map((s) => apply(s, converted[s.id])));
}
