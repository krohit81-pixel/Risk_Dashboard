// components/RiskGauge.tsx
"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import type { RiskStatus } from "@/lib/types";

const COLORS: Record<RiskStatus, string> = {
  Calm: "#2DD4A7",
  Moderate: "#5B8DEF",
  Elevated: "#F5A524",
  High: "#F2545B",
};

/**
 * Semicircular risk meter. score ∈ [-3, +3] → 0..100.
 * Higher = more risk-off / stressed.
 */
export function RiskGauge({
  score,
  status,
}: {
  score: number;
  status: RiskStatus;
}) {
  const pct = Math.round(((score + 3) / 6) * 100);
  const color = COLORS[status];
  const data = [{ name: "risk", value: pct, fill: color }];

  return (
    <div className="relative h-[104px] w-[180px] select-none">
      <RadialBarChart
        width={180}
        height={180}
        cx={90}
        cy={104}
        innerRadius={70}
        outerRadius={92}
        barSize={14}
        data={data}
        startAngle={180}
        endAngle={0}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar
          background={{ fill: "#1B2230" }}
          dataKey="value"
          cornerRadius={8}
          angleAxisId={0}
        />
      </RadialBarChart>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
        <span
          className="text-2xl font-bold tracking-tightest"
          style={{ color }}
        >
          {status}
        </span>
        <span className="text-2xs text-fg-faint">risk environment</span>
      </div>
    </div>
  );
}
