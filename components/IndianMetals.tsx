// components/IndianMetals.tsx
// V5.14 — "Indian Market — Metals" (Markets tab, section 05). Same card/grid format as the
// Key CRO Dashboard's "Market Indicators" section (reuses its exported Grid), just a different
// data set: gold/silver/copper/aluminium/uranium, global COMEX/LME spot converted to INR at the
// live USD/INR rate, in the units India's metal market quotes in — see lib/indianMetals.ts for
// the conversion and why an exact MCX print isn't feasible without a paid data source (and why
// uranium specifically gets its own, stronger caveat below).
"use client";

import type { Indicator } from "@/lib/types";
import { Grid } from "./CroDashboard";

export function IndianMetals({ items }: { items: Indicator[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-2xs leading-relaxed text-fg-faint">
        Global spot (COMEX/LME) converted to INR at the live USD/INR rate, in the units India&apos;s
        metal market quotes in. Tracks the same international benchmark — not the exact MCX
        print, which runs higher once import duty, GST and dealer premium are added. Uranium is
        shown as a global-benchmark equivalent only — it isn&apos;t traded on India&apos;s open
        commodity market at all (import/pricing is government-controlled), and the underlying
        price itself is a thin, periodically-revised industry assessment rather than a daily
        traded print.
      </p>
      <Grid items={items} />
    </div>
  );
}
