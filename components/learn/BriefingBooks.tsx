"use client";

// components/learn/BriefingBooks.tsx
// V5.3 — Learn section 06: pick a briefing-book type, opens the compiled book in a new tab
// at /print/book?pack=<id> (generation + rendering happens there).

import { BRIEFING_PACKS } from "@/lib/briefingPacks";

export function BriefingBooks() {
  const periodPacks = BRIEFING_PACKS.filter((p) => p.kind === "period");
  const themePacks = BRIEFING_PACKS.filter((p) => p.kind === "theme");

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-fg-faint">
        Compiles your saved items into a document with an AI-written preface and an &ldquo;Actions on me&rdquo; section
        (what to learn, ask leadership, investigate further) — opens in a new tab, ready to Print / Save as PDF.
      </p>

      <div>
        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-faint">By period</p>
        <div className="space-y-2">
          {periodPacks.map((p) => (
            <PackRow key={p.id} id={p.id} title={p.title} description={p.description} accent={p.accent} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-faint">By theme</p>
        <div className="space-y-2">
          {themePacks.map((p) => (
            <PackRow key={p.id} id={p.id} title={p.title} description={p.description} accent={p.accent} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PackRow({ id, title, description, accent }: { id: string; title: string; description: string; accent: string }) {
  return (
    <a
      href={`/print/book?pack=${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-line bg-ink-800 px-3.5 py-3 active:bg-ink-700"
    >
      <span className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: accent }} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-fg">{title}</span>
        <span className="block text-[11px] leading-snug text-fg-faint">{description}</span>
      </span>
      <span className="flex-none text-xs text-fg-faint">↗</span>
    </a>
  );
}
