// app/api/admin/migrate-saved/route.ts
// V5.2 — ONE-TIME migration: read the legacy KV blob (saved:items) and upsert every item
// into Supabase. Idempotent (upsert by id) — safe to re-run if it fails partway or if new
// items get saved to KV before you cut over. Does NOT delete or modify the KV data, so it
// stays as a backup. Call with ?secret=<MIGRATION_SECRET>.
//
// Uses its OWN env var (MIGRATION_SECRET), not CRON_SECRET — this is a one-time, sensitive,
// data-moving endpoint, so it gets a fresh dedicated secret rather than reusing whatever
// CRON_SECRET happens to be. Unlike the cron/seed routes, this one FAILS CLOSED if the
// secret isn't set (no "allow if unconfigured" convenience) — deliberate, since this writes
// real data and a stray unauthenticated hit shouldn't silently succeed.

import { NextRequest, NextResponse } from "next/server";
import { kvGet } from "@/lib/snapshotStore";
import { addSaved, savedStoreBackend, type SavedItem } from "@/lib/savedStore";
import { supabaseAvailable } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LEGACY_KV_KEY = "saved:items";

function authed(req: NextRequest): boolean {
  const secret = process.env.MIGRATION_SECRET;
  if (!secret) return false; // fail closed — this route must not be runnable unauthenticated
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized — set MIGRATION_SECRET in Vercel env and pass ?secret=<it>" },
      { status: 401 }
    );
  }

  if (!supabaseAvailable()) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured — nothing to migrate into." },
      { status: 400 }
    );
  }

  const legacy = (await kvGet<SavedItem[]>(LEGACY_KV_KEY)) ?? [];
  if (legacy.length === 0) {
    return NextResponse.json({ ok: true, migrated: 0, failed: 0, note: "No items found at KV key 'saved:items'." });
  }

  let migrated = 0;
  const failures: { id: string; error: string }[] = [];
  for (const item of legacy) {
    try {
      await addSaved(item); // upsert — preserves the item's own savedAtISO if present
      migrated++;
    } catch (e) {
      failures.push({ id: item.id, error: String(e) });
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    backend: savedStoreBackend(),
    source: `KV:${LEGACY_KV_KEY}`,
    found: legacy.length,
    migrated,
    failed: failures.length,
    failures: failures.length ? failures : undefined,
    note: "KV data left untouched — this is a copy, not a move. Verify counts match before relying on Supabase alone.",
  });
}
