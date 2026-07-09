// components/learn/ConceptLibrary.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { CONCEPTS, conceptById, type Concept, type ConceptVisualStep } from "@/lib/concepts";
import type { ConceptSeen } from "@/lib/types";

const PIN_KEY = "learn:pins";

function loadPins(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PIN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function savePins(s: Set<string>) {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

function seenLabel(s?: ConceptSeen): string {
  if (!s) return "not seen yet";
  const dayN = Math.max(1, daysSince(s.firstISO) + 1);
  return `Day ${dayN} · seen ${s.count}×`;
}
function daysSince(iso: string): number {
  const a = new Date(iso + "T00:00:00Z").getTime();
  const b = Date.now();
  return Math.max(0, Math.floor((b - a) / 86400000));
}

function VisualChain({ steps }: { steps: ConceptVisualStep[] }) {
  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <div key={i} className="flex items-stretch gap-1.5">
          {i > 0 ? <span className="flex items-center text-fg-faint">→</span> : null}
          <span
            className={`flex min-w-[78px] items-center rounded-lg border px-2.5 py-2 text-center text-[11.5px] font-semibold ${
              s.kind === "bad"
                ? "border-stress/30 bg-ink-800 text-stress"
                : s.kind === "start"
                ? "border-steel/30 bg-ink-800 text-steel"
                : "border-line bg-ink-800 text-fg-muted"
            }`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Detail({
  concept,
  seen,
  pinned,
  onPin,
  onClose,
}: {
  concept: Concept;
  seen?: ConceptSeen;
  pinned: boolean;
  onPin: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 top-0 z-40 mx-auto max-w-app overflow-y-auto bg-ink-950 pb-10">
      <div className="sticky top-0 flex items-center gap-3 border-b border-line bg-ink-900/95 px-4 py-3 backdrop-blur-md">
        <button onClick={onClose} className="text-sm font-semibold text-steel">
          ‹ Library
        </button>
        <span className="text-xs uppercase tracking-wide text-fg-faint">{concept.category}</span>
        <button onClick={onPin} className={`ml-auto text-lg ${pinned ? "text-amber" : "text-fg-faint"}`}>
          {pinned ? "★" : "☆"}
        </button>
      </div>
      <div className="px-4 pt-4">
        <h2 className="text-[22px] font-bold leading-tight">{concept.term}</h2>
        <p className="mt-0.5 text-xs text-fg-faint">
          {concept.formal} · {seenLabel(seen)}
        </p>

        <div className="mt-4">
          <p className="mb-1 text-2xs font-bold uppercase tracking-wide text-calm">Layman's meaning</p>
          <p className="text-[14px] leading-relaxed text-fg">{concept.layman}</p>
        </div>
        <div className="mt-4">
          <p className="mb-1 text-2xs font-bold uppercase tracking-wide text-mizuho">Risk executive language</p>
          <p className="text-[14px] leading-relaxed text-fg-muted">{concept.risk}</p>
        </div>
        <div className="mt-4">
          <p className="mb-1 text-2xs font-bold uppercase tracking-wide text-steel">Why a CRO cares</p>
          <p className="text-[14px] leading-relaxed text-fg-muted">{concept.cro}</p>
        </div>

        {concept.visual ? (
          <div className="mt-4">
            <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-fg-faint">How it flows</p>
            <VisualChain steps={concept.visual} />
          </div>
        ) : null}

        {seen?.themes?.length ? (
          <div className="mt-5">
            <p className="mb-1.5 text-2xs font-bold uppercase tracking-wide text-fg-faint">Where you've seen it</p>
            {seen.themes.map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 border-b border-line-soft py-2 text-[13px] last:border-0">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-mizuho" />
                <span className="text-fg-muted">{t}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-xs text-fg-faint">
            This concept hasn’t appeared in a theme yet — it’ll start tracking once it does.
          </p>
        )}
      </div>
    </div>
  );
}

export function ConceptLibrary({
  conceptSeen,
  openId,
  onConsumeOpen,
}: {
  conceptSeen: Record<string, ConceptSeen>;
  openId: string | null;
  onConsumeOpen: () => void;
}) {
  const [pins, setPins] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => setPins(loadPins()), []);
  useEffect(() => {
    if (openId) {
      setSelected(openId);
      onConsumeOpen();
    }
  }, [openId, onConsumeOpen]);

  const togglePin = (id: string) => {
    setPins((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      savePins(next);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? CONCEPTS.filter(
          (c) =>
            c.term.toLowerCase().includes(q) ||
            c.formal.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q)
        )
      : CONCEPTS;
    // seen concepts first, then alphabetical
    return [...list].sort((a, b) => {
      const sa = conceptSeen[a.id] ? 1 : 0;
      const sb = conceptSeen[b.id] ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return a.term.localeCompare(b.term);
    });
  }, [query, conceptSeen]);

  const pinned = CONCEPTS.filter((c) => pins.has(c.id));
  const sel = selected ? conceptById(selected) : null;

  return (
    <section className="rise">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search concepts…  (e.g. carry, IRRBB, CET1)"
        className="mb-3 w-full rounded-xl border border-line bg-ink-800 px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-faint"
      />

      <p className="mb-2 mt-1 text-2xs font-bold uppercase tracking-wide text-fg-faint">📌 Pinned</p>
      {pinned.length ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {pinned.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className="rounded-lg border border-elevated/30 bg-elevated/10 px-2.5 py-1.5 text-xs font-semibold text-amber"
            >
              ★ {c.term}
            </button>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-xs text-fg-faint">Nothing pinned yet — tap ☆ on a concept.</p>
      )}

      <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-fg-faint">
        All concepts · seen ones first
      </p>
      <div className="space-y-2">
        {filtered.map((c) => {
          const seen = conceptSeen[c.id];
          return (
            <div
              key={c.id}
              onClick={() => setSelected(c.id)}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-ink-800 px-3.5 py-3"
            >
              <span className="text-[15px] font-semibold text-fg">{c.term}</span>
              <span className="rounded-full border border-line bg-ink-700 px-2 py-0.5 text-2xs font-semibold text-fg-muted">
                {c.category}
              </span>
              <span className="ml-auto whitespace-nowrap text-2xs text-fg-faint">{seenLabel(seen)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(c.id);
                }}
                className={`text-base ${pins.has(c.id) ? "text-amber" : "text-fg-faint"}`}
              >
                {pins.has(c.id) ? "★" : "☆"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-2xs leading-relaxed text-fg-faint">
        Concepts are collected automatically as themes mention them, and you can pin the ones you care about.
        Each entry shows where you first met it and how often it has recurred.
      </p>

      {sel ? (
        <Detail
          concept={sel}
          seen={conceptSeen[sel.id]}
          pinned={pins.has(sel.id)}
          onPin={() => togglePin(sel.id)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
