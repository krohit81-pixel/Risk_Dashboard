"use client";

// app/print/[id]/page.tsx
// V5.3.4 — this route is now just a redirect. The real single-item print view moved to
// /print/item?id=<id> (see app/print/item/page.tsx for why). Kept as a thin redirect so any
// existing/bookmarked/shared /print/<id> links still land somewhere useful.

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyPrintItemRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  useEffect(() => {
    router.replace(`/print/item?id=${encodeURIComponent(id)}`);
  }, [id, router]);

  return <p className="p-10 text-center text-sm text-neutral-500">Redirecting…</p>;
}
