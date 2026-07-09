// lib/briefingPacks.ts
// V5.3 — the catalog of briefing-book types. One mechanism (compile matching saved items +
// AI preface + AI action items), driven by a small config per pack — not bespoke code per
// book type. "period" packs filter by saved-date range; "theme" packs filter by keyword match
// against category (and title/interpretation as a fallback, since category is only populated
// on items saved from v5.2 onward — older items are still discoverable by content).

export interface BriefingPackSpec {
  id: string;
  title: string;
  kind: "period" | "theme";
  tone: "research" | "executive"; // shapes the AI preface's register
  description: string;
  keywords?: string[]; // theme packs only
  accent: string;
}

export const BRIEFING_PACKS: BriefingPackSpec[] = [
  {
    id: "monthly",
    title: "Monthly Research Book",
    kind: "period",
    tone: "research",
    description: "Everything saved in the last calendar month, compiled with a research-depth preface.",
    accent: "#2DD4A7",
  },
  {
    id: "quarterly",
    title: "Quarterly Executive Brief",
    kind: "period",
    tone: "executive",
    description: "Everything saved in the last calendar quarter, distilled into an executive-level brief.",
    accent: "#F5A524",
  },
  {
    id: "credit-risk",
    title: "Credit Risk Pack",
    kind: "theme",
    tone: "research",
    keywords: ["credit", "provision", "npl", "loan loss", "default", "commercial real estate", "cre", "underwriting"],
    description: "Every saved item touching credit quality, provisioning, or CRE.",
    accent: "#F2545B",
  },
  {
    id: "market-risk",
    title: "Market Risk Pack",
    kind: "theme",
    tone: "research",
    keywords: ["market risk", "volatility", "rates", "yields", "fx", "trading", "vix", "bond market"],
    description: "Every saved item touching market risk, rates, FX, or volatility.",
    accent: "#5B8DEF",
  },
  {
    id: "japan-macro",
    title: "Japan Macro Pack",
    kind: "theme",
    tone: "research",
    keywords: ["boj", "bank of japan", "japan", "yen", "jgb", "tankan"],
    description: "Every saved item touching BOJ policy, the yen, or Japan's macro picture.",
    accent: "#B79BFF",
  },
  {
    id: "ai-technology",
    title: "AI & Technology Pack",
    kind: "theme",
    tone: "research",
    // NEW category (v5.3) — not present in the existing curated taxonomy; matched by keyword
    // like every other theme pack rather than requiring a hardcoded enum change elsewhere.
    keywords: ["artificial intelligence", "ai", "machine learning", "automation", "cyber", "technology", "fintech", "digital"],
    description: "Every saved item touching AI, automation, cyber, or technology disruption.",
    accent: "#22D3EE",
  },
];

export function findPack(id: string): BriefingPackSpec | undefined {
  return BRIEFING_PACKS.find((p) => p.id === id);
}
