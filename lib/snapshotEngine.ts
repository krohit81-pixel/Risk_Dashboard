// lib/snapshotEngine.ts
// Builds an EditorialSnapshot. The cron calls generateSnapshot() (which may use
// live news + LLM). The dashboard read path uses curatedSnapshot() as a seed and
// attachLiveDrift() to compare frozen anchors against current data. The read path
// never calls news/LLM.

import type {
  Confidence,
  CoverageItem,
  CroTheme,
  EditorialCard,
  RadarItem,
  MizuhoAlignment,
  ExplainPoint,
  EditorialSnapshot,
  IntelligenceLayer,
  Indicator,
  SnapshotMeta,
  SnapshotSlot,
} from "./types";
import { buildIntelligence, formatIndicatorValue } from "./intelligence";
import {
  slotLabel,
  istDateKey,
  recordTopicsSeen,
  recordConceptsSeen,
  normalizeTopicId,
  daysBetween,
  getLatestSnapshot,
} from "./snapshotStore";
import { ADAPTERS, relevanceScore, sourceTierOf, hasCroSignal, isJunk, type RawStory } from "./newsAdapter";
import { detectConcepts } from "./concepts";
import { lensFor } from "./relevanceConfig";
import { topRisksForPrompt, scenarioById, topRiskById } from "./mizuhoTopRisks";
import { interpretWithProvider, llmAvailable, CRO_SYSTEM_PROMPT, type LlmReason } from "./llm";
import type { DegradeReason } from "./types";

const COVERAGE_TOPICS: { topic: string; keywords: string[] }[] = [
  { topic: "Inflation", keywords: ["inflation", "cpi", "prices"] },
  { topic: "Central Banks", keywords: ["fed", "boj", "ecb", "rate cut", "policy rate", "central bank", "normalisation"] },
  { topic: "Credit", keywords: ["credit", "spread", "high-yield", "high yield", "private credit", "default"] },
  { topic: "Banking", keywords: ["bank", "lender", "cre", "refinanc", "deposit", "capital", "afs"] },
  { topic: "Geopolitics", keywords: ["geopolit", "conflict", "tariff", "sanction", "energy price"] },
  { topic: "Japan", keywords: ["japan", "jgb", "yen", "boj", "nikkei", "carry"] },
  { topic: "China", keywords: ["china", "apac", "property"] },
];

function coverageFor(intel: IntelligenceLayer): CoverageItem[] {
  const corpus = [
    ...intel.themes.flatMap((t) => [t.title, t.whyItMatters, t.bankingImpact, t.category, ...t.mizuho]),
    ...intel.editorial.flatMap((e) => [e.title, e.whatHappened, e.whyItMatters, e.category]),
    intel.japanAsia.narrative,
  ]
    .join(" ")
    .toLowerCase();
  return COVERAGE_TOPICS.map(({ topic, keywords }) => ({
    topic,
    covered: keywords.some((k) => corpus.includes(k)),
  }));
}

/** Overall briefing confidence — derived, never guessed. Seed is capped at Medium. */
function overallConfidence(themes: CroTheme[], seed: boolean): Confidence {
  if (seed) return "Medium";
  const expanded = themes.filter((t) => t.expanded);
  const high = expanded.filter((t) => t.confidence === "High").length;
  if (high >= 2) return "High";
  if (expanded.some((t) => t.confidence !== "Low")) return "Medium";
  return "Low";
}

function baseMeta(
  slot: SnapshotSlot,
  intel: IntelligenceLayer,
  seed: boolean
): SnapshotMeta {
  return {
    generatedISO: new Date().toISOString(),
    slot,
    slotLabel: slotLabel(slot),
    sources: seed ? ["Curated baseline"] : [],
    articlesReviewed: 0,
    themesGenerated: intel.themes.length,
    confidence: overallConfidence(intel.themes, seed),
    coverage: coverageFor(intel),
    stale: false,
    newsVolume: "normal",
    carriedForward: false,
    seed,
  };
}

/** Cheap, no-network curated snapshot — the seed used on read and as fallback. */
export function curatedSnapshot(slot: SnapshotSlot, indicators: Indicator[]): EditorialSnapshot {
  const intelligence = buildIntelligence(indicators, false);
  return { intelligence, meta: baseMeta(slot, intelligence, true) };
}

// ── News pipeline (cron only) ──

async function ingest(): Promise<RawStory[]> {
  // All adapters in parallel; a slow/failed source can't stall the others.
  const settled = await Promise.all(ADAPTERS.map((a) => a.fetchRaw().catch(() => null)));
  const all = settled.flatMap((r) => r ?? []);
  // Root-cause clean: drop non-financial noise (entertainment/sports/crime/lifestyle)
  // here, so neither themes nor the radar can ever surface it.
  const cleaned = all.filter((s) => !isJunk(s));
  console.log(`[gen] ingest: ${all.length} raw → ${cleaned.length} after junk filter`);
  return cleaned;
}

function dedupe(stories: RawStory[]): RawStory[] {
  const seen = new Set<string>();
  const out: RawStory[] = [];
  for (const s of stories) {
    const k = s.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 60);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out;
}

interface Cluster {
  topic: string;
  stories: RawStory[];
  score: number;
}

function clusterAndScore(stories: RawStory[]): Cluster[] {
  const buckets = new Map<string, RawStory[]>();
  for (const s of stories) {
    const text = `${s.title} ${s.summary}`.toLowerCase();
    const match = COVERAGE_TOPICS.find((t) => t.keywords.some((k) => text.includes(k)));
    const topic = match ? match.topic : "Other";
    buckets.set(topic, [...(buckets.get(topic) ?? []), s]);
  }
  return [...buckets.entries()]
    .map(([topic, group]) => ({
      topic,
      stories: group,
      score: group.reduce((a, s) => a + relevanceScore(s), 0),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Word-set overlap of two titles (0..1), for cross-section de-duplication. */
function titleOverlap(a: string, b: string): number {
  const words = (s: string) =>
    new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size);
}

/** Ask the LLM to interpret clusters into the intelligence shape (grounded). */
async function interpretClusters(
  clusters: Cluster[],
  indicators: Indicator[]
): Promise<{ intel: IntelligenceLayer | null; provider: "gemini" | "anthropic" | "none"; reason: LlmReason }> {
  const payload = clusters.slice(0, 5).map((c) => ({
    topic: c.topic,
    sources: [...new Set(c.stories.map((s) => s.source))],
    stories: c.stories.slice(0, 3).map((s) => ({ title: s.title, summary: s.summary })),
  }));

  const JP = ["japan", "boj", "jgb", "yen", "nikkei", "tokyo"];
  const hasJapanNews = clusters.some((c) =>
    c.stories.some((s) => {
      const t = `${s.title} ${s.summary}`.toLowerCase();
      return JP.some((k) => t.includes(k));
    })
  );

  const japanSchema = hasJapanNews
    ? `,\n  "japanAsia": { "horizon", "narrative", "mizuho" (3 strings), "lens": {"kind","question"}, "signals" (3-5 strings), "questions" (3 strings), "whatToUnderstand", "source", "confidence", "interpretation": true }`
    : "";

  const user = `Story clusters (interpret ONLY these — do not add facts):
${JSON.stringify(payload, null, 2)}

Return ONE JSON object with this exact shape (no prose outside the JSON):
{
  "themes": [ { "id", "topicId", "radarLabel", "radarClass" (Market|Strategic|Credit|Regulatory|Banking|Macro|Japan), "expanded": true, "category", "severity" (Low|Moderate|Elevated|High), "horizon" (Immediate|Medium-term|Structural), "title", "whyItMatters", "bankingImpact", "mizuho" (3-4 strings), "mizuhoRisks" (0-2 of { "riskId", "scenarioId", "confidence" (High|Medium|Low) }), "lenses" [ { "kind", "question" } ], "signals" (3-4 strings), "questions" (3 strings), "talkingPoint", "followUp", "whatToUnderstand", "source", "confidence", "interpretation": true } ],
  "editorial": [ { "id", "category", "severity", "horizon", "title", "whatHappened", "whyItMatters", "firstOrder", "secondOrder", "bankRiskKind", "bankRisk", "keyTakeaway", "whatToUnderstand", "source", "confidence" } ]${japanSchema}
}
Rules:
- 3-5 themes (all expanded), 1-2 editorial cards${hasJapanNews ? ", one japanAsia object built ONLY from Japan/BOJ/yen/JGB/Nikkei stories" : ""}.
- Each story cluster may anchor only ONE output item. Do NOT repeat the same development across a theme and an editorial card — editorial cards MUST cover different stories than the themes.
- PRIORITISATION: the reader is onboarding with Mizuho **Americas**. Rank US-relevant developments FIRST — Federal Reserve / FOMC, the Treasury market and funding (issuance, repo/SOFR, liquidity), US credit (IG/HY spreads, private credit, leveraged loans/CLOs), the US banking sector (regional-bank stress, CRE, deposits, capital — SLR / Basel III endgame), US capital markets and US regulation (Fed/OCC/FDIC). Favour US banking/credit/regulatory specificity over generic US macro headlines. Keep Japan/BOJ/JGB/USDJPY developments as important secondary context (they also surface in the dedicated Japan section). Europe/EMEA is tertiary for now.
- Rank by CRO relevance, not popularity. Keep each field concise. JSON only.

MIZUHO TOP RISKS — for each theme, set "mizuhoRisks" by tagging 0-2 of the scenarios below that this theme would most plausibly travel down. Use ONLY these exact ids; never invent a risk or scenario. If none fit cleanly, use an empty array [] — a no-match is correct and expected. Do not write any explanation; just the ids + confidence.
${topRisksForPrompt()}`;

  const { data: out, provider, reason } = await interpretWithProvider<Partial<IntelligenceLayer>>(
    CRO_SYSTEM_PROMPT,
    user
  );
  if (!out || !Array.isArray(out.themes) || out.themes.length < 3) {
    // data came back but was unusable → treat as invalid JSON for retry/visibility
    return { intel: null, provider, reason: reason === "ok" ? "invalid_json" : reason };
  }

  // Re-anchor numbers to the live data spine (the model must not invent numbers).
  const ANCHOR_BY_TOPIC: Record<string, string> = {
    "boj-normalisation": "jgb10y",
    "services-inflation": "cpi",
    "higher-for-longer": "cpi",
    "treasury-supply": "ust10y",
    "credit-spreads": "hyspread",
  };

  // Distinct sources across all clusters → used to DERIVE confidence (not trust the model).
  const sourceCount = new Set(clusters.flatMap((c) => c.stories.map((s) => s.source))).size;

  let alignMapped = 0;
  let alignDropped = 0;
  const themes = (out.themes as (CroTheme & { mizuhoRisks?: { riskId: string; scenarioId: string; confidence: string }[] })[]).map((t) => {
    const anchorId = ANCHOR_BY_TOPIC[t.topicId];
    const anchor = anchorFromIndicators(anchorId, indicators);
    // Derived confidence: anchored + multi-source = High; single-source/no-anchor = Medium.
    const confidence = anchor && sourceCount >= 2 ? "High" : sourceCount >= 1 ? "Medium" : "Low";
    // Resolve simple Mizuho tags → alignments. The "why" is the CURATED scenario path
    // (accurate, no hallucination); plain-English twin is the curated pathLayman.
    const tags = Array.isArray(t.mizuhoRisks) ? t.mizuhoRisks.slice(0, 2) : [];
    const mizuhoAlignment: MizuhoAlignment[] = [];
    for (const m of tags) {
      const risk = topRiskById(m.riskId);
      const scenario = scenarioById(m.riskId, m.scenarioId);
      if (!risk || !scenario) {
        alignDropped++;
        continue;
      }
      mizuhoAlignment.push({
        riskId: m.riskId,
        riskName: risk.name,
        scenarioId: m.scenarioId,
        scenarioLabel: scenario.label,
        confidence: normalizeConfidence(m.confidence),
        why: scenario.path,
        whyLayman: scenario.pathLayman,
      });
    }
    alignMapped += mizuhoAlignment.length;
    const { mizuhoRisks: _drop, ...rest } = t;
    return { ...rest, anchorId, anchor, confidence: confidence as CroTheme["confidence"], mizuhoAlignment } as CroTheme;
  });
  console.log(`[gen] mizuho tagging: ${alignMapped} mapped, ${alignDropped} rejected (invalid ids)`);

  // Fall back to curated for any section the model didn't supply, so the UI stays complete.
  const curated = buildIntelligence(indicators, true);

  // Editorial: drop cards that duplicate a theme (title overlap); curated fallback if none remain.
  const themeTitles = themes.map((t) => t.title);
  const rawEditorial = Array.isArray(out.editorial)
    ? (out.editorial as IntelligenceLayer["editorial"])
    : [];
  const dedupedEditorial = rawEditorial.filter(
    (e) => e.title && !themeTitles.some((tt) => titleOverlap(e.title, tt) > 0.5)
  );
  const editorial = dedupedEditorial.length ? dedupedEditorial : curated.editorial;

  // Japan: use model output ONLY when genuine Japan news existed; else curated narrative.
  // Guard against a degenerate model object (narrative says "no news" / fields are N/A):
  // collapse it to a clean empty card so the UI shows just the one explanatory line.
  let japanAsia =
    hasJapanNews && out.japanAsia
      ? (out.japanAsia as IntelligenceLayer["japanAsia"])
      : curated.japanAsia;

  const looksEmpty =
    !hasJapanNews ||
    /no specific japan/i.test(japanAsia.narrative || "") ||
    (japanAsia.mizuho ?? []).every((m) => !m || /^n\/?a$/i.test(m.trim()));

  if (looksEmpty) {
    japanAsia = {
      horizon: "Structural",
      narrative: "No specific Japan-related developments in today's sources.",
      mizuho: [],
      lens: { kind: "Japan leadership lens", question: "" },
      signals: [],
      questions: [],
      whatToUnderstand: "",
      source: "No Japan-specific sources today",
      confidence: "Low",
      interpretation: true,
      empty: true,
    };
  }

  const intel: IntelligenceLayer = {
    themes,
    expandedCount: themes.filter((t) => t.expanded).length,
    editorial,
    japanAsia,
    radar: buildRadar(clusters, themes, editorial),
    weekly: curated.weekly, // weekly handled separately (Monday job / curated)
    liveNews: true,
    generatedISO: new Date().toISOString(),
  };
  return { intel, provider, reason: "ok" };
}

/**
 * "Also on the Radar" — high-relevance developments that NARROWLY MISSED becoming
 * full themes. Not a leftover bin: each item must clear a relevance floor, come from
 * a credible source, carry a genuine CRO signal, and classify into a real lens.
 * Unclassifiable / low-quality / junk items are dropped, not defaulted. Quality wins
 * over quantity — if nothing clears the bar, the radar is empty.
 */
function buildRadar(clusters: Cluster[], themes: CroTheme[], editorial: EditorialCard[]): RadarItem[] {
  const RELEVANCE_FLOOR = 3; // must be a real near-miss, not filler
  const shown = [...themes.map((t) => t.title), ...editorial.map((e) => e.title)];
  const isDup = (title: string) => shown.some((s) => titleOverlap(s, title) > 0.5);

  // Candidates = stories from clusters that did NOT anchor a theme (skip top 3).
  const candidates: { story: { title: string; summary: string; source: string; url: string }; score: number; lens: string }[] = [];
  for (const c of clusters.slice(3)) {
    for (const s of c.stories) {
      if (!s?.title) continue;
      const text = `${s.title} ${s.summary}`;
      const score = relevanceScore(s as any);
      const tier = sourceTierOf(s.source);
      const lens = lensFor(text);
      const classified = lens !== "macro" || hasCroSignal(text); // don't default junk to "macro"
      if (score < RELEVANCE_FLOOR) continue; // below near-miss bar
      if (tier < 0) continue; // low-quality source
      if (!hasCroSignal(text)) continue; // must carry a real CRO/financial signal
      if (!classified) continue;
      candidates.push({ story: s, score, lens });
    }
  }

  // Best first; de-dupe by lead headline and against shown items; cap small.
  candidates.sort((a, b) => b.score - a.score);
  const out: RadarItem[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const key = c.story.title.toLowerCase().slice(0, 50);
    if (seen.has(key) || isDup(c.story.title)) continue;
    seen.add(key);
    out.push({ title: c.story.title, source: c.story.source, url: c.story.url || undefined, lens: c.lens });
    if (out.length >= 4) break; // fewer, higher quality
  }
  return out;
}

function anchorFromIndicators(id: string | undefined, indicators: Indicator[]) {
  if (!id) return undefined;
  const i = indicators.find((x) => x.id === id);
  if (!i || i.value == null) return undefined;
  let change = "—";
  if (i.previous != null) {
    const d = i.value - i.previous;
    change = i.unit === "%" ? `${d >= 0 ? "+" : ""}${Math.round(d * 100)} bps` : `${d >= 0 ? "+" : ""}${d.toFixed(i.decimals)}`;
  }
  return { label: i.label, value: formatIndicatorValue(i), change, raw: i.value };
}

/**
 * "Explain simply" — a grounded translation layer. Takes themes that were ALREADY
 * generated and rewrites each theme's headline + Mizuho bullets + meeting questions
 * into (a) plain-English Layman's Meaning and (b) Risk Executive Language that names
 * the standard term a CRO would use. It must NOT add new facts — only re-express the
 * supplied points. Isolated from theme generation so a failure here can't break the
 * briefing; on any failure the themes simply render without an Explain view.
 */
async function explainThemes(themes: CroTheme[]): Promise<void> {
  const expanded = themes.filter((t) => t.expanded);
  if (!expanded.length) return;

  const payload = expanded.map((t, i) => ({
    i,
    title: t.title,
    mizuho: t.mizuho ?? [],
    questions: (t.lenses ?? []).map((l) => l.question).filter(Boolean),
  }));

  const system =
    "You translate existing risk-briefing points into two registers for a risk leader who is still learning. " +
    "For each point give: (1) \"layman\" — plain English, no jargon, what it means in everyday terms; and " +
    "(2) \"riskTerm\" — the Risk Executive Language a CRO would use, naming the standard, well-established risk " +
    "term ONLY if it genuinely applies (e.g. IRRBB, duration gap, ICR, PD, LGD, NPL, mark-to-market volatility, " +
    "AFS, CET1, liquidity coverage). If no standard term clearly applies, keep riskTerm plain and do NOT invent one. " +
    "Do NOT add new facts — only re-express the points you are given. Be concise. JSON only.";

  const user = `Themes (re-express ONLY these points):
${JSON.stringify(payload, null, 2)}

Return ONE JSON object:
{ "explain": [ { "i": <index>, "headline": "<one-line plain-English summary of the theme>",
  "mizuho": [ { "layman": "...", "riskTerm": "..." } ],
  "questions": [ { "layman": "...", "riskTerm": "..." } ] } ] }
- One mizuho entry per supplied Mizuho bullet, one questions entry per supplied question, in order.
- headline: a single plain sentence a non-expert would understand. JSON only, no prose outside it.`;

  const { data, reason } = await interpretWithProvider<{
    explain: { i: number; headline: string; mizuho: ExplainPoint[]; questions: ExplainPoint[] }[];
  }>(system, user);

  if (!data || !Array.isArray(data.explain)) {
    console.log(`[gen] explain skipped (reason=${reason})`);
    return;
  }
  for (const e of data.explain) {
    const t = expanded[e.i];
    if (!t) continue;
    t.explain = {
      headline: e.headline ?? "",
      mizuho: Array.isArray(e.mizuho) ? e.mizuho : [],
      questions: Array.isArray(e.questions) ? e.questions : [],
    };
  }
  console.log(`[gen] explain attached to ${data.explain.length} themes`);
}

/**
 * Whole-screen plain-English layer (3.6). Takes the freshly generated themes,
 * editorial cards and Japan narrative and rewrites every prose field into simple
 * layman language — a grounded translation (same facts, no jargon). Stored as a
 * parallel `layman` twin per item so Learning view can swap the whole screen
 * instantly. Isolated: if it fails, Learning view falls back to the original text.
 */
async function translateLayman(intel: IntelligenceLayer): Promise<void> {
  const items: { k: string; t: string }[] = [];
  const push = (k: string, t?: string) => {
    if (t && t.trim()) items.push({ k, t });
  };

  const themes = intel.themes.filter((t) => t.expanded);
  themes.forEach((t, i) => {
    push(`T${i}.title`, t.title);
    push(`T${i}.why`, t.whyItMatters);
    push(`T${i}.imp`, t.bankingImpact);
    (t.mizuho ?? []).forEach((m, j) => push(`T${i}.mz${j}`, m));
    push(`T${i}.tp`, t.talkingPoint);
    push(`T${i}.fu`, t.followUp);
    push(`T${i}.wtu`, t.whatToUnderstand);
    (t.questions ?? []).forEach((q, j) => push(`T${i}.q${j}`, q));
    (t.lenses ?? []).forEach((l, j) => push(`T${i}.lq${j}`, l.question));
  });
  (intel.editorial ?? []).forEach((e, i) => {
    push(`E${i}.title`, e.title);
    push(`E${i}.wh`, e.whatHappened);
    push(`E${i}.why`, e.whyItMatters);
    push(`E${i}.fo`, e.firstOrder);
    push(`E${i}.so`, e.secondOrder);
    push(`E${i}.key`, e.keyTakeaway);
    push(`E${i}.wtu`, e.whatToUnderstand);
  });
  if (intel.japanAsia) {
    push(`J.narr`, intel.japanAsia.narrative);
    (intel.japanAsia.mizuho ?? []).forEach((m, j) => push(`J.mz${j}`, m));
    (intel.japanAsia.questions ?? []).forEach((q, j) => push(`J.q${j}`, q));
    push(`J.wtu`, intel.japanAsia.whatToUnderstand);
  }
  if (!items.length) return;

  const system =
    "You rewrite risk-briefing text into plain English for an intelligent reader who is NEW to finance and risk. " +
    "For each item, keep ALL the facts and numbers, but remove jargon — or if a technical term is essential, explain it in a few words inline. " +
    "Short, clear, concrete sentences. Do not add new facts or opinions. Return JSON only.";
  const user = `Rewrite each "t" in plain English. Return {"items":[{"k":"<same key>","t":"<plain version>"}]} with the SAME keys.
${JSON.stringify(items)}`;

  const { data, reason } = await interpretWithProvider<{ items: { k: string; t: string }[] }>(system, user);
  if (!data || !Array.isArray(data.items)) {
    console.log(`[gen] layman skipped (reason=${reason})`);
    return;
  }
  const map: Record<string, string> = {};
  for (const it of data.items) if (it && it.k && it.t) map[it.k] = it.t;

  themes.forEach((t, i) => {
    const L: NonNullable<CroTheme["layman"]> = {};
    if (map[`T${i}.title`]) L.title = map[`T${i}.title`];
    if (map[`T${i}.why`]) L.whyItMatters = map[`T${i}.why`];
    if (map[`T${i}.imp`]) L.bankingImpact = map[`T${i}.imp`];
    L.mizuho = (t.mizuho ?? []).map((m, j) => map[`T${i}.mz${j}`] ?? m);
    if (map[`T${i}.tp`]) L.talkingPoint = map[`T${i}.tp`];
    if (map[`T${i}.fu`]) L.followUp = map[`T${i}.fu`];
    if (map[`T${i}.wtu`]) L.whatToUnderstand = map[`T${i}.wtu`];
    L.questions = (t.questions ?? []).map((q, j) => map[`T${i}.q${j}`] ?? q);
    L.lensQuestions = (t.lenses ?? []).map((l, j) => map[`T${i}.lq${j}`] ?? l.question);
    t.layman = L;
  });
  (intel.editorial ?? []).forEach((e, i) => {
    e.layman = {
      title: map[`E${i}.title`],
      whatHappened: map[`E${i}.wh`],
      whyItMatters: map[`E${i}.why`],
      firstOrder: map[`E${i}.fo`],
      secondOrder: map[`E${i}.so`],
      keyTakeaway: map[`E${i}.key`],
      whatToUnderstand: map[`E${i}.wtu`],
    };
  });
  if (intel.japanAsia) {
    intel.japanAsia.layman = {
      narrative: map[`J.narr`],
      mizuho: (intel.japanAsia.mizuho ?? []).map((m, j) => map[`J.mz${j}`] ?? m),
      questions: (intel.japanAsia.questions ?? []).map((q, j) => map[`J.q${j}`] ?? q),
      whatToUnderstand: map[`J.wtu`],
    };
  }
  console.log(`[gen] layman attached (${Object.keys(map).length} fields)`);
}

function normalizeConfidence(c: string): Confidence {
  const v = (c || "").toLowerCase();
  if (v.startsWith("h")) return "High";
  if (v.startsWith("l")) return "Low";
  return "Medium";
}

/** Full generation pipeline (cron). Throws on hard failure so the caller keeps the prior snapshot. */
export async function generateSnapshot(
  slot: SnapshotSlot,
  indicators: Indicator[]
): Promise<EditorialSnapshot> {
  const raw = await ingest();
  console.log(
    `[gen] env keys: gemini=${Boolean(process.env.GEMINI_API_KEY)} anthropic=${Boolean(process.env.ANTHROPIC_API_KEY)} disableGemini=${(process.env.DISABLE_GEMINI || "false")}`
  );
  console.log(`[gen] ingested ${raw.length} raw stories`);

  // No live source configured → curated seed (clearly marked).
  if (raw.length === 0) {
    console.log("[gen] no news → curated seed (degradeReason=no_news)");
    const seedSnap = curatedSnapshot(slot, indicators);
    seedSnap.meta.degradeReason = "no_news";
    return seedSnap;
  }

  const stories = dedupe(raw);
  const clusters = clusterAndScore(stories);
  const newsVolume: SnapshotMeta["newsVolume"] = clusters.length < 3 ? "light" : "normal";
  console.log(`[gen] ${stories.length} deduped, ${clusters.length} clusters, volume=${newsVolume}`);

  let intelligence: IntelligenceLayer | null = null;
  let provider: "gemini" | "anthropic" | "none" = "none";
  let llmReason: LlmReason = "no_key";

  if (!llmAvailable()) {
    console.log("[gen] no LLM key configured");
  } else if (clusters.length > 0) {
    let interp = await interpretClusters(clusters, indicators);
    console.log(`[gen] llm provider=${interp.provider} reason=${interp.reason}`);
    // Retry once on invalid JSON (Pro headroom makes this affordable).
    if (!interp.intel && interp.reason === "invalid_json") {
      console.log("[gen] invalid JSON → retrying once");
      interp = await interpretClusters(clusters, indicators);
      console.log(`[gen] retry provider=${interp.provider} reason=${interp.reason}`);
    }
    intelligence = interp.intel;
    provider = interp.provider;
    llmReason = interp.reason;
  }

  // Map the outcome to a degrade reason for visibility.
  let degradeReason: DegradeReason = "ok";
  if (intelligence) {
    degradeReason = newsVolume === "light" ? "carried_forward" : "ok";
  } else if (!llmAvailable()) {
    degradeReason = "no_llm_key";
  } else {
    degradeReason =
      llmReason === "timeout"
        ? "llm_timeout"
        : llmReason === "invalid_json"
        ? "llm_invalid_json"
        : llmReason === "http_error"
        ? "llm_http_error"
        : "invalid_output";
  }

  // LLM failed but we have live news → prefer the LAST GOOD generated snapshot over curated.
  let usedLastGood = false;
  if (!intelligence) {
    const last = await getLatestSnapshot();
    if (last && !last.meta.seed && (last.intelligence?.themes?.length ?? 0) > 0) {
      console.log(`[gen] LLM failed (${degradeReason}) → serving last good generated snapshot`);
      intelligence = last.intelligence;
      usedLastGood = true;
    } else {
      console.log(`[gen] LLM failed (${degradeReason}) → curated fallback`);
    }
  }

  const seed = intelligence === null;
  const intel = intelligence ?? buildIntelligence(indicators, false);

  // Theme persistence (NEW / Day-N) — only for freshly generated themes.
  if (!seed && !usedLastGood) {
    try {
      const dateKey = istDateKey();
      // Normalise topicIds so the same theme matches day-over-day despite
      // casing/punctuation drift from the model (stable persistence).
      for (const t of intel.themes) t.topicId = normalizeTopicId(t.topicId);
      const map = await recordTopicsSeen(
        intel.themes.map((t) => t.topicId),
        dateKey
      );
      for (const t of intel.themes) {
        const s = map[t.topicId];
        if (s) {
          t.firstSeenISO = s.firstISO;
          t.seenCount = s.count;                      // unique days seen
          t.dayN = daysBetween(s.firstISO, dateKey) + 1; // calendar days since first seen
          t.isNew = s.firstISO === dateKey;
        }
      }
    } catch (e) {
      console.log("[gen] persistence update skipped:", (e as Error).message);
    }

    // Whole-screen plain-English layer (3.6) — replaces per-term "Explain simply".
    try {
      await translateLayman(intel);
    } catch (e) {
      console.log("[gen] layman skipped:", (e as Error).message);
    }

    // Concept library auto-collect — record which Learn concepts each theme touched.
    try {
      const dateKey = istDateKey();
      const hits: { id: string; theme: string }[] = [];
      for (const t of intel.themes) {
        const text = [
          t.title,
          t.whyItMatters,
          t.bankingImpact,
          ...(t.mizuho ?? []),
          ...(t.signals ?? []),
          ...(t.lenses ?? []).map((l) => l.question),
          ...(t.explain ? t.explain.mizuho.concat(t.explain.questions).map((p) => p.riskTerm) : []),
        ].join(" . ");
        for (const id of detectConcepts(text)) hits.push({ id, theme: t.title });
      }
      if (hits.length) {
        await recordConceptsSeen(hits, dateKey);
        console.log(`[gen] concepts recorded: ${new Set(hits.map((h) => h.id)).size}`);
      }
    } catch (e) {
      console.log("[gen] concept tracking skipped:", (e as Error).message);
    }
  }

  const meta = baseMeta(slot, intel, seed);
  meta.sources = [...new Set(stories.map((s) => s.source))];
  meta.articlesReviewed = stories.length;
  meta.themesGenerated = intel.themes.length;
  meta.confidence = overallConfidence(intel.themes, seed);
  meta.coverage = coverageFor(intel);
  meta.newsVolume = newsVolume;
  meta.carriedForward = newsVolume === "light";
  meta.llmProvider = seed ? "none" : usedLastGood ? meta.llmProvider : provider;
  meta.stale = usedLastGood;
  meta.degradeReason = degradeReason;

  console.log(`[gen] done: seed=${seed} usedLastGood=${usedLastGood} degradeReason=${degradeReason} provider=${meta.llmProvider}`);

  const snap: EditorialSnapshot = { intelligence: intel, meta };
  validateSnapshot(snap);
  return snap;
}

/** Schema guard — throws so a bad generation never overwrites a good snapshot. */
export function validateSnapshot(snap: EditorialSnapshot): void {
  const { intelligence: i, meta } = snap;
  if (!i || !Array.isArray(i.themes) || i.themes.length === 0) throw new Error("no themes");
  const expanded = i.themes.filter((t) => t.expanded);
  if (expanded.length < 1 || expanded.length > 5) throw new Error("expanded count out of range");
  for (const t of expanded) {
    if (!t.title || !t.whyItMatters || !t.bankingImpact) throw new Error(`theme ${t.id} missing fields`);
    if (!t.lenses?.length || !t.signals?.length) throw new Error(`theme ${t.id} missing lens/signals`);
  }
  if (!meta.generatedISO || Number.isNaN(Date.parse(meta.generatedISO))) throw new Error("bad timestamp");
}

/** Recompute frozen anchors against current data; flag material drift on read. */
export function attachLiveDrift(snap: EditorialSnapshot, indicators: Indicator[]): EditorialSnapshot {
  const drift = (anchorId: string | undefined, anchor: any) => {
    if (!anchor || anchor.raw == null || !anchorId) return anchor;
    const cur = indicators.find((x) => x.id === anchorId);
    if (!cur || cur.value == null) return anchor;
    const rel = Math.abs(cur.value - anchor.raw) / Math.max(Math.abs(anchor.raw), 1);
    if (rel > 0.004) return { ...anchor, live: formatIndicatorValue(cur), drifted: true };
    return { ...anchor, live: undefined, drifted: false };
  };
  const themes = snap.intelligence.themes.map((t) => ({ ...t, anchor: drift(t.anchorId, t.anchor) }));
  const editorial = snap.intelligence.editorial.map((e) => ({ ...e, anchor: drift(e.anchorId, e.anchor) }));
  return { ...snap, intelligence: { ...snap.intelligence, themes, editorial } };
}
