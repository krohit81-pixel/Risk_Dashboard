// lib/savedMappers.ts
// V4.1a — build a complete SavedItem (executive + layman twins + deeper detail)
// from a RAW source item. "Raw" is important: themes/editorial/japan must be the
// UNRESOLVED objects (executive text in the main fields, twins under `.layman`).
// resolveIntelligence() overwrites the main fields with layman text when the
// Learning view is on, so mapping from a resolved object would lose the executive
// original — always pass the raw item from `data.intelligence`.

import type { CroTheme, EditorialCard, JapanAsiaWatch, ResearchAnalysis } from "./types";
import type { SavedItem } from "./savedStore";

const mizuhoLine = (m: { riskName: string; scenarioLabel: string }) =>
  `${m.riskName} · ${m.scenarioLabel}`;

/** Research analysis → SavedItem. The analysis already carries both variants. */
export function savedFromAnalysis(a: ResearchAnalysis): SavedItem {
  return {
    id: `analysis-${a.analyzedISO}`,
    kind: "analysis",
    title: a.title,
    interpretation: a.whyItMatters,
    bankingImpact: a.bankingImpact,
    bankingImpactAreas: a.bankingImpactAreas,
    whatHappened: a.whatHappened,
    whyMizuho: (a.mizuhoAlignment ?? []).map(mizuhoLine),
    sources: a.originalUrl || "Pasted text",
    savedAtISO: "",
    sourceType: a.sourceType,
    analysisDateISO: a.analyzedISO,
    originalUrl: a.originalUrl,
    relatedConcepts: a.relatedConcepts,
    layman: {
      whatHappened: a.layman?.whatHappened,
      interpretation: a.layman?.whyItMatters,
      bankingImpact: a.layman?.bankingImpact,
    },
  };
}

/** RAW CRO Conversation theme → SavedItem (full piece + twins). */
export function savedFromTheme(t: CroTheme, snapshotISO?: string): SavedItem {
  const L = t.layman;
  return {
    id: t.topicId || t.id,
    kind: "theme",
    title: t.title,
    interpretation: t.whyItMatters,
    bankingImpact: t.bankingImpact,
    whyMizuho: t.mizuho ?? [],
    sources: t.source,
    savedAtISO: "",
    snapshotISO,
    layman: {
      interpretation: L?.whyItMatters,
      bankingImpact: L?.bankingImpact,
      whyMizuho: L?.mizuho,
    },
    detail: {
      lenses: (t.lenses ?? []).map((ln, i) => ({
        label: ln.kind,
        question: ln.question,
        questionLayman: L?.lensQuestions?.[i],
      })),
      signals: t.signals,
      questions: t.questions,
      questionsLayman: L?.questions,
      talkingPoint: t.talkingPoint,
      talkingPointLayman: L?.talkingPoint,
      followUp: t.followUp,
      followUpLayman: L?.followUp,
      whatToUnderstand: t.whatToUnderstand,
      whatToUnderstandLayman: L?.whatToUnderstand,
    },
  };
}

/** RAW editorial card → SavedItem (full piece + twins). */
export function savedFromEditorial(c: EditorialCard, snapshotISO?: string): SavedItem {
  const L = c.layman;
  return {
    id: c.id,
    kind: "editorial",
    title: c.title,
    interpretation: c.whyItMatters,
    bankingImpact: c.bankRisk ?? "",
    whyMizuho: [],
    sources: c.source,
    savedAtISO: "",
    snapshotISO,
    whatHappened: c.whatHappened,
    layman: {
      whatHappened: L?.whatHappened,
      interpretation: L?.whyItMatters,
      // EditorialLayman has no bankRisk twin — impact stays executive.
    },
    detail: {
      firstOrder: c.firstOrder,
      firstOrderLayman: L?.firstOrder,
      secondOrder: c.secondOrder,
      secondOrderLayman: L?.secondOrder,
      keyTakeaway: c.keyTakeaway,
      keyTakeawayLayman: L?.keyTakeaway,
      whatToUnderstand: c.whatToUnderstand,
      whatToUnderstandLayman: L?.whatToUnderstand,
    },
  };
}

/** RAW Japan & Asia watch → SavedItem (full piece + twins). */
export function savedFromJapan(j: JapanAsiaWatch, snapshotISO?: string): SavedItem {
  const L = j.layman;
  const dayKey = (snapshotISO || "").slice(0, 10);
  return {
    id: `japan-watch-${dayKey}`,
    kind: "japan",
    title: "Japan & Asia Watch",
    interpretation: j.narrative,
    bankingImpact: "",
    whyMizuho: j.mizuho ?? [],
    sources: j.source,
    savedAtISO: "",
    snapshotISO,
    layman: {
      interpretation: L?.narrative,
      whyMizuho: L?.mizuho,
    },
    detail: {
      lenses: j.lens ? [{ label: j.lens.kind, question: j.lens.question }] : undefined,
      signals: j.signals,
      questions: j.questions,
      questionsLayman: L?.questions,
      whatToUnderstand: j.whatToUnderstand,
      whatToUnderstandLayman: L?.whatToUnderstand,
    },
  };
}
