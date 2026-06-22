// lib/weeklyEngine.ts
// V4.2 — weekly refresh of Markets sections 03–05 (whole heat map, emerging-risks
// watchlist, implications playbook) + the Weekly Learning summary.
//
// Runs once a week on a dedicated cron, ALWAYS on Anthropic (forced), so it never
// touches the scarce free-tier Gemini quota that the daily editorial + Research rely
// on. Grounded on the week's daily snapshots + live indicators.
//
// Curated spine is preserved: region / risk-id / implication-development labels stay
// fixed. The model only RE-RATES (heat, probability, impact, trend, reads) — it does
// not invent new risks or regions. Whole heat map is refreshed, severity included.
//
// Fail-soft: any call that returns nothing or unparseable leaves the previous weekly
// artifact untouched (graceful staleness). The job never throws to break the cron.

import { fetchIndicators } from "./marketData";
import { interpretWithProvider } from "./llm";
import { EMERGING_RISKS, HEAT_MAP_BASE } from "./fallbackData";
import {
  getRecentSnapshots,
  saveWeekly,
  saveWeeklyMarkets,
} from "./snapshotStore";
import type {
  WeeklyMarkets,
  RegionHeat,
  EmergingRisk,
  BankImplication,
  WeeklyLearning,
  Heat,
  Trend,
} from "./types";

const HEATS: Heat[] = ["Green", "Amber", "Red"];
const TRENDS: Trend[] = ["up", "down", "stable"];
const PROBS: EmergingRisk["probability"][] = ["Low", "Medium", "High"];
const IMPACTS: EmergingRisk["impact"][] = ["Low", "Moderate", "Severe"];

/** Compact, grounded summary of the week for the model. */
async function buildWeekContext(): Promise<{ ctx: string; indicators: Awaited<ReturnType<typeof fetchIndicators>> }> {
  const indicators = await fetchIndicators();
  const snaps = await getRecentSnapshots(7);

  const themeLines = snaps
    .flatMap((s) => (s.intelligence?.themes ?? []).filter((t) => t.expanded))
    .slice(0, 24)
    .map((t) => `- [${t.severity}] ${t.title}`)
    .filter((v, i, a) => a.indexOf(v) === i) // de-dupe identical lines
    .slice(0, 16)
    .join("\n");

  const indLines = indicators
    .filter((i) => i.live)
    .slice(0, 14)
    .map((i) => `- ${i.label}: ${i.value ?? "n/a"}${i.unit ? " " + i.unit : ""} (trend ${i.trend})`)
    .join("\n");

  const ctx = `THIS WEEK'S RISK THEMES (from daily snapshots):\n${themeLines || "- (no themes captured)"}\n\nCURRENT MARKET INDICATORS:\n${indLines || "- (no live indicators)"}`;
  return { ctx, indicators };
}

/** ONE Anthropic call re-rating the whole Markets spine. Returns null on failure. */
async function reRateMarkets(ctx: string): Promise<{
  heatMap?: { region: string; heat: string; reason: string }[];
  emergingRisks?: { id: string; probability: string; impact: string; trend: string; note: string }[];
  implications?: {
    riskId: string;
    creditRisk: string;
    marketRisk: string;
    liquidityRisk: string;
    capital: string;
    profitability: string;
  }[];
} | null> {
  const spine = {
    heatMap: HEAT_MAP_BASE.map((h) => ({ region: h.region, heat: h.heat, reason: h.reason })),
    emergingRisks: EMERGING_RISKS.map((r) => ({
      id: r.id,
      name: r.name,
      probability: r.probability,
      impact: r.impact,
      trend: r.trend,
      note: r.note,
    })),
  };

  const system =
    "You are a global-bank CRO updating a weekly risk dashboard. You RE-RATE an existing curated framework against this week's evidence. " +
    "You MUST NOT invent new regions, new risk ids, or new implication developments — keep every region/id/development EXACTLY as given. " +
    "Only update the ratings and the one-line reads to reflect the week. Be measured; do not over-react to a single data point.";

  const user = `Here is the current curated spine (JSON):
${JSON.stringify(spine)}

${ctx}

Return ONE JSON object with updated values only:
{
  "heatMap": [{ "region": "<unchanged>", "heat": "Green|Amber|Red", "reason": "<one-line read, <=140 chars>" }],
  "emergingRisks": [{ "id": "<unchanged>", "probability": "Low|Medium|High", "impact": "Low|Moderate|Severe", "trend": "up|down|stable", "note": "<one-line, <=160 chars>" }],
  "implications": [{ "riskId": "<one of the emergingRisks ids above>", "creditRisk": "...", "marketRisk": "...", "liquidityRisk": "...", "capital": "...", "profitability": "..." }]
}
For "implications", produce EXACTLY ONE entry per emerging risk (same ids), describing what THAT risk means for a global bank across the five areas. Keep every region/id from the spine; do not add or drop any. JSON only.`;

  const { data } = await interpretWithProvider<{
    heatMap?: { region: string; heat: string; reason: string }[];
    emergingRisks?: { id: string; probability: string; impact: string; trend: string; note: string }[];
    implications?: {
      riskId: string;
      creditRisk: string;
      marketRisk: string;
      liquidityRisk: string;
      capital: string;
      profitability: string;
    }[];
  }>(system, user, { forceProvider: "anthropic" });

  return data ?? null;
}

/** ONE Anthropic call producing the Weekly Learning summary. Returns null on failure. */
async function genWeeklyLearning(ctx: string): Promise<WeeklyLearning | null> {
  const system =
    "You are a risk-management mentor writing a concise weekly learning summary for a CRO preparing for a new role. Practical, grounded, no fluff.";
  const user = `${ctx}

Return ONE JSON object:
{
  "keyLessons": ["3-5 short lessons a CRO should take from this week"],
  "conceptsLearned": ["3-5 risk concepts worth reinforcing this week"],
  "questionsNextWeek": ["3-5 questions to carry into next week"]
}
JSON only.`;

  const { data } = await interpretWithProvider<WeeklyLearning>(system, user, { forceProvider: "anthropic" });
  if (!data || !Array.isArray(data.keyLessons)) return null;
  return {
    keyLessons: (data.keyLessons ?? []).map(String).slice(0, 6),
    conceptsLearned: (data.conceptsLearned ?? []).map(String).slice(0, 6),
    questionsNextWeek: (data.questionsNextWeek ?? []).map(String).slice(0, 6),
  };
}

/** Merge re-rated values onto the curated spine, preserving labels and rejecting junk. */
function mergeMarkets(rr: NonNullable<Awaited<ReturnType<typeof reRateMarkets>>>): WeeklyMarkets {
  const heatByRegion = new Map((rr.heatMap ?? []).map((h) => [h.region, h]));
  const heatMap: RegionHeat[] = HEAT_MAP_BASE.map((base) => {
    const u = heatByRegion.get(base.region);
    const heat = u && (HEATS as string[]).includes(u.heat) ? (u.heat as Heat) : base.heat;
    const reason = u && typeof u.reason === "string" && u.reason.trim() ? u.reason.trim() : base.reason;
    return { ...base, heat, reason };
  });

  const riskById = new Map((rr.emergingRisks ?? []).map((r) => [r.id, r]));
  const emergingRisks: EmergingRisk[] = EMERGING_RISKS.map((base) => {
    const u = riskById.get(base.id);
    if (!u) return base;
    return {
      ...base,
      probability: (PROBS as string[]).includes(u.probability) ? (u.probability as EmergingRisk["probability"]) : base.probability,
      impact: (IMPACTS as string[]).includes(u.impact) ? (u.impact as EmergingRisk["impact"]) : base.impact,
      trend: (TRENDS as string[]).includes(u.trend) ? (u.trend as Trend) : base.trend,
      note: typeof u.note === "string" && u.note.trim() ? u.note.trim() : base.note,
    };
  });

  // V4.3 — implications are now keyed to emerging risks (1:1). Build one per risk,
  // linked via riskId; overlay the model's per-area reads, falling back to the risk
  // note so every cell is populated.
  const implByRisk = new Map((rr.implications ?? []).map((i) => [i.riskId, i]));
  const implications: BankImplication[] = EMERGING_RISKS.map((risk) => {
    const u = implByRisk.get(risk.id);
    const pick = (next: string | undefined) =>
      typeof next === "string" && next.trim() ? next.trim() : risk.note;
    return {
      development: risk.name,
      riskId: risk.id,
      riskName: risk.name,
      creditRisk: pick(u?.creditRisk),
      marketRisk: pick(u?.marketRisk),
      liquidityRisk: pick(u?.liquidityRisk),
      capital: pick(u?.capital),
      profitability: pick(u?.profitability),
    };
  });

  return { generatedISO: new Date().toISOString(), provider: "anthropic", heatMap, emergingRisks, implications };
}

export interface WeeklyResult {
  ok: boolean;
  marketsRefreshed: boolean;
  weeklyLearningRefreshed: boolean;
  provider: string;
  error?: string;
}

/**
 * Orchestrate the weekly refresh. Two forced-Anthropic calls (Markets re-rate +
 * Weekly Learning). Each is independently fail-soft — a miss keeps last week's
 * artifact rather than blanking the section.
 */
export async function generateWeekly(): Promise<WeeklyResult> {
  try {
    const { ctx } = await buildWeekContext();

    const [rr, wl] = await Promise.all([reRateMarkets(ctx), genWeeklyLearning(ctx)]);

    let marketsRefreshed = false;
    if (rr) {
      await saveWeeklyMarkets(mergeMarkets(rr));
      marketsRefreshed = true;
    }

    let weeklyLearningRefreshed = false;
    if (wl) {
      await saveWeekly(wl);
      weeklyLearningRefreshed = true;
    }

    return {
      ok: marketsRefreshed || weeklyLearningRefreshed,
      marketsRefreshed,
      weeklyLearningRefreshed,
      provider: "anthropic",
    };
  } catch (err) {
    return { ok: false, marketsRefreshed: false, weeklyLearningRefreshed: false, provider: "none", error: String(err) };
  }
}
