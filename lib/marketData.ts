// lib/marketData.ts
// Shared indicator fetch (FRED + Yahoo) used by BOTH the live dashboard route
// and the editorial snapshot generator (so anchors can be frozen at gen time).

import { levelPair, yoyPair } from "./fred";
import { quote } from "./markets";
import { INDICATOR_SCAFFOLD } from "./fallbackData";
import { withTrends } from "./riskEngine";
import type { Indicator } from "./types";

type Pair = { value: number; previous: number } | null;

function apply(scaffold: Omit<Indicator, "trend">, pair: Pair): Indicator {
  if (pair) {
    return { ...scaffold, value: pair.value, previous: pair.previous, live: true, trend: "stable" };
  }
  return { ...scaffold, trend: "stable" };
}

/** Fetch all indicators in parallel; failed sources fall back to sample values. */
export async function fetchIndicators(): Promise<Indicator[]> {
  const [
    cpi, unrate, fedfunds, ust10y, hyspread,
    sp500, nasdaq, vix, usdjpy, brent,
    curve2s10s, jgb10y, bojrate, japancpi,
    gold, move, nikkei,
  ] = await Promise.all([
    yoyPair("CPIAUCSL"),
    levelPair("UNRATE"),
    levelPair("FEDFUNDS"),
    levelPair("DGS10"),
    levelPair("BAMLH0A0HYM2"),
    quote("^GSPC"),
    quote("^IXIC"),
    quote("^VIX"),
    quote("JPY=X"),
    quote("BZ=F"),
    levelPair("T10Y2Y"),
    levelPair("IRLTLT01JPM156N"),
    levelPair("IRSTCB01JPM156N"),
    yoyPair("JPNCPIALLMINMEI"),
    quote("GC=F"),
    quote("^MOVE"),
    quote("^N225"),
  ]);

  const live: Record<string, Pair> = {
    cpi, unrate, fedfunds, ust10y, hyspread,
    sp500, nasdaq, vix, usdjpy, brent,
    curve2s10s, jgb10y, bojrate, japancpi,
    gold, move, nikkei,
  };

  return withTrends(INDICATOR_SCAFFOLD.map((s) => apply(s, live[s.id] ?? null)));
}
