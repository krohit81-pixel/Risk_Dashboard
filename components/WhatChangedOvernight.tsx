// components/WhatChangedOvernight.tsx
"use client";

import type { OvernightChange } from "@/lib/types";

const DOT: Record<OvernightChange["tone"], string> = {
  negative: "🔴",
  positive: "🟢",
  neutral: "🟠",
};

export function WhatChangedOvernight({ items }: { items: OvernightChange[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((c) => (
        <li key={c.id} className="flex items-baseline gap-2.5 text-[15px]">
          <span aria-hidden>{DOT[c.tone]}</span>
          <span className="text-fg">{c.label}</span>
          <span className="tnum ml-auto font-semibold text-fg-muted">{c.deltaText}</span>
        </li>
      ))}
    </ul>
  );
}
