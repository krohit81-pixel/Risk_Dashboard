// app/api/regenerate/route.ts
// Manual editorial regeneration from the UI. Runs the same pipeline as the cron,
// guarded by a KV busy-flag so it can't run concurrently. On failure the previous
// snapshot is retained (generateSnapshot throws; we never save a bad result).

import { NextResponse } from "next/server";
import { fetchIndicators } from "@/lib/marketData";
import { generateSnapshot } from "@/lib/snapshotEngine";
import { saveSnapshot, kvGet, kvSet } from "@/lib/snapshotStore";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

interface RegenStatus {
  state: "running" | "idle" | "failed";
  startedISO?: string;
  finishedISO?: string;
  provider?: string;
  degradeReason?: string;
  error?: string;
}

const KEY = "regen:status";
const STALE_MS = 4 * 60 * 1000;

export async function GET() {
  const status = (await kvGet<RegenStatus>(KEY)) ?? { state: "idle" };
  return NextResponse.json(status);
}

export async function POST() {
  const prev = (await kvGet<RegenStatus>(KEY)) ?? { state: "idle" };
  if (prev.state === "running" && prev.startedISO && Date.now() - Date.parse(prev.startedISO) < STALE_MS) {
    return NextResponse.json({ ok: false, busy: true, error: "regeneration already running" }, { status: 409 });
  }

  await kvSet(KEY, { state: "running", startedISO: new Date().toISOString() } satisfies RegenStatus);
  try {
    console.log(`[regen] manual regeneration starting`);
    const indicators = await fetchIndicators();
    const snapshot = await generateSnapshot("morning", indicators); // throws on invalid
    await saveSnapshot(snapshot);
    const done: RegenStatus = {
      state: "idle",
      finishedISO: new Date().toISOString(),
      provider: snapshot.meta.llmProvider,
      degradeReason: snapshot.meta.degradeReason,
    };
    await kvSet(KEY, done);
    console.log(`[regen] saved · provider=${snapshot.meta.llmProvider} · degradeReason=${snapshot.meta.degradeReason}`);
    return NextResponse.json({
      ok: true,
      provider: snapshot.meta.llmProvider,
      degradeReason: snapshot.meta.degradeReason,
      themesGenerated: snapshot.meta.themesGenerated,
      generatedISO: snapshot.meta.generatedISO,
    });
  } catch (err) {
    await kvSet(KEY, {
      state: "failed",
      finishedISO: new Date().toISOString(),
      error: String(err),
    } satisfies RegenStatus);
    console.log(`[regen] FAILED — previous snapshot retained: ${String(err)}`);
    return NextResponse.json({ ok: false, error: String(err), note: "previous snapshot retained" }, { status: 500 });
  }
}
