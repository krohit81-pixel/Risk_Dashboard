// lib/types.ts
// Shared shapes for the Global Risk Intelligence Dashboard.

export type Trend = "up" | "down" | "stable";
export type Severity = "Low" | "Moderate" | "Elevated" | "High";
export type Heat = "Green" | "Amber" | "Red";
export type RiskStatus = "Calm" | "Moderate" | "Elevated" | "High";

export type Category =
  | "Inflation"
  | "Central Banks"
  | "Markets"
  | "Credit"
  | "Geopolitics"
  | "Banking";

/** One tracked indicator with current vs previous reading. */
export interface Indicator {
  id: string;
  label: string;
  group: "Macro" | "Markets" | "Rates" | "Credit" | "Volatility" | "FX" | "Commodities" | "Japan";
  value: number | null;
  previous: number | null;
  unit: "%" | "pts" | "index" | "usd" | "yen" | "ratio";
  /** Whole-number decimals to display. */
  decimals: number;
  /** Cadence of the "change" figure. */
  cadence: "Daily" | "Monthly";
  /** Whether a rise in this indicator generally signals MORE risk. */
  riskUpIsBad: boolean;
  trend: Trend;
  live: boolean;
}

export interface Development {
  id: string;
  headline: string;
  category: Category;
  severity: Severity;
  whyItMatters: string;
  /** True when generated from live data; false when curated/editorial. */
  derived: boolean;
}

export interface EmergingRisk {
  id: string;
  name: string;
  probability: "Low" | "Medium" | "High";
  impact: "Low" | "Moderate" | "Severe";
  trend: Trend;
  note: string;
  noteLayman?: string;
}

export interface RegionHeat {
  region: string;
  flag: string;
  heat: Heat;
  reason: string;
}

export interface BankImplication {
  development: string;
  /** V4.3 — link to the Emerging Risk this implication belongs to (1:1 with EmergingRisk.id). */
  riskId?: string;
  riskName?: string;
  creditRisk: string;
  marketRisk: string;
  liquidityRisk: string;
  capital: string;
  profitability: string;
  layman?: {
    development?: string;
    creditRisk?: string;
    marketRisk?: string;
    liquidityRisk?: string;
    capital?: string;
    profitability?: string;
  };
}

export interface MorningBrief {
  status: RiskStatus;
  changeFromYesterday: string;
  /** -3 .. +3 composite; positive = risk-off / more stressed. */
  score: number;
  paragraph: string[];
  updatedISO: string;
}

/** Auto-collected usage record for a Learn-tab concept. */
export interface ConceptSeen {
  firstISO: string;   // IST date first seen in a theme
  lastISO: string;    // IST date last seen
  count: number;      // snapshots it has appeared in
  themes: string[];   // recent theme titles it appeared in (most recent first)
}

/** A single risk-relevant mover for the "What Changed Overnight" section. */
export interface OvernightChange {
  id: string;
  label: string;
  deltaText: string; // e.g. "+12 bps", "-1.2%", "$-4"
  /** Direction of RISK, not of the number: negative = risk-off/bad, positive = risk-on/good. */
  tone: "negative" | "positive" | "neutral";
}

export interface DashboardData {
  brief: MorningBrief;
  developments: Development[];
  indicators: Indicator[];
  emergingRisks: EmergingRisk[];
  heatMap: RegionHeat[];
  implications: BankImplication[];
  /** Japan deep-dive: USD/JPY, JGB 10Y, BOJ rate, Nikkei, Japan CPI. */
  japanWatch: Indicator[];
  /** Top risk-relevant movers since yesterday (data-only, always live). */
  overnight: OvernightChange[];
  /** Phase 3 — CRO intelligence layer (sections 09–13). */
  intelligence: IntelligenceLayer;
  /** Learn-tab concept library: which concepts have appeared, and where. */
  conceptSeen: Record<string, ConceptSeen>;
  /** Phase 3.1 — metadata for the daily editorial snapshot. */
  snapshotMeta: SnapshotMeta;
  anyLive: boolean;
  updatedISO: string;
  /** V4.2 — when the weekly Markets refresh (sections 03–05) was last generated, if any. */
  weeklyRefreshedISO?: string;
}

/**
 * V4.2 — frozen weekly Markets artifact. Generated once a week via Anthropic
 * (off the Gemini quota), grounded on the week's daily snapshots + live indicators.
 * The curated spine is preserved: region/id/development labels stay fixed; only the
 * ratings and reads are re-rated. Whole heat map is refreshed (severity included).
 */
export interface WeeklyMarkets {
  generatedISO: string;
  provider?: string;
  heatMap: RegionHeat[];
  emergingRisks: EmergingRisk[];
  implications: BankImplication[];
}

// ─────────────────────────────────────────────────────────────
// Phase 3 — CRO Intelligence Layer
// ─────────────────────────────────────────────────────────────

export type RiskHorizon = "Immediate" | "Medium-term" | "Structural";
export type Confidence = "High" | "Medium" | "Low";
export type RadarClass =
  | "Macro"
  | "Credit"
  | "Market"
  | "Banking"
  | "Regulatory"
  | "Strategic"
  | "Japan";
export type LensKind =
  | "CRO lens"
  | "Japan leadership lens"
  | "Risk committee lens"
  | "Global bank lens";

export interface Lens {
  kind: LensKind;
  question: string;
}

/** Live data point attached to an editorial item ("data anchors, news explains"). */
export interface DataAnchor {
  label: string;
  value: string; // frozen at generation
  change: string; // frozen at generation
  raw?: number; // numeric value at generation, for drift comparison
  live?: string; // current value at read time, only when materially drifted
  drifted?: boolean;
}

/** Single source for sections 09 (radar chips) and 10 (expanded cards). */
export type DegradeReason =
  | "ok"
  | "no_news"
  | "no_llm_key"
  | "llm_timeout"
  | "llm_invalid_json"
  | "llm_http_error"
  | "invalid_output"
  | "carried_forward";

export interface CroTheme {
  id: string;
  /** Stable taxonomy id for day-over-day matching (e.g. "carry-trade"). */
  topicId: string;
  // Radar (09)
  radarLabel: string;
  radarClass: RadarClass;
  expanded: boolean; // rendered as a full card in section 10
  // Card (10)
  category: string;
  severity: Severity;
  horizon: RiskHorizon;
  title: string;
  whyItMatters: string;
  bankingImpact: string;
  mizuho: string[];
  lenses: Lens[];
  signals: string[];
  // Learning-view only
  questions: string[];
  talkingPoint: string;
  followUp: string;
  whatToUnderstand: string;
  // Footer
  source: string;
  confidence: Confidence;
  interpretation: boolean;
  anchorId?: string;
  anchor?: DataAnchor;
  // Persistence (day-over-day continuity)
  firstSeenISO?: string; // ISO date this topic first appeared
  dayN?: number;         // days since first seen (1 = new today)
  isNew?: boolean;       // first seen today
  seenCount?: number;    // number of snapshots this topic has appeared in
  whatsNew?: string;     // V4.3 — what changed since the prior snapshot (recurring themes only)
  // "Explain simply" (retired in 3.6, kept for back-compat)
  explain?: ThemeExplain;
  // Plain-English twin (whole-screen Learning view)
  layman?: ThemeLayman;
  // v3.9 — mapping to Mizuho's published Top Risks (0..n; may be empty = no clean match)
  mizuhoAlignment?: MizuhoAlignment[];
}

/** One mapping of a theme to a Mizuho published Top Risk + scenario (AI interpretation). */
export interface MizuhoAlignment {
  riskId: string;
  riskName: string;        // resolved from the curated framework (display)
  scenarioId: string;
  scenarioLabel: string;   // resolved (display)
  confidence: Confidence;  // derived High/Med/Low
  why: string;             // transmission path FROM THIS EVENT (executive wording)
  whyLayman?: string;      // plain-English twin (Learning view)
}

/**
 * One bulleted banking-impact area (V4.1). Mirrors the curated BankImplication
 * taxonomy. Only areas that genuinely apply are emitted — no N/A padding.
 * `layman` is the per-area plain-English twin (Learning view, always generated).
 */
export interface BankingImpactArea {
  area: string;   // e.g. "Credit risk", "Market risk", "Liquidity & funding", "Capital", "Operational risk"
  impact: string; // executive prose
  layman: string; // plain-English twin (parity with the Today tab)
}

/**
 * V4.4 — personalized "What should I focus on?" item. Generated by a dedicated call
 * against the user's role/priority profile; deliberately allowed to be empty and must
 * NOT restate the institutional "Why Mizuho cares" mapping.
 */
export interface FocusItem {
  kind: "attention" | "conversation" | "learning";
  text: string;
}

/** A single Research-workspace analysis of user-supplied content (ephemeral unless saved). */
export interface ResearchAnalysis {
  title: string;
  whatHappened: string;
  whyItMatters: string;
  bankingImpact: string;               // combined string — back-compat (savedStore, alignment input)
  bankingImpactAreas?: BankingImpactArea[]; // V4.1 — bulleted areas, each with a layman twin
  mizuhoAlignment: MizuhoAlignment[]; // may be empty (no clean match)
  relatedConcepts: string[];          // ids of EXISTING curated concepts only
  focus?: FocusItem[];                // V4.4 — personalized focus (may be empty)
  layman?: {
    whatHappened: string;
    whyItMatters: string;
    bankingImpact: string;            // combined layman string — back-compat
  };
  sourceType: "text" | "url" | "image";
  originalUrl?: string;
  analyzedISO: string;
  truncated?: boolean;
  provider?: string;
}

export interface ThemeLayman {
  title?: string;
  whyItMatters?: string;
  bankingImpact?: string;
  mizuho?: string[];
  talkingPoint?: string;
  followUp?: string;
  whatToUnderstand?: string;
  questions?: string[];
  lensQuestions?: string[];
}

/** One point rendered twice: plain English, and the term a CRO would use. */
export interface ExplainPoint {
  layman: string;    // plain-English meaning, no jargon
  riskTerm: string;  // "Risk Executive Language" — names the standard term (IRRBB, ICR, PD…)
}

/** Grounded translation of a theme's own points (headline + Mizuho bullets + questions). */
export interface ThemeExplain {
  headline: string;          // one-line plain-English summary of the theme
  mizuho: ExplainPoint[];    // one per Mizuho bullet
  questions: ExplainPoint[]; // one per meeting question
}

export interface EditorialCard {
  id: string;
  category: string;
  severity: Severity;
  horizon: RiskHorizon;
  title: string;
  whatHappened: string; // sourced
  whyItMatters: string; // interpretation
  firstOrder: string;
  secondOrder: string;
  bankRiskKind: string;
  bankRisk: string;
  keyTakeaway: string;
  whatToUnderstand: string; // learning
  source: string;
  confidence: Confidence;
  anchorId?: string;
  anchor?: DataAnchor;
  layman?: EditorialLayman;
  // Persistence (day-over-day continuity)
  firstSeenISO?: string;
  dayN?: number;
  isNew?: boolean;
  seenCount?: number;
}

export interface EditorialLayman {
  title?: string;
  whatHappened?: string;
  whyItMatters?: string;
  firstOrder?: string;
  secondOrder?: string;
  keyTakeaway?: string;
  whatToUnderstand?: string;
}

export interface JapanAsiaWatch {
  horizon: RiskHorizon;
  narrative: string;
  mizuho: string[];
  lens: Lens;
  signals: string[];
  questions: string[];
  whatToUnderstand: string;
  source: string;
  confidence: Confidence;
  interpretation: boolean;
  layman?: JapanLayman;
  /** True when no genuine Japan news existed — render only the narrative line. */
  empty?: boolean;
}

export interface JapanLayman {
  narrative?: string;
  mizuho?: string[];
  questions?: string[];
  whatToUnderstand?: string;
}

export interface WeeklyLearning {
  keyLessons: string[];
  conceptsLearned: string[];
  questionsNextWeek: string[];
}

export interface RadarItem {
  title: string;
  source: string;
  url?: string;
  lens?: string; // us | macro | japan | europe
}

export interface IntelligenceLayer {
  /** Single ranked theme set powering both radar (09) and conversation (10). */
  themes: CroTheme[];
  expandedCount: number;
  editorial: EditorialCard[];
  japanAsia: JapanAsiaWatch;
  weekly: WeeklyLearning;
  /** Headline-only breadth — developments without full editorial treatment. */
  radar: RadarItem[];
  /** True when any theme/editorial item came from a live news adapter. */
  liveNews: boolean;
  generatedISO: string;
}

// ── Phase 3.1: scheduled snapshot metadata ──

export type SnapshotSlot = "morning" | "evening";
export type NewsVolume = "normal" | "light";

export interface CoverageItem {
  topic: string;
  covered: boolean;
}

export interface SnapshotMeta {
  generatedISO: string;
  slot: SnapshotSlot;
  slotLabel: string;          // "Morning briefing" | "Evening update"
  /** Which LLM actually wrote this snapshot (or "none" for curated). */
  llmProvider?: "gemini" | "anthropic" | "none";
  sources: string[];
  articlesReviewed: number;
  themesGenerated: number;
  confidence: Confidence;     // overall briefing confidence
  coverage: CoverageItem[];
  stale: boolean;             // serving a previous snapshot after a failure
  newsVolume: NewsVolume;
  carriedForward: boolean;    // low-news: important themes carried forward
  seed: boolean;              // curated seed (no live news/LLM configured)
  /** Why the briefing is degraded/curated, when applicable. */
  degradeReason?: DegradeReason;
}

/** What the cron generates and persists; the dashboard reads this back. */
export interface EditorialSnapshot {
  intelligence: IntelligenceLayer;
  meta: SnapshotMeta;
}
