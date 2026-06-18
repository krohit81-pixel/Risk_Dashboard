// app/api/cron/editorial/route.ts
// Scheduled generation of the daily editorial snapshot (two slots/day).
// Protected by CRON_SECRET. Vercel Cron sends `Authorization: Bearer <secret>`.
// On any failure the previous snapshot is left untouched (graceful staleness).

import { NextResponse } from "next/server";
import { fetchIndicators } from "@/lib/marketData";
import { generateSnapshot } from "@/lib/snapshotEngine";
import { saveSnapshot, slotForNow } from "@/lib/snapshotStore";
import type { SnapshotSlot } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 180; // Vercel Pro (up to 300s)

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured (e.g. local) → allow
  const auth = req.headers.get("authorization");
  const qs = new URL(req.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || qs === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const param = new URL(req.url).searchParams.get("slot");
  const slot: SnapshotSlot = param === "morning" || param === "evening" ? param : slotForNow();

  try {
    console.log(`[cron] slot=${slot} starting`);
    const indicators = await fetchIndicators();
    const snapshot = await generateSnapshot(slot, indicators); // throws on invalid
    await saveSnapshot(snapshot);
    console.log(`[cron] slot=${slot} saved · degradeReason=${snapshot.meta.degradeReason} · provider=${snapshot.meta.llmProvider}`);
    return NextResponse.json({
      ok: true,
      slot,
      generatedISO: snapshot.meta.generatedISO,
      themesGenerated: snapshot.meta.themesGenerated,
      articlesReviewed: snapshot.meta.articlesReviewed,
      seed: snapshot.meta.seed,
      degradeReason: snapshot.meta.degradeReason,
      provider: snapshot.meta.llmProvider,
      stale: snapshot.meta.stale,
      sources: snapshot.meta.sources,
    });
  } catch (err) {
    // Do NOT overwrite the existing snapshot — graceful staleness.
    return NextResponse.json(
      { ok: false, slot, error: String(err), note: "previous snapshot retained" },
      { status: 500 }
    );
  }
}
