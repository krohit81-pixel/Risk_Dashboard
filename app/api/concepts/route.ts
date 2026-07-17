// app/api/concepts/route.ts
// V5.5 — CRUD for user-added concepts (separate from the curated static library).

import { NextResponse } from "next/server";
import { getUserConcepts, saveUserConcept, deleteUserConcept, type UserConcept } from "@/lib/userConcepts";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: await getUserConcepts() });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<UserConcept>;
    if (!body.term || !body.layman || !body.category) {
      return NextResponse.json({ ok: false, error: "term, category, and layman are required" }, { status: 400 });
    }
    const concept: UserConcept = {
      id: body.id || `user-concept-${Date.now()}`,
      term: String(body.term),
      formal: body.formal ? String(body.formal) : undefined,
      category: body.category as UserConcept["category"],
      aliases: Array.isArray(body.aliases) ? body.aliases.map(String) : [],
      layman: String(body.layman),
      risk: String(body.risk ?? ""),
      cro: String(body.cro ?? ""),
      sourceText: body.sourceText ? String(body.sourceText) : undefined,
    };
    const items = await saveUserConcept(concept);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  try {
    const items = await deleteUserConcept(id);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
