// lib/bankEarningsMetrics.ts
// V5.10.0 — structured, USD-converted numeric layer behind the "Compare Banks" charts
// (components/learn/BankEarningsCompare.tsx). lib/bankEarnings.ts (05 Bank Earnings) stays
// free-text/display-oriented (label/value strings mixed with prose); this file pulls the
// SAME underlying figures already cited there into typed numbers so they can be charted,
// converts non-USD figures at real FX rates, and is explicit about basis differences (net
// vs pre-tax profit, quarter vs half-year vs full-year) instead of silently mixing them.
//
// Nothing here is invented: every figure traces to a value already in lib/bankEarnings.ts,
// except Citigroup's absolute net-income figure ($5.8B, +45% YoY from $4.0B) — Citi's card
// only carries EPS + revenue + a YoY %, so this one number was confirmed via the bank's own
// Q2 2026 results (Jul 14, 2026) rather than left as a gap in the flagship profit chart.
// Mizuho's USD profit and ROE reuse the primary-source figures already established in
// lib/mizuhoQ1Earnings.ts (Q1 FY2026 results deck) for consistency between the two screens.
//
// This is a CURATED, hand-maintained companion dataset — like lib/bankEarnings.ts itself, it
// is NOT wired to the live "Refresh Earnings" overlay (lib/bankEarningsStore.ts). A bank whose
// list-card text gets refreshed via that button won't automatically update its bars here until
// this file is hand-revised alongside the baseline — flagged in the Compare screen's caption
// rather than left unstated.

export const FX_AS_OF = "Jul 30, 2026";

export const FX_RATES = {
  GBPUSD: 1.3465, // 1 GBP = 1.3465 USD
  EURUSD: 1.153, // 1 EUR = 1.153 USD
  USDJPY: 162.45, // 1 USD = 162.45 JPY — same disclosed spot rate used in lib/mizuhoQ1Earnings.ts
  USDSGD: 1.2828, // 1 USD = 1.2828 SGD
  USDCNY: 6.77, // 1 USD = 6.77 CNY
};

export const FX_NOTE =
  "GBP/USD 1.3465, EUR/USD 1.153, USD/JPY 162.45 (same spot Mizuho's own Q1 FY26 filing discloses), " +
  "USD/SGD 1.2828, USD/CNY 6.77 — approximate market rates as of Jul 30, 2026.";

export type ProfitBasis = "net" | "pretax";
export type PeriodType = "quarter" | "half" | "fullyear";
export type Currency = "USD" | "GBP" | "EUR" | "JPY" | "SGD" | "CNY";

function toUSD(amount: number, currency: Currency): number {
  switch (currency) {
    case "USD":
      return amount;
    case "GBP":
      return amount * FX_RATES.GBPUSD;
    case "EUR":
      return amount * FX_RATES.EURUSD;
    case "JPY":
      return amount / FX_RATES.USDJPY;
    case "SGD":
      return amount / FX_RATES.USDSGD;
    case "CNY":
      return amount / FX_RATES.USDCNY;
  }
}

const PERIOD_MONTHS: Record<PeriodType, number> = { quarter: 3, half: 6, fullyear: 12 };

export interface BankFinancials {
  id: string;
  name: string;
  ticker: string;
  region: "US" | "Europe" | "Asia";
  profitLocal: number; // in the bank's reporting currency, billions
  currency: Currency;
  profitBasis: ProfitBasis;
  periodLabel: string; // e.g. "Q2 2026", "H1 2026", "FY2025"
  periodType: PeriodType;
  profitUSD: number; // computed
  /** Even-split run-rate to a single quarter — an approximation for half/full-year figures,
   *  not an official quarterly number. Lets the profit chart compare like-for-like. */
  quarterlyRunRateUSD: number;
  /** Profit/net-income YoY growth, ONLY when the source explicitly reports profit growth
   *  (not revenue growth, not a beat-vs-estimate figure) — left undefined otherwise. */
  yoyGrowthPct?: number;
  /** Primary/standardized CET1 ratio where disclosed this period. */
  cet1Pct?: number;
  /** An actually-reported return metric (ROE/ROTCE/RoTE) — never a forward-looking target. */
  roe?: { label: string; pct: number; approx?: boolean };
  /** Same-day (or near same-day) stock reaction, signed %. Approximate = derived from a
   *  reported range's midpoint rather than one confirmed figure. */
  stockReactionPct?: number;
  stockReactionApprox?: boolean;
}

function make(input: {
  id: string;
  name: string;
  ticker: string;
  region: "US" | "Europe" | "Asia";
  profitLocal: number;
  currency: Currency;
  profitBasis: ProfitBasis;
  periodLabel: string;
  periodType: PeriodType;
  yoyGrowthPct?: number;
  cet1Pct?: number;
  roe?: { label: string; pct: number; approx?: boolean };
  stockReactionPct?: number;
  stockReactionApprox?: boolean;
  /** Override the computed USD figure (used for Mizuho, to reuse the primary-source $2.60B
   *  from lib/mizuhoQ1Earnings.ts rather than re-deriving it). */
  profitUSDOverride?: number;
}): BankFinancials {
  const profitUSD = input.profitUSDOverride ?? toUSD(input.profitLocal, input.currency);
  const months = PERIOD_MONTHS[input.periodType];
  const quarterlyRunRateUSD = profitUSD / (months / 3);
  return { ...input, profitUSD, quarterlyRunRateUSD };
}

export const BANK_FINANCIALS: BankFinancials[] = [
  // ───────────────────────── US ─────────────────────────
  make({
    id: "jpm", name: "JPMorgan Chase", ticker: "JPM", region: "US",
    profitLocal: 21.2, currency: "USD", profitBasis: "net",
    periodLabel: "Q2 2026", periodType: "quarter",
    cet1Pct: 14.1, roe: { label: "ROTCE", pct: 23 }, stockReactionPct: 0.5,
  }),
  make({
    id: "gs", name: "Goldman Sachs", ticker: "GS", region: "US",
    profitLocal: 6.63, currency: "USD", profitBasis: "net",
    periodLabel: "Q2 2026", periodType: "quarter",
    cet1Pct: 12.9, roe: { label: "ROE (ann.)", pct: 23.5 }, stockReactionPct: 7.7,
  }),
  make({
    id: "citi", name: "Citigroup", ticker: "C", region: "US",
    profitLocal: 5.8, currency: "USD", profitBasis: "net",
    periodLabel: "Q2 2026", periodType: "quarter",
    yoyGrowthPct: 45, cet1Pct: 12.8, stockReactionPct: -4.2,
  }),
  make({
    id: "bac", name: "Bank of America", ticker: "BAC", region: "US",
    profitLocal: 9.1, currency: "USD", profitBasis: "net",
    periodLabel: "Q2 2026", periodType: "quarter",
    yoyGrowthPct: 27, cet1Pct: 11.2, stockReactionPct: 1.9,
  }),
  make({
    id: "ms", name: "Morgan Stanley", ticker: "MS", region: "US",
    profitLocal: 5.58, currency: "USD", profitBasis: "net",
    periodLabel: "Q2 2026", periodType: "quarter",
    yoyGrowthPct: 58, cet1Pct: 14.8,
  }),

  // ───────────────────────── Europe ─────────────────────────
  make({
    id: "barclays", name: "Barclays", ticker: "BARC", region: "Europe",
    profitLocal: 3.25, currency: "GBP", profitBasis: "pretax",
    periodLabel: "Q2 2026", periodType: "quarter",
    yoyGrowthPct: 31, cet1Pct: 14.3, stockReactionPct: -4.5, stockReactionApprox: true,
  }),
  make({
    id: "stanchart", name: "Standard Chartered", ticker: "STAN", region: "Europe",
    profitLocal: 4.8, currency: "USD", profitBasis: "pretax",
    periodLabel: "H1 2026", periodType: "half",
    yoyGrowthPct: 9, cet1Pct: 14.2, roe: { label: "RoTE", pct: 17.6 },
    stockReactionPct: 4, stockReactionApprox: true,
  }),
  make({
    id: "hsbc", name: "HSBC", ticker: "HSBA", region: "Europe",
    profitLocal: 9.4, currency: "USD", profitBasis: "pretax",
    periodLabel: "Q1 2026", periodType: "quarter",
    cet1Pct: 14.0, roe: { label: "RoTE", pct: 18, approx: true },
  }),
  make({
    id: "ubs", name: "UBS", ticker: "UBS", region: "Europe",
    profitLocal: 2.8, currency: "USD", profitBasis: "net",
    periodLabel: "Q2 2026", periodType: "quarter",
    yoyGrowthPct: 17, cet1Pct: 14.4, stockReactionPct: -0.35, stockReactionApprox: true,
  }),
  make({
    id: "db", name: "Deutsche Bank", ticker: "DBK", region: "Europe",
    profitLocal: 1.9, currency: "EUR", profitBasis: "net",
    periodLabel: "Q2 2026", periodType: "quarter",
    yoyGrowthPct: 10, cet1Pct: 13.9,
  }),

  // ───────────────────────── Asia ─────────────────────────
  make({
    id: "mizuho", name: "Mizuho Financial Group", ticker: "8411.T", region: "Asia",
    profitLocal: 422.91, currency: "JPY", profitBasis: "net",
    periodLabel: "Q1 FY2026", periodType: "quarter",
    yoyGrowthPct: 45.5, roe: { label: "ROE", pct: 12.5 },
    profitUSDOverride: 2.6, // lib/mizuhoQ1Earnings.ts, USD/JPY 162.45 spot
  }),
  make({
    id: "mufg", name: "MUFG (Mitsubishi UFJ)", ticker: "8306.T", region: "Asia",
    profitLocal: 2400, currency: "JPY", profitBasis: "net",
    periodLabel: "FY2025 (full year)", periodType: "fullyear",
    yoyGrowthPct: 30, cet1Pct: 9.2, stockReactionPct: 4.1,
  }),
  make({
    id: "smfg", name: "SMFG (Sumitomo Mitsui)", ticker: "8316.T", region: "Asia",
    profitLocal: 1580, currency: "JPY", profitBasis: "net",
    periodLabel: "FY2025 (full year)", periodType: "fullyear",
    yoyGrowthPct: 34.4, cet1Pct: 12.59,
  }),
  make({
    id: "dbs", name: "DBS Group", ticker: "D05.SI", region: "Asia",
    profitLocal: 2.93, currency: "SGD", profitBasis: "net",
    periodLabel: "Q1 2026", periodType: "quarter",
    yoyGrowthPct: 1, cet1Pct: 14.8, roe: { label: "ROE", pct: 17 },
    stockReactionPct: 2.2, stockReactionApprox: true,
  }),
  make({
    id: "icbc", name: "ICBC", ticker: "1398.HK", region: "Asia",
    profitLocal: 86.94, currency: "CNY", profitBasis: "net",
    periodLabel: "Q1 2026", periodType: "quarter",
    yoyGrowthPct: 3.3, stockReactionPct: -2.1,
  }),
];
