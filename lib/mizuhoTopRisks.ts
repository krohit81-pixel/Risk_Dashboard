// lib/mizuhoTopRisks.ts
// Curated reference framework — Mizuho's published "Top Risks" taxonomy, used as the
// durable spine the dashboard maps live events onto. This is REFERENCE DATA, not event
// data: versioned, held locally, never fetched at runtime.
//
// PROVENANCE: curated from Mizuho's published top-risk disclosure
// (mizuhogroup.com governance → "Management of Top Risks", framework as of March 2025 /
// FY2025). The framework itself is treated as *sourced fact*; the event→risk *mapping*
// the model produces is *AI interpretation* and is labelled as such in the UI. Real-world
// refresh cadence is ~annual; a quarterly diff-check is the conservative reminder margin.
//
// NOTE: this is a curated approximation structured for teaching/mapping. Verify against
// the published page on each quarterly check; update + redeploy on any published change.

export const MIZUHO_TOP_RISKS_ASOF = "March 2025 (FY2025)";
export const MIZUHO_TOP_RISKS_SOURCE =
  "mizuhogroup.com/who-we-are/governance — Management of Top Risks";

export interface TopRiskScenario {
  id: string;
  label: string; // short scenario label for the chip
  path: string;       // published-style transmission path (executive wording)
  pathLayman: string; // plain-English version for Learning view
}

export interface TopRisk {
  id: string;
  name: string; // published top-risk name
  scenarios: TopRiskScenario[];
}

export const MIZUHO_TOP_RISKS: TopRisk[] = [
  {
    id: "econ-slowdown",
    name: "Economic deterioration (US / global slowdown)",
    scenarios: [
      { id: "us-recession", label: "US recession", path: "A US downturn drives corporate defaults and rising credit costs across the loan book.", pathLayman: "If the US economy tips into recession, more companies default and the bank's loan losses rise." },
      { id: "nbfi-private-credit", label: "NBFI / private-credit stress", path: "Stress in non-bank lenders and private credit transmits to banks via fund-finance lines, warehouse facilities and counterparty exposure.", pathLayman: "Trouble at non-bank lenders and private-credit funds reaches the bank through the financing and trading lines it gives them." },
      { id: "china-demand", label: "China demand / property slump", path: "A deeper China property and demand slump hits Asian trade finance and commodity-linked exposures.", pathLayman: "A deeper slump in China hits Asian trade finance and anyone exposed to commodities." },
    ],
  },
  {
    id: "rates-markets",
    name: "Rising interest rates & market volatility",
    scenarios: [
      { id: "boj-jgb", label: "BOJ normalisation / JGB yields", path: "BOJ normalisation lifts JGB yields, marking down domestic bond holdings (AFS / duration) and pressuring capital.", pathLayman: "When Japan's central bank lets rates rise, the Japanese government bonds the bank holds lose value, denting its capital." },
      { id: "us-higher-for-longer", label: "US higher-for-longer", path: "US rates staying higher for longer widen credit spreads and depress bond-portfolio values.", pathLayman: "If US rates stay high, risky borrowing gets pricier and the bank's bond holdings lose value." },
      { id: "market-shock", label: "Sharp risk-off / volatility", path: "A sharp risk-off move inflates trading-book VaR and CVA charges, consuming market-risk capital.", pathLayman: "A sudden market sell-off makes the trading book riskier and forces the bank to hold more capital." },
    ],
  },
  {
    id: "fx-funding",
    name: "Foreign-currency funding & liquidity",
    scenarios: [
      { id: "usd-funding", label: "USD funding squeeze", path: "A dollar-funding squeeze raises the cost and reduces the availability of USD liquidity for a yen-based bank.", pathLayman: "If dollars get scarce and expensive, a yen-based bank struggles to fund its dollar business." },
      { id: "deposit-outflow", label: "Deposit competition / outflow", path: "Deposit competition or outflows push up funding costs and tighten the liquidity-coverage position.", pathLayman: "If savers chase better rates elsewhere, the bank pays more to keep deposits and its liquidity tightens." },
    ],
  },
  {
    id: "credit-concentration",
    name: "Credit concentration",
    scenarios: [
      { id: "cre-office", label: "Commercial real estate", path: "CRE / office refinancing stress raises defaults among property-heavy borrowers and reprices collateral.", pathLayman: "Office and property loans coming due at high rates may not refinance, so some borrowers default and buildings lose value." },
      { id: "leveraged-finance", label: "Leveraged finance / CLOs", path: "Leveraged-loan and CLO deterioration lifts losses in the leveraged-finance book.", pathLayman: "Riskier corporate loans and CLOs sour, raising losses in the bank's leveraged-finance book." },
      { id: "large-borrower", label: "Single-name / sector concentration", path: "Default of a large single name or concentrated sector crystallises outsized losses.", pathLayman: "If one big borrower or a concentrated sector fails, the bank takes an outsized hit." },
    ],
  },
  {
    id: "cyber-it",
    name: "Cyber attacks & IT system failure",
    scenarios: [
      { id: "cyber-attack", label: "Cyber-attack", path: "A cyber-attack disrupts services or causes data loss, with financial and reputational damage.", pathLayman: "A cyber-attack disrupts services or leaks data, costing money and trust." },
      { id: "system-failure", label: "Major system outage", path: "A major system failure interrupts settlement and customer service.", pathLayman: "A big IT outage stops payments and customer service." },
    ],
  },
  {
    id: "climate",
    name: "Climate-related risk",
    scenarios: [
      { id: "transition", label: "Transition risk", path: "The low-carbon transition impairs carbon-intensive borrowers in the portfolio.", pathLayman: "As the world shifts away from carbon, heavy-emitting borrowers become riskier to lend to." },
      { id: "physical", label: "Physical risk", path: "Physical climate events damage collateral and disrupt borrowers and operations.", pathLayman: "Floods, storms and other climate events damage the assets backing loans and disrupt borrowers." },
    ],
  },
  {
    id: "compliance-conduct",
    name: "Compliance, conduct & financial crime",
    scenarios: [
      { id: "aml-sanctions", label: "AML / sanctions", path: "AML or sanctions breaches lead to penalties, remediation cost and reputational harm.", pathLayman: "Failures in anti-money-laundering or sanctions checks bring fines and clean-up costs." },
      { id: "conduct", label: "Conduct / governance", path: "Conduct or governance failures trigger regulatory action and reputational damage.", pathLayman: "Misconduct or weak governance triggers regulatory action and reputational damage." },
    ],
  },
  {
    id: "geopolitical",
    name: "Geopolitical risk",
    scenarios: [
      { id: "sanctions-trade", label: "Sanctions / trade fragmentation", path: "Sanctions, tariffs or trade fragmentation disrupt cross-border business and specific exposures.", pathLayman: "Sanctions, tariffs or trade splits disrupt cross-border business and specific exposures." },
      { id: "energy-supply", label: "Energy / supply-chain shock", path: "Conflict-driven energy-price or supply-chain shocks hit borrowers and reignite inflation.", pathLayman: "Conflicts that spike energy prices or break supply chains hurt borrowers and push inflation back up." },
    ],
  },
];

// ── Lookups & validation ──
const RISK_BY_ID = new Map(MIZUHO_TOP_RISKS.map((r) => [r.id, r]));
export function topRiskById(id: string): TopRisk | undefined {
  return RISK_BY_ID.get(id);
}
export function scenarioById(riskId: string, scenarioId: string): TopRiskScenario | undefined {
  return RISK_BY_ID.get(riskId)?.scenarios.find((s) => s.id === scenarioId);
}
/** Valid (riskId, scenarioId) pair? Used to reject invented mappings. */
export function isValidAlignment(riskId: string, scenarioId: string): boolean {
  return Boolean(scenarioById(riskId, scenarioId));
}

/** Compact catalogue for the alignment prompt (ids the model MUST map to). */
export function topRisksForPrompt(): string {
  return MIZUHO_TOP_RISKS.map(
    (r) =>
      `${r.id} — ${r.name}\n` +
      r.scenarios.map((s) => `   • ${s.id} — ${s.label}: ${s.path}`).join("\n")
  ).join("\n");
}
