// lib/analyze.ts
// Shared interpretation pipeline. Two entry points use it:
//   1) the daily editorial engine (themes → dedicated alignment), and
//   2) the Research workspace (user content → one analysis).
// The Mizuho alignment lives here as a DEDICATED grounded call (restored in V4.0 after
// inline tagging under-produced): a focused call gives the model its full attention, so
// coverage is reliable. The displayed "why" is the CURATED scenario path (no hallucinated
// mapping prose); plain-English twin is the curated pathLayman.

import { interpretWithProvider } from "./llm";
import { generateFocus } from "./focus";
import { detectConcepts } from "./concepts";
import {
  topRisksForPrompt,
  scenarioById,
  topRiskById,
} from "./mizuhoTopRisks";
import type { MizuhoAlignment, Confidence, Severity, RiskHorizon, ResearchAnalysis } from "./types";

function normalizeConfidence(c: string): Confidence {
  const v = (c || "").toLowerCase();
  if (v.startsWith("h")) return "High";
  if (v.startsWith("l")) return "Low";
  return "Medium";
}

const SEVERITIES: Severity[] = ["Low", "Moderate", "Elevated", "High"];
const HORIZONS: RiskHorizon[] = ["Immediate", "Medium-term", "Structural"];
function normalizeSeverity(s: string): Severity {
  const m = SEVERITIES.find((x) => x.toLowerCase() === (s || "").toLowerCase());
  return m ?? "Moderate";
}
function normalizeHorizon(h: string): RiskHorizon {
  const m = HORIZONS.find((x) => x.toLowerCase() === (h || "").toLowerCase());
  return m ?? "Medium-term";
}
const BANK_RISK_KINDS = ["Credit", "Market", "Liquidity & funding", "Capital", "Operational", "Strategic"];
function canonRiskKind(k: string): string {
  const v = (k || "").toLowerCase();
  if (v.startsWith("credit")) return "Credit";
  if (v.startsWith("market")) return "Market";
  if (v.startsWith("liquid") || v.includes("funding")) return "Liquidity & funding";
  if (v.startsWith("capital")) return "Capital";
  if (v.startsWith("oper")) return "Operational";
  if (v.startsWith("strat")) return "Strategic";
  return BANK_RISK_KINDS.includes(k) ? k : "Market";
}

/** Normalize a model-supplied date string to an ISO date (YYYY-MM-DD); undefined if unparseable. */
function normalizeDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s || s.length < 6 || /^\d+$/.test(s) || /^(n\/?a|none|unknown|null)$/i.test(s)) return undefined;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return undefined;
  const d = new Date(t);
  // Guard against absurd parses (e.g. a bare number) — require a plausible recent year.
  const y = d.getUTCFullYear();
  if (y < 2000 || y > 2100) return undefined;
  return d.toISOString().slice(0, 10);
}

/** Pull a publication date from a URL path like /2026/06/30/ when present. */
function dateFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const m = url.match(/\/(20\d{2})\/(\d{1,2})\/(\d{1,2})(?:\/|$)/);
  if (!m) return undefined;
  const [, y, mo, da] = m;
  const iso = `${y}-${mo.padStart(2, "0")}-${da.padStart(2, "0")}`;
  return normalizeDate(iso);
}

export interface AlignInput {
  title: string;
  why: string;
  impact: string;
}

/**
 * DEDICATED Mizuho alignment call (shared). Maps each input item to 0..n curated
 * Top-Risk scenarios. Returns a parallel array (one MizuhoAlignment[] per input).
 * Strictly grounded: only valid ids survive; the "why" is the curated scenario path.
 * A no-match (empty array) is valid and expected. Isolated — on failure returns all-empty.
 */
export async function alignToMizuho(items: AlignInput[]): Promise<MizuhoAlignment[][]> {
  const out: MizuhoAlignment[][] = items.map(() => []);
  if (!items.length) return out;

  const system =
    "You map risk items onto a bank's OWN published Top Risks taxonomy. You may ONLY use the " +
    "risk ids and scenario ids provided — never invent one. Tag each item with the 0-2 scenarios it " +
    "would most plausibly travel down. If nothing maps cleanly, return an empty array for that item — " +
    "a no-match is correct and expected. Do not write explanations; return ids + confidence only. JSON only.";

  const payload = items.map((it, i) => ({ i, title: it.title, why: it.why, impact: it.impact }));
  const user = `Mizuho published Top Risks (use ONLY these ids):
${topRisksForPrompt()}

Items:
${JSON.stringify(payload, null, 2)}

Return ONE JSON object:
{ "alignments": [ { "i": <item index>, "matches": [ { "riskId": "<id>", "scenarioId": "<id>", "confidence": "High|Medium|Low" } ] } ] }
- matches may be []. At most 2 per item. Use only the ids listed above. JSON only.`;

  const { data, reason } = await interpretWithProvider<{
    alignments: { i: number; matches: { riskId: string; scenarioId: string; confidence: string }[] }[];
  }>(system, user);

  if (!data || !Array.isArray(data.alignments)) {
    console.log(`[gen] alignment skipped (reason=${reason})`);
    return out;
  }

  let mapped = 0;
  let dropped = 0;
  for (const a of data.alignments) {
    if (typeof a.i !== "number" || !out[a.i] || !Array.isArray(a.matches)) continue;
    for (const m of a.matches.slice(0, 2)) {
      const risk = topRiskById(m.riskId);
      const scenario = scenarioById(m.riskId, m.scenarioId);
      if (!risk || !scenario) {
        dropped++;
        continue;
      }
      out[a.i].push({
        riskId: m.riskId,
        riskName: risk.name,
        scenarioId: m.scenarioId,
        scenarioLabel: scenario.label,
        confidence: normalizeConfidence(m.confidence),
        why: scenario.path,
        whyLayman: scenario.pathLayman,
      });
    }
  }
  console.log(`[gen] alignment: ${mapped} items, mapped=${out.reduce((n, a) => n + a.length, 0)}, rejected=${dropped}`);
  return out;
}

const MAX_CONTENT_CHARS = 16000; // ~4k words — cap input; label when truncated

export interface AnalyzeMeta {
  sourceType: "text" | "url" | "image";
  originalUrl?: string;
  sourceLabel?: string;
}

/**
 * Analyze ONE piece of user-supplied content through the standard CRO framework.
 * Completely isolated from the daily snapshot: computes and returns, persists nothing.
 * Grounded — interprets ONLY the supplied content, never invents facts/numbers.
 */
export async function analyzeContent(content: string, meta: AnalyzeMeta): Promise<ResearchAnalysis> {
  const trimmed = (content || "").trim();
  const truncated = trimmed.length > MAX_CONTENT_CHARS;
  const text = truncated ? trimmed.slice(0, MAX_CONTENT_CHARS) : trimmed;

  const system =
    "You are a risk-intelligence analyst. Interpret ONLY the supplied content through a CRO lens for " +
    "the incoming Head of Risk at Mizuho (a Japanese global bank), onboarding via Mizuho Americas. " +
    "Never invent facts, numbers or quotes not present in the content. Cleanly separate SOURCED facts " +
    "(whatHappened) from your INTERPRETATION (everything else). If the content is not risk/finance " +
    "relevant, say so plainly in whatHappened and keep the other fields brief. JSON only.";

  const user = `Content to analyze${meta.originalUrl ? ` (from ${meta.originalUrl})` : ""}:
"""
${text}
"""

Return ONE JSON object (no prose outside it):
{
  "title": "<concise headline for this content>",
  "articleDate": "<the date the article/source was published, if stated anywhere in the content (dateline, byline, timestamp) — ISO YYYY-MM-DD; empty string if not present>",
  "category": "<short risk category, e.g. Monetary Policy | Credit Risk | Market Risk | Operational Risk & Resilience | Geopolitics | Regulation>",
  "severity": "Low|Moderate|Elevated|High",
  "horizon": "Immediate|Medium-term|Structural",
  "confidence": "Low|Medium|High",
  "whatHappened": "<2-3 sentence FACTUAL summary, grounded strictly in the content — sourced>",
  "whyItMatters": "<macro / market / risk significance — your interpretation>",
  "firstOrder": "<the immediate, direct consequence>",
  "secondOrder": "<the knock-on / downstream consequence>",
  "bankRiskKind": "<one of: Credit | Market | Liquidity & funding | Capital | Operational | Strategic>",
  "bankRisk": "<the specific implication for a global bank, executive risk language, grounded in the content>",
  "keyTakeaway": "<one-sentence bottom line>",
  "whatToUnderstand": "<teaching note: the mechanism or concept a non-expert should grasp to follow this>",
  "laymanWhatHappened": "<whatHappened in plain English, minimal jargon>",
  "laymanWhyItMatters": "<whyItMatters in plain English>"
}
- Keep each field concise. whatHappened must be sourced (no added facts); the rest is interpretation.
- Pick exactly one bankRiskKind from the list. JSON only.`;

  const { data, provider, reason } = await interpretWithProvider<{
    title: string;
    articleDate: string;
    category: string;
    severity: string;
    horizon: string;
    confidence: string;
    whatHappened: string;
    whyItMatters: string;
    firstOrder: string;
    secondOrder: string;
    bankRiskKind: string;
    bankRisk: string;
    keyTakeaway: string;
    whatToUnderstand: string;
    laymanWhatHappened: string;
    laymanWhyItMatters: string;
  }>(system, user);

  if (!data || !data.whatHappened) {
    throw new Error(`analysis failed (reason=${reason})`);
  }

  const bankRiskKind = canonRiskKind(data.bankRiskKind || "");
  const bankRisk = (data.bankRisk || "").trim();
  // Combined string for back-compat consumers (savedStore, alignment input, fallback render).
  const impactCombined = bankRisk ? `${bankRiskKind}: ${bankRisk}` : "";
  // One-entry areas list keeps the saved-item / old-render shape valid.
  const areas = bankRisk ? [{ area: bankRiskKind, impact: bankRisk, layman: bankRisk }] : [];

  // Dedicated alignment (shared with editorial) for this single item.
  const [alignment] = await alignToMizuho([
    { title: data.title || "", why: data.whyItMatters || "", impact: impactCombined },
  ]);

  // V4.4 — personalized "what should I focus on?" (dedicated call; may be empty).
  const focus = await generateFocus({
    title: data.title || "",
    whatHappened: data.whatHappened,
    whyItMatters: data.whyItMatters || "",
    bankingImpact: impactCombined,
    alignment: alignment ?? [],
  });

  // Related concepts: link ONLY to existing curated concepts (never auto-create).
  const relatedConcepts = detectConcepts(
    `${data.title} ${data.whatHappened} ${data.whyItMatters} ${impactCombined} ${data.firstOrder || ""} ${data.secondOrder || ""}`
  );

  return {
    title: data.title || "Untitled analysis",
    articleDate: normalizeDate(data.articleDate) || dateFromUrl(meta.originalUrl),
    category: (data.category || "").trim() || "Risk",
    severity: normalizeSeverity(data.severity),
    horizon: normalizeHorizon(data.horizon),
    confidence: normalizeConfidence(data.confidence),
    whatHappened: data.whatHappened,
    whyItMatters: data.whyItMatters || "",
    firstOrder: (data.firstOrder || "").trim(),
    secondOrder: (data.secondOrder || "").trim(),
    bankRiskKind,
    bankRisk,
    keyTakeaway: (data.keyTakeaway || "").trim(),
    whatToUnderstand: (data.whatToUnderstand || "").trim(),
    bankingImpact: impactCombined,
    bankingImpactAreas: areas,
    mizuhoAlignment: alignment ?? [],
    relatedConcepts,
    focus,
    layman: {
      whatHappened: data.laymanWhatHappened || data.whatHappened,
      whyItMatters: data.laymanWhyItMatters || data.whyItMatters || "",
      bankingImpact: impactCombined,
    },
    sourceType: meta.sourceType,
    sourceLabel: meta.sourceLabel,
    originalUrl: meta.originalUrl,
    analyzedISO: new Date().toISOString(),
    truncated,
    provider,
  };
}
