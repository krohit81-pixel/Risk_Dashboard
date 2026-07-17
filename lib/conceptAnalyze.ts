// lib/conceptAnalyze.ts
// V5.5 — converts arbitrary pasted text ("Net Interest Income", a paragraph copied from an
// article, a rough note) into the app's standard Concept Library format via a dedicated LLM
// call, for the user to review/edit before saving. This is EXPLANATORY REFORMATTING, not
// sourced-fact extraction like Research analysis — the model is drafting glossary-style prose
// grounded in the input, not separating fact from interpretation. Still must not invent
// numbers/claims that aren't implied by the input.

import { interpretWithProvider } from "./llm";
import type { ConceptCategory } from "./concepts";

const CATEGORIES: ConceptCategory[] = ["Market", "Credit", "Capital", "Liquidity", "Macro", "Japan"];

export interface ConceptDraft {
  term: string;
  formal: string;
  category: ConceptCategory;
  aliases: string[];
  layman: string;
  risk: string;
  cro: string;
}

function normalizeCategory(c: string): ConceptCategory {
  const hit = CATEGORIES.find((x) => x.toLowerCase() === (c || "").toLowerCase());
  return hit ?? "Market";
}

/** STEP: raw text (+ optional term hint) → a standard-format concept draft. Null on failure. */
export async function analyzeConceptText(rawText: string, termHint?: string): Promise<ConceptDraft | null> {
  const system =
    "You convert pasted text about a financial/risk concept into a glossary entry for a CRO's personal " +
    "Concept Library, in the app's fixed format. Ground every field in the supplied text — don't invent " +
    "statistics or claims the text doesn't support — but DO write in the app's established voice: 'layman' " +
    "is plain English with zero jargon, 'risk' is the precise language a CRO would use, 'cro' is one sentence " +
    "on why a Chief Risk Officer specifically would care. Keep every field concise (1-2 sentences each, except " +
    "aliases). JSON only.";

  const user = `${termHint ? `Term hint: ${termHint}\n\n` : ""}Pasted text:
"""
${rawText.slice(0, 6000)}
"""

Return ONE JSON object:
{
  "term": "<short display name, Title Case, e.g. 'Net Interest Income'>",
  "formal": "<fuller/formal name if different from term, else repeat term>",
  "category": "<one of: Market, Credit, Capital, Liquidity, Macro, Japan — pick the closest fit>",
  "aliases": ["<surface forms / abbreviations someone might use for this, incl. the term itself>"],
  "layman": "<plain English explanation, zero jargon, 1-2 sentences>",
  "risk": "<the precise language a CRO would use to describe this, 1-2 sentences>",
  "cro": "<one sentence: why a CRO specifically cares about this>"
}
JSON only, no markdown fences.`;

  const { data } = await interpretWithProvider<{
    term: string;
    formal: string;
    category: string;
    aliases: string[];
    layman: string;
    risk: string;
    cro: string;
  }>(system, user);

  if (!data || !data.term || !data.layman) return null;

  return {
    term: data.term.trim(),
    formal: (data.formal || data.term).trim(),
    category: normalizeCategory(data.category),
    aliases: Array.isArray(data.aliases) ? data.aliases.filter((a) => typeof a === "string" && a.trim()) : [],
    layman: (data.layman || "").trim(),
    risk: (data.risk || "").trim(),
    cro: (data.cro || "").trim(),
  };
}
