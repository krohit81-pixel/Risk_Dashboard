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
        typeof m?.caveat === "string"
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

function explainInvalid(r: any): string {
  if (!r || typeof r !== "object") return "model returned no result";
  if (!Array.isArray(r.metrics) || !r.metrics.length) return "extraction had no metrics";
  if (!r.overall || !RATINGS.includes(r.overall?.rating)) return "extraction had no valid overall rating";
  if (!Array.isArray(r.keyPositives)) return "extraction had no key-positives list";
  if (!Array.isArray(r.keyRisks)) return "extraction had no key-risks list";
  if (!Array.isArray(r.dataLimitations)) return "extraction had no data-limitations list";
  return "extraction was malformed";
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
  if (!extracted.data || !extracted.data.length) {
    throw new Error(
      extracted.reason === "no_key"
        ? "Stock Health needs GEMINI_API_KEY configured — not available right now."
        : "Couldn't read any statistics from that screenshot. Try a clearer image of the summary panel."
    );
  }

  const raw: RawStockMetric[] = extracted.data;
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

  const user = `Extracted metrics (verbatim from a stock summary screenshot):
${rawList}

Return ONE JSON object (no prose outside it):
{
  "ticker": "<ticker if identifiable from a label, else empty string>",
  "companyName": "<company name if identifiable, else empty string>",
  "sectorBasis": "sector" | "broad-market",
  "metrics": [
    {
      "id": "<short slug, e.g. pe_ratio>",
      "label": "<the metric's label, copied from the input>",
      "value": "<the metric's value, copied from the input verbatim>",
      "category": "valuation" | "profitability" | "financialRisk" | "shareholderReturns" | "other",
      "meaning": "<what this metric means, explained very simply>",
      "whyItCares": "<why an investor cares about this metric>",
      "relevance": "High" | "Medium" | "Low",
      "assessment": "positive" | "neutral" | "caution" | "negative",
      "assessmentWhy": "<one sentence: why this assessment, in THIS company's likely context>",
      "benchmarkRange": "<an indicative typical/benchmark range, if meaningful for this metric>",
      "caveat": "<when this metric can mislead or needs more context>",
      "checkNext": "<only for caution/negative rows: the single most useful thing to check next>"
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

  if (!data || !isValidResult(data)) {
    console.log(`[stockhealth] interpretation invalid: ${data ? explainInvalid(data) : `no data (reason=${reason})`}`);
    throw new Error("Couldn't produce a reliable assessment from that screenshot. Try again, or a clearer image.");
  }

  return {
    ticker: data.ticker || undefined,
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
