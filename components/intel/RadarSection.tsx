// components/intel/RadarSection.tsx
"use client";

import type { RadarItem } from "@/lib/types";

const LENS_LABEL: Record<string, { label: string; cls: string }> = {
  us: { label: "US", cls: "text-steel border-[#26405a] bg-[#10202f]" },
  japan: { label: "Japan", cls: "text-mizuho border-[#3a3060] bg-[#1a1530]" },
  europe: { label: "EU", cls: "text-calm border-[#1f4036] bg-[#0f211c]" },
  macro: { label: "Macro", cls: "text-fg-muted border-line bg-ink-800" },
};

export function RadarSection({ items }: { items: RadarItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-2xs leading-relaxed text-fg-faint">
        Headline-level developments without full editorial treatment — breadth, not depth.
      </p>
      {items.map((it, i) => {
        const lens = LENS_LABEL[it.lens ?? "macro"] ?? LENS_LABEL.macro;
        const body = (
          <div className="flex items-start gap-2.5 rounded-xl border border-line bg-ink-800 px-3.5 py-2.5">
            <span className={`mt-0.5 flex-none rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${lens.cls}`}>
              {lens.label}
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] leading-snug text-fg">{it.title}</span>
              <span className="mt-0.5 block text-2xs text-fg-faint">{it.source}</span>
            </span>
          </div>
        );
        return it.url ? (
          <a key={i} href={it.url} target="_blank" rel="noopener noreferrer" className="block">
            {body}
          </a>
        ) : (
          <div key={i}>{body}</div>
        );
      })}
    </div>
  );
}
