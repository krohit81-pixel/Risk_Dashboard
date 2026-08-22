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
  { id: "jgb10y", label: "JGB 10Y", group: "Japan", value: 2.69, previous: 2.60, unit: "%", decimals: 2, cadence: "Monthly", riskUpIsBad: true, live: false, history: [1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.45, 2.5, 2.55, 2.6, 2.6, 2.6, 2.69] },
  { id: "bojrate", label: "BOJ Policy Rate", group: "Japan", value: 0.50, previous: 0.50, unit: "%", decimals: 2, cadence: "Monthly", riskUpIsBad: true, live: false, history: [0.1, 0.1, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
  { id: "nikkei", label: "Nikkei 225", group: "Japan", value: 38500, previous: 39000, unit: "index", decimals: 0, cadence: "Daily", riskUpIsBad: false, live: false, history: [37000, 37500, 38000, 39200, 38800, 40000, 39500, 38900, 39400, 39800, 39200, 39000, 38500] },
  { id: "japancpi", label: "Japan CPI (YoY)", group: "Japan", value: 3.0, previous: 2.8, unit: "%", decimals: 1, cadence: "Monthly", riskUpIsBad: true, live: false, history: [2.2, 2.5, 2.7, 2.9, 3.3, 3.6, 3.0, 2.7, 2.5, 2.9, 2.7, 2.8, 3.0] },
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

// Implications framework — links each emerging risk to the five risk lenses.
// V5.11.6 — rewritten to be 1:1 keyed to EMERGING_RISKS above (riskId/riskName set on every
// entry), matching the shape lib/weeklyEngine.ts's mergeMarkets() has produced since V4.3. This
// was previously 3 generic market-scenario entries with no riskId, which only ever mattered
// before the first weekly job had run (app/api/dashboard/route.ts's fallback path) — but that
// mismatch meant the Markets tab's per-theme UI had nothing to pair them against in that
// window. Every entry has a full layman twin, same as EMERGING_RISKS' noteLayman.
export const IMPLICATIONS_BASE: BankImplication[] = [
  {
    development: "Persistent Inflation",
    riskId: "inflation",
    riskName: "Persistent Inflation",
    creditRisk: "Higher-for-longer rates raise borrower default and expected-credit-loss risk.",
    marketRisk: "Curve repricing hits rates and duration books; equity multiples compress if real yields keep climbing.",
    liquidityRisk: "Deposit competition intensifies as rates stay elevated, pressuring funding costs.",
    capital: "Spread widening and AFS mark-to-market pressure CET1 buffers.",
    profitability: "NIM support from higher rates, offset by weaker fee and origination income.",
    layman: {
      development: "Prices stay stubbornly high",
      creditRisk: "With rates staying high, more borrowers struggle to repay, so loan losses can rise.",
      marketRisk: "Bond prices fall as rates jump, and shares can drop too.",
      liquidityRisk: "The bank has to pay savers more to keep their deposits.",
      capital: "Paper losses on bonds eat into the bank's safety cushion of capital.",
      profitability: "The bank earns more on loans, but makes less from fees — so it roughly evens out.",
    },
  },
  {
    development: "Commercial Real Estate Stress",
    riskId: "cre",
    riskName: "Commercial Real Estate Stress",
    creditRisk: "Office and CRE-heavy loan books face rising default risk as refinancing hits much higher rates.",
    marketRisk: "CRE-linked securities and REIT exposures mark down as valuations reset lower.",
    liquidityRisk: "CRE-concentrated lenders can face funding strain if depositors grow wary of property exposure.",
    capital: "Loan-loss provisioning against CRE books draws down capital buffers.",
    profitability: "Higher provisioning and slower CRE origination weigh on earnings.",
    layman: {
      development: "Office and property loans come under strain",
      creditRisk: "Landlords struggle to refinance office loans at today's much higher rates, so more loans turn bad.",
      marketRisk: "Investments tied to office buildings lose value as their true worth resets lower.",
      liquidityRisk: "Banks heavy in property lending can see nervous depositors pull back.",
      capital: "Setting money aside for bad property loans eats into the bank's capital cushion.",
      profitability: "More money set aside for losses, and less new property lending, both hurt profit.",
    },
  },
  {
    development: "China Slowdown",
    riskId: "china",
    riskName: "China Slowdown",
    creditRisk: "Exposure to China-linked corporates and commodity exporters sees higher default risk.",
    marketRisk: "Commodity and EM-linked trading books face drawdown risk from weaker Chinese demand.",
    liquidityRisk: "Cross-border funding lines to China-exposed clients may tighten.",
    capital: "Risk weights on China/EM exposures can rise as the outlook deteriorates.",
    profitability: "Trade-finance and China-linked fee income slows.",
    layman: {
      development: "China's economy keeps slowing",
      creditRisk: "Companies that depend on China or sell it raw materials become more likely to default.",
      marketRisk: "Investments linked to commodities or emerging markets can lose value.",
      liquidityRisk: "It can get harder to fund clients doing business with China.",
      capital: "The bank may need to hold more capital against China-linked exposures.",
      profitability: "Trade and deal income tied to China slows down.",
    },
  },
  {
    development: "Geopolitical Tensions",
    riskId: "geopolitics",
    riskName: "Geopolitical Tensions",
    creditRisk: "Sanctions and trade friction raise counterparty and supply-chain-linked default risk.",
    marketRisk: "Energy and FX volatility spikes can hit trading books with limited warning.",
    liquidityRisk: "Sudden risk-off episodes can narrow funding markets quickly.",
    capital: "Stressed-VaR add-ons rise during volatility spikes.",
    profitability: "Hedging costs rise and deal pipelines can pause during acute episodes.",
    layman: {
      development: "Conflicts and trade fights flare up",
      creditRisk: "Sanctions and trade disruptions make some borrowers more likely to default.",
      marketRisk: "Sudden swings in oil prices or currencies can catch trading desks off guard.",
      liquidityRisk: "In a scare, it can suddenly get harder and pricier to borrow.",
      capital: "The bank has to set aside more capital when markets get this jumpy.",
      profitability: "Protecting against these swings costs money, and deal-making often pauses.",
    },
  },
  {
    development: "Private Credit Risk",
    riskId: "privatecredit",
    riskName: "Private Credit Risk",
    creditRisk: "Limited transparency into private-credit leverage raises hidden default risk in direct-lending exposures.",
    marketRisk: "Stale marks on illiquid private-credit positions can understate true risk.",
    liquidityRisk: "A shock could trigger redemption pressure funds aren't structured to absorb quickly.",
    capital: "Valuation write-downs, when they come, can be abrupt and capital-consuming.",
    profitability: "Fee income from private-credit partnerships is exposed if the asset class cools.",
    layman: {
      development: "Non-bank lending keeps growing fast",
      creditRisk: "It's hard to see how much debt is really piled up behind these loans, so trouble can hide until it's large.",
      marketRisk: "These investments aren't priced very often, so their stated value may not reflect real risk.",
      liquidityRisk: "If investors want their money back all at once, these funds may not be able to pay out quickly.",
      capital: "When a write-down finally happens, it can be sudden and sizeable.",
      profitability: "Fees the bank earns from these partnerships are at risk if the boom cools off.",
    },
  },
];
