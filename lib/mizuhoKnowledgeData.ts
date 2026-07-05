// lib/mizuhoKnowledgeData.ts
// V5.1 — PURE data + types + retrieval for the Mizuho Knowledge Repository. No server imports
// (KV/LLM), so this is safe to import into client components (e.g. the Learn reference view).
// The server-side readers/interpreters live in mizuhoKnowledge.ts and re-export from here.

export const MIZUHO_KNOWLEDGE_KEY = "mizuho:knowledge:master";

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

export interface MizuhoLens {
  domains: string[];
  sections: string[];
  context: string;
  interpretation: string;
  businesses: string[];
  riskStripes: string[];
  executives: string[];
  impacts: string[];
  gap?: string;
  repoVersion?: string;
  repoUpdated?: string;
}

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
  "Operational Risk": [],
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
