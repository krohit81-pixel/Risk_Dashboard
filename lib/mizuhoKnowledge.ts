// lib/mizuhoKnowledge.ts
// V5.0 — static Mizuho Knowledge Repository (institutional knowledge from Basel Pillar 3,
// financial statements, investor presentations, annual reports, risk appetite, governance).
// Source of truth is embedded here (git-versioned); seeded into KV via /api/admin/seed-mizuho
// so it can be read at runtime and updated without a code deploy. Retrieval is SELECTIVE —
// we never pass the whole repository to the model, only the sections a given article touches.

import { kvGet } from "./snapshotStore";
import { interpretWithProvider } from "./llm";

export const MIZUHO_KNOWLEDGE_KEY = "mizuho:knowledge:master";

/** Embedded fallback / seed content. Keep in sync with the disclosed source documents. */
export const MIZUHO_KNOWLEDGE = {
  version: "5.0",
  institution: "Mizuho Financial Group",
  last_updated: "2026-05-19",
  capital: {
    source: "Basel Pillar 3",
    summary: "Mizuho maintains strong regulatory capital and liquidity comfortably above minimum requirements.",
    key_metrics: { cet1: "13.70%", tier1: "16.55%", total_capital: "18.41%", lcr: "132.2%", nsfr: "115%", leverage: "5.07%" },
    interpretation: [
      "Capital strength is a strategic priority.",
      "Credit risk is the largest contributor to RWA.",
      "Funding stability is a recurring management theme.",
      "Liquidity buffers remain strong.",
    ],
    retrieve_on: ["banking stress", "capital", "cet1", "lcr", "nsfr", "rwa", "funding", "treasury", "basel"],
  },
  financials: {
    source: "FY25 Financial Statements",
    summary: "Record profitability driven by fee income, higher BOJ rates and strong corporate banking activity.",
    metrics: { ordinary_income: "9.09T", ordinary_profit: "1.57T", net_profit: "1.25T", assets: "302.2T", guidance: "1.30T" },
    drivers: ["Higher BOJ rates", "Fee income", "FX", "Corporate Banking", "Global Markets"],
    risk_focus: ["Credit costs", "Geopolitical uncertainty", "Capital allocation", "Liquidity"],
  },
  strategy: {
    source: "FY25 Investor Presentation",
    vision: "Become a leading global financial institution.",
    targets: { roe: "Above 12%", payout: "60%", buyback: "400B", pb_target: "Continue improving valuation" },
    focus_businesses: ["Global CIB", "Japanese Retail", "Wealth Management", "Asset Management", "Corporate Banking"],
    macro_view: [
      "Japan has exited deflation.",
      "Higher rates support banking earnings.",
      "Corporate investment cycle improving.",
      "Retail shifting from savings to investments.",
    ],
  },
  risk_philosophy: {
    discipline: [
      "Conservative underwriting",
      "Forward-looking provisioning",
      "Customer flow over proprietary trading",
      "Disciplined capital allocation",
    ],
    decision_framework: ["Prepare for risks.", "Capture tailwinds.", "Protect capital.", "Maintain flexibility."],
  },
  executive_questions: [
    "Does this affect capital?",
    "Does this affect liquidity?",
    "Does this affect RWAs?",
    "Does this affect corporate banking?",
    "Does this affect shareholder returns?",
    "Does this change FY28 targets?",
  ],
  retrieval_index: {
    capital: ["cet1", "tier1", "basel", "rwa", "stress test"],
    earnings: ["profit", "results", "quarterly"],
    macro: ["boj", "inflation", "yen", "rates"],
    strategy: ["roe", "buyback", "payout"],
    credit: ["defaults", "provisions", "commercial real estate"],
  },
} as const;

export type MizuhoKnowledge = typeof MIZUHO_KNOWLEDGE;

/** Read the repository from KV; fall back to the embedded copy if not seeded yet. */
export async function getMizuhoKnowledge(): Promise<MizuhoKnowledge> {
  const kv = await kvGet<MizuhoKnowledge>(MIZUHO_KNOWLEDGE_KEY);
  return kv ?? MIZUHO_KNOWLEDGE;
}

// ── STEP 1/2: domain classification + selective section retrieval ──
// Repository domains → keywords that signal them, and → which JSON sections carry the disclosure.
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  Capital: ["capital", "cet1", "tier 1", "tier1", "rwa", "basel", "stress test", "capital buffer", "leverage ratio"],
  Liquidity: ["liquidity", "lcr", "nsfr", "funding", "deposit run", "deposits"],
  Credit: ["credit", "default", "provision", "npl", "loan loss", "underwriting", "commercial real estate", "cre", "delinquenc"],
  Market: ["market risk", "trading", "proprietary", "fx", "volatility", "yields", "bond market", "rates"],
  "Operational Risk": ["operational risk", "cyber", "outage", "fraud", "conduct", "resilience"],
  "Corporate Banking": ["corporate banking", "cib", "syndicated", "corporate lending", "wholesale"],
  Treasury: ["treasury", "alm", "issuance", "repo", "funding"],
  "Wealth Management": ["wealth management", "private bank", "high net worth", "hnw"],
  "Asset Management": ["asset management", "aum", "fund flows"],
  Strategy: ["strategy", "roe", "buyback", "payout", "dividend", "valuation", "pbr", "medium-term plan", "shareholder return"],
  "Financial Results": ["earnings", "results", "profit", "quarterly", "guidance", "net income", "revenue"],
  Regulation: ["regulation", "regulator", "regulatory", "fsa", "occ", "fdic", "supervis", "capital rule"],
  "Japan Macro": ["boj", "bank of japan", "japan", "yen", "inflation", "deflation", "tankan", "jgb"],
};

const DOMAIN_SECTIONS: Record<string, (keyof MizuhoKnowledge)[]> = {
  Capital: ["capital"],
  Liquidity: ["capital"],
  Credit: ["capital", "risk_philosophy"],
  Market: ["risk_philosophy", "financials"],
  "Operational Risk": [], // no dedicated disclosure yet → will surface as a repository gap
  "Corporate Banking": ["strategy", "financials"],
  Treasury: ["capital"],
  "Wealth Management": ["strategy"],
  "Asset Management": ["strategy"],
  Strategy: ["strategy"],
  "Financial Results": ["financials"],
  Regulation: ["capital"],
  "Japan Macro": ["strategy"],
};

export interface MizuhoRetrieval {
  domains: string[];
  sectionKeys: string[];
  /** Only the matched sections + always-on meta — never the whole repository. */
  payload: Record<string, unknown>;
}

/** STEP 1+2 — match the article to domains and pull ONLY the relevant sections. */
export function retrieveMizuhoSections(text: string, knowledge: MizuhoKnowledge): MizuhoRetrieval {
  const hay = (text || "").toLowerCase();
  const domains: string[] = [];
  for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    if (kws.some((k) => hay.includes(k))) domains.push(domain);
  }
  const sectionKeys = new Set<string>();
  for (const d of domains) for (const s of DOMAIN_SECTIONS[d] ?? []) sectionKeys.add(s as string);

  const payload: Record<string, unknown> = {};
  for (const key of sectionKeys) payload[key] = (knowledge as Record<string, unknown>)[key];
  return { domains, sectionKeys: [...sectionKeys], payload };
}

// ── STEP 3-5: interpret through Mizuho's disclosed perspective ──
export interface MizuhoLens {
  domains: string[]; // STEP 1 — matched repository domains
  sections: string[]; // provenance — which sections informed the context
  context: string; // MIZUHO CONTEXT — strictly from the repository
  interpretation: string; // INTERPRETATION — reasoned, Mizuho-specific
  businesses: string[]; // businesses affected
  riskStripes: string[]; // risk stripes affected
  executives: string[]; // executive questions/roles triggered
  impacts: string[]; // capital / liquidity / earnings / funding / strategy movement
  gap?: string; // explicit note when the repository lacks supporting disclosure
  repoVersion?: string;
  repoUpdated?: string;
}

/** Run the article facts through Mizuho's disclosed positions. Returns null on hard failure. */
export async function interpretThroughMizuho(facts: {
  title: string;
  whatHappened: string;
  whyItMatters?: string;
}): Promise<MizuhoLens | null> {
  const knowledge = await getMizuhoKnowledge();
  const blob = `${facts.title} ${facts.whatHappened} ${facts.whyItMatters ?? ""}`;
  const { domains, sectionKeys, payload } = retrieveMizuhoSections(blob, knowledge);

  // No domain match → honest "not covered" lens, no model call needed.
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
