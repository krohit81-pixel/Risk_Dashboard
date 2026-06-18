// app/api/dashboard/route.ts
// The homepage endpoint. The DATA layer (indicators, brief, heat map, Japan
// Watch) is rebuilt live on every load. The EDITORIAL layer (09–13) is read
// from the persisted daily snapshot — never regenerated here. If no snapshot
// exists yet, a curated seed is served so the app is never blank.

import { NextResponse } from "next/server";
import { fetchIndicators } from "@/lib/marketData";
import {
  EMERGING_RISKS,
  HEAT_MAP_BASE,
  IMPLICATIONS_BASE,
} from "@/lib/fallbackData";
import { buildBrief, deriveDevelopments, usHeatFromData } from "@/lib/riskEngine";
import {
  getLatestSnapshot,
  istDateKey,
  slotForNow,
  getConceptSeen,
} from "@/lib/snapshotStore";
import { curatedSnapshot, attachLiveDrift } from "@/lib/snapshotEngine";
import { buildOvernight } from "@/lib/overnight";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const indicators = await fetchIndicators();
  const updatedISO = new Date().toISOString();
  const brief = buildBrief(indicators, updatedISO);

  // Top developments: data-derived first, then curated geopolitics/banking.
  const derived = deriveDevelopments(indicators).slice(0, 4);
  const curated = [
    {
      id: "dev-geo",
      headline: "Geopolitical and trade friction remains a live tail risk",
      category: "Geopolitics" as const,
      severity: "Elevated" as const,
      whyItMatters:
        "Conflict and tariff escalation can spike energy prices and disrupt supply chains at short notice.",
      derived: false,
    },
    {
      id: "dev-bank",
      headline: "CRE and private-credit exposures stay on the supervisory radar",
      category: "Banking" as const,
      severity: "Moderate" as const,
      whyItMatters:
        "Refinancing at higher rates and opaque private-credit leverage warrant close portfolio monitoring.",
      derived: false,
    },
  ];
  const developments = [...derived, ...curated].slice(0, 5);

  const usBase = HEAT_MAP_BASE.find((h) => h.region === "United States")!;
  const heatMap = HEAT_MAP_BASE.map((h) =>
    h.region === "United States" ? usHeatFromData(indicators, usBase) : h
  );

  const anyLive = indicators.some((i) => i.live);
  const byId = (id: string) => indicators.find((i) => i.id === id)!;
  const japanWatch = ["usdjpy", "jgb10y", "bojrate", "nikkei", "japancpi"].map(byId);

  // ── Editorial layer: read the persisted daily snapshot (no regeneration) ──
  let snapshot = await getLatestSnapshot();
  let stale = false;
  if (!snapshot) {
    // Pre-first-run or no KV store → curated seed (clearly marked, not persisted).
    snapshot = curatedSnapshot(slotForNow(), indicators);
  } else {
    // Stale if the latest snapshot is from a previous IST day.
    const snapDate = istDateKey(new Date(snapshot.meta.generatedISO));
    if (snapDate < istDateKey()) stale = true;
  }
  // Frozen prose, but flag anchors that have materially drifted from live data.
  snapshot = attachLiveDrift(snapshot, indicators);
  snapshot.meta = { ...snapshot.meta, stale };

  const payload: DashboardData = {
    brief,
    developments,
    indicators,
    emergingRisks: EMERGING_RISKS,
    heatMap,
    implications: IMPLICATIONS_BASE,
    japanWatch,
    overnight: buildOvernight(indicators),
    conceptSeen: await getConceptSeen(),
    intelligence: snapshot.intelligence,
    snapshotMeta: snapshot.meta,
    anyLive,
    updatedISO,
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
