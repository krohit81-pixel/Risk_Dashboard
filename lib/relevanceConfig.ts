// lib/relevanceConfig.ts
// Adjustable editorial relevance weighting. Rohit's onboarding path is
// Americas (now) → EMEA → Japan/global, so weighting is PHASE-driven rather than
// hardcoded: change ONBOARDING_PHASE (env) and the ranking shifts without a rebuild.
// Japan is never zeroed here — and is additionally protected by its own dedicated
// Japan & Asia Watch section regardless of these weights.

export type Lens = "us" | "macro" | "japan" | "europe";

/** Keyword signatures used to classify a story into a lens. Order = priority. */
const LENS_KEYWORDS: { lens: Lens; keywords: string[] }[] = [
  {
    lens: "japan",
    keywords: ["japan", "boj", "jgb", "yen", "nikkei", "carry trade", "tokyo", "ueda"],
  },
  {
    lens: "europe",
    keywords: ["ecb", "euro zone", "eurozone", "europe", "german", "bund", "uk ", "gilt", "bank of england", "lagarde"],
  },
  {
    lens: "us",
    keywords: [
      "fed", "fomc", "federal reserve", "powell", "treasury", "u.s.", "us ", "american",
      "sofr", "repo", "regional bank", "occ", "fdic", "basel iii endgame", "slr",
      "leveraged loan", "clo", "municipal", "dollar funding",
    ],
  },
];

/** US-specific terms that make a story conversation-relevant for Mizuho Americas. */
const US_SPECIFIC = [
  "regional bank", "commercial real estate", "cre", "private credit", "leveraged loan",
  "clo", "deposit", "sofr", "repo", "treasury auction", "basel", "slr", "occ", "fdic",
  "credit spread", "high yield", "capital markets", "fed", "fomc", "discount window",
];

/** Phase profiles — additive priority points per lens. Phase 1 = Americas-first. */
const PHASE_PRIORITY: Record<string, Record<Lens, number>> = {
  "1": { us: 4.0, macro: 2.0, japan: 1.5, europe: 0.8 }, // Americas onboarding (now)
  "2": { us: 3.0, macro: 2.0, japan: 1.5, europe: 2.5 }, // EMEA rising
  "3": { us: 2.0, macro: 2.0, japan: 3.0, europe: 1.5 }, // Japan/global
};

export function currentPhase(): string {
  const p = (process.env.ONBOARDING_PHASE || "1").trim();
  return PHASE_PRIORITY[p] ? p : "1";
}

export function lensFor(text: string): Lens {
  const t = text.toLowerCase();
  for (const { lens, keywords } of LENS_KEYWORDS) {
    if (keywords.some((k) => t.includes(k))) return lens;
  }
  return "macro";
}

/** Priority bonus for a story, given the active phase + US specificity. */
export function lensBonus(text: string): { lens: Lens; bonus: number } {
  const lens = lensFor(text);
  const priority = PHASE_PRIORITY[currentPhase()];
  let bonus = priority[lens];
  if (lens === "us") {
    const t = text.toLowerCase();
    const hits = US_SPECIFIC.filter((k) => t.includes(k)).length;
    bonus += Math.min(hits, 3) * 1.2; // reward US banking/credit/reg specificity
  }
  return { lens, bonus };
}

/** Human-readable weighting summary (for the prompt + docs). */
export function weightingSummary(): string {
  const p = PHASE_PRIORITY[currentPhase()];
  return `phase ${currentPhase()} — US:${p.us} macro:${p.macro} japan:${p.japan} europe:${p.europe}`;
}
