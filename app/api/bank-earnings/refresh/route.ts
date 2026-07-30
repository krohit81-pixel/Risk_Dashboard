// app/api/bank-earnings/refresh/route.ts
// V5.8.0 — manual "Refresh Earnings" trigger (Settings → Generation History). Same busy-flag
// + last-good-kept pattern as /api/regenerate: never overwrites the baseline/overlay with a
// bad or partial result, and can't be double-triggered while a run is in flight.

import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/snapshotStore";
import { refreshBankEarnings } from "@/lib/bankEarningsRefresh";
import { recordRun } from "@/lib/runStore";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

interface EarningsRegenStatus {
  state: "running" | "idle" | "failed";
  startedISO?: string;
  finishedISO?: string;
  note?: string;
  error?: string;
}

const KEY = "earnings:regen:status";
const STALE_MS = 4 * 60 * 1000;

export async function GET() {
  const status = (await kvGet<EarningsRegenStatus>(KEY)) ?? { state: "idle" };
  return NextResponse.json(status);
}

export async function POST() {
  const prev = (await kvGet<EarningsRegenStatus>(KEY)) ?? { state: "idle" };
  if (prev.state === "running" && prev.startedISO && Date.now() - Date.parse(prev.startedISO) < STALE_MS) {
    return NextResponse.json({ ok: false, busy: true, error: "earnings refresh already running" }, { status: 409 });
  }

  await kvSet(KEY, { state: "running", startedISO: new Date().toISOString() } satisfies EarningsRegenStatus);
  try {
    console.log(`[earnings] manual refresh starting`);
    const summary = await refreshBankEarnings();
    const note = `${summary.banksChecked} checked · ${summary.banksWithNews} with news · ${summary.banksUpdated} updated`;
    const done: EarningsRegenStatus = { state: "idle", finishedISO: new Date().toISOString(), note };
    await kvSet(KEY, done);
    await recordRun({
      ranISO: new Date().toISOString(),
      trigger: "manual",
      ok: summary.ok,
      job: "earnings",
      provider: summary.provider,
      degradeReason: summary.degradeReason,
      note,
      error: summary.error,
    });
    console.log(`[earnings] done · ${note}${summary.error ? ` · error=${summary.error}` : ""}`);
    return NextResponse.json({ ...summary, note });
  } catch (err) {
    const error = String(err);
    await kvSet(KEY, { state: "failed", finishedISO: new Date().toISOString(), error } satisfies EarningsRegenStatus);
    await recordRun({ ranISO: new Date().toISOString(), trigger: "manual", ok: false, job: "earnings", error });
    console.log(`[earnings] FAILED — baseline/overlay retained: ${error}`);
    return NextResponse.json({ ok: false, error, note: "previous data retained" }, { status: 500 });
  }
}
