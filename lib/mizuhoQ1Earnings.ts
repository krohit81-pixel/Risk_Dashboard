// lib/mizuhoQ1Earnings.ts
// V5.9.0 — "Mizuho Q1 Earnings" (Settings → 07): a full-detail, USD-converted read of
// Mizuho's Q1 FY2026 results, sourced directly from the primary filing ("Summary of
// Financial Results for the First Quarter of FY2026 (Under Japanese GAAP)", Jul 30, 2026).
//
// Distinct from the "mizuho" entry in lib/bankEarnings.ts (05 Bank Earnings): that entry is
// the fast-compiled, 15-bank-baseline card and explicitly flags its credit-cost and capital
// figures as "not cleanly confirmed." This module is the deeper, single-bank companion built
// from the actual results deck, so it resolves those gaps (credit costs, NPL ratio) — CET1 /
// capital ratio still isn't in this particular release and is left unstated rather than guessed.
//
// FX basis: quarterly P&L and the Jun-2026 balance sheet convert JPY at the report's own
// disclosed spot rate, USD/JPY 162.45. Historical FY20–FY25 figures use the SAME current rate
// (not each year's actual rate) so the trend reflects business volume, not currency moves —
// noted wherever those series appear. FY26 full-year outlook uses Mizuho's own planned FY26
// rate, USD/JPY 150.00. Figures already disclosed natively in USD (the international/"Non-JPY"
// balance sheet block, regional loan splits) are carried through unconverted.

export const AS_OF = "Jul 30, 2026";
export const FX_SPOT_NOTE = "USD/JPY 162.45 (Jun-26 spot, as disclosed)";
export const FX_PLANNED_NOTE = "USD/JPY 150.00 (Mizuho's planned FY26 rate)";
export const SOURCE_NOTE =
  "Mizuho Financial Group, Summary of Financial Results for Q1 FY2026 (Japanese GAAP), Jul 30, 2026.";

export type Direction = "pos" | "neg";

export interface HeadlineStat {
  label: string;
  valueUsd: string;
  deltaText: string;
  direction: Direction;
  note?: string;
}

export const HEADLINE: HeadlineStat[] = [
  { label: "Gross Profit", valueUsd: "$6.59B", deltaText: "+39.1% YoY", direction: "pos" },
  { label: "Net Business Profit", valueUsd: "$3.54B", deltaText: "+81.9% YoY", direction: "pos" },
  { label: "Profit Attributable", valueUsd: "$2.60B", deltaText: "+45.5% YoY", direction: "pos" },
  { label: "Credit-Related Costs", valueUsd: "$0.04B", deltaText: "vs. reversal last year", direction: "neg" },
  { label: "Expense Ratio", valueUsd: "47.7%", deltaText: "−12.0 ppts YoY", direction: "pos" },
  { label: "GCIBC Profit", valueUsd: "$0.39B", deltaText: "−34% YoY", direction: "neg" },
];

export const HEADLINE_PLAIN =
  "Mizuho had a very strong quarter. Profit attributable to shareholders was $2.60B, up 45.5% from a year ago — already about a third of what the bank expects to earn for the whole year, in just three months. Growth was broad-based: fee income from corporate clients in Japan, markets trading, and rising Yen rates all contributed, and costs grew slower than revenue, so the expense ratio actually improved. Credit costs stayed near zero and the non-performing loan ratio kept falling. The one segment to watch is GCIBC (global corporate & investment banking), where profit fell a third — worth a direct question to the desk on whether that's cost allocation or a genuine slowdown outside Japan.";

// ---------- Trajectory (FY20–FY25 full years vs. FY26 Q1, one quarter) ----------
export const TRAJECTORY_YEARS = ["FY20", "FY21", "FY22", "FY23", "FY24", "FY25", "FY26 Q1"];

export const NBP_TRAJECTORY_USD = [4.92, 5.25, 4.97, 6.19, 7.04, 8.99, 3.54];
export const EXPENSE_RATIO_TRAJECTORY = [64.0, 62.7, 64.6, 62.9, 62.5, 59.4, 47.7];
export const PROFIT_TRAJECTORY_USD = [2.9, 3.27, 3.42, 4.18, 5.45, 7.69, 2.6];
export const ROE_TRAJECTORY = [5.2, 5.7, 6.1, 7.0, 8.5, 11.4, 12.5];

export const TRAJECTORY_PLAIN =
  "Look at the shape, not just this quarter's bar. Profit and ROE have climbed every year since FY20 — this is the continuation of a multi-year trend, not a sudden spike. The falling expense-ratio line is the other half of the story: Mizuho is making more money per dollar it spends.";

// ---------- Segment engine ----------
export interface SegmentRow {
  name: string;
  grossUsd: string;
  nbpUsd: string;
  nbpYoY: string;
  nbpDir: Direction;
  profitUsd: string;
  profitYoY: string;
  profitDir: Direction;
}

export const SEGMENTS: SegmentRow[] = [
  { name: "Retail & Business (RBC)", grossUsd: "1.59", nbpUsd: "0.51", nbpYoY: "+117%", nbpDir: "pos", profitUsd: "0.29", profitYoY: "+67%", profitDir: "pos" },
  { name: "Corporate & Investment Banking (CIBC)", grossUsd: "1.30", nbpUsd: "0.94", nbpYoY: "+55%", nbpDir: "pos", profitUsd: "0.78", profitYoY: "+37%", profitDir: "pos" },
  { name: "Global Corp. & Inv. Banking (GCIBC)", grossUsd: "1.43", nbpUsd: "0.59", nbpYoY: "−12%", nbpDir: "neg", profitUsd: "0.39", profitYoY: "−34%", profitDir: "neg" },
  { name: "Asset Management (AMC)", grossUsd: "0.10", nbpUsd: "0.03", nbpYoY: "+15%", nbpDir: "pos", profitUsd: "0.01", profitYoY: "+13%", profitDir: "pos" },
];

export const CUSTOMER_GROUPS_TOTAL: SegmentRow = {
  name: "Customer Groups (subtotal)", grossUsd: "4.42", nbpUsd: "2.07", nbpYoY: "+35%", nbpDir: "pos", profitUsd: "1.48", profitYoY: "+10%", profitDir: "pos",
};

export const MARKETS_SEGMENTS: SegmentRow[] = [
  { name: "Markets — Banking", grossUsd: "0.98", nbpUsd: "0.89", nbpYoY: "+219%", nbpDir: "pos", profitUsd: "—", profitYoY: "", profitDir: "pos" },
  { name: "Markets — Sales & Trading", grossUsd: "0.96", nbpUsd: "0.34", nbpYoY: "+96%", nbpDir: "pos", profitUsd: "—", profitYoY: "", profitDir: "pos" },
];

export const MARKETS_TOTAL: SegmentRow = {
  name: "Markets (subtotal)", grossUsd: "1.94", nbpUsd: "1.23", nbpYoY: "+172%", nbpDir: "pos", profitUsd: "0.85", profitYoY: "+154%", profitDir: "pos",
};

export const SEGMENT_CHART = [
  { name: "RBC", valueUsd: 0.29 },
  { name: "CIBC", valueUsd: 0.78 },
  { name: "GCIBC", valueUsd: 0.39 },
  { name: "AMC", valueUsd: 0.01 },
  { name: "Markets", valueUsd: 0.85 },
];

export const SEGMENT_PLAIN =
  "Think of Mizuho as five engines: four \"Customer Groups\" businesses (retail, domestic corporate, global corporate, asset management) plus \"Markets\" (trading and treasury). Retail and domestic corporate had excellent quarters. GCIBC is the exception — profit fell a third. Markets more than doubled its profit, the single biggest swing factor this quarter — and inherently the most volatile segment quarter to quarter, so treat it as a high-water mark, not a new baseline.";

// ---------- Americas deep-dive ----------
export const AMERICAS_METRICS = [
  { label: "Americas Loans (avg. bal.)", value: "$114.0B", delta: "+$3.2B vs FY25 avg", dir: "pos" as Direction, note: "Period-end balance: $112.6B. Largest of the three international regions." },
  { label: "Americas Customer Deposits", value: "~$45.0B", delta: "20% of non-JPY total", dir: "pos" as Direction, note: "Estimated from disclosed regional mix (Americas 20% / EMEA 10% / APAC 20% of $224.8B total)." },
  { label: "Non-Interest Income (GCIBC)", value: "$0.45B", delta: "+$0.02B YoY", dir: "pos" as Direction, note: "Largest of the three regions for GCIBC fee income (EMEA $0.10B, APAC $0.24B)." },
  { label: "U.S.-Based Securities Entities", value: "$0.31B NBP", delta: "$0.23B profit attrib.", dir: "pos" as Direction, note: "Mizuho Securities USA + Mizuho Bank Europe securities division, FY26 Q1, management basis." },
];

export const REGION_LOAN_YEARS = ["FY24", "FY25", "FY26 Q1"];
export const REGION_LOANS_USD = {
  Americas: [105.2, 110.8, 114.0],
  EMEA: [48.9, 47.3, 49.3],
  APAC: [88.6, 89.4, 89.4],
};

export const MARGIN_SERIES = {
  years: ["FY24", "FY25", "FY26 Q1"],
  returnsOnLoans: [5.54, 4.71, 4.48],
  costOfDeposits: [4.18, 3.44, 3.17],
  netMargin: [1.36, 1.26, 1.31],
};

export const AMERICAS_NII_TABLE = [
  { label: "Total Americas", fy25q1: "$0.43B", fy26q1: "$0.45B", yoy: "+$0.02B", dir: "pos" as Direction },
  { label: "o/w Investment Banking", fy25q1: "$0.17B", fy26q1: "$0.21B", yoy: "+$0.04B", dir: "pos" as Direction },
  { label: "o/w Credit-related fees", fy25q1: "$0.24B", fy26q1: "$0.23B", yoy: "−$0.01B", dir: "neg" as Direction },
  { label: "o/w FX & Derivatives", fy25q1: "$0.02B", fy26q1: "$0.02B", yoy: "~flat", dir: "pos" as Direction },
];

export const AMERICAS_PLAIN =
  "The filing doesn't break every line out by legal entity, but it does split loans, deposits, and fee income by region. Americas is consistently the largest of the three international regions. Investment banking fees grew faster than credit-related fees this quarter — a healthier mix than leaning on lending spreads alone. This is also the section that fills the gap the 05 Bank Earnings card flags: this quarter's credit costs and NPL ratio (see Asset Quality below) — CET1/capital ratio still isn't broken out in this particular release.";

// ---------- Balance sheet (Jun 2026) ----------
export const BALANCE_SHEET = [
  { label: "Total Assets", value: "$1.87T", delta: "+$12.3B vs Mar-26", dir: "pos" as Direction },
  { label: "Loans (Group)", value: "$634B", delta: "+$20B vs Mar-26", dir: "pos" as Direction },
  { label: "Securities", value: "$302B", delta: "+$44B vs Mar-26", dir: "pos" as Direction },
  { label: "Deposits / NCDs", value: "$1.08T", delta: "−$13B vs Mar-26", dir: "neg" as Direction },
  { label: "Net Assets", value: "$67.7B", delta: "+$0.6B vs Mar-26", dir: "pos" as Direction },
  { label: "Non-JPY Loans", value: "$284.4B", delta: "+$6.5B vs Mar-26", dir: "pos" as Direction },
];

export const BALANCE_SHEET_PLAIN =
  "A bank's balance sheet is what it owns (assets — mostly loans and securities) and what it owes (liabilities — mostly customer deposits); the difference is net assets, the shareholders' cushion. Everything here grew modestly except deposits, which dipped slightly — not a red flag on its own, but worth tracking if the trend continues.";

// ---------- Asset quality ----------
export const CREDIT_COST_YEARS = ["FY24", "FY25", "FY26 Q1"];
export const CREDIT_COST_USD = [-0.32, -0.82, -0.04];

export const NPL_DATES = ["Mar-25", "Mar-26", "Jun-26"];
export const NPL_RATIO = [0.97, 0.8, 0.7];

export const ASSET_QUALITY_PLAIN =
  "\"Credit-related costs\" is money set aside for loans that might go bad. A small number means the bank isn't seeing much trouble right now — this quarter's $0.04B compares with a full-year budget of about $0.73B, only 5% used. The \"NPL ratio\" is the share of loans already in trouble, and it's been falling for two years straight, now 0.70%. Both charts tell the same story: credit quality is currently benign.";

// ---------- Outlook ----------
export const OUTLOOK = [
  { label: "FY26 NBP Outlook", value: "$11.67B", delta: "+$0.80B vs May", dir: "pos" as Direction },
  { label: "FY26 Profit Outlook", value: "$9.33B", delta: "+$0.67B vs May", dir: "pos" as Direction },
  { label: "Share Buyback (max)", value: "$1.33B", delta: "+$0.67B vs May", dir: "pos" as Direction },
  { label: "Annual Dividend (est.)", value: "¥150/sh", delta: "+¥5 YoY", dir: "pos" as Direction },
];

export const OUTLOOK_ASSUMPTIONS =
  "Guidance assumes BOJ policy rate 1.00%, Nikkei 225 at 57,000, USD/JPY at 150. Upside if rates rise faster or the Yen weakens further; downside in the reverse case.";

export const OUTLOOK_PLAIN =
  "Management raised its own full-year targets after this quarter's results — a vote of confidence, not just a formality. They're also returning more cash to shareholders while keeping the dividend steady. The guidance assumptions above are the scenario this all depends on — if rates or the Yen move differently, the outlook moves with them.";
