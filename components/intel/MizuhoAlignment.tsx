// components/intel/MizuhoAlignment.tsx
"use client";

import type { MizuhoAlignment } from "@/lib/types";

const CONF_DOT: Record<string, string> = {
  High: "bg-mizuho",
  Medium: "bg-mizuho/60",
  Low: "bg-mizuho/30",
};

/**
 * Renders a theme's alignment to Mizuho's published Top Risks.
 * Executive view = compact purple chips (risk · scenario · confidence).
 * Learning view = "Why Mizuho cares" narrative (plain-English twin), scenario-anchored.
 * Empty alignment renders nothing (a no-match is valid).
 */
export function MizuhoAlignmentBlock({
  items,
  learning,
}: {
  items?: MizuhoAlignment[];
  learning: boolean;
}) {
  if (!items?.length) return null;

  return (
    <div className="mt-3 rounded-xl border border-[#2f2747] bg-[#16121f] px-3.5 py-2.5">
      <p className="mb-1.5 text-2xs font-bold uppercase tracking-wide text-mizuho">
        {learning ? "Why Mizuho cares" : "Mizuho Top Risk"}
      </p>

      {learning ? (
        <div className="space-y-2">
          {items.map((a, i) => (
            <div key={i}>
              <p className="text-[13px] font-semibold text-[#c4bdf0]">
                {a.riskName} <span className="font-normal text-fg-faint">· {a.scenarioLabel}</span>
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{a.whyLayman ?? a.why}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`mt-1 h-1.5 w-1.5 flex-none rounded-full ${CONF_DOT[a.confidence] ?? "bg-mizuho/60"}`} />
              <span className="text-[12.5px] leading-snug text-[#c4bdf0]">
                <span className="font-semibold">{a.riskName}</span>
                <span className="text-fg-faint"> · {a.scenarioLabel}</span>
                <span className="text-fg-faint"> · {a.confidence}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
