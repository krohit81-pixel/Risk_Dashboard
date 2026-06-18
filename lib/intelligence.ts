// lib/intelligence.ts
// The CRO intelligence layer (sections 09–13). Content is the curated
// "interpretation" layer — clearly tagged and confidence-rated — matching the
// final prototype. When a news adapter is wired (lib/newsAdapter.ts), live
// stories would replace these via the same shapes.
//
// CRITICAL BUILD RULE: sections 09 (radar) and 10 (conversation) draw from ONE
// theme set (THEMES below). The radar lists every theme as a chip; section 10
// expands those flagged `expanded`. They can never drift.

import type {
  CroTheme,
  EditorialCard,
  Indicator,
  IntelligenceLayer,
  JapanAsiaWatch,
  WeeklyLearning,
  DataAnchor,
} from "./types";

// ── Single ranked theme set (rank order = significance, not popularity) ──
const THEMES: CroTheme[] = [
  {
    id: "th-carry",
    topicId: "boj-normalisation",
    radarLabel: "BOJ normalisation",
    radarClass: "Japan",
    expanded: true,
    category: "Japan",
    severity: "Elevated",
    horizon: "Structural",
    title: "Rising JGB yields strain the global carry trade",
    whyItMatters:
      "A higher domestic anchor weakens the yen-funded carry that quietly supports global risk assets.",
    bankingImpact:
      "A carry unwind can force simultaneous repricing across rates, FX and funding books.",
    mizuho: [
      "Rising JGB yields affect Japanese balance sheets.",
      "Funding dynamics may shift.",
      "Capital flows and repatriation may change.",
      "Japanese institutional investor behaviour may evolve.",
    ],
    lenses: [
      { kind: "Japan leadership lens", question: "what does this imply for Japanese funding, rates and capital flows?" },
      { kind: "Global bank lens", question: "where would a carry unwind hit our cross-border funding?" },
    ],
    signals: ["Japan 10Y JGB", "BOJ meetings", "USD/JPY", "Nikkei 225"],
    questions: [
      "Which businesses are exposed to yen funding?",
      "How resilient are the hedges?",
      "What happens if Japanese investors repatriate capital?",
    ],
    talkingPoint:
      "JGB yields are rising as BOJ normalisation proceeds. The risk isn't the level itself but a disorderly carry unwind that could reprice rates, FX and funding together.",
    followUp: "How resilient are our yen-funding hedges to a faster-than-expected BOJ path?",
    whatToUnderstand:
      "When Japanese government bonds pay more, Japanese investors have less reason to send money abroad — which can pull capital home and unsettle markets that relied on cheap yen.",
    source: "Nikkei (sample)",
    confidence: "High",
    interpretation: true,
    anchorId: "jgb10y",
  },
  {
    id: "th-inflation",
    topicId: "services-inflation",
    radarLabel: "Higher-for-longer rates",
    radarClass: "Macro",
    expanded: true,
    category: "Inflation",
    severity: "Elevated",
    horizon: "Medium-term",
    title: "Sticky services inflation pushes rate cuts further out",
    whyItMatters:
      "The services component is the holdout, trimming odds of near-term easing.",
    bankingImpact:
      "Higher-for-longer extends refinancing pressure on leveraged and CRE borrowers.",
    mizuho: [
      "Sustained higher USD rates keep global funding costs elevated.",
      "Pressure on dollar funding books.",
      "Refinancing stress among cross-border borrowers.",
    ],
    lenses: [
      { kind: "CRO lens", question: "which portfolios are most exposed to refinancing risk?" },
      { kind: "Risk committee lens", question: "does this alter the outlook or require enhanced monitoring?" },
    ],
    signals: ["Next CPI release", "Core CPI", "Wage growth", "Services inflation"],
    questions: [
      "Which portfolios face refinancing pressure?",
      "Which sectors are most vulnerable?",
      "What is our downside if rates stay higher for longer?",
    ],
    talkingPoint:
      "Inflation remains sticky, driven by services, and continues to support a higher-for-longer rate environment that pressures refinancing-sensitive borrowers.",
    followUp: "Are we seeing evidence of refinancing stress emerging in specific sectors?",
    whatToUnderstand:
      "Prices for services — rent, wages, insurance — are stubborn, so the Fed is slower to cut rates, keeping borrowing costs high for companies that need to refinance.",
    source: "Marketaux · 4-story cluster",
    confidence: "High",
    interpretation: true,
    anchorId: "cpi",
  },
  {
    id: "th-privatecredit",
    topicId: "private-credit",
    radarLabel: "Private-credit transparency",
    radarClass: "Regulatory",
    expanded: true,
    category: "Credit",
    severity: "Moderate",
    horizon: "Structural",
    title: "Supervisors signal closer scrutiny of private-credit leverage",
    whyItMatters:
      "A regulatory commentary flagged limited transparency in private-credit fund leverage.",
    bankingImpact:
      "Opaque leverage makes loss timing hard to gauge; exposure may sit across lending, fund finance and counterparty lines.",
    mizuho: [
      "Indirect exposure via fund finance and counterparty lines.",
      "APAC private-credit growth is accelerating.",
      "May influence regional credit conditions.",
    ],
    lenses: [
      { kind: "Risk committee lens", question: "do we have a clear view of indirect private-credit exposure?" },
      { kind: "Global bank lens", question: "how concentrated is our counterparty risk to these funds?" },
    ],
    signals: ["Regulatory commentary", "Credit spreads", "Fund defaults", "Fund finance activity"],
    questions: [
      "What is our direct and indirect private-credit exposure?",
      "Are fund valuations stale?",
      "Where would stress show up first?",
    ],
    talkingPoint:
      "Regulators are signalling closer scrutiny of private-credit leverage. The concern is transparency — losses may surface late, so indirect exposure is worth confirming.",
    followUp:
      "Do we have a consolidated view of indirect private-credit exposure across lending and counterparty lines?",
    whatToUnderstand:
      "Private-credit funds lend outside public markets, so their borrowing and losses are harder to see — problems can build quietly before they surface.",
    source: "GNews cluster",
    confidence: "Medium",
    interpretation: true,
  },
  // Radar-only themes (covered as editorial / emerging risks, not expanded).
  {
    id: "th-cre",
    topicId: "cre-refinancing",
    radarLabel: "CRE refinancing wall",
    radarClass: "Credit",
    expanded: false,
    category: "Banking",
    severity: "Moderate",
    horizon: "Medium-term",
    title: "CRE refinancing wall approaches at higher rates",
    whyItMatters: "",
    bankingImpact: "",
    mizuho: [],
    lenses: [],
    signals: [],
    questions: [],
    talkingPoint: "",
    followUp: "",
    whatToUnderstand: "",
    source: "Marketaux cluster",
    confidence: "Medium",
    interpretation: true,
  },
  {
    id: "th-geo",
    topicId: "geopolitical-tail",
    radarLabel: "Geopolitical tail risk",
    radarClass: "Macro",
    expanded: false,
    category: "Geopolitics",
    severity: "Elevated",
    horizon: "Immediate",
    title: "Geopolitical tail risk",
    whyItMatters: "",
    bankingImpact: "",
    mizuho: [],
    lenses: [],
    signals: [],
    questions: [],
    talkingPoint: "",
    followUp: "",
    whatToUnderstand: "",
    source: "",
    confidence: "Medium",
    interpretation: true,
  },
];

// ── Editorial intelligence cards (section 11) — lean, < 30s read ──
const EDITORIAL: EditorialCard[] = [
  {
    id: "ed-auction",
    category: "Markets",
    severity: "Elevated",
    horizon: "Immediate",
    title: "Long-end Treasuries sell off after a soft 10Y auction",
    whatHappened:
      "The 10Y reopening drew weak demand and tailed; the 10Y yield rose on the day.",
    whyItMatters:
      "Thin auction demand suggests investors want more term premium to hold duration.",
    firstOrder: "Higher long-end yields, steeper term premium.",
    secondOrder: "AFS mark-to-market losses, tighter financial conditions.",
    bankRiskKind: "Market Risk",
    bankRisk: "Duration and AFS books take mark-to-market hits; CET1 buffers feel it.",
    keyTakeaway:
      "Investors are demanding more compensation to hold long-term government debt, pushing yields higher and pressuring bank bond portfolios.",
    whatToUnderstand:
      "A weak auction means buyers were scarce, so the Treasury had to offer higher yields — and the bonds banks already hold lose value as a result.",
    source: "Finnhub",
    confidence: "High",
    anchorId: "ust10y",
  },
  {
    id: "ed-cre",
    category: "Banking",
    severity: "Moderate",
    horizon: "Medium-term",
    title: "CRE refinancing wall approaches at higher rates",
    whatHappened:
      "Several large office loans near maturity face refinancing at sharply higher rates.",
    whyItMatters: "Higher refinancing costs raise default risk for CRE-heavy lenders.",
    firstOrder: "Higher refinancing costs for office owners.",
    secondOrder: "Pressure on regional lenders; forced sales reprice collateral.",
    bankRiskKind: "Credit Risk",
    bankRisk: "Concentrated CRE and regional-lender exposure.",
    keyTakeaway:
      "The CRE refinancing wall is the channel through which higher-for-longer rates most directly threaten lender balance sheets.",
    whatToUnderstand:
      "Office loans taken out when rates were low must now refinance at today's higher rates — many borrowers can't afford it, raising default risk.",
    source: "Marketaux cluster",
    confidence: "Medium",
  },
];

const JAPAN_ASIA: JapanAsiaWatch = {
  horizon: "Structural",
  narrative:
    "BOJ normalisation remains the dominant regional theme. Rising JGB yields and a firmer yen could alter capital flows, funding dynamics and carry-trade positioning globally. China's soft demand adds a second drag on regional growth, keeping APAC firmly in watch territory.",
  mizuho: [
    "Directly shapes Japanese funding, rates and capital-flow conditions.",
    "China weakness affects APAC corporate clients and trade finance.",
    "May influence Japanese export demand and regional credit.",
  ],
  lens: {
    kind: "Japan leadership lens",
    question: "what does this imply for Japanese funding, rates and capital flows?",
  },
  signals: ["Japan 10Y JGB", "BOJ policy meetings", "USD/JPY", "Nikkei 225", "China demand data"],
  questions: [
    "How exposed are we to yen funding and JGB duration?",
    "What is the group-wide FX sensitivity?",
    "How would repatriation flows hit our books?",
  ],
  whatToUnderstand:
    "Japan stepping away from ultra-low rates after decades is a structural shift — it changes where global money flows and can ripple into funding costs everywhere.",
  source: "Nikkei (sample)",
  confidence: "High",
  interpretation: true,
};

const WEEKLY: WeeklyLearning = {
  keyLessons: [
    "Credit spreads often provide earlier warning signals than equity markets.",
    "BOJ normalisation has global funding implications well beyond Japan.",
    "CRE refinancing remains one of the clearest transmission channels for higher rates.",
  ],
  conceptsLearned: ["Carry trade", "Term premium", "Duration risk"],
  questionsNextWeek: ["Private credit", "Regional-bank exposure", "JGB market structure"],
};

// ── Data anchor: pull the live value + change for an indicator id ──
export function formatIndicatorValue(i: Indicator): string {
  if (i.value == null) return "—";
  return i.unit === "%" ? `${i.value.toFixed(i.decimals)}%`
    : i.unit === "usd" ? `$${i.value.toLocaleString("en-US", { maximumFractionDigits: i.decimals })}`
    : i.unit === "yen" ? `¥${i.value.toFixed(i.decimals)}`
    : i.value.toLocaleString("en-US", { maximumFractionDigits: i.decimals });
}

export function anchorFor(id: string | undefined, indicators: Indicator[]): DataAnchor | undefined {
  if (!id) return undefined;
  const i = indicators.find((x) => x.id === id);
  if (!i || i.value == null) return undefined;
  let change = "—";
  if (i.previous != null) {
    const d = i.value - i.previous;
    change = i.unit === "%"
      ? `${d >= 0 ? "+" : ""}${Math.round(d * 100)} bps`
      : `${d >= 0 ? "+" : ""}${d.toFixed(i.decimals)}`;
  }
  return { label: i.label, value: formatIndicatorValue(i), change, raw: i.value };
}

/**
 * Assemble the intelligence layer, attaching live data anchors so editorial
 * interpretation is pinned to the data spine ("data anchors, news explains").
 */
export function buildIntelligence(
  indicators: Indicator[],
  liveNews: boolean
): IntelligenceLayer {
  const themes = THEMES.map((t) => ({ ...t, anchor: anchorFor(t.anchorId, indicators) }));
  const editorial = EDITORIAL.map((e) => ({ ...e, anchor: anchorFor(e.anchorId, indicators) }));
  return {
    themes,
    expandedCount: themes.filter((t) => t.expanded).length,
    editorial,
    japanAsia: JAPAN_ASIA,
    weekly: WEEKLY,
    liveNews,
    generatedISO: new Date().toISOString(),
  };
}
