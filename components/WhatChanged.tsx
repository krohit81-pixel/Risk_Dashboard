// components/WhatChanged.tsx
"use client";

import type { Indicator } from "@/lib/types";
import { fmtValue, fmtChange } from "@/lib/format";
import { ToneTile, type Tone } from "./shared/ToneTile";

// V5.5.1 — was a 7-item subset that excluded several indicators the "What Changed" movers
// list (lib/overnight.ts) already ranks by magnitude (japancpi, nikkei, curve2s10s, jgb10y,
// move, gold, nasdaq, unrate) — so a mover could show a delta with no way to see its actual
// prev/now values. Expanded to the full tracked set, grouped for readability. Any indicator
// not actually present in the fetched data simply won't render a row (existing .filter(Boolean)
// below already handles that safely).
const TRACK = [
  "cpi", "japancpi", "unrate", "fedfunds", // rates & inflation
  "ust10y", "jgb10y", "curve2s10s",         // rates curve
  "vix", "move", "hyspread",                // vol & credit
  "usdjpy", "brent", "gold",                // FX & commodities
  "sp500", "nasdaq", "nikkei",              // equities
];

// V5.6.4 — was a data table; switched to the same colour-tile grid as the top-movers section
// above it, so the whole "What Changed" area reads as one consistent Bloomberg-board look.
export function WhatChanged({ indicators }: { indicators: Indicator[] }) {
  const rows = TRACK.map((id) => indicators.find((i) => i.id === id)).filter(
    (i): i is Indicator => Boolean(i)
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map((ind) => {
        const chg = fmtChange(ind);
        const tone: Tone =
          chg.dir === "flat"
            ? "neutral"
            : (ind.riskUpIsBad ? chg.dir === "up" : chg.dir === "down")
            ? "negative"
            : "positive";
        return (
          <ToneTile
            key={ind.id}
            size="sm"
            tone={tone}
            label={ind.label}
            value={fmtValue(ind.value, ind)}
            changeText={chg.text}
            arrow={chg.dir}
          />
        );
      })}
    </div>
  );
}
