// lib/overnight.ts
// "What Changed Overnight" — a ranked, risk-coloured summary of the biggest
// movers since yesterday. Data-only (uses live indicator prev→now), so it is
// always fresh and reliable. Colour encodes direction of RISK, not the number:
// rising yields/spreads/vol/inflation = risk-off (negative); rising equities =
// risk-on (positive).

import type { Indicator, OvernightChange } from "./types";

// For each indicator: does a RISE in the number mean more risk ("bad") or less?
const RISK_ON_RISE: Record<string, "bad" | "good" | "neutral"> = {
  cpi: "bad",
  japancpi: "bad",
  unrate: "bad",
  fedfunds: "bad",
  ust10y: "bad",
  jgb10y: "bad",
  hyspread: "bad",
  vix: "bad",
  move: "bad",
  brent: "bad", // energy-price spike = risk
  usdjpy: "bad", // weaker yen = carry/Japan stress
  sp500: "good",
  nasdaq: "good",
  nikkei: "good",
  gold: "neutral",
  curve2s10s: "neutral",
};

function fmtDelta(i: Indicator, d: number): string {
  const sign = d >= 0 ? "+" : "\u2212"; // proper minus sign
  if (i.unit === "%") {
    return `${sign}${Math.abs(Math.round(d * 100))} bps`;
  }
  if (i.id === "sp500" || i.id === "nasdaq" || i.id === "nikkei") {
    const pct = i.previous ? (d / i.previous) * 100 : 0;
    return `${pct >= 0 ? "+" : "\u2212"}${Math.abs(pct).toFixed(1)}%`;
  }
  if (i.unit === "usd") {
    return `${sign}$${Math.abs(d).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (i.unit === "yen") return `${sign}\u00a5${Math.abs(d).toFixed(1)}`;
  return `${sign}${Math.abs(d).toFixed(1)}`;
}

/** Magnitude for ranking — normalised so a 1% equity move and a 10bp rate move are comparable. */
function magnitude(i: Indicator, d: number): number {
  if (i.previous == null || i.previous === 0) return 0;
  return Math.abs(d / i.previous); // relative move
}

export function buildOvernight(indicators: Indicator[], limit = 5): OvernightChange[] {
  const movers = indicators
    .filter((i) => i.value != null && i.previous != null && i.value !== i.previous)
    .map((i) => {
      const d = (i.value as number) - (i.previous as number);
      const dir = RISK_ON_RISE[i.id] ?? "neutral";
      const tone: OvernightChange["tone"] =
        dir === "neutral"
          ? "neutral"
          : (d > 0 && dir === "bad") || (d < 0 && dir === "good")
          ? "negative"
          : "positive";
      return {
        id: i.id,
        label: i.label,
        deltaText: fmtDelta(i, d),
        tone,
        _mag: magnitude(i, d),
      };
    })
    .sort((a, b) => b._mag - a._mag)
    .slice(0, limit)
    .map(({ _mag, ...rest }) => rest);

  return movers;
}
