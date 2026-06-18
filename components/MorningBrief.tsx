// components/MorningBrief.tsx
"use client";

import type { MorningBrief as Brief } from "@/lib/types";
import { Card, SampleTag } from "./ui";
import { RiskGauge } from "./RiskGauge";
import { clockTime } from "@/lib/format";

function changeColor(score: number): string {
  if (score >= 0.4) return "text-stress";
  if (score <= -0.4) return "text-calm";
  return "text-fg-muted";
}

export function MorningBrief({
  brief,
  anyLive,
}: {
  brief: Brief;
  anyLive: boolean;
}) {
  return (
    <Card className="overflow-hidden rise">
      <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 pt-5 pb-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest text-steel">
            Daily Risk Brief
          </p>
          <p className={`mt-1 text-sm font-medium ${changeColor(brief.score)}`}>
            {brief.changeFromYesterday}
          </p>
        </div>
        <RiskGauge score={brief.score} status={brief.status} />
      </div>

      <div className="px-5 py-4">
        <p className="text-[15px] leading-relaxed text-fg">
          {brief.paragraph.join(" ")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line-soft px-5 py-3">
        <span className="text-2xs text-fg-faint">
          Updated {clockTime(brief.updatedISO)}
        </span>
        {!anyLive ? <SampleTag /> : (
          <span className="inline-flex items-center gap-1.5 text-2xs text-calm">
            <span className="h-1.5 w-1.5 rounded-full bg-calm" /> live data
          </span>
        )}
      </div>
    </Card>
  );
}
