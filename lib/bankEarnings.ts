// lib/bankEarnings.ts
// V5.7.0 — "Bank Earnings" prototype: latest-quarter results for 15 major banks (5 US,
// 5 Europe, 5 Asia), compiled from public earnings releases and reputable financial news.
// This file is the curated FALLBACK BASELINE — not a live feed on its own. See AS_OF and
// each bank's periodNote for exactly how current the baseline data is.
//
// V5.8.0 — a refresh layer sits on top of this baseline (see lib/bankEarningsStore.ts /
// lib/bankEarningsRefresh.ts): Settings → Generation History → "Refresh Earnings" fetches
// real news via the existing adapters and has the grounded LLM extract updated figures for
// any bank where a genuinely newer quarter is confirmed in the fetched articles, persisting
// the result in a KV overlay. This file never gets overwritten by that process — it's the
// last-good fallback if a refresh run finds nothing new or fails. Update it by hand when you
// want to move the baseline itself forward (e.g. once a quarter, to fold refreshed figures
// back in and keep the KV overlay small).
//
// Sourcing note: figures below were reconciled from company press releases / investor
// relations pages plus Reuters, Bloomberg, CNBC, FT and similar coverage. Where sources
// conflicted (a handful of cases — e.g. exact same-day stock-move percentages), the more
// conservative or primary-sourced figure was kept; ambiguous items were phrased qualitatively
// rather than stated as precise facts. Treat this as directional intelligence, not a
// substitute for the banks' own filings.

export const AS_OF = "Jul 30, 2026";

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
  /** V5.8.0 — short, jargon-free translation of the same facts above (no new claims). */
  plainEnglish: string;
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
    plainEnglish:
      "JPMorgan made more money than Wall Street expected, mostly from booming trading and dealmaking. Investors barely reacted because everyone already expected a strong quarter. One thing to watch: the bank trimmed some of the money it sets aside for bad loans, even as pressure is building elsewhere in consumer credit — worth watching if that turns out to be premature.",
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
    plainEnglish:
      "Goldman Sachs blew past expectations, with trading and dealmaking revenue way up, and the stock jumped the most of any big US bank this quarter. It also cut back sharply on money set aside for loan losses — a good sign if credit stays healthy, but worth watching given how much cash it's now returning to shareholders on top of that.",
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
    plainEnglish:
      "Citigroup beat expectations on both profit and revenue, but the stock fell anyway — investors didn't like that the bank plans to spend more in the second half without raising its return targets. Citi was also one of the few big US banks adding to its bad-loan reserves this quarter, mainly because of stress in its US credit-card business.",
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
    plainEnglish:
      "Bank of America had a clean, straightforward good quarter — profit, trading and dealmaking all beat expectations, and credit quality actually improved, with fewer loans going bad. The stock rose to near a 52-week high on the news.",
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
    plainEnglish:
      "Morgan Stanley posted its best quarter ever in both trading/dealmaking and wealth management, helped in part by a boom in AI-related trading activity, and the stock hit an all-time high. The flip side: a good chunk of this quarter's strength depends on that trading boom continuing — if AI-driven trading activity cools off, so could this growth.",
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
    plainEnglish:
      "Barclays beat profit expectations and raised its full-year targets, but the stock still fell — its trading revenue grew much more slowly than its big US rivals', and it flagged a chunk of extra costs coming in the second half. A future accounting-rule change will also add to the assets Barclays needs to hold capital against, though that's a couple of years out.",
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
    plainEnglish:
      "Standard Chartered had its best first half ever, beat expectations, raised guidance, and announced a new share buyback — the stock rose on the news. The bank did set aside extra money specifically for Middle East-related loan risk, which is worth watching as that conflict continues.",
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
    plainEnglish:
      "HSBC's profit was roughly flat versus a year ago even though revenue grew, because the bank had to set aside more money for loans that might go bad — including a fraud-related issue in the UK and a Middle East-related buffer. Its capital cushion also shrank a bit. The bigger, more complete half-year results are due in early August, so treat this as a partial picture.",
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
    plainEnglish:
      "UBS beat profit expectations and is nearly done folding in Credit Suisse — it's recovered most of the promised cost savings — but the stock barely moved. Investors seem to be waiting for more clarity on when UBS will return more cash to shareholders and finish the last stages of the Credit Suisse integration.",
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
    plainEnglish:
      "Deutsche Bank had arguably its best-ever quarter and first half on paper — revenue and profit both up nicely, with 20 straight quarters of growth — but different outlets reported very different stock reactions (some sharply up, some flat), so the market's actual verdict isn't fully clear yet. Money set aside for bad loans also rose about 50% year-over-year — the one number worth watching.",
  },

  // ───────────────────────── Asia ─────────────────────────
  {
    id: "mizuho",
    name: "Mizuho Financial Group",
    ticker: "8411.T",
    region: "Asia",
    period: "Q1 FY2026 (Apr–Jun 2026)",
    reportDate: "Jul 30, 2026",
    headline: "Record Q1 profit on strong loan growth and a weaker yen; FY guidance raised — but this quarter's capital and credit-cost figures aren't yet confirmed.",
    metrics: [
      { label: "Net profit", value: "¥422.91B (+45.5% YoY)" },
      { label: "Total income", value: "¥2.520T (+18.3% YoY)" },
      { label: "FY26 guidance (yr to Mar 2027)", value: "¥1.40T (raised from ¥1.30T)" },
      { label: "Prior FY profit (record)", value: "¥1,248.6B (FY ended Mar 2026)" },
    ],
    highlights: [
      "Total income rose 18.3% YoY to ¥2.520 trillion, with robust growth across core retail banking divisions.",
      "Loan demand stayed strong despite sticky inflation and Middle East-conflict headwinds; investment banking benefited from a weaker yen boosting overseas activity.",
      "BOJ hiked rates 25bps to 1.0% in June 2026 — a continued tailwind for loan-deposit spreads across the Japanese megabanks.",
      "Management raised the FY2026 (year to Mar 2027) net profit forecast to ¥1.40 trillion from ¥1.30 trillion, in line with consensus.",
    ],
    stockReaction: {
      direction: "mixed",
      changeText: "Unconfirmed",
      detail: "Same-day share-price reaction wasn't cleanly confirmed from available sources as of this update (Jul 30, 2026) — treat as unresolved rather than a stated beat/miss reaction; check back on the next refresh.",
    },
    riskWatch: [
      "This quarter's CET1 ratio and credit-cost figures were not cleanly confirmed from available sources as of this update — for context, FY2025 (year ended Mar 2026) CET1 was 9.9%, at the low end of Mizuho's own 9–10% target range.",
      "FY2025 credit-related costs had jumped to ¥133.0B on Middle East conflict-related provisioning; worth checking whether that trend continued into Q1 FY2026 once fuller results commentary is available.",
      "Investment banking strength was partly weak-yen-driven — a reversal in yen direction would remove some of this quarter's tailwind.",
      "Analysts continue to flag that NIM/earnings tailwinds could fade from FY2027 as non-Japan rates ease while the BOJ keeps hiking — an asymmetric rate exposure.",
    ],
    plainEnglish:
      "Mizuho's profit jumped 45% this quarter, mostly because more people and businesses are borrowing, and a weaker yen made its overseas trading arm look better in yen terms. Management got confident enough to raise its full-year profit target. The one thing we don't have solid numbers on yet is how much of a safety buffer (capital) and bad-loan cost this quarter carried — last year that safety buffer was already thin, so it's worth checking once the fuller report is out.",
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
    plainEnglish:
      "MUFG became the first Japanese bank ever to earn more than ¥2 trillion (roughly $13–14B) in a year, and investors liked it — the stock rose and kept climbing the following week. The catch: its capital safety buffer actually fell below the bank's own target range, partly because of a large stake in an Indian lender and a late surge in loan growth — worth watching as a trend, not just a one-quarter blip.",
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
    plainEnglish:
      "Sumitomo Mitsui posted a record profit and holds the strongest capital cushion of Japan's three megabanks, and it's also splitting its stock 2-for-1 to make shares more accessible to investors. About a third of its loan book sits outside Japan, which cuts both ways — more growth, but more exposure to foreign-currency and interest-rate swings.",
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
    plainEnglish:
      "DBS had its best-ever quarter for total income, driven by strong wealth-management and fee business, and its credit quality actually improved. The one thing to watch is that DBS is leaning more and more on wealth-management fees for its growth story — fine while markets are calm, more exposed if rate cuts or market swings slow that business down.",
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
    plainEnglish:
      "ICBC's profit came in roughly as expected — no big surprise — but the deeper story is that the bank's lending margins remain stuck near historic lows, a structural problem across China's big state banks. Exposure to China's property sector remains a standing risk to watch, even though this quarter didn't provide fresh numbers on it.",
  },
];
