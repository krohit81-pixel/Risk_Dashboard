"use client";

import { useEffect, useState } from "react";

/**
 * Circular "buffer" progress ring with a percentage in the middle and a rotating stage
 * label underneath. Since analyzeContent() is a single server round-trip (several
 * sequential LLM calls inside one request, not streamed), this is a TIME-BASED ESTIMATE,
 * not a literal readout of backend completion — it ramps toward ~92% over the expected
 * duration and holds there, then snaps to 100% the moment the real response arrives.
 * Stage labels are timed to roughly track the actual call sequence in analyzeContent
 * (interpret → align/focus → Mizuho lens) so it reads as informative, not just decorative.
 */
export function ProgressRing({
  active,
  estimateSeconds = 24,
  stages,
  size = 64,
}: {
  active: boolean;
  estimateSeconds?: number;
  stages?: string[];
  size?: number;
}) {
  const [pct, setPct] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const defaultStages = [
    "Reading content…",
    "Interpreting through the CRO lens…",
    "Aligning to Mizuho Top Risks…",
    "Checking the Mizuho repository…",
  ];
  const labels = stages && stages.length ? stages : defaultStages;

  useEffect(() => {
    if (!active) {
      setPct(0);
      setStageIdx(0);
      return;
    }
    const start = Date.now();
    const capMs = estimateSeconds * 1000;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      // Ease toward 92% asymptotically — never claims completion until the real result lands.
      const raw = 92 * (1 - Math.exp((-2.2 * elapsed) / capMs));
      setPct(Math.min(92, raw));
      const stageSlot = Math.min(labels.length - 1, Math.floor((elapsed / capMs) * labels.length));
      setStageIdx(stageSlot);
    }, 150);
    return () => clearInterval(id);
  }, [active, estimateSeconds, labels.length]);

  if (!active) return null;

  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-ink-700" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="text-steel transition-[stroke-dashoffset] duration-150 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-fg">
          {Math.round(pct)}%
        </div>
      </div>
      <p className="text-2xs text-fg-faint">{labels[stageIdx]}</p>
    </div>
  );
}
