// lib/analyze.ts
// Shared interpretation pipeline. Two entry points use it:
//   1) the daily editorial engine (themes → dedicated alignment), and
//   2) the Research workspace (user content → one analysis).
// The Mizuho alignment lives here as a DEDICATED grounded call (restored in V4.0 after
// inline tagging under-produced): a focused call gives the model its full attention, so
// coverage is reliable. The displayed "why" is the CURATED scenario path (no hallucinated
// mapping prose); plain-English twin is the curated pathLayman.

import { interpretWithProvider } from "./llm";
import { detectConcepts } from "./concepts";
import {
  topRisksForPrompt,
  scenarioById,
  topRiskById,
} from "./mizuhoTopRisks";
import type { MizuhoAlignment, Confidence, ResearchAnalysis } from "./types";

function normalizeConfidence(c: string): Confidence {
  const v = (c || "").toLowerCase();
  if (v.startsWith("h")) return "High";
  if (v.startsWith("l")) return "Low";
  return "Medium";
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
  sourceType: "text" | "url";
  originalUrl?: string;
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
    "Never invent facts, numbers or quotes not present in the content. If the content is not risk/finance " +
    "relevant, say so plainly in whatHappened and keep the other fields brief. JSON only.";

  const user = `Content to analyze${meta.originalUrl ? ` (from ${meta.originalUrl})` : ""}:
"""
${text}
"""

Return ONE JSON object (no prose outside it):
{
  "title": "<concise headline for this content>",
  "whatHappened": "<2-3 sentence factual summary of the content>",
  "whyItMatters": "<macro / market significance>",
  "bankingImpact": "<implications across credit, market, liquidity, funding, capital, operational risk — only those that genuinely apply>",
  "laymanWhatHappened": "<same as whatHappened, plain English, minimal jargon>",
  "laymanWhyItMatters": "<same as whyItMatters, plain English>",
  "laymanBankingImpact": "<same as bankingImpact, plain English>"
}
JSON only.`;

  const { data, provider, reason } = await interpretWithProvider<{
    title: string;
    whatHappened: string;
    whyItMatters: string;
    bankingImpact: string;
    laymanWhatHappened: string;
    laymanWhyItMatters: string;
    laymanBankingImpact: string;
  }>(system, user);

  if (!data || !data.whatHappened) {
    throw new Error(`analysis failed (reason=${reason})`);
  }

  // Dedicated alignment (shared with editorial) for this single item.
  const [alignment] = await alignToMizuho([
    { title: data.title || "", why: data.whyItMatters || "", impact: data.bankingImpact || "" },
  ]);

  // Related concepts: link ONLY to existing curated concepts (never auto-create).
  const relatedConcepts = detectConcepts(
    `${data.title} ${data.whatHappened} ${data.whyItMatters} ${data.bankingImpact}`
  );

  return {
    title: data.title || "Untitled analysis",
    whatHappened: data.whatHappened,
    whyItMatters: data.whyItMatters || "",
    bankingImpact: data.bankingImpact || "",
    mizuhoAlignment: alignment ?? [],
    relatedConcepts,
    layman: {
      whatHappened: data.laymanWhatHappened || data.whatHappened,
      whyItMatters: data.laymanWhyItMatters || data.whyItMatters || "",
      bankingImpact: data.laymanBankingImpact || data.bankingImpact || "",
    },
    sourceType: meta.sourceType,
    originalUrl: meta.originalUrl,
    analyzedISO: new Date().toISOString(),
    truncated,
    provider,
  };
}
