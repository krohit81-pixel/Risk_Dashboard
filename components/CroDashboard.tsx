// components/CroDashboard.tsx
"use client";

import type { Indicator } from "@/lib/types";
import { Card, TrendArrow, SampleTag, Sparkline } from "./ui";
import { fmtValue, fmtChange } from "@/lib/format";

// Within each section, keep a stable sub-order by group.
const GROUP_ORDER: Indicator["group"][] = [
  "Macro", "Markets", "Rates", "Credit", "Volatility", "FX", "Commodities",
];

function relMonth(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
function relDay(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function IndicatorCard({ ind }: { ind: Indicator }) {
  const chg = fmtChange(ind);
  const chgColor =
    chg.dir === "flat"
      ? "text-fg-muted"
      : (ind.riskUpIsBad ? chg.dir === "up" : chg.dir === "down")
      ? "text-stress"
      : "text-calm";

  // Economic releases: prefer the true publication date ("Last released: Jun 11"),
  // fall back to the data's reference month ("May 2026 data").
  const isRelease = ind.section === "release";
  const lastReleased = isRelease
    ? ind.releaseDateISO
      ? `Last released: ${relDay(ind.releaseDateISO)}`
      : ind.observationDate
      ? `${relMonth(ind.observationDate)} data`
      : ""
    : "";

  return (
    <Card className="px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium leading-tight text-fg-muted">{ind.label}</span>
        {!ind.live ? <SampleTag /> : null}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className="tnum text-xl font-bold tracking-tight text-fg">{fmtValue(ind.value, ind)}</span>
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
      {lastReleased ? <p className="mt-1 text-[10px] text-fg-faint">{lastReleased}</p> : null}
    </Card>
  );
}

function Grid({ items }: { items: Indicator[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((ind) => (
        <IndicatorCard key={ind.id} ind={ind} />
      ))}
    </div>
  );
}

export function CroDashboard({ indicators }: { indicators: Indicator[] }) {
  // Split the page: scheduled economic releases vs real-time market indicators.
  // (Japan-group indicators render separately in Japan Watch.)
  const inScope = indicators.filter((i) => i.group !== "Japan");
  const order = (i: Indicator) => GROUP_ORDER.indexOf(i.group);
  const releases = inScope.filter((i) => i.section === "release").sort((a, b) => order(a) - order(b));
  const markets = inScope
    .filter((i) => i.section !== "release")
    .sort((a, b) => order(a) - order(b));

  return (
    <section className="rise space-y-5">
      {markets.length ? (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="text-2xs font-semibold uppercase tracking-widest text-fg-faint">Market Indicators</p>
            <span className="text-[10px] text-fg-faint">real-time · daily</span>
          </div>
          <Grid items={markets} />
        </div>
      ) : null}

      {releases.length ? (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="text-2xs font-semibold uppercase tracking-widest text-fg-faint">Economic Releases</p>
            <span className="text-[10px] text-fg-faint">scheduled · monthly</span>
          </div>
          <Grid items={releases} />
        </div>
      ) : null}
    </section>
  );
}
