// lib/layman.ts
// Whole-screen Learning view: given the generated content and the learning flag,
// return objects whose prose fields are swapped to their plain-English twin where
// one exists. Components render the returned objects as-is and stay language-agnostic.

import type {
  IntelligenceLayer,
  CroTheme,
  EditorialCard,
  JapanAsiaWatch,
  BankImplication,
  EmergingRisk,
} from "./types";

function resolveTheme(t: CroTheme): CroTheme {
  const L = t.layman;
  if (!L) return t;
  return {
    ...t,
    title: L.title ?? t.title,
    whyItMatters: L.whyItMatters ?? t.whyItMatters,
    bankingImpact: L.bankingImpact ?? t.bankingImpact,
    mizuho: L.mizuho ?? t.mizuho,
    talkingPoint: L.talkingPoint ?? t.talkingPoint,
    followUp: L.followUp ?? t.followUp,
    whatToUnderstand: L.whatToUnderstand ?? t.whatToUnderstand,
    questions: L.questions ?? t.questions,
    lenses:
      L.lensQuestions && t.lenses
        ? t.lenses.map((ln, j) => ({ ...ln, question: L.lensQuestions![j] ?? ln.question }))
        : t.lenses,
  };
}

function resolveEditorial(e: EditorialCard): EditorialCard {
  const L = e.layman;
  if (!L) return e;
  return {
    ...e,
    title: L.title ?? e.title,
    whatHappened: L.whatHappened ?? e.whatHappened,
    whyItMatters: L.whyItMatters ?? e.whyItMatters,
    firstOrder: L.firstOrder ?? e.firstOrder,
    secondOrder: L.secondOrder ?? e.secondOrder,
    keyTakeaway: L.keyTakeaway ?? e.keyTakeaway,
    whatToUnderstand: L.whatToUnderstand ?? e.whatToUnderstand,
  };
}

function resolveJapan(j: JapanAsiaWatch): JapanAsiaWatch {
  if (!j.layman) return j;
  const L = j.layman;
  return {
    ...j,
    narrative: L.narrative ?? j.narrative,
    mizuho: L.mizuho ?? j.mizuho,
    questions: L.questions ?? j.questions,
    whatToUnderstand: L.whatToUnderstand ?? j.whatToUnderstand,
  };
}

export function resolveIntelligence(intel: IntelligenceLayer, learning: boolean): IntelligenceLayer {
  if (!learning) return intel;
  return {
    ...intel,
    themes: intel.themes.map(resolveTheme),
    editorial: (intel.editorial ?? []).map(resolveEditorial),
    japanAsia: intel.japanAsia ? resolveJapan(intel.japanAsia) : intel.japanAsia,
  };
}

export function resolveImplications(items: BankImplication[], learning: boolean): BankImplication[] {
  if (!learning) return items;
  return items.map((it) => {
    const L = it.layman;
    if (!L) return it;
    return {
      ...it,
      development: L.development ?? it.development,
      creditRisk: L.creditRisk ?? it.creditRisk,
      marketRisk: L.marketRisk ?? it.marketRisk,
      liquidityRisk: L.liquidityRisk ?? it.liquidityRisk,
      capital: L.capital ?? it.capital,
      profitability: L.profitability ?? it.profitability,
    };
  });
}

export function resolveEmerging(items: EmergingRisk[], learning: boolean): EmergingRisk[] {
  if (!learning) return items;
  return items.map((r) => (r.noteLayman ? { ...r, note: r.noteLayman } : r));
}
