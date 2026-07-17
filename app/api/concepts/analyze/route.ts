// app/api/concepts/analyze/route.ts
// V5.5 — analyze pasted text into a draft concept (not saved — the client reviews/edits, then
// POSTs to /api/concepts to actually save it).

import { NextResponse } from "next/server";
import { analyzeConceptText } from "@/lib/conceptAnalyze";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; termHint?: string };
    const text = (body.text || "").trim();
    if (text.length < 10) {
      return NextResponse.json({ ok: false, error: "Paste a bit more text to analyze." }, { status: 400 });
    }
    const draft = await analyzeConceptText(text, body.termHint);
    if (!draft) {
      return NextResponse.json({ ok: false, error: "Could not draft a concept from that text — try adding more detail." }, { status: 422 });
    }
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
