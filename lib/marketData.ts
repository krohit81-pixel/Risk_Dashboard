// lib/marketData.ts
// Shared indicator fetch (FRED + Yahoo) used by BOTH the live dashboard route
// and the editorial snapshot generator (so anchors can be frozen at gen time).

import { levelHistory, yoyHistory, latestReleaseDate, type Reading } from "./fred";
import { quote } from "./markets";
import { INDICATOR_SCAFFOLD } from "./fallbackData";
import { withTrends } from "./riskEngine";
import type { Indicator } from "./types";

// FRED release IDs for the "Last released" publication date on economic-release cards.
const RELEASE_ID: Record<string, number> = {
  cpi: 10, // Consumer Price Index
  corepce: 21, // Personal Income and Outlays (PCE)
  unrate: 50, // Employment Situation
};

function apply(
  scaffold: Omit<Indicator, "trend">,
  reading: Reading | null,
  releaseISO?: string | null
): Indicator {
  if (reading) {
    return {
      ...scaffold,
      value: reading.value,
      previous: reading.previous,
      history: reading.history ?? scaffold.history,
      observationDate: reading.observationDate,
      releaseDateISO: releaseISO ?? undefined,
      live: true,
      trend: "stable",
    };
  }
  // No live data — keep the sample scaffold (incl. its sample history), mark not-live.
  return { ...scaffold, trend: "stable" };
}

/** Fetch all indicators in parallel; failed sources fall back to sample values. */
export async function fetchIndicators(): Promise<Indicator[]> {
  const [
    cpi, corepce, unrate, fedfunds, ust10y, hyspread,
    sp500, nasdaq, vix, usdjpy, brent,
    curve2s10s, jgb10y, bojrate, japancpi,
    gold, move, nikkei,
    cpiRel, pceRel, unrateRel,
  ] = await Promise.all([
    yoyHistory("CPIAUCSL"),
    yoyHistory("PCEPILFE"),
    levelHistory("UNRATE"),
    levelHistory("FEDFUNDS"),
    levelHistory("DGS10"),
    levelHistory("BAMLH0A0HYM2"),
    quote("^GSPC"),
    quote("^IXIC"),
    quote("^VIX"),
    quote("JPY=X"),
    quote("BZ=F"),
    levelHistory("T10Y2Y"),
    levelHistory("IRLTLT01JPM156N"),
    levelHistory("IRSTCB01JPM156N"),
    yoyHistory("JPNCPIALLMINMEI"),
    quote("GC=F"),
    quote("^MOVE"),
    quote("^N225"),
    latestReleaseDate(RELEASE_ID.cpi),
    latestReleaseDate(RELEASE_ID.corepce),
    latestReleaseDate(RELEASE_ID.unrate),
  ]);

  const live: Record<string, Reading | null> = {
    cpi, corepce, unrate, fedfunds, ust10y, hyspread,
    sp500, nasdaq, vix, usdjpy, brent,
    curve2s10s, jgb10y, bojrate, japancpi,
    gold, move, nikkei,
  };
  const releaseDate: Record<string, string | null> = {
    cpi: cpiRel, corepce: pceRel, unrate: unrateRel,
  };

  return withTrends(
    INDICATOR_SCAFFOLD.map((s) => apply(s, live[s.id] ?? null, releaseDate[s.id]))
  );
}
