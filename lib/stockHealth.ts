// lib/stockHealth.ts
// V5.15 — "Stock Health" mode inside Research: paste/upload a stock's key-statistics
// screenshot, get a structured, benchmarked risk assessment instead of a captioned screenshot.
// Two-call pipeline, mirroring lib/analyze.ts's role/shape for the rest of Research:
//   1) extractStockMetrics() (lib/llm.ts) — Gemini vision, single JSON-mode call, verbatim
//      {label, value} extraction only. No interpretation happens in this step.
//   2) one grounded interpretWithProvider() call — takes ONLY the extracted pairs (never the
//      image again) and produces the full StockHealthAssessment: per-metric meaning/why-it-
//      matters/assessment/benchmark/caveat, category bucketing, positives/risks/investigate,
//      and an overall rating.
// Validated with a bankEarningsRefresh.ts-style hand-rolled type guard before anything renders
// — this app never renders an LLM result it hasn't shape-checked first.

import { interpretWithProvider, extractStockMetrics, type ImageInput, type RawStockMetric } from "./llm";
import type { StockHealthAssessment, StockMetric, MetricCategory, Assessment } from "./types";

const CATEGORIES: MetricCategory[] = ["valuation", "profitability", "financialRisk", "shareholderReturns", "other"];
const ASSESSMENTS: Assessment[] = ["positive", "neutral", "caution", "negative"];
const RATINGS = ["attractive", "reasonable", "caution", "highRisk"];

interface LlmStockHealthResult {
  ticker?: string;
  companyName?: string;
  sectorBasis: "sector" | "broad-market";
  metrics: (Omit<StockMetric, "id"> & { id?: string })[];
  keyPositives: string[];
  keyRisks: { risk: string; checkNext: string }[];
  thingsToInvestigate: { area: string; checkNext: string }[];
  overall: StockHealthAssessment["overall"];
  dataLimitations: string[];
}

function isValidResult(r: any): r is LlmStockHealthResult {
  if (!r || typeof r !== "object") return false;
  if (r.sectorBasis !== "sector" && r.sectorBasis !== "broad-market") return false;
  if (!Array.isArray(r.metrics) || !r.metrics.length) return false;
  if (
    !r.metrics.every(
      (m: any) =>
        typeof m?.label === "string" &&
        m.label &&
        typeof m?.value === "string" &&
        m.value &&
        CATEGORIES.includes(m.category) &&
        typeof m?.meaning === "string" &&
        m.meaning &&
        typeof m?.whyItCares === "string" &&
        ["High", "Medium", "Low"].includes(m.relevance) &&
        ASSESSMENTS.includes(m.assessment) &&
        typeof m?.assessmentWhy === "string" &&
        typeof m?.caveat === "string" &&
        typeof m?.updateFrequency === "string" &&
        m.updateFrequency
    )
  )
    return false;
  if (!Array.isArray(r.keyPositives) || !r.keyPositives.every((x: any) => typeof x === "string")) return false;
  if (
    !Array.isArray(r.keyRisks) ||
    !r.keyRisks.every((x: any) => typeof x?.risk === "string" && typeof x?.checkNext === "string")
  )
    return false;
  if (
    !Array.isArray(r.thingsToInvestigate) ||
    !r.thingsToInvestigate.every((x: any) => typeof x?.area === "string" && typeof x?.checkNext === "string")
  )
    return false;
  if (!r.overall || !RATINGS.includes(r.overall.rating)) return false;
  if (
    typeof r.overall.valuation !== "string" ||
    typeof r.overall.profitability !== "string" ||
    typeof r.overall.financialStrength !== "string" ||
    typeof r.overall.income !== "string"
  )
    return false;
  if (!Array.isArray(r.dataLimitations) || !r.dataLimitations.every((x: any) => typeof x === "string")) return false;
  return true;
}

// V5.15.1 — mirrors isValidResult()'s checks exactly (was a partial subset that fell through
// to a generic "extraction was malformed" for anything not explicitly listed — useless for
// diagnosing a real failure, the exact gap CLAUDE.md's own "always capture why" lesson from
// bankEarningsRefresh.ts warns against repeating). Every branch below is one specific,
// actionable reason.
function explainInvalid(r: any): string {
  if (!r || typeof r !== "object") return "model returned no result";
  if (r.sectorBasis !== "sector" && r.sectorBasis !== "broad-market")
    return `sectorBasis was ${JSON.stringify(r.sectorBasis)}, not "sector"/"broad-market"`;
  if (!Array.isArray(r.metrics) || !r.metrics.length) return "extraction had no metrics";
  for (let i = 0; i < r.metrics.length; i++) {
    const m = r.metrics[i];
    if (typeof m?.label !== "string" || !m.label) return `metrics[${i}] missing label`;
    if (typeof m?.value !== "string" || !m.value) return `metrics[${i}] (${m?.label}) missing value`;
    if (!CATEGORIES.includes(m.category)) return `metrics[${i}] (${m?.label}) bad category ${JSON.stringify(m.category)}`;
    if (typeof m?.meaning !== "string" || !m.meaning) return `metrics[${i}] (${m?.label}) missing meaning`;
    if (typeof m?.whyItCares !== "string") return `metrics[${i}] (${m?.label}) missing whyItCares`;
    if (!["High", "Medium", "Low"].includes(m.relevance)) return `metrics[${i}] (${m?.label}) bad relevance ${JSON.stringify(m.relevance)}`;
    if (!ASSESSMENTS.includes(m.assessment)) return `metrics[${i}] (${m?.label}) bad assessment ${JSON.stringify(m.assessment)}`;
    if (typeof m?.assessmentWhy !== "string") return `metrics[${i}] (${m?.label}) missing assessmentWhy`;
    if (typeof m?.caveat !== "string") return `metrics[${i}] (${m?.label}) missing caveat`;
    if (typeof m?.updateFrequency !== "string" || !m.updateFrequency) return `metrics[${i}] (${m?.label}) missing updateFrequency`;
  }
  if (!Array.isArray(r.keyPositives) || !r.keyPositives.every((x: any) => typeof x === "string"))
    return "keyPositives was not a string array";
  if (!Array.isArray(r.keyRisks) || !r.keyRisks.every((x: any) => typeof x?.risk === "string" && typeof x?.checkNext === "string"))
    return "keyRisks was not a {risk,checkNext}[] array";
  if (
    !Array.isArray(r.thingsToInvestigate) ||
    !r.thingsToInvestigate.every((x: any) => typeof x?.area === "string" && typeof x?.checkNext === "string")
  )
    return "thingsToInvestigate was not a {area,checkNext}[] array";
  if (!r.overall || !RATINGS.includes(r.overall?.rating))
    return `overall.rating was ${JSON.stringify(r.overall?.rating)}, not one of ${RATINGS.join("/")}`;
  if (typeof r.overall.valuation !== "string") return "overall.valuation missing";
  if (typeof r.overall.profitability !== "string") return "overall.profitability missing";
  if (typeof r.overall.financialStrength !== "string") return "overall.financialStrength missing";
  if (typeof r.overall.income !== "string") return "overall.income missing";
  if (!Array.isArray(r.dataLimitations) || !r.dataLimitations.every((x: any) => typeof x === "string"))
    return "dataLimitations was not a string array";
  return "extraction was malformed (unreached check — isValidResult/explainInvalid have drifted)";
}

function slug(label: string, i: number): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return base || `metric_${i}`;
}

/**
 * Extract + interpret a stock key-statistics screenshot into a full StockHealthAssessment.
 * Throws on failure (bad screenshot, no LLM key, or a malformed result) — callers surface a
 * plain error message rather than rendering a partial/garbage assessment.
 */
export async function analyzeStockHealth(images: ImageInput[], sourceLabel?: string): Promise<StockHealthAssessment> {
  const extracted = await extractStockMetrics(images);
  if (!extracted.data || !extracted.data.metrics.length) {
    throw new Error(
      extracted.reason === "no_key"
        ? "Stock Health needs GEMINI_API_KEY configured — not available right now."
        : "Couldn't read any statistics from that screenshot. Try a clearer image of the summary panel."
    );
  }

  const raw: RawStockMetric[] = extracted.data.metrics;
  const extractedTitle = extracted.data.title; // ticker/company header text, if any was visible
  const rawList = raw.map((m) => `- ${m.label}: ${m.value}`).join("\n");

  const system =
    "You are a risk-intelligence analyst producing a stock health/risk screening for a retail-savvy " +
    "reader. You may ONLY use the exact metric values supplied below — never invent a metric, a value, " +
    "or a benchmark figure that wasn't given to you. Explain every metric in very simple language (as " +
    "if to a 13-year-old) but keep the risk framing precise. Do not automatically call a high number bad " +
    "or a low number good — the correct read depends on the specific metric and, where you can infer it, " +
    "the company's likely sector. If you cannot infer a sector with confidence, say so and use a broad-" +
    "market heuristic instead of guessing a sector. This is a screening/educational assessment only, not " +
    "investment advice. JSON only.";

  const user = `Extracted metrics (verbatim from a stock summary screenshot)${extractedTitle ? `, header text "${extractedTitle}"` : ""}:
${rawList}

Return ONE JSON object (no prose outside it):
{
  "ticker": "<ticker if identifiable${extractedTitle ? ` — the header text above is "${extractedTitle}", use it if it looks like a ticker` : ""}, else empty string>",
  "companyName": "<company name if identifiable${extractedTitle ? ` (the header text above may be a company name instead of a ticker)` : ""}, else empty string>",
  "sectorBasis": "sector" | "broad-market",
  "metrics": [
    {
      "id": "<short slug, e.g. pe_ratio>",
      "label": "<the metric's label, copied from the input>",
      "value": "<the metric's value, copied from the input verbatim — ALWAYS as a JSON string, e.g. \"15.59\", even though it looks like a number>",
      "category": "valuation" | "profitability" | "financialRisk" | "shareholderReturns" | "other",
      "meaning": "<what this metric means, explained very simply>",
      "whyItCares": "<why an investor cares about this metric>",
      "relevance": "High" | "Medium" | "Low",
      "assessment": "positive" | "neutral" | "caution" | "negative",
      "assessmentWhy": "<one sentence: why this assessment, in THIS company's likely context>",
      "benchmarkRange": "<an indicative typical/benchmark range, if meaningful for this metric>",
      "caveat": "<when this metric can mislead or needs more context>",
      "checkNext": "<only for caution/negative rows: the single most useful thing to check next>",
      "updateFrequency": "<how often this metric's underlying value actually changes — a short phrase like \"Daily\", \"Real-time (intraday)\", \"Quarterly (with earnings)\", \"Annual\", \"As of last declared dividend\", \"Event-based (scheduled date)\">"
    }
  ],
  "keyPositives": ["<3-5 most important positive signals>"],
  "keyRisks": [{"risk": "<concern>", "checkNext": "<what an investor should check because of it>"}],
  "thingsToInvestigate": [{"area": "<area the given metrics can't resolve>", "checkNext": "<what to look up>"}],
  "overall": {
    "rating": "attractive" | "reasonable" | "caution" | "highRisk",
    "valuation": "<one short sentence>",
    "profitability": "<one short sentence>",
    "financialStrength": "<one short sentence>",
    "income": "<one short sentence on dividend/income characteristics>",
    "redFlags": "<any significant red flag, or empty string>"
  },
  "dataLimitations": ["<things this screenshot cannot tell you, e.g. earnings growth, revenue growth, free cash flow, future estimates, competitive position, management quality, sector outlook, recent news>"]
}
- Include EVERY metric from the extracted list above, each exactly once, in "metrics".
- keyRisks/thingsToInvestigate/dataLimitations: 2-5 items each, be specific to what IS and ISN'T knowable from these numbers.
- JSON only.`;

  const { data, provider, reason } = await interpretWithProvider<LlmStockHealthResult>(system, user);

  // V5.15.1 — a purely-numeric-looking value ("15.59") is often emitted as a JSON number by
  // the model despite being asked for a string, since this call re-writes the value fresh
  // rather than passing the source string through untouched (same failure mode fixed in
  // extractStockMetrics() one step earlier). Coerce before validating rather than rejecting a
  // real, usable metric over its JSON type instead of its content — hit in production: a real
  // P/E value of 15.59 was rejected outright by the stricter string-only check this replaces.
  if (data && Array.isArray((data as any).metrics)) {
    for (const m of (data as any).metrics) {
      if (m && typeof m.value === "number") m.value = String(m.value);
    }
  }

  if (!data || !isValidResult(data)) {
    console.log(`[stockhealth] interpretation invalid: ${data ? explainInvalid(data) : `no data (reason=${reason})`}`);
    throw new Error("Couldn't produce a reliable assessment from that screenshot. Try again, or a clearer image.");
  }

  // V5.16 — the interpretation call sometimes leaves ticker/companyName blank even when the
  // screenshot's own header clearly had one (that header text isn't part of the metrics list
  // this call actually sees) — fall back to what extraction found directly, so the name at the
  // top of the assessment doesn't go missing just because the second call didn't echo it.
  return {
    ticker: data.ticker || extractedTitle || undefined,
    companyName: data.companyName || undefined,
    sectorBasis: data.sectorBasis,
    metrics: data.metrics.map((m, i) => ({ ...m, id: m.id || slug(m.label, i) })) as StockMetric[],
    keyPositives: data.keyPositives,
    keyRisks: data.keyRisks,
    thingsToInvestigate: data.thingsToInvestigate,
    overall: data.overall,
    dataLimitations: data.dataLimitations,
    sourceLabel,
    analyzedISO: new Date().toISOString(),
    provider,
  };
}
