// app/api/saved/route.ts
import { NextResponse } from "next/server";
import { getSaved, addSaved, removeSaved, type SavedItem } from "@/lib/savedStore";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: await getSaved() });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SavedItem;
    if (!body?.id || !body?.title) {
      return NextResponse.json({ ok: false, error: "id and title required" }, { status: 400 });
    }
    const item: SavedItem = {
      id: String(body.id),
      kind: body.kind ?? "theme",
      title: String(body.title),
      interpretation: String(body.interpretation ?? ""),
      bankingImpact: String(body.bankingImpact ?? ""),
      whyMizuho: Array.isArray(body.whyMizuho) ? body.whyMizuho.map(String) : [],
      sources: String(body.sources ?? ""),
      savedAtISO: new Date().toISOString(),
      snapshotISO: body.snapshotISO ? String(body.snapshotISO) : undefined,
      sourceType: body.sourceType,
      analysisDateISO: body.analysisDateISO ? String(body.analysisDateISO) : undefined,
      originalUrl: body.originalUrl ? String(body.originalUrl) : undefined,
      relatedConcepts: Array.isArray(body.relatedConcepts) ? body.relatedConcepts.map(String) : undefined,
      focus: Array.isArray(body.focus) ? body.focus : undefined,
      // ── V4.1a full-piece capture — persist the deeper content (was being dropped) ──
      whatHappened: body.whatHappened ? String(body.whatHappened) : undefined,
      bankingImpactAreas: Array.isArray(body.bankingImpactAreas) ? body.bankingImpactAreas : undefined,
      layman: body.layman && typeof body.layman === "object" ? body.layman : undefined,
      detail: body.detail && typeof body.detail === "object" ? body.detail : undefined,
    };
    const items = await addSaved(item);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const items = await removeSaved(id);
  return NextResponse.json({ ok: true, items });
}
