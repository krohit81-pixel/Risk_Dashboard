// components/RiskGauge.tsx
"use client";

import type { RiskStatus } from "@/lib/types";

const COLORS: Record<RiskStatus, string> = {
  Calm: "rgb(var(--calm))",
  Moderate: "rgb(var(--steel))",
  Elevated: "rgb(var(--elevated))",
  High: "rgb(var(--stress))",
};

/**
 * V5.6.2 — slim horizontal risk meter (replaces the semicircle donut for a cleaner,
 * more editorial look). score ∈ [-3, +3] → 0..100 position along a calm→stress gradient.
 */
export function RiskGauge({
  score,
  status,
}: {
  score: number;
  status: RiskStatus;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(((score + 3) / 6) * 100)));
  const color = COLORS[status];

  return (
    <div className="w-[152px] select-none pt-0.5">
      <div className="text-right">
        <span className="text-xl font-bold leading-tight tracking-tightest" style={{ color }}>
          {status}
        </span>
        <p className="text-2xs text-fg-faint">risk environment</p>
      </div>

      <div
        className="relative mt-3 h-1.5 w-full rounded-full"
        style={{
          background:
            "linear-gradient(90deg, rgb(var(--calm)) 0%, rgb(var(--steel)) 38%, rgb(var(--elevated)) 68%, rgb(var(--stress)) 100%)",
        }}
      >
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
          style={{ left: `${pct}%`, backgroundColor: color, borderColor: "rgb(var(--ink-800))" }}
        />
      </div>

      <div className="mt-1 flex justify-between text-[9px] font-medium uppercase tracking-wide text-fg-faint">
        <span>Calm</span>
        <span>High</span>
      </div>
    </div>
  );
}
