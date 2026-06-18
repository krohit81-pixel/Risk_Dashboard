// components/RiskHeatMap.tsx
"use client";

import { useState } from "react";
import type { RegionHeat } from "@/lib/types";
import { Card, HeatDot } from "./ui";

const EDGE: Record<RegionHeat["heat"], string> = {
  Green: "border-l-calm",
  Amber: "border-l-elevated",
  Red: "border-l-stress",
};

function Region({ r }: { r: RegionHeat }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className={`border-l-2 ${EDGE[r.heat]} px-4 py-3`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-lg leading-none">{r.flag}</span>
          <span className="text-[15px] font-semibold text-fg">{r.region}</span>
        </span>
        <span className="flex items-center gap-2">
          <HeatDot heat={r.heat} />
          <span className="text-xs text-fg-faint">{open ? "\u25be" : "\u25b8"}</span>
        </span>
      </button>
      {open ? (
        <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{r.reason}</p>
      ) : null}
    </Card>
  );
}

export function RiskHeatMap({ regions }: { regions: RegionHeat[] }) {
  return (
    <section className="rise">
      <p className="mb-2.5 text-2xs text-fg-faint">Tap a region for the one-line read.</p>
      <div className="space-y-2">
        {regions.map((r) => (
          <Region key={r.region} r={r} />
        ))}
      </div>
    </section>
  );
}
