// app/api/bloomberg/route.ts
// V5.0 — serves the latest Bloomberg digest (written to shared KV by the external
// bloomberg-extractor service) to the Research workspace. Read-only; no LLM call.

import { NextResponse } from "next/server";
import { getBloombergLatest, getBloombergByDate } from "@/lib/snapshotStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date");
  const digest = date ? await getBloombergByDate(date) : await getBloombergLatest();
  return NextResponse.json({ ok: true, digest: digest ?? null });
}
