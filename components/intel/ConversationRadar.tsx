// components/intel/ConversationRadar.tsx
"use client";

import type { CroTheme, RadarClass } from "@/lib/types";

const CLASS_COLOR: Record<RadarClass, string> = {
  Market: "text-steel",
  Strategic: "text-mizuho",
  Credit: "text-elevated",
  Regulatory: "text-calm",
  Banking: "text-steel",
  Japan: "text-mizuho",
  Macro: "text-fg-muted",
};

export function ConversationRadar({ themes }: { themes: CroTheme[] }) {
  return (
    <section className="rise">
      <div className="grid grid-cols-2 gap-2.5">
        {themes.map((t) => (
          <div key={t.id} className="rounded-xl border border-line bg-ink-800 px-3.5 py-3">
            <p className="text-[14px] font-semibold leading-snug text-fg">{t.radarLabel}</p>
            <p className={`mt-1 text-2xs font-semibold uppercase tracking-wide ${CLASS_COLOR[t.radarClass]}`}>
              {t.radarClass} theme
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
