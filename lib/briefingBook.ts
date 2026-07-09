// lib/briefingBook.ts
// V5.3 — compiles a briefing book: query matching saved items, then TWO dedicated LLM calls
// (preface, action items — kept separate per the project's established lesson that merging
// calls under-produces). Translate-don't-regenerate: both calls summarize/reason over the
// ACTUAL compiled items; neither is told to invent new market facts.

import { getSaved, getSavedInRange, type SavedItem } from "./savedStore";
import { interpretWithProvider } from "./llm";
import { BRIEFING_PACKS, findPack, type BriefingPackSpec } from "./briefingPacks";

const MAX_ITEMS_FOR_PROMPT = 40; // bound prompt size; book still lists all matched items, just caps what's sent to the LLM

export interface BriefingBook {
  packId: string;
  title: string;
  subtitle: string; // date range or "All time"
  tone: "research" | "executive";
  generatedISO: string;
  stats: { itemCount: number; truncatedForPrompt: boolean; untaggedCount: number };
  preface: string;
  actionItems: { toLearn: string[]; toAsk: string[]; toInvestigate: string[] };
  items: SavedItem[];
  gap?: string; // honest note when there's too little to compile from
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Word-boundary-aware keyword match, so short tokens ("ai") don't false-positive inside
 *  unrelated words ("maintain", "detail"). Longer phrases still use plain substring match. */
function keywordHits(haystack: string, keywords: string[]): boolean {
  const hay = haystack.toLowerCase();
  return keywords.some((kw) => {
    const k = kw.toLowerCase();
    if (k.length <= 3) return new RegExp(`\\b${k}\\b`).test(hay);
    return hay.includes(k);
  });
}

function matchesTheme(item: SavedItem, keywords: string[]): boolean {
  // Category first (the intended, precise signal from v5.2 on); title/interpretation as a
  // fallback so items saved before category-tagging existed are still discoverable.
  const hay = `${item.category ?? ""} ${item.title} ${item.interpretation} ${item.whatHappened ?? ""}`;
  return keywordHits(hay, keywords);
}

function periodRange(days: number): { from: string; to: string; label: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  return { from: from.toISOString(), to: to.toISOString(), label: `${fmtDate(from.toISOString())} \u2013 ${fmtDate(to.toISOString())} (last ${days} days)` };
}

function itemSummary(it: SavedItem) {
  return {
    title: it.title,
    category: it.category || "(uncategorized)",
    severity: it.severity || "",
    savedAt: it.savedAtISO,
    whatHappened: (it.whatHappened || "").slice(0, 400),
    whyItMatters: (it.interpretation || "").slice(0, 400),
  };
}

async function generatePreface(pack: BriefingPackSpec, items: SavedItem[], subtitle: string): Promise<string> {
  const summaries = items.slice(0, MAX_ITEMS_FOR_PROMPT).map(itemSummary);
  const register =
    pack.tone === "executive"
      ? "Executive register: tight, decision-oriented, assume a senior audience (this compiles for the reader's own use as a CRO onboarding into Mizuho Americas) — lead with the 2-3 things that matter most, not a chronological walk-through."
      : "Research register: a bit more depth and connective reasoning across items is fine, but stay concise.";
  const system =
    "You write a short preface for a compiled briefing book made of the reader's OWN previously-saved risk analyses. " +
    "Translate and synthesize what is ACTUALLY in the supplied items — do not introduce new facts, figures, or events not present in them. " +
    "Identify genuine common threads across the items (a shared driver, an escalating pattern, a recurring name/institution) rather than just listing them. " +
    `${register} 200-350 words. Plain prose, no headers, no bullet list. JSON only.`;
  const user = `Book: "${pack.title}" \u2014 ${subtitle}
${items.length > MAX_ITEMS_FOR_PROMPT ? `(showing the most recent ${MAX_ITEMS_FOR_PROMPT} of ${items.length} items)` : ""}

Items:
${JSON.stringify(summaries, null, 2)}

Return: {"preface": "<the preface text>"}`;
  const { data } = await interpretWithProvider<{ preface: string }>(system, user);
  return data?.preface?.trim() || "";
}

async function generateActionItems(
  pack: BriefingPackSpec,
  items: SavedItem[]
): Promise<{ toLearn: string[]; toAsk: string[]; toInvestigate: string[] }> {
  const summaries = items.slice(0, MAX_ITEMS_FOR_PROMPT).map(itemSummary);
  const system =
    "You produce a short action-items section for a CRO who is onboarding as Head of Risk, India at Mizuho (via Mizuho Americas) " +
    "and uses saved risk analyses to prepare for conversations with senior risk leadership. Ground every item in the SUPPLIED " +
    "content — do not invent generic career advice unconnected to these specific items. JSON only.";
  const user = `Book: "${pack.title}"

Items:
${JSON.stringify(summaries, null, 2)}

Produce three short lists (2-4 items each, one sentence per item):
- "toLearn": concepts or mechanisms in these items worth understanding more deeply
- "toAsk": questions genuinely worth raising with senior leadership, grounded in what's in these items
- "toInvestigate": specific follow-ups worth digging into further

Return: {"toLearn": [...], "toAsk": [...], "toInvestigate": [...]}
Empty arrays are fine if the items don't support a category. JSON only.`;
  const { data } = await interpretWithProvider<{ toLearn: string[]; toAsk: string[]; toInvestigate: string[] }>(system, user);
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : []);
  return { toLearn: arr(data?.toLearn), toAsk: arr(data?.toAsk), toInvestigate: arr(data?.toInvestigate) };
}

/** Compile a briefing book. Returns null only if the packId is unknown. */
export async function generateBriefingBook(packId: string): Promise<BriefingBook | null> {
  const pack = findPack(packId);
  if (!pack) return null;

  let items: SavedItem[];
  let subtitle: string;

  if (pack.kind === "period") {
    // V5.3 design choice: trailing N days, not strict calendar month/quarter boundaries —
    // always has content regardless of when in the month/quarter it's generated, and the
    // label states the exact window rather than implying a calendar cutoff it doesn't have.
    const days = packId === "quarterly" ? 90 : 30;
    const { from, to, label } = periodRange(days);
    items = await getSavedInRange(from, to);
    subtitle = label;
  } else {
    const all = await getSaved();
    items = all.filter((it) => matchesTheme(it, pack.keywords ?? []));
    subtitle = "All time";
  }

  const untaggedCount = items.filter((it) => !it.category).length;

  if (items.length === 0) {
    return {
      packId,
      title: pack.title,
      subtitle,
      tone: pack.tone,
      generatedISO: new Date().toISOString(),
      stats: { itemCount: 0, truncatedForPrompt: false, untaggedCount: 0 },
      preface: "",
      actionItems: { toLearn: [], toAsk: [], toInvestigate: [] },
      items: [],
      gap:
        pack.kind === "period"
          ? "No items saved in this window yet."
          : "No saved items matched this theme yet — items saved from v5.2 onward carry a category tag that improves matching over time.",
    };
  }

  const [preface, actionItems] = await Promise.all([
    generatePreface(pack, items, subtitle),
    generateActionItems(pack, items),
  ]);

  return {
    packId,
    title: pack.title,
    subtitle,
    tone: pack.tone,
    generatedISO: new Date().toISOString(),
    stats: { itemCount: items.length, truncatedForPrompt: items.length > MAX_ITEMS_FOR_PROMPT, untaggedCount },
    preface,
    actionItems,
    items,
  };
}

export { BRIEFING_PACKS };
