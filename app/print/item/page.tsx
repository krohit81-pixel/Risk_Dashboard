"use client";

// app/print/item/page.tsx
// V5.3.4 — single saved-item print view, now at ?id=<id> instead of a dynamic path segment
// (/print/[id]). Root cause of the persistent "Item not found" reports: saved-analysis ids
// look like "analysis-2026-07-08T03:40:11.845Z" — colons, dots — and something in how that
// travelled through a dynamic path segment was producing a mismatched id server-side (the
// list view, which never touches a path segment, worked fine throughout). The briefing-book
// route already used a query string successfully for its ids and never showed this problem,
// so this mirrors that proven-working pattern instead of a second, different mechanism.
//
// The old /print/[id]/<id> route now just redirects here so any existing links still work.

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SavedItem } from "@/lib/savedStore";
import { PrintItem } from "@/components/print/PrintItem";
import { PrintActionBar, PrintActionBarSpacer } from "@/components/print/PrintActionBar";
import { ProgressRing } from "@/components/shared/ProgressRing";

type LoadState = { status: "loading" } | { status: "not_found" } | { status: "error"; message: string } | { status: "ok"; item: SavedItem };

/** V5.11 — on-screen only (`print:hidden`), lets the user pick which version actually prints
 *  before they hit "Print / Save as PDF". Defaults to Full; Share omits the Mizuho/risk-lens
 *  sections — see components/print/PrintItem.tsx for what each mode renders. */
function ViewModeToggle({ mode, onChange }: { mode: "full" | "share"; onChange: (m: "full" | "share") => void }) {
  return (
    <div className="print:hidden sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-4 py-2.5 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <span className="text-[11px] font-semibold text-neutral-500">Export as:</span>
        {(
          [
            ["full", "Full version", "incl. Mizuho & risk lens"],
            ["share", "Share version", "article + simple summary only"],
          ] as const
        ).map(([id, label, hint]) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={hint}
            className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition ${
              mode === id
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-600 active:bg-neutral-100"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="hidden text-[11px] text-neutral-500 sm:inline">
          {mode === "full" ? "Includes Mizuho alignment & risk-lens interpretation." : "Just the article, its source, and your plain-English take."}
        </span>
      </div>
    </div>
  );
}

function PrintItemInner() {
  const params = useSearchParams();
  const id = params.get("id") || "";
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [mode, setMode] = useState<"full" | "share">("full");

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
      <ViewModeToggle mode={mode} onChange={setMode} />
      <PrintItem item={state.item} mode={mode} />
      <PrintActionBarSpacer />
      <PrintActionBar />
    </>
  );
}

export default function PrintItemPage() {
  return (
    <Suspense
      fallback={
        <>
          <p className="p-10 text-center text-sm text-neutral-500">Loading…</p>
          <PrintActionBarSpacer />
          <PrintActionBar />
        </>
      }
    >
      <PrintItemInner />
    </Suspense>
  );
}
