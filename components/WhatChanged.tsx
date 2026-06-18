// components/WhatChanged.tsx
"use client";

import type { Indicator } from "@/lib/types";
import { Card, TrendArrow } from "./ui";
import { fmtValue, fmtChange } from "@/lib/format";

const TRACK = ["cpi", "fedfunds", "ust10y", "sp500", "vix", "usdjpy", "brent"];

export function WhatChanged({ indicators }: { indicators: Indicator[] }) {
  const rows = TRACK.map((id) => indicators.find((i) => i.id === id)).filter(
    (i): i is Indicator => Boolean(i)
  );

  return (
    <section className="rise">
      <Card className="overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line-soft text-2xs uppercase tracking-wide text-fg-faint">
              <th className="px-4 py-2 text-left font-medium">Indicator</th>
              <th className="px-2 py-2 text-right font-medium">Prev</th>
              <th className="px-2 py-2 text-right font-medium">Now</th>
              <th className="px-4 py-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody className="tnum">
            {rows.map((ind, i) => {
              const chg = fmtChange(ind);
              const chgColor =
                chg.dir === "flat"
                  ? "text-fg-muted"
                  : (ind.riskUpIsBad ? chg.dir === "up" : chg.dir === "down")
                  ? "text-stress"
                  : "text-calm";
              return (
                <tr
                  key={ind.id}
                  className={i < rows.length - 1 ? "border-b border-line-soft/60" : ""}
                >
                  <td className="px-4 py-2.5 text-left font-medium text-fg">
                    {ind.label}
                  </td>
                  <td className="px-2 py-2.5 text-right text-fg-muted">
                    {fmtValue(ind.previous, ind)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold text-fg">
                    {fmtValue(ind.value, ind)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium ${chgColor}`}>
                    <span className="inline-flex items-center gap-1.5">
                      {chg.text}
                      <TrendArrow trend={ind.trend} riskUpIsBad={ind.riskUpIsBad} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
