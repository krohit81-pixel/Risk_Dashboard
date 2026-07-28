// components/WhatChangedOvernight.tsx
"use client";

import type { Indicator, OvernightChange } from "@/lib/types";
import { fmtValue } from "@/lib/format";
import { ToneTile } from "./shared/ToneTile";

function arrowFor(deltaText: string): "up" | "down" | "flat" {
  const t = deltaText.trim();
  if (t.startsWith("-") || t.startsWith("−")) return "down";
  if (t.startsWith("+")) return "up";
  return "flat";
}

/** V5.6.4 — the day's biggest movers as a grid of colour-coded tiles (Bloomberg-board style)
 *  instead of a plain list. `indicators` is optional so the tiles degrade gracefully to
 *  delta-only if the full indicator set isn't available for some reason. */
export function WhatChangedOvernight({ items, indicators }: { items: OvernightChange[]; indicators?: Indicator[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((c) => {
        const ind = indicators?.find((i) => i.id === c.id);
        return (
          <ToneTile
            key={c.id}
            tone={c.tone}
            label={c.label}
            value={ind ? fmtValue(ind.value, ind) : undefined}
            changeText={c.deltaText}
            arrow={arrowFor(c.deltaText)}
          />
        );
      })}
    </div>
  );
}
