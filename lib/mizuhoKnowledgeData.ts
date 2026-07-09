// lib/mizuhoKnowledgeData.ts
// V5.2.1 — PURE data + types + retrieval for the Mizuho Knowledge Repository. No server
// imports (KV/LLM), so this is safe to import into client components (Learn reference view).
// The server-side readers/interpreters live in mizuhoKnowledge.ts and re-export from here.
//
// V5.2.1 — restructured from one flat object into a repository of self-describing CARDS
// (matching the shape of the source documents themselves: each has its own metadata, purpose,
// structured content, and "Retrieval Triggers"). This scales the way the source material is
// clearly meant to grow — two more cards (Basel Pillar 3, Financial Statements reference) are
// already referenced as "related knowledge cards" in the business-model card, not yet written.
// Adding a card in future = append to CARDS + tag its domains; no retrieval-logic changes needed.

export const MIZUHO_KNOWLEDGE_KEY = "mizuho:knowledge:master";

/** The 13 repository domains STEP 1 classifies an article against. */
export const MIZUHO_DOMAINS = [
  "Capital",
  "Liquidity",
  "Credit",
  "Market",
  "Operational Risk",
  "Corporate Banking",
  "Treasury",
  "Wealth Management",
  "Asset Management",
  "Strategy",
  "Financial Results",
  "Regulation",
  "Japan Macro",
  "Governance", // V5.2.1 — added for the risk-governance/RAF cards
] as const;
export type MizuhoDomain = (typeof MIZUHO_DOMAINS)[number];

export interface MizuhoKnowledgeCard {
  id: string;
  title: string;
  source: string;
  priority: "Very High" | "High" | "Medium";
  /** Which of the 13 domains this card is relevant to (drives STEP 2 retrieval). */
  domains: MizuhoDomain[];
  /** Keyword triggers, as authored in the source documents ("Retrieval Triggers"). */
  retrieveOn: string[];
  /** Free-form structured content — shape genuinely differs per card, rendered card-by-card
   *  in the Learn reference view and passed whole to the interpretation prompt when matched. */
  content: Record<string, unknown>;
  /** Optional: card-specific leadership/executive questions (governance & risk-mgmt cards have these). */
  leadershipQuestions?: string[];
}

const CORE_DISCLOSURES: MizuhoKnowledgeCard = {
  id: "core_disclosures",
  title: "Capital, Financial Profile & Strategy",
  source: "Basel Pillar 3 / FY25 Financial Statements / FY25 Investor Presentation",
  priority: "Very High",
  domains: ["Capital", "Liquidity", "Credit", "Market", "Treasury", "Strategy", "Financial Results", "Regulation", "Japan Macro"],
  retrieveOn: [
    "banking stress", "capital", "cet1", "lcr", "nsfr", "rwa", "funding", "treasury", "basel",
    "profit", "results", "quarterly", "boj", "inflation", "yen", "rates", "roe", "buyback", "payout",
    "defaults", "provisions", "commercial real estate",
  ],
  content: {
    capital: {
      summary: "Mizuho maintains strong regulatory capital and liquidity comfortably above minimum requirements.",
      key_metrics: { cet1: "13.70%", tier1: "16.55%", total_capital: "18.41%", lcr: "132.2%", nsfr: "115%", leverage: "5.07%" },
      interpretation: [
        "Capital strength is a strategic priority.",
        "Credit risk is the largest contributor to RWA.",
        "Funding stability is a recurring management theme.",
        "Liquidity buffers remain strong.",
      ],
    },
    financials: {
      summary: "Record profitability driven by fee income, higher BOJ rates and strong corporate banking activity.",
      metrics: { ordinary_income: "9.09T", ordinary_profit: "1.57T", net_profit: "1.25T", assets: "302.2T", guidance: "1.30T" },
      drivers: ["Higher BOJ rates", "Fee income", "FX", "Corporate Banking", "Global Markets"],
      risk_focus: ["Credit costs", "Geopolitical uncertainty", "Capital allocation", "Liquidity"],
    },
    strategy: {
      vision: "Become a leading global financial institution.",
      targets: { roe: "Above 12%", payout: "60%", buyback: "400B", pb_target: "Continue improving valuation" },
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
  },
  leadershipQuestions: [
    "Does this affect capital?",
    "Does this affect liquidity?",
    "Does this affect RWAs?",
    "Does this affect corporate banking?",
    "Does this affect shareholder returns?",
    "Does this change FY28 targets?",
  ],
};

const RISK_GOVERNANCE: MizuhoKnowledgeCard = {
  id: "risk_governance",
  title: "Risk Governance Framework",
  source: "Integrated Report 2025 (Risk Governance)",
  priority: "High",
  domains: ["Governance", "Operational Risk"],
  retrieveOn: [
    "governance", "risk committee", "board oversight", "first line", "second line",
    "raf", "operational resilience", "risk culture",
  ],
  content: {
    purpose: "How Mizuho governs risk through executive oversight, committees, the Risk Appetite Framework and the Three Lines model.",
    summary: "Risk governance aligns risk-taking with strategy, capital and sustainability through executive oversight, committee review, continuous monitoring and clearly defined responsibilities.",
    philosophy: [
      "Strategy drives risk taking.",
      "Risk appetite precedes execution.",
      "Independent challenge is mandatory.",
      "Continuous monitoring supports intervention.",
      "Governance evolves with the external environment.",
    ],
    structure: {
      "Board & Senior Management": ["Set strategy", "Approve risk appetite", "Review emerging risks"],
      "Risk Management Committee": ["Reviews top risks", "Reviews stress tests", "Supports executive decisions"],
      "Risk Committee": ["Independent challenge", "Input to top-risk selection"],
    },
    three_lines: {
      "First Line — Business units": ["Own risk", "Execute controls"],
      "Second Line — Risk Management": ["Oversight", "Challenge", "Monitoring"],
      "Executive Management": ["Balance growth and risk", "Review RAF", "Approve responses"],
    },
    governance_cycle: [
      "External Environment", "Emerging Risks", "Top Risks", "Risk Appetite",
      "Business Planning", "Stress Testing", "Continuous Monitoring", "Management Review", "RAF Adjustment",
    ],
    guidance: "Use this card to explain how Mizuho would GOVERN AND RESPOND to an event, not just describe the event itself.",
  },
  leadershipQuestions: [
    "Would this become a Top Risk?",
    "Should the Risk Management Committee review it?",
    "Does this require new stress scenarios?",
    "Does this affect strategy or capital?",
    "Is escalation required?",
  ],
};

const RISK_MANAGEMENT: MizuhoKnowledgeCard = {
  id: "risk_management",
  title: "Risk Management Framework (RAF & Top Risks)",
  source: "Integrated Report 2025 (Risk Governance)",
  priority: "High",
  domains: ["Governance", "Capital", "Credit", "Market", "Operational Risk", "Japan Macro"],
  retrieveOn: [
    "raf", "risk appetite", "stress testing", "top risks", "scenario analysis", "enterprise risk", "resilience",
  ],
  content: {
    purpose: "How Mizuho identifies, measures, monitors and manages enterprise risks and integrates them into business planning.",
    summary: "Built around the Risk Appetite Framework (RAF): risk appetite is established before business planning, validated using stress testing, and monitored continuously. Material changes in the external environment may trigger reassessment of business plans and risk appetite.",
    core_principles: [
      "Risk taking supports strategic objectives.",
      "Risk appetite guides business planning.",
      "Business plans are validated using stress testing.",
      "Continuous monitoring throughout the year.",
      "Management adjusts risk appetite when conditions materially change.",
    ],
    raf_definition: "Risk appetite defines the types and levels of risk Mizuho is willing to accept while executing its strategy.",
    raf_cycle: [
      "Identify external environment and top risks", "Determine risk appetite", "Formulate business plans",
      "Build baseline and adverse scenarios", "Perform stress testing", "Assess business plan resilience",
      "Monitor risks continuously", "Review and recalibrate",
    ],
    top_risks: {
      "Macro & Geopolitical": ["Japan slowdown", "US slowdown", "Sovereign risk", "Trade wars"],
      "Operational": ["Cyber attacks", "IT failures", "AI disruption", "Natural disasters"],
      "Conduct": ["Money laundering", "Terrorist financing", "Employee misconduct"],
      "ESG": ["Climate transition", "Environmental response", "Talent shortages"],
    },
    second_order_reasoning: [
      "BOJ rates \u2192 Earnings \u2192 Capital \u2192 RAF \u2192 Lending",
      "Trade war \u2192 Credit quality \u2192 Provisions \u2192 Stress testing \u2192 Business plan review",
    ],
  },
  leadershipQuestions: [
    "Does this change Top Risks?",
    "Does this alter stress scenarios?",
    "Does this affect capital planning?",
    "Should RAF be reviewed?",
    "Which businesses and risk stripes are affected?",
  ],
};

const BUSINESS_MODEL: MizuhoKnowledgeCard = {
  id: "business_model",
  title: "Business Model & News-to-Business Mapping",
  source: "Integrated Report 2025 / Company Information",
  priority: "Very High",
  // Tagged broadly on purpose: this card's whole point is mapping ANY external event to the
  // affected Mizuho business line, so it's relevant across most domains, not one narrow slice.
  domains: ["Corporate Banking", "Treasury", "Wealth Management", "Asset Management", "Market", "Credit", "Strategy"],
  retrieveOn: [
    "retail", "consumer", "mortgage", "sme", "trade", "exports", "manufacturing", "supply chain", "tariffs",
    "m&a", "infrastructure", "project finance", "lng", "renewables", "acquisition", "leveraged finance",
    "ipo", "bond issuance", "private credit", "yield curve", "treasuries", "fed", "boj", "fx", "volatility",
    "vix", "asset flows", "private wealth", "retirement", "cre", "cyber", "ai",
  ],
  content: {
    summary: "Mizuho operates a diversified universal banking model: domestic retail banking, corporate banking, trust banking, asset management and a growing Global Corporate & Investment Banking (GCIB) franchise. This card maps external events directly to affected businesses.",
    business_lines: {
      "Retail & Business Banking (Japan)": {
        purpose: "Serve individuals, SMEs, mid-sized companies",
        products: ["Deposits", "Mortgages", "Consumer lending", "SME lending", "Cash management", "Digital banking"],
        revenue_drivers: ["Net Interest Income", "Fees", "Deposits"],
        primary_risks: ["Credit Risk", "Interest Rate Risk", "Operational Risk"],
        retrieve_when: ["Retail", "Consumer", "Mortgage", "SME", "Japan Economy", "Consumer Spending"],
      },
      "Corporate Banking": {
        purpose: "Support Japanese corporates",
        products: ["Corporate Lending", "Working Capital", "Trade Finance", "Treasury Services", "Transaction Banking"],
        revenue_drivers: ["Lending", "Cash Management", "FX", "Trade Finance"],
        primary_risks: ["Credit Risk", "Country Risk", "Concentration Risk"],
        retrieve_when: ["Trade", "Exports", "Manufacturing", "Corporate Earnings", "Supply Chain", "Tariffs"],
      },
      "Global Corporate & Investment Banking (GCIB)": {
        purpose: "Support multinational corporations globally",
        products: ["Syndicated Loans", "Project Finance", "Structured Finance", "Acquisition Finance", "Leveraged Finance", "M&A Advisory", "Debt Capital Markets", "Equity Capital Markets"],
        revenue_drivers: ["Advisory", "Underwriting", "Lending", "Markets"],
        primary_risks: ["Credit Risk", "Counterparty Risk", "Market Risk"],
        retrieve_when: ["M&A", "Infrastructure", "Project Finance", "LNG", "Renewables", "Acquisition", "Leveraged Finance", "IPO", "Bond Issuance", "Private Credit"],
      },
      "Global Markets": {
        products: ["FX", "Rates", "Credit", "Equities", "Derivatives"],
        retrieve_when: ["Yield Curve", "Treasuries", "Fed", "BOJ", "FX", "Volatility", "VIX", "Bond Markets"],
      },
      "Asset & Wealth Management": {
        products: ["Investment Management", "Trust Services", "Pension Solutions", "Wealth Advisory"],
        retrieve_when: ["Asset Flows", "Fund Industry", "Private Wealth", "Retirement", "Institutional Investors"],
      },
    },
    strategic_focus_areas: [
      "Improving customer experience",
      "Asset & Wealth Management in Japan",
      "Enhancing the competitiveness of Japanese companies",
      "Global Corporate & Investment Banking",
      "Sustainability & Innovation",
    ],
    news_to_business_map: {
      BOJ: "Treasury / Retail Banking",
      Fed: "Treasury / Markets",
      LNG: "Project Finance",
      Tariffs: "Corporate Banking",
      AI: "Enterprise Technology",
      Cyber: "Technology & Operations",
      "M&A": "Investment Banking",
      IPO: "ECM",
      "Bond Issue": "DCM",
      CRE: "Structured Lending",
    },
  },
  leadershipQuestions: [
    "Which business generates revenue from this?",
    "Which business owns the exposure?",
    "Which business could benefit?",
    "Which business could lose?",
    "Would this affect ROE?",
    "Would this affect capital allocation?",
    "Would this affect client activity?",
  ],
};

export const MIZUHO_CARDS: MizuhoKnowledgeCard[] = [CORE_DISCLOSURES, RISK_GOVERNANCE, RISK_MANAGEMENT, BUSINESS_MODEL];

export const MIZUHO_KNOWLEDGE = {
  version: "5.2.1",
  institution: "Mizuho Financial Group",
  last_updated: "2026-07-09",
  cards: MIZUHO_CARDS,
  // Flat top-level executive questions retained for back-compat with the original spec's
  // single list; per-card leadershipQuestions above are the richer, sourced version.
  executive_questions: CORE_DISCLOSURES.leadershipQuestions ?? [],
} as const;

export type MizuhoKnowledge = typeof MIZUHO_KNOWLEDGE;

export interface MizuhoLens {
  domains: string[];
  sections: string[]; // matched card ids (kept the field name "sections" for back-compat with saved items)
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

// ── Domain keyword classification (STEP 1). Extended in V5.2.1 with the new Governance
// domain and the additional retrieval triggers from the risk-management/governance cards. ──
const DOMAIN_KEYWORDS: Record<MizuhoDomain, string[]> = {
  Capital: ["capital", "cet1", "tier 1", "tier1", "rwa", "basel", "stress test", "capital buffer", "leverage ratio"],
  Liquidity: ["liquidity", "lcr", "nsfr", "funding", "deposit run", "deposits"],
  Credit: ["credit", "default", "provision", "npl", "loan loss", "underwriting", "commercial real estate", "cre", "delinquenc"],
  Market: ["market risk", "trading", "proprietary", "fx", "volatility", "vix", "yields", "bond market", "rates", "yield curve", "treasuries"],
  "Operational Risk": ["operational risk", "cyber", "outage", "fraud", "conduct", "resilience", "ai disruption", "natural disaster"],
  "Corporate Banking": ["corporate banking", "cib", "syndicated", "corporate lending", "wholesale", "trade finance", "tariffs", "supply chain"],
  Treasury: ["treasury", "alm", "issuance", "repo", "funding"],
  "Wealth Management": ["wealth management", "private bank", "high net worth", "hnw", "private wealth"],
  "Asset Management": ["asset management", "aum", "fund flows", "asset flows", "institutional investors"],
  Strategy: ["strategy", "roe", "buyback", "payout", "dividend", "valuation", "pbr", "medium-term plan", "shareholder return"],
  "Financial Results": ["earnings", "results", "profit", "quarterly", "guidance", "net income", "revenue"],
  Regulation: ["regulation", "regulator", "regulatory", "fsa", "occ", "fdic", "supervis", "capital rule"],
  "Japan Macro": ["boj", "bank of japan", "japan", "yen", "inflation", "deflation", "tankan", "jgb"],
  Governance: ["governance", "risk committee", "board oversight", "first line", "second line", "raf",
    "risk appetite", "operational resilience", "risk culture", "stress testing", "top risks", "scenario analysis", "enterprise risk"],
};

/** Which cards to pull in when a domain matches. Derived from each card's own `domains` tag. */
const DOMAIN_CARD_IDS: Record<MizuhoDomain, string[]> = MIZUHO_DOMAINS.reduce((acc, domain) => {
  acc[domain] = MIZUHO_CARDS.filter((c) => c.domains.includes(domain)).map((c) => c.id);
  return acc;
}, {} as Record<MizuhoDomain, string[]>);

export interface MizuhoRetrieval {
  domains: string[];
  sectionKeys: string[]; // matched card ids
  payload: Record<string, unknown>; // { [cardId]: { title, source, content } }
}

/** STEP 1+2 — match the article to domains, then pull ONLY the cards tagged to those domains.
 *  The Business Model card is special-cased in: whenever ANY domain matches, it's included too
 *  (its whole purpose, per its own doc, is mapping events to affected businesses — relevant
 *  to virtually any Mizuho-relevant article, not one narrow domain slice). */
export function retrieveMizuhoSections(text: string, knowledge: MizuhoKnowledge): MizuhoRetrieval {
  const hay = (text || "").toLowerCase();
  const domains: string[] = [];
  for (const domain of MIZUHO_DOMAINS) {
    if (DOMAIN_KEYWORDS[domain].some((k) => hay.includes(k))) domains.push(domain);
  }

  const cardIds = new Set<string>();
  for (const d of domains) for (const id of DOMAIN_CARD_IDS[d as MizuhoDomain] ?? []) cardIds.add(id);
  if (domains.length > 0) cardIds.add("business_model"); // always ground "which business" when relevant at all

  const payload: Record<string, unknown> = {};
  for (const id of cardIds) {
    const card = MIZUHO_CARDS.find((c) => c.id === id);
    if (card) payload[id] = { title: card.title, source: card.source, content: card.content };
  }
  return { domains, sectionKeys: [...cardIds], payload };
}
