// app/api/research/analyze-stock/route.ts
// V5.15 — Stock Health mode (Research, image-only). Separate route from
// app/api/research/analyze/route.ts because the output shape (StockHealthAssessment) is
// unrelated to ResearchAnalysis — keeps that route's logic uncluttered rather than branching
// it three ways. Shares the SAME daily research quota counter (lib/researchQuota.ts) — this
// is still "a Research analysis" for usage-limiting purposes, not a separate budget to spend
// around the cap. Ephemeral like the rest of Research: computes and returns, persists nothing
// (saving is a separate explicit action via /api/saved).

import { NextResponse } from "next/server";
import { analyzeStockHealth } from "@/lib/stockHealth";
import type { ImageInput } from "@/lib/llm";
import { getResearchQuota, incrementResearchCount } from "@/lib/researchQuota";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { images?: ImageInput[]; sourceLabel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const quota = await getResearchQuota();
  if (quota.remaining <= 0) {
    return NextResponse.json(
      {
        ok: false,
        capped: true,
        quota,
        error:
          `Research is paused for today (used ${quota.used} of ${quota.cap}) to protect the daily ` +
          `briefing's quota. It resets after midnight IST.`,
      },
      { status: 429 }
    );
  }

  const images = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
  if (!images.length) {
    return NextResponse.json({ ok: false, error: "Add a screenshot of the stock's key statistics." }, { status: 400 });
  }

  try {
    const assessment = await analyzeStockHealth(images, body.sourceLabel);
    const used = await incrementResearchCount();
    return NextResponse.json({
      ok: true,
      assessment,
      quota: { ...quota, used, remaining: Math.max(0, quota.cap - used) },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || "Stock Health analysis failed." }, { status: 500 });
  }
}
