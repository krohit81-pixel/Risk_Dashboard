// lib/bankEarnings.ts
// V5.7.0 — "Bank Earnings" prototype: latest-quarter results for 15 major banks (5 US,
// 5 Europe, 5 Asia), compiled from public earnings releases and reputable financial news
// as of Jul 29, 2026. This is a curated static snapshot for the prototype, not a live feed —
// see AS_OF and each bank's periodNote for exactly how current the data is.
//
// Sourcing note: figures below were reconciled from company press releases / investor
// relations pages plus Reuters, Bloomberg, CNBC, FT and similar coverage. Where sources
// conflicted (a handful of cases — e.g. exact same-day stock-move percentages), the more
// conservative or primary-sourced figure was kept; ambiguous items were phrased qualitatively
// rather than stated as precise facts. Treat this as directional intelligence, not a
// substitute for the banks' own filings.

export const AS_OF = "Jul 29, 2026";

export type StockReactionDirection = "up" | "down" | "mixed";
export type Region = "US" | "Europe" | "Asia";

export interface BankEarnings {
  id: string;
  name: string;
  ticker: string;
  region: Region;
  period: string; // e.g. "Q2 2026"
  reportDate: string; // e.g. "Jul 15, 2026"
  /** Set when the latest quarter/half isn't out yet — clarifies what period is actually shown. */
  periodNote?: string;
  headline: string; // one-line summary
  metrics: { label: string; value: string }[];
  highlights: string[];
  stockReaction: {
    direction: StockReactionDirection;
    changeText: string; // "+7.7%"
    detail: string;
  };
  riskWatch: string[];
}

export const REGION_LABEL: Record<Region, string> = {
  US: "United States",
  Europe: "Europe & UK",
  Asia: "Asia",
};

export const REGION_FLAG: Record<Region, string> = {
  US: "🇺🇸",
  Europe: "🇪🇺",
  Asia: "🌏",
};

/** Cross-bank sector notes worth surfacing alongside the individual cards. */
export const REGION_NOTES: Partial<Record<Region, string>> = {
  US: "Forbes' Jul 16 analysis of the “Big Eight” flagged that broad fee/trading strength this quarter may be masking rising consumer-credit pain: Citi (and Wells Fargo) added consumer-card and CRE reserves this quarter while JPMorgan, Goldman and BofA cut provisions — a divergence worth treating as an early-warning signal rather than uniform sector improvement.",
  Asia: "All three Japanese megabanks flagged Middle East conflict-related risk in their credit-cost commentary this cycle — a shared, cross-institution watch item rather than a bank-specific one.",
};

export const BANK_EARNINGS: BankEarnings[] = [
  // ───────────────────────── US ─────────────────────────
  {
    id: "jpm",
    name: "JPMorgan Chase",
    ticker: "JPM",
    region: "US",
    period: "Q2 2026",
    reportDate: "Jul 15, 2026",
    headline: "Broad beat, but a muted stock reaction — expectations were already priced in.",
    metrics: [
      { label: "EPS (adj.)", value: "$6.14 vs ~$5.74 est." },
      { label: "Revenue", value: "$57.3B (+27% YoY)" },
      { label: "Net income", value: "$21.2B GAAP" },
      { label: "ROTCE (adj.)", value: "23%" },
    ],
    highlights: [
      "GAAP EPS $7.70 included a $4.6B pre-tax gain on JPM's Visa stake; adjusted EPS of $6.14 still beat estimates.",
      "Markets revenue $12.1B — Equity Markets +86% YoY to $6.0B.",
      "Investment banking fees $3.3B (+30% YoY), the highest since 2021.",
      "Raised full-year 2026 NII guidance to ~$105.5B (from $103B).",
    ],
    stockReaction: {
      direction: "up",
      changeText: "+0.5%",
      detail: "Closed near $344–345, close to 52-week highs — a muted move despite the beat, consistent with high expectations already priced in.",
    },
    riskWatch: [
      "CET1 (standardized) fell 20bps QoQ to 14.1% — net income more than offset by higher RWA and capital distributions.",
      "Credit costs $2.5B with only a modest $149M net reserve build.",
      "Provisions were trimmed >10% QoQ across JPM and several peers — some analysts flag this as potentially premature given rising consumer-credit stress elsewhere in the sector.",
      "Raised NII guidance implies more balance-sheet growth and rate sensitivity going forward.",
    ],
  },
  {
    id: "gs",
    name: "Goldman Sachs",
    ticker: "GS",
    region: "US",
    period: "Q2 2026",
    reportDate: "Jul 14, 2026",
    headline: "Large beat across the board; shares jumped on trading and banking strength.",
    metrics: [
      { label: "EPS", value: "$20.98 vs ~$14.46 est." },
      { label: "Revenue", value: "$20.34B (+26% vs est.)" },
      { label: "Net earnings", value: "$6.63B" },
      { label: "ROE (ann.)", value: "23.5%" },
    ],
    highlights: [
      "Global Banking & Markets net revenues $15.5B (+53% YoY).",
      "Equities sales & trading $7.42B; FICC $4.59B; investment banking revenue $3.40B.",
      "Record Asset & Wealth Management fees of $3.4B.",
      "$5.36B returned to shareholders ($4.0B buybacks + $1.36B dividends); dividend raised 11% to $5.00/share.",
    ],
    stockReaction: {
      direction: "up",
      changeText: "+7.7%",
      detail: "Shares surged to roughly $1,127 on the release — the strongest same-day reaction among the US majors this quarter.",
    },
    riskWatch: [
      "Provision for credit losses fell sharply to $102M (from $315M in Q1, $384M a year ago) — the largest percentage cut among major banks this quarter; some analysts flag it as a notable reserve-release given still-elevated consumer credit stress industry-wide.",
      "CET1 improved to 12.9% standardized / 13.7% advanced — solid buffer.",
      "Aggressive capital-return pace ($5.36B this quarter, dividend +11%) worth weighing against the reserve-release trend above.",
    ],
  },
  {
    id: "citi",
    name: "Citigroup",
    ticker: "C",
    region: "US",
    period: "Q2 2026",
    reportDate: "Jul 14, 2026",
    headline: "Beat on both lines, but the stock fell — market didn't love the spending outlook.",
    metrics: [
      { label: "EPS", value: "$3.15 vs $2.73 est." },
      { label: "Revenue", value: "$24.8B (+14% YoY)" },
      { label: "Net income", value: "+45% YoY" },
      { label: "CET1", value: "12.8%" },
    ],
    highlights: [
      "Best quarterly revenue performance in a decade.",
      "Equities trading revenue $2.3B (+45% YoY); prime balances up nearly 60%.",
      "Management maintained full-year return guidance while signaling higher H2 2026 investment spend.",
    ],
    stockReaction: {
      direction: "down",
      changeText: "-4.2%",
      detail: "Fell to $134.86 despite the beat — investors reacted to flat full-year return guidance and higher planned H2 spending as a near-term margin concern.",
    },
    riskWatch: [
      "Cost of credit $2.5B, driven mainly by net credit losses in US Consumer Cards; FY26 US Cards net charge-off guidance 4.0–4.5%.",
      "Citi was one of the few majors adding to reserves this quarter (net build $118M) — specifically flagged as covering ongoing CRE and international credit uncertainty, a divergence from peers who cut provisions.",
      "CET1 12.8%, ~120bps above the current regulatory requirement.",
      "Stock fell despite the beat — a guidance-credibility signal worth tracking into Q3.",
    ],
  },
  {
    id: "bac",
    name: "Bank of America",
    ticker: "BAC",
    region: "US",
    period: "Q2 2026",
    reportDate: "Jul 14, 2026",
    headline: "Clean beat-and-raise quarter with improving credit trends.",
    metrics: [
      { label: "EPS", value: "$1.21 vs $1.12 est." },
      { label: "Revenue", value: "$31.6B (+15% YoY)" },
      { label: "Net income", value: "$9.1B (+27% YoY)" },
      { label: "CET1", value: "11.2%" },
    ],
    highlights: [
      "Trading revenue +33% YoY; investment banking fees +50% YoY.",
      "Global Wealth & Investment Management: $1.4B net income, client balances $4.9T.",
      "Raised full-year NII growth guidance to the upper end of its 6–8% range.",
    ],
    stockReaction: {
      direction: "up",
      changeText: "+1.9%",
      detail: "Closed at $60.62, near its 52-week high — a positive but measured reaction.",
    },
    riskWatch: [
      "Credit trends improving: provisions fell to $1.4B, net charge-off ratio improved to 0.47% (from 0.55%).",
      "Loan growth (+8% YoY) is outpacing deposit growth (+2.5% YoY) — a funding-mix trend worth tracking.",
      "$8B returned to shareholders this quarter — capital-return pace vs. capital-build trajectory to monitor.",
    ],
  },
  {
    id: "ms",
    name: "Morgan Stanley",
    ticker: "MS",
    region: "US",
    period: "Q2 2026",
    reportDate: "Jul 15, 2026",
    headline: "Record quarter across Institutional Securities and Wealth Management; stock hit an all-time high.",
    metrics: [
      { label: "EPS", value: "$3.46 vs ~$2.93–3.03 est." },
      { label: "Revenue", value: "$21.3B (+27% YoY)" },
      { label: "Net income", value: "$5.58B (+58% YoY)" },
      { label: "CET1 (adv.)", value: "16.2%" },
    ],
    highlights: [
      "Institutional Securities net revenues $11.0B (record); Wealth Management $8.9B (record), with a quarterly-record $148.1B in organic net new assets.",
      "Equities net revenues $6.3B (+69% YoY), partly attributed to AI-boom-driven trading activity.",
      "$1.5B in buybacks executed, plus a new $20B repurchase authorization starting Q3 2026 and a dividend increase to $1.15/share.",
    ],
    stockReaction: {
      direction: "up",
      changeText: "All-time high",
      detail: "Closed at $228.55 (intraday high $232.25) on report day — a strongly positive reaction; the precise same-day percentage move wasn't consistently confirmed across sources.",
    },
    riskWatch: [
      "Very strong capital cushion (CET1 standardized 14.8% / advanced 16.2%), ~300bps+ above requirement.",
      "Heavy reliance on trading/equities revenue (+69% YoY, tied to AI-driven volumes) for the beat — a concentration risk if that activity normalizes.",
      "Provisions fell to $98M from $196M YoY — a small base relative to peers given MS's less credit-heavy balance sheet.",
    ],
  },

  // ───────────────────────── Europe ─────────────────────────
  {
    id: "barclays",
    name: "Barclays",
    ticker: "BARC",
    region: "Europe",
    period: "H1 2026",
    reportDate: "Jul 28, 2026",
    headline: "Profit beat and guidance raised, but shares fell on weak FICC trading vs. US peers.",
    metrics: [
      { label: "Q2 pre-tax profit", value: "£3.25B (+31% YoY)" },
      { label: "H1 pre-tax profit", value: "£6.07B (+17%)" },
      { label: "Q2 income", value: "£8.34B (+16% YoY)" },
      { label: "CET1", value: "14.3%" },
    ],
    highlights: [
      "Reported EPS +43% to 16.7p; Q2 pre-tax profit beat consensus (~£3.12B).",
      "FY2026 group income target raised to ~£31.5B (from £31B).",
      "H1 capital distributions of roughly £2.3B combining a buyback and interim dividend.",
    ],
    stockReaction: {
      direction: "down",
      changeText: "~-4 to -5%",
      detail: "Fell despite the beat — Barclays' FICC trading income rose just 1% vs. an average of ~13% at the top-5 US banks, and guidance flagged £450M of incremental H2 2026 costs.",
    },
    riskWatch: [
      "Q2 impairment charge £571M (£346M US Consumer Bank, £160M Barclays UK); loan-loss rate 51bps Q2 / 62bps H1, within the bank's 50–60bps through-cycle guidance.",
      "~£11B of RWA inflation flagged from a US Consumer Bank IRB model migration expected in H2 2027 — a known future capital drag.",
      "Ongoing regulatory/AML and consumer-protection matters disclosed, with no new material charge quantified this release.",
    ],
  },
  {
    id: "stanchart",
    name: "Standard Chartered",
    ticker: "STAN",
    region: "Europe",
    period: "H1 2026",
    reportDate: "Jul 23, 2026",
    headline: "Record first half, guidance upgraded, new buyback — shares rose.",
    metrics: [
      { label: "H1 pre-tax profit", value: "$4.8B (+9% YoY, record)" },
      { label: "H1 operating income", value: "$11.6B (+6%, record)" },
      { label: "RoTE", value: "17.6%" },
      { label: "CET1", value: "14.2%" },
    ],
    highlights: [
      "Q2 revenue $5.7B beat consensus ($5.62B).",
      "Growth led by Wealth Solutions and Global Banking income.",
      "FY2026 income growth guidance upgraded to the mid-point of its 5–7% range.",
      "New $1B buyback announced; interim dividend raised 66% to 20.4 cents/share.",
    ],
    stockReaction: {
      direction: "up",
      changeText: "~+3 to +5%",
      detail: "Shares rose on the beat plus upgraded guidance and the new buyback, with a stronger move reported on the Hong Kong-listed line.",
    },
    riskWatch: [
      "Credit impairment charge $446M (up from $336M a year ago), including a $234M management overlay specifically for Middle East-related exposures — a concentration flag.",
      "CET1 14.2%, within the reiterated 13–14% target range; leverage 4.7%, total capital 21.1% — comfortable buffers.",
      "FY2028 targets (cost-income ~57%, RoTE >15%) reiterated — multi-year execution risk remains.",
    ],
  },
  {
    id: "hsbc",
    name: "HSBC",
    ticker: "HSBA",
    region: "Europe",
    period: "Q1 2026",
    reportDate: "May 5, 2026",
    periodNote: "H1 2026 results are due Aug 4, 2026 — not yet released as of this snapshot. Shown here: the last confirmed quarter.",
    headline: "Profit dipped on higher credit losses even as revenue grew — watch the Aug 4 H1 print for the fuller picture.",
    metrics: [
      { label: "Pre-tax profit", value: "$9.4B (roughly flat YoY)" },
      { label: "Revenue", value: "$18.6B (+6% YoY)" },
      { label: "RoTE", value: "~17–19%" },
      { label: "CET1", value: "14.0% (-0.9pp QoQ)" },
    ],
    highlights: [
      "Revenue growth driven by Wealth fees and higher banking net interest income.",
      "FY2026 banking NII guidance raised to ~$46B.",
      "First interim dividend of $0.10/share declared.",
    ],
    stockReaction: {
      direction: "mixed",
      changeText: "Unconfirmed",
      detail: "Coverage of the Q1 release conflicted on direction — some framed it as a profit miss weighing on the stock, others as a gain on the RoTE beat. Not confidently resolved from available sources.",
    },
    riskWatch: [
      "Expected credit losses rose to $1.3B in Q1, including a $0.4B fraud-related UK securitisation exposure and a $0.3B Middle East-conflict-linked macro overlay.",
      "FY2026 ECL guidance raised to ~45bps (from ~40bps).",
      "CET1 fell 0.9pp QoQ to 14.0% — driven by the Hang Seng Bank privatisation, dividends and RWA growth; cushion within target range but narrowing.",
      "Hong Kong commercial real estate exposure ~$29.5B — stable quality reported, but a standing concentration to monitor.",
    ],
  },
  {
    id: "ubs",
    name: "UBS",
    ticker: "UBS",
    region: "Europe",
    period: "Q2 2026",
    reportDate: "Jul 29, 2026",
    headline: "Beat on profit with integration nearly complete; stock reaction was muted.",
    metrics: [
      { label: "Net profit", value: "$2.8B (+17% YoY, beat $2.39B est.)" },
      { label: "Underlying pre-tax", value: "$3.9B (+45% YoY)" },
      { label: "Revenue", value: "$13.3B (+16% YoY)" },
      { label: "CET1", value: "14.4%" },
    ],
    highlights: [
      "Global Wealth Management pre-tax profit $2.0B (+38%), net new assets $36B; Investment Bank pre-tax more than doubled to $1.2B.",
      "Credit Suisse integration: $12.6B of the $13.5B gross cost-savings target realized, substantially complete by year-end 2026.",
      "Invested assets hit a record $7.3 trillion; new $3B buyback announced through mid-2027.",
    ],
    stockReaction: {
      direction: "mixed",
      changeText: "~flat (-0.2 to -0.5%)",
      detail: "Roughly flat despite the beat — investors reportedly awaiting more clarity on the pace of capital returns and the final stages of CS integration.",
    },
    riskWatch: [
      "Credit loss expense CHF 61M — still low, but rising versus prior periods.",
      "Reported opex rose 7%, including ongoing litigation provisions — a live drag on the integration-driven margin story.",
      "Credit Suisse integration not yet fully complete — residual execution/restructuring risk remains through year-end 2026.",
      "Management flagged geopolitical risk and a potential AI-driven market pullback as macro watch items.",
    ],
  },
  {
    id: "db",
    name: "Deutsche Bank",
    ticker: "DBK",
    region: "Europe",
    period: "Q2 2026",
    reportDate: "Jul 29, 2026",
    headline: "Bank's strongest-ever Q2 on paper; market reaction was mixed and coverage inconsistent.",
    metrics: [
      { label: "Net profit", value: "~€1.9B (+10% YoY)" },
      { label: "Pre-tax profit", value: "€2.7B (+11% YoY)" },
      { label: "Revenue", value: "€8.5B (+9% YoY)" },
      { label: "CET1", value: "13.9%" },
    ],
    highlights: [
      "20th consecutive quarter of YoY revenue growth; H1 2026 was the bank's highest half-year result on record (€17.2B revenue, €4.1B profit).",
      "Diluted EPS €0.57 (+19% YoY); FY2026 NII outlook raised to above €14B.",
      "New €500M buyback announced after completing a prior €1B program.",
    ],
    stockReaction: {
      direction: "mixed",
      changeText: "Conflicting across sources",
      detail: "Some coverage showed shares up as much as 6% intraday on the DAX on the buyback news; other sources showed the NYSE-listed ADR roughly flat to slightly down. Treat the exact magnitude as unresolved pending a single authoritative source.",
    },
    riskWatch: [
      "Provision for credit losses €460M (38bps annualized) — up roughly 50% YoY, a notable increase worth flagging.",
      "CET1 13.9% — the lowest of the five European banks in this set, though still comfortably above requirements.",
      "Some outlets cite offsetting restructuring costs against the “record” profit headline — worth reconciling against the bank's own release detail.",
    ],
  },

  // ───────────────────────── Asia ─────────────────────────
  {
    id: "mizuho",
    name: "Mizuho Financial Group",
    ticker: "8411.T",
    region: "Asia",
    period: "FY2025 (year ended Mar 2026)",
    reportDate: "May 15, 2026",
    periodNote: "Q1 FY2026 (Apr–Jun) is due Jul 30, 2026 — one day after this snapshot.",
    headline: "Record full-year profit, but Middle East-linked credit costs and a thin capital buffer stand out.",
    metrics: [
      { label: "Profit", value: "¥1,248.6B (+41.0% YoY, record)" },
      { label: "FY26 guidance", value: "¥1,300.0B (+4.1%)" },
      { label: "ROE", value: "11.4% (record)" },
      { label: "CET1", value: "9.9%" },
    ],
    highlights: [
      "Ordinary profit ¥1,573.2B (+34.6% YoY).",
      "Net gains on stock sales ¥325.1B, driven mainly by cross-shareholding unwinds — analysts assess roughly ¥100B of FY25 profit as non-recurring.",
      "Dividend raised to an estimated ¥150/share for FY26 (from ¥145).",
    ],
    stockReaction: {
      direction: "down",
      changeText: "-0.6%",
      detail: "Shares dipped modestly to ¥7,006 on release day despite the earnings beat; sentiment improved over the following days, with at least one analyst upgrading to Buy by May 19.",
    },
    riskWatch: [
      "Credit-related costs jumped to ¥133.0B (+¥81.4B YoY), explicitly tied by management to “specific companies” and forward-looking provisioning for Middle East conflict-related uncertainty.",
      "CET1 at 9.9% sits at the low end of Mizuho's own 9–10% target range — limited buffer versus peers.",
      "Analysts flag that NIM/earnings tailwinds could fade from FY2027 as non-Japan rates ease while the BOJ continues hiking — an asymmetric rate exposure.",
    ],
  },
  {
    id: "mufg",
    name: "MUFG (Mitsubishi UFJ)",
    ticker: "8306.T",
    region: "Asia",
    period: "FY2025 (year ended Mar 2026)",
    reportDate: "May 15, 2026",
    periodNote: "Q1 FY2026 is due ~Aug 3–4, 2026 — not yet released.",
    headline: "First Japanese megabank ever to top ¥2 trillion in profit — but capital fell below its own target range.",
    metrics: [
      { label: "Net profit", value: "¥2.4 trillion (+30% YoY, record)" },
      { label: "ROE target", value: "~12% (raised from ~9%)" },
      { label: "CET1", value: "9.2% (-1.6pp YoY)" },
      { label: "Core bank profit", value: "¥1.36T (2.3x YoY)" },
    ],
    highlights: [
      "Record profit for a third consecutive year, on higher NIM from rising global and JGB rates.",
      "ROE target raised to ~12% for FY2026; dividend increased.",
      "EPS surprise of roughly +41% vs. consensus.",
    ],
    stockReaction: {
      direction: "up",
      changeText: "+4.1%",
      detail: "Shares rose on the record beat, adding roughly 5% over the following week.",
    },
    riskWatch: [
      "CET1 fell 1.6pp YoY to 9.2% — below MUFG's own target range, driven by its stake in India's Shriram Finance plus a large late-fiscal-year loan-book increase. This is the standout capital-trajectory item to watch this cycle.",
      "Cross-border credit/concentration exposure via the Shriram Finance (India NBFC) stake.",
      "Morningstar expects earnings growth to slow to ~5% from FY2027 as non-Japan rates ease.",
      "Large late-quarter loan growth funding the RWA increase — worth watching for underwriting discipline.",
    ],
  },
  {
    id: "smfg",
    name: "SMFG (Sumitomo Mitsui)",
    ticker: "8316.T",
    region: "Asia",
    period: "FY2025 (year ended Mar 2026)",
    reportDate: "May 13, 2026",
    periodNote: "Q1 FY2026 is expected around late July 2026 (exact date unconfirmed) — not yet reflected here.",
    headline: "Record profit and the strongest capital ratio of the three Japanese megabanks.",
    metrics: [
      { label: "Profit", value: "¥1.58 trillion (+34.4% YoY, record)" },
      { label: "FY26 guidance", value: "¥1.70T (+7.4%)" },
      { label: "CET1", value: "12.59%" },
      { label: "EPS", value: "¥411.97" },
    ],
    highlights: [
      "Board approved a 2-for-1 stock split effective October 1, 2026.",
      "Cross-shareholdings cut from ~¥5.7T (Jul 2024) to ~¥3T — pace of unwind is ahead of peers.",
      "Total capital ratio 15.62%; leverage ratio 5.17% — comfortable buffers.",
    ],
    stockReaction: {
      direction: "mixed",
      changeText: "Unconfirmed",
      detail: "Same-day price reaction wasn't reliably confirmed across available sources — treat as unresolved rather than a claimed beat/miss reaction.",
    },
    riskWatch: [
      "NPL ratio ticked up to 0.76%.",
      "Morningstar flags ~35% of SMFG's loan book sits outside Japan — cross-border credit/FX/rate exposure, expected to slow growth to ~9% through FY2028.",
      "Continued cross-shareholding unwind is flattering reported profit (one-off gains) versus a lower sustainable run-rate.",
      "Shared BOJ policy-path sensitivity — a mid-July single-day ~3.25% stock drop was attributed to BOJ officials signaling a more cautious hike path than markets had priced.",
    ],
  },
  {
    id: "dbs",
    name: "DBS Group",
    ticker: "D05.SI",
    region: "Asia",
    period: "Q1 2026",
    reportDate: "Apr 29, 2026",
    periodNote: "Q2 2026 is due Aug 6, 2026 — not yet released.",
    headline: "Record income quarter on wealth and transaction-fee strength; credit quality improved.",
    metrics: [
      { label: "Net profit", value: "S$2.93B (+1% YoY, +24% QoQ)" },
      { label: "Total income", value: "S$5.95B (record)" },
      { label: "ROE", value: "17.0%" },
      { label: "CET1 (phased-in)", value: "14.8%" },
    ],
    highlights: [
      "Record wealth-management fees, record transaction-services fees, and continued deposit growth.",
      "Total dividend S$0.81/share (S$0.66 ordinary + S$0.15 capital-return).",
      "Liquidity strong: LCR 151%, NSFR 117%.",
    ],
    stockReaction: {
      direction: "up",
      changeText: "~+1.4 to +3%",
      detail: "Shares rose on the record quarter; exact magnitude varies modestly by source and window, direction is consistently positive.",
    },
    riskWatch: [
      "CET1 (fully phased-in pro forma) 14.8%, down 0.2pp QoQ on higher RWA.",
      "NPL ratio improved to 1.0% (from 1.1%) — a positive signal, worth watching against continued RWA growth.",
      "Growing reliance on wealth-management fee income for growth — a concentration/market-sensitivity item as rate-cut cycles progress.",
    ],
  },
  {
    id: "icbc",
    name: "ICBC",
    ticker: "1398.HK",
    region: "Asia",
    period: "Q1 2026",
    reportDate: "Apr 29, 2026",
    periodNote: "H1/interim 2026 results are due late August 2026 — not yet released.",
    headline: "Profit roughly in line with estimates; margin compression remains the structural story.",
    metrics: [
      { label: "Net profit", value: "RMB 86.94B (+3.3% YoY)" },
      { label: "Net interest margin", value: "1.29%" },
      { label: "NPL ratio", value: "1.31% (flat QoQ)" },
      { label: "Net interest income", value: "RMB 168.5B" },
    ],
    highlights: [
      "Profit came in roughly in line with the Reuters-polled analyst estimate (~RMB 86.2B).",
      "NIM ticked up marginally from 1.28% at end-2025.",
    ],
    stockReaction: {
      direction: "down",
      changeText: "-2.1%",
      detail: "Hong Kong-listed shares fell to HK$7.03 on release day. One source characterized this as an EPS miss, which conflicts with the broadly in-line profit read above — noted as an unresolved discrepancy.",
    },
    riskWatch: [
      "NIM remains near historic lows despite the small uptick — structural margin compression across Chinese state banks is an ongoing concern.",
      "China property-sector exposure is a standing structural risk given ICBC's scale in mortgage and corporate real-estate lending; current-quarter, bank-specific exposure figures were not available to confirm and are deliberately omitted here rather than guessed.",
      "Capital ratios were only described qualitatively as “above regulatory minimums” in available sources — exact CET1 for this quarter unconfirmed.",
    ],
  },
];
