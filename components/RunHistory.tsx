// components/RunHistory.tsx
"use client";

import type { RunRecord } from "@/lib/runStore";
import type { BloombergRun } from "@/lib/types";

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** V4.5.2 — Bloomberg ingestion runs, shown as a separate sub-list (fields differ from
 *  the editorial run log, so it's kept visually distinct rather than interleaved). */
export function BloombergRunHistory({ runs }: { runs?: BloombergRun[] }) {
  if (!runs || runs.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-faint">Bloomberg ingestion</p>
      <div className="space-y-1.5">
        {runs.slice(0, 10).map((r, i) => {
          const ok = r.failed === 0;
          return (
            <div key={i} className="flex items-center gap-2.5 rounded-lg border border-line bg-ink-800 px-3 py-2 text-2xs">
              <span className={`h-1.5 w-1.5 flex-none rounded-full ${ok ? "bg-calm" : "bg-stress"}`} />
              <span className="text-fg-muted">{fmt(r.run_time)}</span>
              <span className="rounded-full border border-elevated/30 bg-elevated/10 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-elevated">
                bloomberg
              </span>
              <span className="ml-auto text-fg-faint">
                {r.processed}/{r.emails_found} processed{r.skipped ? ` · ${r.skipped} skipped` : ""}{r.failed ? ` · ${r.failed} failed` : ""}
              </span>
            </div>
          );
        })}
        {runs[0]?.newsletter_types?.length ? (
          <p className="px-1 pt-0.5 text-[10px] leading-relaxed text-fg-faint">
            Latest: {runs[0].newsletter_types.join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RunHistory({ runs }: { runs: RunRecord[] }) {
  if (!runs?.length) {
    return <p className="text-xs text-fg-faint">No generation runs recorded yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {runs.map((r, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-lg border border-line bg-ink-800 px-3 py-2 text-2xs">
          <span className={`h-1.5 w-1.5 flex-none rounded-full ${r.ok ? "bg-calm" : "bg-stress"}`} />
          <span className="text-fg-muted">{fmt(r.ranISO)}</span>
          <span className="rounded-full border border-line bg-ink-700 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-fg-faint">
            {r.trigger}
          </span>
          {r.job === "weekly" ? (
            <span className="rounded-full border border-steel/30 bg-steel/10 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-steel">
              weekly
            </span>
          ) : null}
          <span className="ml-auto text-fg-faint">
            {r.ok ? (
              <>
                {r.provider ?? "—"}
                {r.fallbackUsed ? " · fallback" : ""}
                {r.degradeReason && r.degradeReason !== "ok" ? ` · ${r.degradeReason}` : ""}
              </>
            ) : (
              <span className="text-stress">failed · last-good kept</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
