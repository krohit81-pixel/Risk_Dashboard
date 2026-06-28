// lib/fallbackData.ts
// Used ONLY when live data is unavailable for a given indicator.
// All numeric fallbacks render with a "sample" flag in the UI (live:false).
// The curated narrative content (emerging risks, base heat-map reasoning,
// implications) is an editorial starting framework a CRO would tailor.

import type {
  EmergingRisk,
  Indicator,
  RegionHeat,
  BankImplication,
} from "./types";

// Indicator scaffolding. value/previous here are SAMPLE placeholders;
// the route overwrites them with live readings where available.
export const INDICATOR_SCAFFOLD: Omit<Indicator, "trend">[] = [
  // ── Economic Releases (scheduled: monthly / quarterly) ──
  { id: "cpi", label: "US CPI (YoY)", group: "Macro", section: "release", value: 3.1, previous: 3.0, unit: "%", decimals: 1, cadence: "Monthly", riskUpIsBad: true, live: false, history: [3.4, 3.3, 3.5, 3.4, 3.3, 3.2, 3.0, 2.9, 3.1, 3.2, 3.0, 3.0, 3.1] },
  { id: "corepce", label: "Core PCE (YoY)", group: "Macro", section: "release", value: 2.8, previous: 2.7, unit: "%", decimals: 1, cadence: "Monthly", riskUpIsBad: true, live: false, history: [3.0, 2.9, 2.9, 2.8, 2.8, 2.7, 2.7, 2.6, 2.7, 2.8, 2.7, 2.7, 2.8] },
  { id: "unrate", label: "US Unemployment", group: "Macro", section: "release", value: 4.1, previous: 4.0, unit: "%", decimals: 1, cadence: "Monthly", riskUpIsBad: true, live: false, history: [3.9, 3.9, 4.0, 4.0, 4.1, 4.0, 4.1, 4.2, 4.1, 4.0, 4.1, 4.0, 4.1] },
  { id: "fedfunds", label: "Fed Funds Rate", group: "Macro", section: "release", value: 4.33, previous: 4.58, unit: "%", decimals: 2, cadence: "Monthly", riskUpIsBad: true, live: false, history: [5.33, 5.33, 5.33, 5.08, 4.83, 4.58, 4.58, 4.33, 4.33, 4.33, 4.33, 4.58, 4.33] },
  // ── Market Indicators (real-time / daily) ──
  { id: "sp500", label: "S&P 500", group: "Markets", section: "market", value: 5970, previous: 5930, unit: "index", decimals: 0, cadence: "Daily", riskUpIsBad: false, live: false },
  { id: "nasdaq", label: "Nasdaq Composite", group: "Markets", section: "market", value: 19400, previous: 19250, unit: "index", decimals: 0, cadence: "Daily", riskUpIsBad: false, live: false },
  { id: "ust10y", label: "US 10Y Treasury", group: "Rates", section: "market", value: 4.42, previous: 4.36, unit: "%", decimals: 2, cadence: "Daily", riskUpIsBad: true, live: false },
  { id: "hyspread", label: "US High-Yield Spread", group: "Credit", section: "market", value: 3.15, previous: 3.10, unit: "%", decimals: 2, cadence: "Daily", riskUpIsBad: true, live: false },
  { id: "vix", label: "VIX", group: "Volatility", section: "market", value: 15.8, previous: 14.9, unit: "pts", decimals: 1, cadence: "Daily", riskUpIsBad: true, live: false },
  { id: "usdjpy", label: "USD / JPY", group: "FX", section: "market", value: 156.2, previous: 155.4, unit: "yen", decimals: 1, cadence: "Daily", riskUpIsBad: true, live: false },
  { id: "brent", label: "Brent Crude", group: "Commodities", section: "market", value: 78.4, previous: 76.9, unit: "usd", decimals: 1, cadence: "Daily", riskUpIsBad: true, live: false },
  // ── V2 additions ──
  { id: "gold", label: "Gold (spot)", group: "Commodities", section: "market", value: 4090, previous: 4133, unit: "usd", decimals: 0, cadence: "Daily", riskUpIsBad: true, live: false },
  { id: "move", label: "MOVE Index", group: "Volatility", section: "market", value: 95.0, previous: 88.0, unit: "pts", decimals: 0, cadence: "Daily", riskUpIsBad: true, live: false },
  // Yield curve: a RISE (steepening) is risk-positive, so riskUpIsBad = false.
  { id: "curve2s10s", label: "Yield Curve 2s10s", group: "Rates", section: "market", value: 0.42, previous: 0.48, unit: "%", decimals: 2, cadence: "Daily", riskUpIsBad: false, live: false },
  // ── Japan group (rendered only in the Japan Watch section) ──
  { id: "jgb10y", label: "JGB 10Y", group: "Japan", value: 2.69, previous: 2.60, unit: "%", decimals: 2, cadence: "Monthly", riskUpIsBad: true, live: false },
  { id: "bojrate", label: "BOJ Policy Rate", group: "Japan", value: 0.50, previous: 0.50, unit: "%", decimals: 2, cadence: "Monthly", riskUpIsBad: true, live: false },
  { id: "nikkei", label: "Nikkei 225", group: "Japan", value: 38500, previous: 39000, unit: "index", decimals: 0, cadence: "Daily", riskUpIsBad: false, live: false },
  { id: "japancpi", label: "Japan CPI (YoY)", group: "Japan", value: 3.0, previous: 2.8, unit: "%", decimals: 1, cadence: "Monthly", riskUpIsBad: true, live: false },
];

// A standing CRO watch-list. Editorial — tailor to your institution.
export const EMERGING_RISKS: EmergingRisk[] = [
  {
    id: "inflation",
    name: "Persistent Inflation",
    probability: "Medium",
    impact: "Severe",
    trend: "stable",
    note: "Sticky services inflation could keep policy rates higher for longer, repricing the entire curve.",
    noteLayman: "If everyday prices (like services) keep rising, central banks may hold interest rates high for longer — which makes borrowing more expensive across the board.",
  },
  {
    id: "cre",
    name: "Commercial Real Estate Stress",
    probability: "Medium",
    impact: "Severe",
    trend: "up",
    note: "Office refinancing at higher rates pressures regional lenders and CRE-heavy loan books.",
    noteLayman: "Lots of office-building loans are coming due and must be renewed at today's much higher rates. Banks that lent heavily to property could take losses.",
  },
  {
    id: "china",
    name: "China Slowdown",
    probability: "Medium",
    impact: "Moderate",
    trend: "stable",
    note: "Weak demand and property drag weigh on global growth and commodity-linked exposures.",
    noteLayman: "China's economy is soft — weak spending and a property slump — which slows global growth and hurts demand for raw materials.",
  },
  {
    id: "geopolitics",
    name: "Geopolitical Tensions",
    probability: "High",
    impact: "Moderate",
    trend: "up",
    note: "Conflict and trade friction raise energy-price and supply-chain tail risk.",
    noteLayman: "Wars and trade fights can suddenly spike oil prices and disrupt supply chains, which is hard to plan for.",
  },
  {
    id: "privatecredit",
    name: "Private Credit Risk",
    probability: "Medium",
    impact: "Moderate",
    trend: "up",
    note: "Rapid growth and limited transparency raise concerns about hidden leverage and valuation lags.",
    noteLayman: "Lending by investment funds (not banks) has grown fast and is hard to see into — so hidden borrowing and stale valuations are a worry.",
  },
];

// Base regional reasoning. The route may override the US heat from live data.
export const HEAT_MAP_BASE: RegionHeat[] = [
  { region: "United States", flag: "🇺🇸", heat: "Amber", reason: "Inflation above target; rates may stay elevated longer than markets expect." },
  { region: "Europe", flag: "🇪🇺", heat: "Amber", reason: "Sub-trend growth and fiscal strain offset gradual ECB easing." },
  { region: "United Kingdom", flag: "🇬🇧", heat: "Amber", reason: "Disinflation progressing but services inflation and gilt sensitivity persist." },
  { region: "Japan", flag: "🇯🇵", heat: "Amber", reason: "BoJ normalisation and a weak yen create rate and FX volatility risk." },
  { region: "China", flag: "🇨🇳", heat: "Red", reason: "Property deleveraging, soft demand and deflation risk constrain the outlook." },
  { region: "India", flag: "🇮🇳", heat: "Green", reason: "Resilient growth and contained inflation; external balance the main watch-item." },
];

// Implications framework — links macro moves to the five risk lenses.
export const IMPLICATIONS_BASE: BankImplication[] = [
  {
    development: "US inflation surprises higher",
    creditRisk: "Higher-for-longer rates raise borrower default and expected-credit-loss risk.",
    marketRisk: "Curve repricing hits rates and duration books; equity drawdown risk rises.",
    liquidityRisk: "Deposit competition intensifies as rates stay elevated.",
    capital: "Spread widening and AFS mark-to-market pressure CET1 buffers.",
    profitability: "NIM support from higher rates, offset by weaker fee and origination income.",
    layman: {
      development: "Inflation comes in hotter than expected",
      creditRisk: "With rates staying high, more borrowers struggle to repay, so loan losses can rise.",
      marketRisk: "Bond prices fall as rates jump, and shares can drop too.",
      liquidityRisk: "The bank has to pay savers more to keep their deposits.",
      capital: "Paper losses on bonds eat into the bank's safety cushion of capital.",
      profitability: "The bank earns more on loans, but makes less from fees — so it roughly evens out.",
    },
  },
  {
    development: "Treasury yields move higher",
    creditRisk: "Refinancing costs climb for leveraged and CRE borrowers.",
    marketRisk: "Mark-to-market losses on fixed-income and AFS portfolios.",
    liquidityRisk: "Collateral haircuts and funding costs rise.",
    capital: "Unrealised securities losses erode tangible capital.",
    profitability: "Asset yields improve but funding costs and hedging drag offset gains.",
    layman: {
      development: "Government bond interest rates rise",
      creditRisk: "It gets more expensive for big borrowers (like property firms) to refinance their loans.",
      marketRisk: "The bonds the bank already owns lose value on paper.",
      liquidityRisk: "Borrowing and posting collateral both get more expensive.",
      capital: "Those paper losses chip away at the bank's core capital.",
      profitability: "The bank earns more on new lending, but higher funding and hedging costs cancel much of it out.",
    },
  },
  {
    development: "Credit spreads widen / risk-off",
    creditRisk: "Default probabilities rise across high-yield and private-credit exposures.",
    marketRisk: "Trading-book VaR and CVA charges increase with volatility.",
    liquidityRisk: "Primary issuance windows narrow; rollover risk increases.",
    capital: "RWA inflation and stressed-VaR add-ons consume capital.",
    profitability: "Underwriting and DCM pipelines slow; provisioning rises.",
    layman: {
      development: "Investors get nervous and dump risky assets",
      creditRisk: "The odds of default jump for riskier borrowers, including private-credit funds.",
      marketRisk: "Trading desks face bigger potential losses as markets swing.",
      liquidityRisk: "It gets harder to raise new funding, so rolling over debt is riskier.",
      capital: "Turbulent markets force the bank to hold more capital aside.",
      profitability: "Deal-making slows and the bank sets aside more money for expected losses.",
    },
  },
];
