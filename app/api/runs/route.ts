// app/api/runs/route.ts
import { NextResponse } from "next/server";
import { getRuns } from "@/lib/runStore";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ runs: await getRuns() });
}
