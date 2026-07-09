"use client";

// app/print/[id]/page.tsx
// V5.3 — dedicated print-styled route for a single saved item. Approach: browser-native
// Print → Save as PDF, not a server-rendered PDF pipeline (Puppeteer-class tooling is a real
// infra addition on Vercel serverless) — upgradeable later if a heavier renderer is ever needed.
//
// V5.3.3 — the loading and not-found states were previously missing the action bar entirely
// (only the success state had it), reproducing the exact "no way back" trap fixed in 5.3.1 for
// the OTHER print route. Every state now renders the bar. Also: a real fetch/query error was
// previously indistinguishable from a genuine "no such id" (both showed "Item not found") —
// now surfaced separately with a retry, and a progress ring replaces the plain loading text.

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { SavedItem } from "@/lib/savedStore";
import { PrintItem } from "@/components/print/PrintItem";
import { PrintActionBar, PrintActionBarSpacer } from "@/components/print/PrintActionBar";
import { ProgressRing } from "@/components/shared/ProgressRing";

type LoadState = { status: "loading" } | { status: "not_found" } | { status: "error"; message: string } | { status: "ok"; item: SavedItem };

export default function PrintItemPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(() => {
    if (!id) {
      setState({ status: "error", message: "No item id in the URL." });
      return;
    }
    setState({ status: "loading" });
    fetch(`/api/saved?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setState({ status: "error", message: j.error });
        else if (!j.item) setState({ status: "not_found" });
        else setState({ status: "ok", item: j.item });
      })
      .catch((e) => setState({ status: "error", message: String(e) }));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === "loading") {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-neutral-500">
          <div className="text-neutral-700">
            <ProgressRing active estimateSeconds={4} theme="light" stages={["Fetching this item\u2026"]} />
          </div>
        </div>
        <PrintActionBarSpacer />
        <PrintActionBar />
      </>
    );
  }

  if (state.status === "not_found" || state.status === "error") {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-sm text-neutral-500">
            {state.status === "not_found"
              ? "Item not found. It may have been removed."
              : `Something went wrong loading this item: ${state.message}`}
          </p>
          <button onClick={load} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 active:bg-neutral-100">
            Try again
          </button>
        </div>
        <PrintActionBarSpacer />
        <PrintActionBar />
      </>
    );
  }

  return (
    <>
      <PrintItem item={state.item} />
      <PrintActionBarSpacer />
      <PrintActionBar />
    </>
  );
}
