// app/api/briefing/generate/route.ts
// V5.3 — compiles a briefing book on demand (query saved items + 2 dedicated LLM calls for
// preface/action-items). Not cached: always regenerates, since staleness would be more
// confusing than the modest latency of a couple of LLM calls. GET (idempotent from the
// caller's perspective — no writes), matching the app's other read routes.

import { NextRequest, NextResponse } from "next/server";
import { generateBriefingBook } from "@/lib/briefingBook";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const packId = new URL(req.url).searchParams.get("pack");
  if (!packId) {
    return NextResponse.json({ ok: false, error: "?pack=<id> required" }, { status: 400 });
  }
  try {
    const book = await generateBriefingBook(packId);
    if (!book) return NextResponse.json({ ok: false, error: `Unknown pack: ${packId}` }, { status: 404 });
    return NextResponse.json({ ok: true, book });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
