"use client";

// app/print/[id]/page.tsx
// V5.3 — dedicated print-styled route for a single saved item. Approach: browser-native
// Print → Save as PDF, not a server-rendered PDF pipeline (Puppeteer-class tooling is a real
// infra addition on Vercel serverless) — upgradeable later if a heavier renderer is ever needed.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { SavedItem } from "@/lib/savedStore";
import { PrintItem } from "@/components/print/PrintItem";

export default function PrintItemPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const [item, setItem] = useState<SavedItem | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    if (!id) return;
    fetch(`/api/saved?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => setItem(j.item ?? null))
      .catch(() => setItem(null));
  }, [id]);

  if (item === undefined) {
    return <p className="p-10 text-center text-sm text-neutral-500">Loading…</p>;
  }
  if (item === null) {
    return <p className="p-10 text-center text-sm text-neutral-500">Item not found. It may have been removed.</p>;
  }

  return (
    <>
      <div className="print:hidden sticky top-0 z-10 flex justify-center border-b border-neutral-200 bg-white/95 py-2.5 backdrop-blur">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white active:bg-neutral-700"
        >
          Print / Save as PDF
        </button>
      </div>
      <PrintItem item={item} />
    </>
  );
}
