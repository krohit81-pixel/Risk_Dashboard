// components/shared/ToneTile.tsx
"use client";

import type { ReactNode } from "react";

/** Direction of RISK (not of the raw number) — negative = risk-off/bad, positive = risk-on/good. */
export type Tone = "negative" | "positive" | "neutral";

const STYLE: Record<Tone, { bg: string; text: string; sub: string }> = {
  negative: { bg: "bg-stress", text: "text-white", sub: "text-white/75" },
  // calm is a light-ish teal — dark text reads better on it than white (same choice as the
  // existing "NEW" badge elsewhere in the app).
  positive: { bg: "bg-calm", text: "text-[#06231d]", sub: "text-[#06231d]/70" },
  neutral: { bg: "bg-ink-700", text: "text-fg", sub: "text-fg-faint" },
};

/**
 * V5.6.4 — solid-colour "market board" tile (label / value / change), inspired by
 * Bloomberg-style ticker walls. Used for Home → What Changed and Show all indicators,
 * where the goal is an at-a-glance colour read, not a data table.
 */
export function ToneTile({
  tone,
  label,
  value,
  changeText,
  arrow,
  size = "md",
}: {
  tone: Tone;
  label: string;
  value?: ReactNode;
  changeText: string;
  arrow: "up" | "down" | "flat";
  size?: "md" | "sm";
}) {
  const s = STYLE[tone];
  const arrowChar = arrow === "up" ? "▲" : arrow === "down" ? "▼" : "•";
  const dense = size === "sm";
  return (
    <div className={`rounded-xl ${dense ? "px-3 py-2.5" : "px-3.5 py-3"} ${s.bg}`}>
      <p className={`${dense ? "text-[9.5px]" : "text-[10px]"} font-bold uppercase leading-tight tracking-wide ${s.sub}`}>
        {label}
      </p>
      {value != null ? (
        <p className={`tnum mt-1 ${dense ? "text-base" : "text-lg"} font-extrabold leading-none ${s.text}`}>{value}</p>
      ) : null}
      <p className={`tnum mt-1 flex items-center gap-1 ${dense ? "text-[11px]" : "text-[13px]"} font-bold ${s.text}`}>
        <span aria-hidden>{arrowChar}</span>
        {changeText}
      </p>
    </div>
  );
}
