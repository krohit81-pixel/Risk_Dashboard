// components/ui.tsx
"use client";

import type { ReactNode } from "react";
import type { Heat, Severity, Trend } from "@/lib/types";

/* ── Section header: eyebrow number + title, encodes section order ── */
export function SectionHeader({
  n,
  title,
  hint,
}: {
  n: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-2.5">
      <span className="tnum text-2xs font-semibold tracking-widest text-fg-faint">
        {n}
      </span>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
        {title}
      </h2>
      {hint ? (
        <span className="ml-auto text-2xs text-fg-faint">{hint}</span>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-ink-800 shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Trend arrow with functional risk color ── */
export function TrendArrow({
  trend,
  riskUpIsBad,
  className = "",
}: {
  trend: Trend;
  riskUpIsBad: boolean;
  className?: string;
}) {
  if (trend === "stable")
    return <span className={`text-fg-faint ${className}`} aria-label="stable">→</span>;
  const isUp = trend === "up";
  // Color reflects RISK direction, not numeric direction.
  const bad = riskUpIsBad ? isUp : !isUp;
  const color = bad ? "text-stress" : "text-calm";
  return (
    <span className={`${color} ${className}`} aria-label={isUp ? "up" : "down"}>
      {isUp ? "▲" : "▼"}
    </span>
  );
}

const SEVERITY_STYLE: Record<Severity, string> = {
  Low: "bg-calm/10 text-calm border-calm/25",
  Moderate: "bg-steel/10 text-steel border-steel/25",
  Elevated: "bg-elevated/10 text-elevated border-elevated/25",
  High: "bg-stress/10 text-stress border-stress/25",
};

export function SeverityPill({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-semibold ${SEVERITY_STYLE[severity]}`}
    >
      {severity}
    </span>
  );
}

const HEAT_STYLE: Record<Heat, { dot: string; text: string }> = {
  Green: { dot: "bg-calm", text: "text-calm" },
  Amber: { dot: "bg-elevated", text: "text-elevated" },
  Red: { dot: "bg-stress", text: "text-stress" },
};

export function HeatDot({ heat }: { heat: Heat }) {
  const s = HEAT_STYLE[heat];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
      <span className={`text-2xs font-semibold ${s.text}`}>{heat}</span>
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-ink-700 px-2 py-0.5 text-2xs font-medium text-fg-muted">
      {children}
    </span>
  );
}

export function SampleTag() {
  return (
    <span className="inline-flex items-center rounded border border-elevated/30 bg-elevated/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-elevated">
      sample
    </span>
  );
}

/** V4.6 — tiny inline SVG sparkline (no chart lib). `up` colors by risk direction. */
export function Sparkline({
  data,
  riskUpIsBad = false,
  className = "",
}: {
  data?: number[];
  riskUpIsBad?: boolean;
  className?: string;
}) {
  if (!data || data.length < 3) return null;
  const w = 56;
  const h = 18;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const rising = data[data.length - 1] >= data[0];
  // Color the line by whether the recent move is risk-positive or risk-negative.
  const stroke = rising === riskUpIsBad ? "rgb(var(--stress))" : "rgb(var(--calm))";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}
