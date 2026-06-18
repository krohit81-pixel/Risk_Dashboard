// lib/format.ts
import type { Indicator } from "./types";

export function fmtNumber(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Display string for an indicator value, with unit affordances. */
export function fmtValue(value: number | null, ind: Indicator): string {
  if (value == null) return "—";
  const base = fmtNumber(value, ind.decimals);
  switch (ind.unit) {
    case "%":
      return `${base}%`;
    case "usd":
      return `$${base}`;
    case "yen":
      return `¥${base}`;
    case "pts":
    case "index":
    case "ratio":
    default:
      return base;
  }
}

/** Signed change between current and previous, formatted for display. */
export function fmtChange(ind: Indicator): { text: string; dir: "up" | "down" | "flat" } {
  if (ind.value == null || ind.previous == null) return { text: "—", dir: "flat" };
  const diff = ind.value - ind.previous;
  const dir = ind.trend === "stable" ? "flat" : ind.trend === "up" ? "up" : "down";
  // Rates / percentage-point series: show in bps where it reads better.
  const isPct = ind.unit === "%";
  const isIndex = ind.unit === "index";
  let text: string;
  if (isPct) {
    const bps = Math.round(diff * 100);
    text = `${bps >= 0 ? "+" : ""}${bps} bps`;
  } else if (isIndex) {
    const pctChg = (diff / (ind.previous || 1)) * 100;
    text = `${pctChg >= 0 ? "+" : ""}${pctChg.toFixed(2)}%`;
  } else {
    text = `${diff >= 0 ? "+" : ""}${fmtNumber(diff, ind.decimals)}`;
  }
  return { text, dir };
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.round((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
