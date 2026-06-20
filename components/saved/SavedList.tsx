// components/saved/SavedList.tsx
"use client";

import type { SavedItem } from "@/lib/savedStore";

const KIND_LABEL: Record<SavedItem["kind"], string> = {
  theme: "CRO Conversation",
  editorial: "Editorial",
  japan: "Japan & Asia",
  analysis: "Research",
};

function fmt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function SavedList({
  items,
  onRemove,
}: {
  items: SavedItem[];
  onRemove: (id: string) => void;
}) {
  if (!items?.length) {
    return (
      <p className="text-xs leading-relaxed text-fg-faint">
        Nothing saved yet. Tap <span className="font-semibold text-fg-muted">☆ Save</span> on a theme,
        editorial item or Japan note to keep its interpretation here — it stays even after the next
        daily snapshot replaces the live feed.
      </p>
    );
  }
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.id} className="rounded-xl border border-line bg-ink-800 px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full border border-line bg-ink-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-fg-muted">
              {KIND_LABEL[it.kind]}
            </span>
            <button
              onClick={() => onRemove(it.id)}
              className="ml-auto text-2xs font-semibold text-fg-faint"
            >
              Remove
            </button>
          </div>
          <h4 className="text-[14.5px] font-semibold leading-snug text-fg">{it.title}</h4>
          {it.interpretation ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
              <span className="font-semibold text-steel">Why it matters: </span>
              {it.interpretation}
            </p>
          ) : null}
          {it.bankingImpact ? (
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
              <span className="font-semibold text-steel">Banking impact: </span>
              {it.bankingImpact}
            </p>
          ) : null}
          {it.whyMizuho?.length ? (
            <div className="mt-1.5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-mizuho">Why Mizuho cares</p>
              <ul className="mt-0.5 list-disc pl-4 text-[13px] leading-relaxed text-fg-muted">
                {it.whyMizuho.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {it.sources ? <p className="mt-1.5 text-2xs text-fg-faint">Source: {it.sources}</p> : null}
          {it.kind === "analysis" ? (
            <p className="mt-1 text-2xs text-fg-faint">
              {it.sourceType === "url" ? "From URL" : "Pasted text"}
              {it.originalUrl ? (
                <>
                  {" · "}
                  <a href={it.originalUrl} target="_blank" rel="noopener noreferrer" className="text-steel underline">
                    open link
                  </a>
                </>
              ) : null}
              {it.analysisDateISO ? ` · analyzed ${fmt(it.analysisDateISO)}` : ""}
              {" · saved "}
              {fmt(it.savedAtISO)}
            </p>
          ) : (
            <p className="mt-1 text-2xs text-fg-faint">
              Saved {fmt(it.savedAtISO)}
              {it.snapshotISO ? ` · from snapshot ${fmt(it.snapshotISO)}` : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
