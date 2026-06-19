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
