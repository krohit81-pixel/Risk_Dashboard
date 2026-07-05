// app/api/admin/seed-mizuho/route.ts
// V5.0 — one-time (idempotent) seed of the Mizuho Knowledge Repository into KV.
// Call with ?secret=<CRON_SECRET>. Re-run after updating MIZUHO_KNOWLEDGE to refresh KV
// without a code deploy path change. GET returns the currently-stored version.

import { NextRequest, NextResponse } from "next/server";
import { kvSet } from "@/lib/snapshotStore";
import { MIZUHO_KNOWLEDGE, MIZUHO_KNOWLEDGE_KEY, getMizuhoKnowledge } from "@/lib/mizuhoKnowledge";

export const dynamic = "force-dynamic";

function authed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → allow (dev)
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  // Idempotent seed — mirrors how the ingestion cron is triggered (GET + ?secret=).
  await kvSet(MIZUHO_KNOWLEDGE_KEY, MIZUHO_KNOWLEDGE);
  const current = await getMizuhoKnowledge();
  return NextResponse.json({
    ok: true,
    action: "seeded",
    key: MIZUHO_KNOWLEDGE_KEY,
    version: current.version,
    last_updated: current.last_updated,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
