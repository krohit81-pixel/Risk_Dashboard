// lib/riskEngine.ts
// Deterministic logic that turns indicator readings into the morning brief,
// trend arrows, the composite risk status, and data-derived developments.

import type {
  Development,
  Indicator,
  MorningBrief,
  RegionHeat,
  RiskStatus,
} from "./types";

const EPS = 1e-9;

/** Assign a trend, treating tiny moves as "stable". */
export function classifyTrend(ind: Indicator): Indicator["trend"] {
  if (ind.value == null || ind.previous == null) return "stable";
  const diff = ind.value - ind.previous;
  // "Stable" threshold scales with the indicator's typical size.
  const base = Math.max(Math.abs(ind.previous), 1);
  const rel = Math.abs(diff) / base;
  if (rel < 0.0015 && Math.abs(diff) < EPS + 0.005) return "stable";
  return diff > 0 ? "up" : "down";
}

export function withTrends(indicators: Indicator[]): Indicator[] {
  return indicators.map((i) => ({ ...i, trend: classifyTrend(i) }));
}

function find(indicators: Indicator[], id: string): Indicator | undefined {
  return indicators.find((i) => i.id === id);
}

function pct(ind?: Indicator): number {
  if (!ind || ind.value == null || ind.previous == null || ind.previous === 0)
    return 0;
  return ((ind.value - ind.previous) / Math.abs(ind.previous)) * 100;
}

/**
 * Composite risk score in roughly [-3, +3].
 * POSITIVE = more risk-off / stressed than yesterday.
 * NEGATIVE = more risk-positive / calmer than yesterday.
 */
export function computeScore(indicators: Indicator[]): number {
  const ust = find(indicators, "ust10y");
  const vix = find(indicators, "vix");
  const hy = find(indicators, "hyspread");
  const sp = find(indicators, "sp500");
  const oil = find(indicators, "brent");

  let s = 0;
  // Rising yields → mild risk-off.
  if (ust && ust.value != null && ust.previous != null)
    s += clamp((ust.value - ust.previous) * 8, -1, 1);
  // VIX level + change.
  if (vix && vix.value != null) {
    s += clamp((vix.value - 18) / 14, -0.6, 1); // level
    s += clamp(pct(vix) / 25, -0.6, 0.8); // change
  }
  // Wider HY spreads → risk-off.
  if (hy && hy.value != null && hy.previous != null)
    s += clamp((hy.value - hy.previous) * 4, -1, 1);
  // Equities down → risk-off.
  if (sp) s += clamp(-pct(sp) / 2, -1, 1);
  // Oil spike → mild risk-off (inflation / geopolitics channel).
  if (oil) s += clamp(pct(oil) / 8, -0.5, 0.7);

  return round(clamp(s, -3, 3), 2);
}

export function statusFromScore(score: number): RiskStatus {
  if (score >= 1.6) return "High";
  if (score >= 0.55) return "Elevated";
  if (score >= -0.55) return "Moderate";
  return "Calm";
}

export function changePhrase(score: number): string {
  if (score >= 0.4) return "More risk-off than yesterday";
  if (score <= -0.4) return "More risk-positive than yesterday";
  return "Broadly unchanged from yesterday";
}

/** Build the readable morning-brief paragraph from the live deltas. */
export function buildBrief(
  indicators: Indicator[],
  updatedISO: string
): MorningBrief {
  const score = computeScore(indicators);
  const status = statusFromScore(score);

  const ust = find(indicators, "ust10y");
  const cpi = find(indicators, "cpi");
  const oil = find(indicators, "brent");
  const hy = find(indicators, "hyspread");
  const vix = find(indicators, "vix");
  const jpy = find(indicators, "usdjpy");

  const lines: string[] = [];
  lines.push(
    `Global risk conditions are ${status.toLowerCase()} right now.`
  );

  if (ust) lines.push(dir(ust, "Treasury yields", "moved higher", "eased", "are little changed"));
  if (cpi) lines.push(dir(cpi, "Inflation", "ticked up", "cooled", "remains steady"));
  if (oil) lines.push(dir(oil, "Oil prices", "rose", "fell", "are flat"));
  if (hy) lines.push(dir(hy, "Credit spreads", "widened", "tightened", "remain stable"));
  if (vix) lines.push(dir(vix, "Equity volatility", "rose", "declined", "is contained"));
  if (jpy) lines.push(dir(jpy, "The yen", "weakened further", "firmed", "is steady"));

  lines.push(changePhrase(score) + ".");

  return {
    status,
    changeFromYesterday: changePhrase(score),
    score,
    paragraph: lines,
    updatedISO,
  };
}

function dir(
  ind: Indicator,
  subject: string,
  up: string,
  down: string,
  flat: string
): string {
  const t = ind.trend;
  if (t === "up") return `${subject} ${up}.`;
  if (t === "down") return `${subject} ${down}.`;
  return `${subject} ${flat}.`;
}

/** Generate developments straight from the data; the route adds curated ones. */
export function deriveDevelopments(indicators: Indicator[]): Development[] {
  const out: Development[] = [];
  const cpi = find(indicators, "cpi");
  const ust = find(indicators, "ust10y");
  const oil = find(indicators, "brent");
  const vix = find(indicators, "vix");
  const hy = find(indicators, "hyspread");

  if (cpi && cpi.value != null) {
    const up = cpi.trend === "up";
    out.push({
      id: "dev-cpi",
      headline: `US CPI ${fmt(cpi.value, 1)}% — ${up ? "firmer" : cpi.trend === "down" ? "cooler" : "steady"} than prior`,
      category: "Inflation",
      severity: up ? "Elevated" : "Moderate",
      whyItMatters: up
        ? "Firmer inflation may delay rate cuts and lift refinancing pressure for borrowers."
        : "Cooler inflation supports the case for policy easing and eases curve pressure.",
      derived: true,
    });
  }

  if (ust && ust.value != null && ust.trend !== "stable") {
    const up = ust.trend === "up";
    out.push({
      id: "dev-ust",
      headline: `US 10Y yield ${up ? "higher" : "lower"} at ${fmt(ust.value, 2)}%`,
      category: "Markets",
      severity: up ? "Elevated" : "Moderate",
      whyItMatters: up
        ? "Higher yields tighten financial conditions and pressure rate-sensitive assets and AFS books."
        : "Falling yields ease funding conditions and support duration-heavy portfolios.",
      derived: true,
    });
  }

  if (hy && hy.value != null && hy.trend !== "stable") {
    const wider = hy.trend === "up";
    out.push({
      id: "dev-hy",
      headline: `High-yield spreads ${wider ? "wider" : "tighter"} at ${fmt(hy.value, 2)}%`,
      category: "Credit",
      severity: wider ? "Elevated" : "Low",
      whyItMatters: wider
        ? "Widening spreads signal rising default risk and pressure trading-book and credit valuations."
        : "Tighter spreads point to constructive credit sentiment and supportive issuance conditions.",
      derived: true,
    });
  }

  if (oil && oil.value != null && oil.trend === "up") {
    out.push({
      id: "dev-oil",
      headline: `Brent crude higher near $${fmt(oil.value, 0)}`,
      category: "Geopolitics",
      severity: "Moderate",
      whyItMatters:
        "Rising energy prices add to inflation persistence and can compress consumer and corporate margins.",
      derived: true,
    });
  }

  if (vix && vix.value != null && vix.value >= 20) {
    out.push({
      id: "dev-vix",
      headline: `Volatility elevated — VIX at ${fmt(vix.value, 1)}`,
      category: "Markets",
      severity: vix.value >= 28 ? "High" : "Elevated",
      whyItMatters:
        "Higher volatility lifts trading-book VaR and signals fragile risk appetite.",
      derived: true,
    });
  }

  return out;
}

/** Data-driven heat for the United States from inflation + rates + volatility. */
export function usHeatFromData(
  indicators: Indicator[],
  fallback: RegionHeat
): RegionHeat {
  const cpi = find(indicators, "cpi");
  const ust = find(indicators, "ust10y");
  const vix = find(indicators, "vix");
  if (!cpi?.live && !ust?.live) return fallback; // no live signal → keep editorial

  let pts = 0;
  if (cpi?.value != null) pts += cpi.value >= 3 ? 1 : cpi.value >= 2.5 ? 0.5 : 0;
  if (ust?.value != null) pts += ust.value >= 4.5 ? 1 : ust.value >= 4 ? 0.5 : 0;
  if (vix?.value != null) pts += vix.value >= 25 ? 1 : vix.value >= 18 ? 0.5 : 0;

  const heat = pts >= 2.5 ? "Red" : pts >= 1 ? "Amber" : "Green";
  const reason =
    heat === "Red"
      ? "Above-target inflation, elevated rates and stressed volatility together."
      : heat === "Amber"
      ? "Inflation above target and rates may stay elevated longer than markets expect."
      : "Inflation and rates easing toward neutral; conditions broadly supportive.";
  return { ...fallback, heat, reason };
}

// helpers
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
function fmt(n: number, d: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
