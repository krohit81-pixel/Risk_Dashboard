// lib/concepts.ts
// The curated core of the Learn-tab concept library. Hand-written for accuracy
// (no hallucinated definitions). Auto-collection populates first-seen / where-seen
// for these concepts as themes mention them; novel auto-defined terms are a later
// iteration. Each concept can carry a small "chain" visual where a picture teaches
// better than prose.

export type ConceptCategory =
  | "Market"
  | "Credit"
  | "Capital"
  | "Liquidity"
  | "Macro"
  | "Japan";

export interface ConceptVisualStep {
  kind: "start" | "box" | "bad";
  label: string;
}

export interface Concept {
  id: string;
  term: string;
  formal: string;
  category: ConceptCategory;
  /** Surface forms used to auto-link this concept inside theme text. */
  aliases: string[];
  layman: string; // plain English, no jargon
  risk: string;   // the language a CRO would use
  cro: string;    // why a CRO cares
  visual?: ConceptVisualStep[];
}

const v = (kind: ConceptVisualStep["kind"], label: string): ConceptVisualStep => ({ kind, label });

export const CONCEPTS: Concept[] = [
  {
    id: "carry-trade",
    term: "Carry Trade",
    formal: "Yen-funded carry trade",
    category: "Japan",
    aliases: ["carry trade", "carry unwind", "yen-funded carry", "the carry"],
    layman: "Borrow money where it's cheap (Japan), invest where it pays more, and pocket the difference.",
    risk: "Yen-funded carry; it unwinds when the BOJ normalises, forcing correlated repricing across rates, FX and funding books.",
    cro: "A fast unwind hits rates, FX and funding at the same time — correlated moves that break hedges and drain liquidity.",
    visual: [v("start", "Borrow ¥ cheap"), v("box", "Invest abroad, higher yield"), v("bad", "JGB yields ↑"), v("bad", "Unwind → money home")],
  },
  {
    id: "irrbb",
    term: "IRRBB",
    formal: "Interest Rate Risk in the Banking Book",
    category: "Market",
    aliases: ["IRRBB", "interest rate risk in the banking book", "duration gap"],
    layman: "How much the bank loses on paper when rates move, because its assets and debts reprice at different speeds.",
    risk: "Measured via the duration gap and EVE / NII sensitivity; supervisors require explicit limits.",
    cro: "Rate moves hit both economic value of equity and net interest income — a core, regulated bank risk.",
    visual: [v("start", "Rates ↑"), v("bad", "Bond price ↓"), v("bad", "AFS loss"), v("bad", "CET1 pressure")],
  },
  {
    id: "term-premium",
    term: "Term Premium",
    formal: "Compensation for holding long-dated bonds",
    category: "Market",
    aliases: ["term premium"],
    layman: "The extra yield investors demand for lending long instead of rolling short loans.",
    risk: "A rising term premium steepens the curve and pressures duration-heavy portfolios.",
    cro: "When it rises, long yields jump and bank bond portfolios take mark-to-market hits.",
  },
  {
    id: "afs",
    term: "AFS / Mark-to-Market",
    formal: "Available-for-sale securities",
    category: "Capital",
    aliases: ["AFS", "available-for-sale", "available for sale", "mark-to-market", "mark to market", "MTM"],
    layman: "Bonds the bank could sell — their paper losses count against capital even before any sale.",
    risk: "Unrealised losses flow through OCI into CET1, so rate moves erode the buffer pre-emptively.",
    cro: "Rate-driven mark-to-market losses quietly shrink the capital cushion without a single sale.",
    visual: [v("start", "Rates ↑"), v("bad", "AFS bond value ↓"), v("bad", "Unrealised loss → CET1")],
  },
  {
    id: "cet1",
    term: "CET1",
    formal: "Common Equity Tier 1 capital",
    category: "Capital",
    aliases: ["CET1", "common equity tier 1", "tangible capital", "core capital"],
    layman: "The bank's core safety cushion — the highest-quality capital it holds against losses.",
    risk: "The primary solvency ratio supervisors track; most risks ultimately consume it.",
    cro: "It's the number that constrains everything — growth, dividends, risk appetite all bend to it.",
  },
  {
    id: "icr",
    term: "Interest Coverage Ratio",
    formal: "ICR = EBIT ÷ interest expense",
    category: "Credit",
    aliases: ["ICR", "interest coverage", "interest coverage ratio"],
    layman: "Can a company earn enough to cover the interest on its debt? Lower means more fragile.",
    risk: "A falling ICR signals rising PD and migration toward non-performing loans.",
    cro: "An early-warning gauge for corporate credit stress before defaults actually appear.",
    visual: [v("box", "EBIT"), v("box", "÷ interest"), v("start", "= ICR"), v("bad", "< 1.5 = stress")],
  },
  {
    id: "pd",
    term: "Probability of Default",
    formal: "PD — a component of expected credit loss",
    category: "Credit",
    aliases: ["PD", "probability of default", "default probability"],
    layman: "The chance a borrower won't pay back what they owe.",
    risk: "Combines with LGD and EAD to size expected credit loss (ECL) and provisions.",
    cro: "Small PD shifts move large provisioning and capital numbers across a loan book.",
  },
  {
    id: "lgd",
    term: "Loss Given Default",
    formal: "LGD — share of exposure lost if a borrower defaults",
    category: "Credit",
    aliases: ["LGD", "loss given default"],
    layman: "If a borrower does default, how much of the money is actually unrecoverable.",
    risk: "Drives ECL alongside PD and EAD; collateral and seniority reduce it.",
    cro: "Determines how painful a default actually is once it happens.",
  },
  {
    id: "ecl",
    term: "Expected Credit Loss",
    formal: "ECL = PD × LGD × EAD",
    category: "Credit",
    aliases: ["ECL", "expected credit loss", "provisioning", "loan-loss provisions", "provisions"],
    layman: "The bank's best estimate of how much it will lose on loans — set aside in advance.",
    risk: "The IFRS 9 provisioning engine; rising PD/LGD lifts provisions and dents earnings.",
    cro: "Provisions hit the P&L before any actual loss, so ECL shapes quarterly results.",
    visual: [v("box", "PD"), v("box", "× LGD"), v("box", "× EAD"), v("start", "= ECL provision")],
  },
  {
    id: "npl",
    term: "Non-Performing Loan",
    formal: "NPL — 90+ days overdue",
    category: "Credit",
    aliases: ["NPL", "NPLs", "non-performing loan", "non-performing loans", "bad loans"],
    layman: "A loan where the borrower has basically stopped paying (usually 90+ days late).",
    risk: "The NPL ratio is a headline asset-quality metric; rising NPLs lift provisions and erode capital.",
    cro: "What supervisors and investors watch first when judging a bank's loan book.",
  },
  {
    id: "hy-spread",
    term: "High-Yield Spread",
    formal: "Extra yield on sub-investment-grade debt",
    category: "Credit",
    aliases: ["high-yield spread", "high yield spread", "HY spread", "credit spread", "credit spreads", "spreads"],
    layman: "The extra interest risky borrowers must pay over safe government debt — a fear gauge for credit.",
    risk: "Widening spreads signal rising default risk and tightening financial conditions; often lead equities.",
    cro: "An early, market-priced read on credit stress across the system.",
  },
  {
    id: "lcr",
    term: "Liquidity Coverage Ratio",
    formal: "LCR — 30-day stress liquidity",
    category: "Liquidity",
    aliases: ["LCR", "liquidity coverage ratio", "liquidity buffers", "liquidity buffer"],
    layman: "Enough cash-like assets to survive a 30-day run on the bank.",
    risk: "Regulatory minimum; HQLA must cover stressed net outflows for 30 days.",
    cro: "A binding constraint in a funding squeeze — it governs how much liquidity must sit idle.",
  },
  {
    id: "nim",
    term: "Net Interest Margin",
    formal: "NIM — spread between lending and funding",
    category: "Macro",
    aliases: ["NIM", "net interest margin"],
    layman: "The gap between what the bank earns on loans and pays on deposits — its core profit engine.",
    risk: "Higher rates can lift NIM, but deposit competition and funding costs offset it.",
    cro: "Drives core profitability; rate cycles and deposit behaviour push it around.",
  },
  {
    id: "deposit-beta",
    term: "Deposit Beta",
    formal: "Pass-through of rate rises to depositors",
    category: "Liquidity",
    aliases: ["deposit beta", "deposit competition", "deposit repricing"],
    layman: "How fast a bank has to raise the interest it pays savers when rates go up.",
    risk: "High deposit beta compresses NIM and signals funding-cost pressure.",
    cro: "A sticky, underappreciated drag on margins when rates stay high.",
  },
  {
    id: "rwa",
    term: "Risk-Weighted Assets",
    formal: "RWA — capital-weighted exposures",
    category: "Capital",
    aliases: ["RWA", "risk-weighted assets", "RWA inflation"],
    layman: "Assets scaled by how risky they are — riskier loans need more capital behind them.",
    risk: "RWA is the denominator of capital ratios; stress and downgrades inflate it.",
    cro: "RWA inflation silently consumes CET1 even without new lending.",
  },
  {
    id: "var",
    term: "Value at Risk",
    formal: "VaR — potential trading loss",
    category: "Market",
    aliases: ["VaR", "value at risk", "stressed VaR", "trading-book VaR"],
    layman: "A statistical estimate of how much a trading book could lose on a bad day.",
    risk: "Drives market-risk capital; volatility spikes inflate VaR and stressed-VaR add-ons.",
    cro: "When markets turn, VaR rises and consumes capital just as risk appetite should fall.",
  },
  {
    id: "cva",
    term: "Credit Valuation Adjustment",
    formal: "CVA — counterparty credit risk on derivatives",
    category: "Market",
    aliases: ["CVA", "credit valuation adjustment"],
    layman: "An adjustment for the risk that the other side of a derivative trade defaults.",
    risk: "CVA charges rise with counterparty spreads and volatility, consuming capital.",
    cro: "A volatility-sensitive capital cost that bites exactly in a risk-off move.",
  },
  {
    id: "yield-curve",
    term: "Yield Curve",
    formal: "Term structure of interest rates (e.g. 2s10s)",
    category: "Macro",
    aliases: ["yield curve", "2s10s", "curve steepening", "curve flattening", "inversion", "steeper curve"],
    layman: "A line showing interest rates from short to long maturities — its shape signals the economy's mood.",
    risk: "Steepening/flattening and inversion shift duration risk and recession signals.",
    cro: "Shapes NIM, hedging and the read on where the cycle is heading.",
  },
  {
    id: "boj-normalisation",
    term: "BOJ Normalisation",
    formal: "Bank of Japan exit from ultra-loose policy",
    category: "Japan",
    aliases: ["BOJ normalisation", "BOJ normalization", "boj policy", "policy normalisation", "yield curve control", "YCC"],
    layman: "Japan's central bank slowly ending years of near-zero rates and bond-buying.",
    risk: "Rising JGB yields and a firmer yen reshape carry, capital flows and funding globally.",
    cro: "The structural force behind the carry trade, yen funding and Japanese repatriation — central for Mizuho.",
  },
  {
    id: "jgb",
    term: "JGB Yields",
    formal: "Japanese Government Bond yields",
    category: "Japan",
    aliases: ["JGB", "JGBs", "JGB 10Y", "Japanese government bond", "japan 10y"],
    layman: "The interest rate Japan pays to borrow — the anchor for Japanese savers and global carry.",
    risk: "A higher domestic anchor weakens yen-funded carry and pulls Japanese capital home.",
    cro: "Moves here ripple straight into Mizuho's balance sheet and global funding.",
  },
  {
    id: "cre-wall",
    term: "CRE Refinancing Wall",
    formal: "Commercial real-estate maturity wall",
    category: "Credit",
    aliases: ["CRE", "commercial real estate", "refinancing wall", "CRE wall", "office loans"],
    layman: "A pile of property loans coming due that must be refinanced at today's much higher rates.",
    risk: "Higher refinancing costs lift PD for CRE-heavy lenders; forced sales reprice collateral.",
    cro: "The clearest channel through which higher-for-longer rates threaten lender balance sheets.",
  },
  {
    id: "private-credit",
    term: "Private Credit",
    formal: "Non-bank direct lending",
    category: "Credit",
    aliases: ["private credit", "private-credit", "direct lending", "fund finance"],
    layman: "Lending by funds rather than banks — fast-growing, less transparent, hard to value.",
    risk: "Opaque leverage and valuation lags make loss timing hard; exposure sits across fund finance and counterparty lines.",
    cro: "Indirect, concentrated exposure that's difficult to see — a rising supervisory focus in APAC.",
  },
  {
    id: "repatriation",
    term: "Repatriation Flows",
    formal: "Japanese capital returning home",
    category: "Japan",
    aliases: ["repatriation", "capital flows", "capital repatriation"],
    layman: "When higher home yields lure Japanese investors to sell foreign assets and bring money back.",
    risk: "Large repatriation can lift global yields and strengthen the yen, unwinding carry positions.",
    cro: "A second-order channel by which BOJ policy moves global markets and funding.",
  },
  {
    id: "stress-test",
    term: "Stress Testing",
    formal: "Scenario-based resilience analysis",
    category: "Capital",
    aliases: ["stress test", "stress testing", "scenario analysis"],
    layman: "Asking 'what if?' — modelling how the bank holds up under a severe but plausible shock.",
    risk: "Drives capital planning, buffers and risk appetite under adverse scenarios.",
    cro: "The core tool for proving the bank survives the tail — and for setting buffers.",
  },
];

const BY_ID: Record<string, Concept> = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));
export function conceptById(id: string): Concept | undefined {
  return BY_ID[id];
}

// Alias → concept id, longest-first so "duration gap" wins over "gap" etc.
const ALIAS_INDEX: { re: RegExp; id: string }[] = CONCEPTS.flatMap((c) =>
  c.aliases.map((a) => ({ alias: a, id: c.id }))
)
  .sort((a, b) => b.alias.length - a.alias.length)
  .map(({ alias, id }) => ({
    id,
    re: new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
  }));

/** Concept ids whose aliases appear anywhere in the given text. */
export function detectConcepts(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const { re, id } of ALIAS_INDEX) if (re.test(text)) found.add(id);
  return [...found];
}

export type LinkSegment = { t: string; id?: string };

/** Split text into segments, tagging spans that match a concept alias. */
export function linkifyConcepts(text: string): LinkSegment[] {
  if (!text) return [];
  const segs: LinkSegment[] = [];
  let rest = text;
  let guard = 0;
  while (rest.length && guard++ < 200) {
    let best: { index: number; len: number; id: string } | null = null;
    for (const { re, id } of ALIAS_INDEX) {
      const m = re.exec(rest);
      if (m && (best === null || m.index < best.index)) {
        best = { index: m.index, len: m[0].length, id };
      }
    }
    if (!best) {
      segs.push({ t: rest });
      break;
    }
    if (best.index > 0) segs.push({ t: rest.slice(0, best.index) });
    segs.push({ t: rest.slice(best.index, best.index + best.len), id: best.id });
    rest = rest.slice(best.index + best.len);
  }
  return segs;
}
