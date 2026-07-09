"use client";

// app/print/book/page.tsx
// V5.3 — dedicated print-styled route for a compiled briefing book. Reads ?pack=<id> from the
// URL, calls the generate route (which does the Supabase query + 2 dedicated LLM calls), then
// renders. Same browser-print approach as the single-item view.
//
// useSearchParams() requires a Suspense boundary for Next's static-export prerendering —
// split into an outer Suspense wrapper + the actual client logic below.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BriefingBook } from "@/lib/briefingBook";
import { PrintBook } from "@/components/print/PrintBook";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { PrintActionBar, PrintActionBarSpacer } from "@/components/print/PrintActionBar";

function PrintBookInner() {
  const params = useSearchParams();
  const packId = params.get("pack") || "";
  const [book, setBook] = useState<BriefingBook | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packId) {
      setError("No pack specified.");
      setBook(null);
      return;
    }
    fetch(`/api/briefing/generate?pack=${encodeURIComponent(packId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) {
          setError(j.error || "Could not generate this briefing book.");
          setBook(null);
        } else {
          setBook(j.book);
        }
      })
      .catch(() => {
        setError("Could not reach the server.");
        setBook(null);
      });
  }, [packId]);

  if (book === undefined) {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-neutral-500">
          <div className="text-neutral-700">
            <ProgressRing
              active
              estimateSeconds={20}
              theme="light"
              stages={["Querying saved items…", "Writing the preface…", "Drafting action items…"]}
            />
          </div>
          <p className="text-sm">Compiling your briefing book…</p>
        </div>
        <PrintActionBarSpacer />
        <PrintActionBar />
      </>
    );
  }
  if (error || !book) {
    return (
      <>
        <p className="p-10 text-center text-sm text-neutral-500">{error || "Something went wrong."}</p>
        <PrintActionBarSpacer />
        <PrintActionBar />
      </>
    );
  }

  return (
    <>
      <PrintBook book={book} />
      <PrintActionBarSpacer />
      <PrintActionBar />
    </>
  );
}

export default function PrintBookPage() {
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
      <PrintBookInner />
    </Suspense>
  );
}
