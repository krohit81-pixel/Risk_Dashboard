// app/api/bank-earnings/route.ts
// V5.8.0 — merged Bank Earnings data: the curated baseline (lib/bankEarnings.ts) with any
// per-bank KV overlay entries from a "Refresh Earnings" run applied on top. Read fresh on
// every request (cheap — no LLM/news calls here, those only happen on /refresh).

import { NextResponse } from "next/server";
import { AS_OF } from "@/lib/bankEarnings";
import { getMergedBankEarnings, getOverlayMeta } from "@/lib/bankEarningsStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const [banks, overlayMeta] = await Promise.all([getMergedBankEarnings(), getOverlayMeta()]);
  return NextResponse.json({ banks, asOf: AS_OF, overlayMeta });
}
