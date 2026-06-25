// app/api/bloomberg/route.ts
// V5 — serves the per-briefing Bloomberg digests + the analyzed-headline set to the
// Research workspace. Read-only; no LLM call.

import { NextResponse } from "next/server";
import { getBloombergAll, getBloombergAnalyzed } from "@/lib/snapshotStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const [digests, analyzed] = await Promise.all([getBloombergAll(), getBloombergAnalyzed()]);
  return NextResponse.json({ ok: true, digests, analyzed });
}
