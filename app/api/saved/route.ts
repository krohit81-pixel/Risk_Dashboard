// app/api/saved/route.ts
// V5.2 — simplified for Supabase: the client sends the full SavedItem, and it's stored
// as-is in the `payload` column. No more hand-maintained field whitelist — that pattern
// silently dropped new fields twice (mizuhoLens, articleDate) as SavedItem grew. Minimal
// shape validation only; savedStore.itemToRow derives the structured/queryable columns.

import { NextResponse } from "next/server";
import { getSaved, getSavedById, addSaved, removeSaved, type SavedItem } from "@/lib/savedStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    console.log(`[api/saved] id lookup requested: "${id}"`);
    try {
      const item = await getSavedById(id);
      console.log(`[api/saved] id lookup result: ${item ? "found" : "not found"}`);
      return NextResponse.json({ item }); // item: null here means a genuine "no such id"
    } catch (e) {
      return NextResponse.json({ item: null, error: String(e) }, { status: 500 });
    }
  }
  return NextResponse.json({ items: await getSaved() });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SavedItem>;
    if (!body?.id || !body?.title || !body?.kind) {
      return NextResponse.json({ ok: false, error: "id, title, and kind are required" }, { status: 400 });
    }
    const item: SavedItem = {
      ...body,
      id: String(body.id),
      kind: body.kind,
      title: String(body.title),
      interpretation: String(body.interpretation ?? ""),
      bankingImpact: String(body.bankingImpact ?? ""),
      whyMizuho: Array.isArray(body.whyMizuho) ? body.whyMizuho.map(String) : [],
      sources: String(body.sources ?? ""),
      savedAtISO: new Date().toISOString(),
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
  try {
    const items = await removeSaved(id);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
