// components/CroDashboard.tsx
"use client";

import type { Indicator } from "@/lib/types";
import { Card, TrendArrow, SampleTag } from "./ui";
import { fmtValue, fmtChange } from "@/lib/format";

const GROUP_ORDER: Indicator["group"][] = [
  "Macro",
  "Markets",
  "Rates",
  "Credit",
  "Volatility",
  "FX",
  "Commodities",
];

function IndicatorCard({ ind }: { ind: Indicator }) {
  const chg = fmtChange(ind);
  const chgColor =
    chg.dir === "flat"
      ? "text-fg-muted"
      : (ind.riskUpIsBad ? chg.dir === "up" : chg.dir === "down")
      ? "text-stress"
      : "text-calm";
  return (
    <Card className="px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium leading-tight text-fg-muted">
          {ind.label}
        </span>
        {!ind.live ? <SampleTag /> : null}
      </div>
      <div className="mt-1.5 flex items-end justify-between">
        <span className="tnum text-xl font-bold tracking-tight text-fg">
          {fmtValue(ind.value, ind)}
        </span>
        <TrendArrow trend={ind.trend} riskUpIsBad={ind.riskUpIsBad} className="text-sm" />
      </div>
      <div className="mt-0.5 flex items-center justify-between text-2xs">
        <span className="tnum text-fg-faint">
          prev {fmtValue(ind.previous, ind)}
        </span>
        <span className={`tnum font-medium ${chgColor}`}>
          {chg.text} <span className="text-fg-faint">· {ind.cadence}</span>
        </span>
      </div>
    </Card>
  );
}

export function CroDashboard({ indicators }: { indicators: Indicator[] }) {
  const byGroup = GROUP_ORDER.map((g) => ({
    group: g,
    items: indicators.filter((i) => i.group === g),
  })).filter((x) => x.items.length > 0);

  return (
    <section className="rise">
      <div className="space-y-4">
        {byGroup.map(({ group, items }) => (
          <div key={group}>
            <p className="mb-1.5 text-2xs font-semibold uppercase tracking-widest text-fg-faint">
              {group}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((ind) => (
                <IndicatorCard key={ind.id} ind={ind} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
