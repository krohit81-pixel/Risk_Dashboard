// app/api/cron/weekly/route.ts
// V4.2 — scheduled weekly refresh of Markets sections 03–05 + Weekly Learning.
// Runs Saturday morning IST so the weekly view is ready for weekend review.
// ALWAYS Anthropic (forced inside the engine) — never touches Gemini quota.
// Protected by CRON_SECRET like the editorial cron. Fail-soft: a miss retains
// last week's artifact (graceful staleness); the run is logged either way.

import { NextResponse } from "next/server";
import { generateWeekly } from "@/lib/weeklyEngine";
import { recordRun } from "@/lib/runStore";

export const dynamic = "force-dynamic";
export const maxDuration = 180; // Vercel Pro

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  const qs = new URL(req.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || qs === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  console.log(`[cron] weekly starting`);
  const result = await generateWeekly();
  console.log(
    `[cron] weekly done ok=${result.ok} markets=${result.marketsRefreshed} learning=${result.weeklyLearningRefreshed}` +
      (result.error ? ` error=${result.error}` : "")
  );

  await recordRun({
    ranISO: new Date().toISOString(),
    trigger: "scheduled",
    job: "weekly",
    ok: result.ok,
    provider: result.ok ? result.provider : "none",
    degradeReason: result.ok
      ? result.marketsRefreshed && result.weeklyLearningRefreshed
        ? undefined
        : "partial_weekly_refresh"
      : "weekly_failed_last_good_retained",
    error: result.error,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
