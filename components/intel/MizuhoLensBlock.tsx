"use client";

import { useState } from "react";
import type { MizuhoLens } from "@/lib/mizuhoKnowledgeData";

function ChipRow({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span
            key={i}
            className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
            style={{ borderColor: `${color}55`, backgroundColor: `${color}14`, color }}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Short repo tag, e.g. "v5.0 · May 2026" — kept to one line. */
function repoTag(lens: MizuhoLens): string {
  if (!lens.repoVersion) return "";
  let when = "";
  if (lens.repoUpdated) {
    const d = new Date(lens.repoUpdated);
    when = isNaN(d.getTime()) ? "" : ` \u00b7 ${d.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  }
  return `v${lens.repoVersion}${when}`;
}

/** "Through Mizuho's lens" — repository-grounded context + reasoned interpretation.
 *  Collapsible, default closed. FACT (the article) lives above this block. */
export function MizuhoLensBlock({ lens }: { lens?: MizuhoLens | null }) {
  const [open, setOpen] = useState(false);
  if (!lens) return null;
  const hasContent = lens.context || lens.interpretation || lens.businesses.length || lens.riskStripes.length;

  return (
    <div className="mt-4 rounded-xl border border-[#2a2140] bg-[#161226] px-3.5 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <span className="text-2xs font-semibold uppercase tracking-wide text-[#b79bff]">Through Mizuho&rsquo;s lens</span>
        <span className="ml-auto flex-none whitespace-nowrap text-[10px] text-fg-faint">{repoTag(lens)}</span>
        <span className="flex-none text-xs text-fg-faint">{open ? "\u25be" : "\u25b8"}</span>
      </button>

      {open ? (
        !hasContent && lens.gap ? (
          <p className="mt-2 text-[12px] leading-relaxed text-fg-faint">{lens.gap}</p>
        ) : (
          <div className="mt-2">
            {lens.context ? (
              <p className="text-[13px] leading-relaxed text-fg-muted">
                <span className="text-2xs font-semibold uppercase tracking-wide text-[#b79bff]">Mizuho context · repository — </span>
                {lens.context}
              </p>
            ) : null}
            {lens.interpretation ? (
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                <span className="text-2xs font-semibold uppercase tracking-wide text-elevated">Interpretation — </span>
                {lens.interpretation}
              </p>
            ) : null}

            <ChipRow label="Businesses affected" items={lens.businesses} color="#5B8DEF" />
            <ChipRow label="Risk stripes" items={lens.riskStripes} color="#F2545B" />
            <ChipRow label="Moves" items={lens.impacts} color="#2DD4A7" />
            <ChipRow label="Executive questions" items={lens.executives} color="#F5A524" />

            {lens.gap ? <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">Repository gap: {lens.gap}</p> : null}
          </div>
        )
      ) : null}
    </div>
  );
}
