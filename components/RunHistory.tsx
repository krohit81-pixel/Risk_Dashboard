// components/RunHistory.tsx
"use client";

import type { RunRecord } from "@/lib/runStore";

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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
