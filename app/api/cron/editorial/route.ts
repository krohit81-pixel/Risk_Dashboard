// app/api/cron/editorial/route.ts
// Scheduled generation of the daily editorial snapshot (two slots/day).
// Protected by CRON_SECRET. Vercel Cron sends `Authorization: Bearer <secret>`.
// On any failure the previous snapshot is left untouched (graceful staleness).

import { NextResponse } from "next/server";
import { fetchIndicators } from "@/lib/marketData";
import { generateSnapshot } from "@/lib/snapshotEngine";
import { saveSnapshot, slotForNow } from "@/lib/snapshotStore";
import { recordRun } from "@/lib/runStore";
import { buildBrief, buildDevelopments } from "@/lib/riskEngine";
import { buildOvernight } from "@/lib/overnight";
import { renderDailyBriefPdf } from "@/lib/dailyBriefPdf";
import { sendDailyBriefEmail } from "@/lib/dailyBriefEmail";
import type { SnapshotSlot } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 180; // Vercel Pro (up to 300s)

/** V5.13 — best-effort: builds and emails the Daily Risk Brief PDF after a successful snapshot
 *  save. Deliberately swallows its own errors (logged, never thrown) — a PDF/email failure must
 *  never turn a successful snapshot generation into a failed cron run. Mirrors the SAME "live
 *  data spine" computation app/api/dashboard/route.ts uses (buildBrief/buildDevelopments/
 *  buildOvernight on the same `indicators`), so the PDF matches what the Home tab shows right
 *  now, not a stale/different view. */
async function sendDailyBriefBestEffort(
  indicators: Awaited<ReturnType<typeof fetchIndicators>>,
  snapshot: Awaited<ReturnType<typeof generateSnapshot>>
): Promise<{ attempted: boolean; ok: boolean; note: string }> {
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  try {
    const pdf = await renderDailyBriefPdf({
      dateLabel,
      brief: buildBrief(indicators, new Date().toISOString()),
      overnight: buildOvernight(indicators),
      developments: buildDevelopments(indicators),
      themes: snapshot.intelligence.themes,
      editorial: snapshot.intelligence.editorial,
      japanAsia: snapshot.intelligence.japanAsia,
      radar: snapshot.intelligence.radar,
    });
    const sent = await sendDailyBriefEmail(pdf, dateLabel);
    if (sent.skipped) return { attempted: false, ok: false, note: `email skipped: ${sent.reason}` };
    if (!sent.ok) return { attempted: true, ok: false, note: `email failed: ${sent.reason}` };
    return { attempted: true, ok: true, note: "email sent" };
  } catch (e) {
    return { attempted: true, ok: false, note: `PDF build failed: ${String(e)}` };
  }
}

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

    // V5.13 — best-effort Daily Risk Brief PDF email. Never lets a PDF/email problem turn this
    // already-successful snapshot save into a failed cron run — see the function's own comment.
    const brief = await sendDailyBriefBestEffort(indicators, snapshot);
    console.log(`[cron] daily brief email: ${brief.note}`);

    await recordRun({
      ranISO: new Date().toISOString(),
      trigger: "scheduled",
      ok: true,
      provider: snapshot.meta.llmProvider,
      fallbackUsed: snapshot.meta.llmProvider === "anthropic",
      degradeReason: snapshot.meta.degradeReason,
      themes: snapshot.meta.themesGenerated,
      note: brief.attempted ? `daily brief: ${brief.note}` : undefined,
    });
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
      dailyBrief: brief,
      sources: snapshot.meta.sources,
    });
  } catch (err) {
    // Do NOT overwrite the existing snapshot — graceful staleness.
    await recordRun({ ranISO: new Date().toISOString(), trigger: "scheduled", ok: false, error: String(err) });
    return NextResponse.json(
      { ok: false, slot, error: String(err), note: "previous snapshot retained" },
      { status: 500 }
    );
  }
}
