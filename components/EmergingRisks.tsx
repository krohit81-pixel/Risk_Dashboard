// components/EmergingRisks.tsx
"use client";

import type { EmergingRisk } from "@/lib/types";
import { Card, TrendArrow } from "./ui";

/** Short "reviewed" date, e.g. "Jun 27". */
function fmtReviewed(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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

function Meter({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-fg-faint">{label}</span>
      <span className={`text-[13px] font-semibold ${color}`}>{value}</span>
    </div>
  );
}

export function EmergingRisks({ risks }: { risks: EmergingRisk[] }) {
  return (
    <section className="rise">
      <div className="space-y-2.5">
        {risks.map((r) => (
          <Card key={r.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-fg">{r.name}</h3>
              <TrendArrow trend={r.trend} riskUpIsBad className="text-base" />
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{r.note}</p>
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
          </Card>
        ))}
      </div>
    </section>
  );
}
