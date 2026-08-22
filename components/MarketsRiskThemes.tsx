// components/MarketsRiskThemes.tsx
// V5.11.6 — merges what used to be two parallel Markets sections (EmergingRisks.tsx,
// BankImplications.tsx) into one per-theme view. They always covered the exact same 5 themes
// (BankImplication.riskId is a documented 1:1 link to EmergingRisk.id, guaranteed by
// lib/weeklyEngine.ts's mergeMarkets(), which builds implications FROM the emerging-risks list)
// — showing them as two separately-scrolled lists made you cross-reference "Persistent
// Inflation" in one list against "Persistent Inflation" again in the other. One card per theme
// now: the risk read up top, its five bank-implication areas underneath.
//
// Also adds a local Executive/Learning toggle — this section previously had NO layman path at
// all (the page-level toggle deliberately doesn't reach Markets; see CLAUDE.md's Navigation
// structure note), even though EmergingRisk.noteLayman and BankImplication.layman already
// existed on the type. They just weren't being populated by lib/weeklyEngine.ts's generation
// prompt, or read by any UI. Both are fixed as part of this change. Local toggle (not the
// header one) matches the established pattern in ResearchWorkspace/SavedList, which each own
// their own Executive/Learning state rather than reaching for the global one.

"use client";

import { useState } from "react";
import type { EmergingRisk, BankImplication } from "@/lib/types";
import { Card, TrendArrow } from "./ui";

const PROB_COLOR: Record<EmergingRisk["probability"], string> = {
  Low: "text-calm",
  Medium: "text-elevated",
  High: "text-stress",
};
const IMPACT_COLOR: Record<EmergingRisk["impact"], string> = {
  Low: "text-calm",
  Moderate: "text-elevated",
  Severe: "text-stress",
};

const LENSES: { key: "creditRisk" | "marketRisk" | "liquidityRisk" | "capital" | "profitability"; label: string }[] = [
  { key: "creditRisk", label: "Credit Risk" },
  { key: "marketRisk", label: "Market Risk" },
  { key: "liquidityRisk", label: "Liquidity Risk" },
  { key: "capital", label: "Capital" },
  { key: "profitability", label: "Profitability" },
];

function fmtReviewed(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Meter({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-fg-faint">{label}</span>
      <span className={`text-[13px] font-semibold ${color}`}>{value}</span>
    </div>
  );
}

export function MarketsRiskThemes({
  risks,
  implications,
}: {
  risks: EmergingRisk[];
  implications: BankImplication[];
}) {
  const [learning, setLearning] = useState(false);
  const implByRiskId = new Map(implications.map((i) => [i.riskId, i]));

  return (
    <section className="rise">
      <div className="mb-3 flex gap-1.5">
        {([["exec", "Executive"], ["learn", "Learning"]] as const).map(([id, label]) => {
          const active = id === "learn" ? learning : !learning;
          return (
            <button
              key={id}
              onClick={() => setLearning(id === "learn")}
              className={`rounded-lg border px-2.5 py-1 text-2xs font-semibold transition ${
                active ? "border-steel/50 bg-steel/10 text-steel" : "border-line bg-ink-800 text-fg-faint"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {risks.map((r) => {
          const impl = implByRiskId.get(r.id);
          const note = learning && r.noteLayman ? r.noteLayman : r.note;
          return (
            <Card key={r.id} className="overflow-hidden">
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] font-semibold text-fg">{r.name}</h3>
                  <TrendArrow trend={r.trend} riskUpIsBad className="text-base" />
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{note}</p>
                <div className="mt-3 flex gap-6">
                  <Meter label="Probability" value={r.probability} color={PROB_COLOR[r.probability]} />
                  <Meter label="Impact" value={r.impact} color={IMPACT_COLOR[r.impact]} />
                  <Meter
                    label="Trend"
                    value={r.trend === "up" ? "Rising" : r.trend === "down" ? "Easing" : "Stable"}
                    color={r.trend === "up" ? "text-stress" : r.trend === "down" ? "text-calm" : "text-fg-muted"}
                  />
                </div>
                {r.reviewedISO ? (
                  <p className="mt-2.5 text-[10px] text-fg-faint">Reviewed {fmtReviewed(r.reviewedISO)}</p>
                ) : null}
              </div>

              {impl ? (
                <div className="divide-y divide-line-soft/60 border-t border-line-soft">
                  {LENSES.map(({ key, label }) => {
                    const execVal = impl[key];
                    const laymanVal = impl.layman?.[key];
                    return (
                      <div key={key} className="flex gap-3 px-4 py-2.5">
                        <span className="w-[88px] shrink-0 text-2xs font-semibold uppercase tracking-wide text-steel">
                          {label}
                        </span>
                        <span className="text-[13px] leading-relaxed text-fg-muted">
                          {learning && laymanVal ? laymanVal : execVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
