// components/intel/StaleBanner.tsx
"use client";

import type { SnapshotMeta } from "@/lib/types";

function istDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }) + " IST";
}

export function StaleBanner({ meta }: { meta: SnapshotMeta }) {
  if (meta.stale) {
    return (
      <div className="rounded-xl border border-elevated/30 bg-elevated/5 px-4 py-3">
        <p className="text-[13px] font-semibold text-elevated">
          Using previous successful editorial snapshot
        </p>
        <p className="mt-0.5 text-2xs text-fg-muted">
          Today&apos;s generation hasn&apos;t completed. Originally generated {istDate(meta.generatedISO)}.
        </p>
      </div>
    );
  }
  if (meta.seed) {
    return (
      <div className="rounded-xl border border-steel/25 bg-steel/5 px-4 py-3">
        <p className="text-[13px] font-semibold text-steel">Curated baseline</p>
        <p className="mt-0.5 text-2xs text-fg-muted">
          The scheduled live briefing generates once a news source and AI key are configured. The
          data layer above is live.
        </p>
      </div>
    );
  }
  if (meta.carriedForward) {
    return (
      <div className="rounded-xl border border-elevated/30 bg-elevated/5 px-4 py-3">
        <p className="text-[13px] font-semibold text-elevated">News flow was limited</p>
        <p className="mt-0.5 text-2xs text-fg-muted">
          Important themes were carried forward rather than manufacturing new ones.
        </p>
      </div>
    );
  }
  return null;
}
