// lib/mizuhoKnowledge.ts
// V5.0 — server-side readers/interpreters for the Mizuho Knowledge Repository.
// Pure data + retrieval live in ./mizuhoKnowledgeData (client-safe); re-exported here so
// existing imports keep working.

import { kvGet } from "./snapshotStore";
import { interpretWithProvider } from "./llm";
import {
  MIZUHO_KNOWLEDGE,
  MIZUHO_KNOWLEDGE_KEY,
  retrieveMizuhoSections,
  type MizuhoKnowledge,
  type MizuhoLens,
} from "./mizuhoKnowledgeData";

export {
  MIZUHO_KNOWLEDGE,
  MIZUHO_KNOWLEDGE_KEY,
  retrieveMizuhoSections,
} from "./mizuhoKnowledgeData";
export type { MizuhoKnowledge, MizuhoLens, MizuhoRetrieval } from "./mizuhoKnowledgeData";

/** Read the repository from KV; fall back to the embedded copy if not seeded yet. */
export async function getMizuhoKnowledge(): Promise<MizuhoKnowledge> {
  const kv = await kvGet<MizuhoKnowledge>(MIZUHO_KNOWLEDGE_KEY);
  return kv ?? MIZUHO_KNOWLEDGE;
}

/** STEP 3-5 — run the article facts through Mizuho's disclosed positions. Null on hard failure. */
export async function interpretThroughMizuho(facts: {
  title: string;
  whatHappened: string;
  whyItMatters?: string;
}): Promise<MizuhoLens | null> {
  const knowledge = await getMizuhoKnowledge();
  const blob = `${facts.title} ${facts.whatHappened} ${facts.whyItMatters ?? ""}`;
  const { domains, sectionKeys, payload } = retrieveMizuhoSections(blob, knowledge);

  if (domains.length === 0) {
    return {
      domains: [],
      sections: [],
      context: "",
      interpretation: "",
      businesses: [],
      riskStripes: [],
      executives: [],
      impacts: [],
      gap: "This development does not map to a disclosed Mizuho repository domain, so no Mizuho-specific context is available.",
      repoVersion: knowledge.version,
      repoUpdated: knowledge.last_updated,
    };
  }

  const system =
    "You interpret an article through Mizuho Financial Group's OWN disclosed positions — the repository excerpts provided — " +
    "not generic banking knowledge. Prefer Mizuho's disclosed strategy/metrics over generic knowledge whenever they differ. " +
    "NEVER invent facts: MIZUHO CONTEXT must come STRICTLY from the excerpts. If the excerpts don't support a point, say so in 'gap' " +
    "rather than guessing. Keep the layers distinct — FACT is the article (given), CONTEXT is the repository, INTERPRETATION is your reasoning. JSON only.";

  const user = `ARTICLE (FACT):
- title: ${facts.title}
- what happened: ${facts.whatHappened}
- why it matters: ${facts.whyItMatters ?? ""}

Matched Mizuho domains: ${domains.join(", ")}

MIZUHO REPOSITORY EXCERPTS (v${knowledge.version}, updated ${knowledge.last_updated}) — use ONLY these for MIZUHO CONTEXT:
${JSON.stringify(payload, null, 2)}

Mizuho executive questions to weigh: ${knowledge.executive_questions.join(" ")}
Mizuho focus businesses (pick only those genuinely affected): ${knowledge.strategy.focus_businesses.join(", ")}

Return ONE JSON object:
{
  "context": "<2-3 sentences of Mizuho context grounded ONLY in the excerpts>",
  "interpretation": "<why this specifically matters to Mizuho — reasoned from FACT + CONTEXT>",
  "businesses": ["<affected Mizuho businesses, from the focus list; [] if none>"],
  "riskStripes": ["<Capital|Liquidity|Credit|Market|Operational — only those affected>"],
  "executives": ["<which executive questions this triggers, short; [] if none>"],
  "impacts": ["<of: capital, liquidity, earnings, funding, strategy — only those this plausibly moves>"],
  "gap": "<state explicitly if the repository lacks relevant disclosure; else empty string>"
}
JSON only. Keep each field concise.`;

  const { data } = await interpretWithProvider<{
    context: string;
    interpretation: string;
    businesses: string[];
    riskStripes: string[];
    executives: string[];
    impacts: string[];
    gap: string;
  }>(system, user);

  if (!data) return null;
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : []);
  return {
    domains,
    sections: sectionKeys,
    context: (data.context || "").trim(),
    interpretation: (data.interpretation || "").trim(),
    businesses: arr(data.businesses),
    riskStripes: arr(data.riskStripes),
    executives: arr(data.executives),
    impacts: arr(data.impacts),
    gap: (data.gap || "").trim() || undefined,
    repoVersion: knowledge.version,
    repoUpdated: knowledge.last_updated,
  };
}
