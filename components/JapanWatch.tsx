// components/JapanWatch.tsx
"use client";

import type { Indicator } from "@/lib/types";
import { Card, TrendArrow, SampleTag, Sparkline } from "./ui";
import { fmtValue, fmtChange } from "@/lib/format";

function JapanCard({ ind }: { ind: Indicator }) {
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
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className="tnum text-xl font-bold tracking-tight text-fg">
          {fmtValue(ind.value, ind)}
        </span>
        <div className="flex items-center gap-1.5">
          <Sparkline data={ind.history} riskUpIsBad={ind.riskUpIsBad} />
          <TrendArrow trend={ind.trend} riskUpIsBad={ind.riskUpIsBad} className="text-sm" />
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between text-2xs">
        <span className="tnum text-fg-faint">prev {fmtValue(ind.previous, ind)}</span>
        <span className={`tnum font-medium ${chgColor}`}>
          {chg.text} <span className="text-fg-faint">· {ind.cadence}</span>
        </span>
      </div>
    </Card>
  );
}

export function JapanWatch({ indicators }: { indicators: Indicator[] }) {
  return (
    <section className="rise">
      <div className="grid grid-cols-2 gap-2.5">
        {indicators.map((ind) => (
          <JapanCard key={ind.id} ind={ind} />
        ))}
      </div>
      <p className="mt-2 text-2xs leading-relaxed text-fg-faint">
        JGB 10Y, BOJ rate and Japan CPI update on a monthly reporting cadence; USD/JPY and
        the Nikkei are live. A weaker yen and rising JGB yields pressure the global carry trade.
      </p>
    </section>
  );
}
