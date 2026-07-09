// components/learn/Linkify.tsx
"use client";

import { linkifyConcepts } from "@/lib/concepts";

/** Renders text, turning any recognised concept term into a tappable link. */
export function Linkify({
  text,
  onOpen,
}: {
  text: string;
  onOpen?: (id: string) => void;
}) {
  const segs = linkifyConcepts(text);
  return (
    <>
      {segs.map((s, i) =>
        s.id && onOpen ? (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(s.id!)}
            className="border-b border-dotted border-mizuho font-semibold text-mizuho"
          >
            {s.t}
          </button>
        ) : (
          <span key={i}>{s.t}</span>
        )
      )}
    </>
  );
}
