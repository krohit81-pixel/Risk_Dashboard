// components/learn/ConceptLibrary.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { CONCEPTS, type ConceptVisualStep } from "@/lib/concepts";
import type { ConceptSeen } from "@/lib/types";
import type { UserConcept } from "@/lib/userConcepts";
import { CollapsibleSection } from "@/components/CollapsibleSection";

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
/** V5.6.1 — user-added concepts don't have seen-tracking, so show when they were added instead. */
function addedLabel(iso?: string): string {
  if (!iso) return "Added recently";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Added recently";
  return `Added ${d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
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

/** V5.6.1 — unified shape so curated (lib/concepts.ts) and user-added (Supabase) concepts
 *  can share the exact same row + detail rendering. */
type EntryMeta = {
  id: string;
  term: string;
  formal?: string;
  category: string;
  layman: string;
  risk: string;
  cro: string;
  aliases?: string[];
  visual?: ConceptVisualStep[];
  isUser: boolean;
  metaLabel: string;
  themes?: string[];
};

/** V5.6.3 — two-line card row: term (+ pin) on top so long terms wrap cleanly, category
 *  capsule + meta label on their own line below. Pinned rows get a subtle amber tint so
 *  "floats to the top" is visible, not just positional. */
function EntryRow({
  entry,
  pinned,
  onOpen,
  onTogglePin,
}: {
  entry: EntryMeta;
  pinned: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className={`cursor-pointer rounded-xl border px-3.5 py-3 transition ${
        pinned ? "border-amber/30 bg-amber/5" : "border-line bg-ink-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-semibold leading-snug text-fg">{entry.term}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`-mt-0.5 flex-none text-base leading-none ${pinned ? "text-amber" : "text-fg-faint"}`}
          aria-label={pinned ? "Unpin" : "Pin"}
        >
          {pinned ? "★" : "☆"}
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-line bg-ink-700 px-2 py-0.5 text-2xs font-semibold text-fg-muted">
          {entry.category}
        </span>
        <span className="text-2xs text-fg-faint">{entry.metaLabel}</span>
      </div>
    </div>
  );
}

/** V5.6.3 — groups a sorted entry list into an explicit "Pinned" cluster up top, so pinning
 *  reads as an unmistakable, labelled group rather than a subtle sort-order change. */
function EntryList({
  entries,
  pins,
  onOpen,
  onTogglePin,
  emptyMessage,
}: {
  entries: EntryMeta[];
  pins: Set<string>;
  onOpen: (id: string) => void;
  onTogglePin: (id: string) => void;
  emptyMessage: string;
}) {
  if (entries.length === 0) {
    return <p className="text-2xs text-fg-faint">{emptyMessage}</p>;
  }
  const pinnedEntries = entries.filter((e) => pins.has(e.id));
  const restEntries = entries.filter((e) => !pins.has(e.id));
  return (
    <div className="space-y-3">
      {pinnedEntries.length ? (
        <div className="space-y-2">
          <p className="text-2xs font-bold uppercase tracking-wide text-amber">📌 Pinned</p>
          {pinnedEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              pinned
              onOpen={() => onOpen(entry.id)}
              onTogglePin={() => onTogglePin(entry.id)}
            />
          ))}
        </div>
      ) : null}
      {restEntries.length ? (
        <div className="space-y-2">
          {pinnedEntries.length ? (
            <p className="pt-1 text-2xs font-bold uppercase tracking-wide text-fg-faint">All</p>
          ) : null}
          {restEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              pinned={false}
              onOpen={() => onOpen(entry.id)}
              onTogglePin={() => onTogglePin(entry.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Detail({
  entry,
  pinned,
  onPin,
  onClose,
  onEdit,
  onDelete,
}: {
  entry: EntryMeta;
  pinned: boolean;
  onPin: () => void;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    // V5.10.4 — width must track app/page.tsx's SHELL_WIDTH (kept as a literal string here,
    // not an import, since that's a client-page-local const) so this full-screen overlay
    // doesn't look narrower than the shell it's opened from on iPad/macOS.
    <div className="fixed inset-x-0 bottom-0 top-0 z-40 mx-auto max-w-app overflow-y-auto bg-ink-950 pb-10 md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
      <div className="sticky top-0 flex items-center gap-3 border-b border-line bg-ink-900/95 px-4 py-3 backdrop-blur-md">
        <button onClick={onClose} className="text-sm font-semibold text-steel">
          ‹ Library
        </button>
        <span className="text-xs uppercase tracking-wide text-fg-faint">{entry.category}</span>
        <button onClick={onPin} className={`ml-auto text-lg ${pinned ? "text-amber" : "text-fg-faint"}`}>
          {pinned ? "★" : "☆"}
        </button>
      </div>
      <div className="px-4 pt-4">
        <h2 className="text-[22px] font-bold leading-tight">{entry.term}</h2>
        <p className="mt-0.5 text-xs text-fg-faint">
          {entry.formal ? `${entry.formal} · ` : ""}
          {entry.metaLabel}
        </p>

        <div className="mt-4">
          <p className="mb-1 text-2xs font-bold uppercase tracking-wide text-calm">Layman's meaning</p>
          <p className="text-[14px] leading-relaxed text-fg">{entry.layman}</p>
        </div>
        {entry.risk ? (
          <div className="mt-4">
            <p className="mb-1 text-2xs font-bold uppercase tracking-wide text-mizuho">Risk executive language</p>
            <p className="text-[14px] leading-relaxed text-fg-muted">{entry.risk}</p>
          </div>
        ) : null}
        {entry.cro ? (
          <div className="mt-4">
            <p className="mb-1 text-2xs font-bold uppercase tracking-wide text-steel">Why a CRO cares</p>
            <p className="text-[14px] leading-relaxed text-fg-muted">{entry.cro}</p>
          </div>
        ) : null}

        {entry.visual ? (
          <div className="mt-4">
            <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-fg-faint">How it flows</p>
            <VisualChain steps={entry.visual} />
          </div>
        ) : null}

        {entry.aliases?.length ? (
          <p className="mt-4 text-[11px] text-fg-faint">Also known as: {entry.aliases.join(", ")}</p>
        ) : null}

        {entry.themes?.length ? (
          <div className="mt-5">
            <p className="mb-1.5 text-2xs font-bold uppercase tracking-wide text-fg-faint">Where you've seen it</p>
            {entry.themes.map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 border-b border-line-soft py-2 text-[13px] last:border-0">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-mizuho" />
                <span className="text-fg-muted">{t}</span>
              </div>
            ))}
          </div>
        ) : entry.isUser ? null : (
          <p className="mt-5 text-xs text-fg-faint">
            This concept hasn’t appeared in a theme yet — it’ll start tracking once it does.
          </p>
        )}

        {entry.isUser ? (
          <div className="mt-6 flex gap-3 border-t border-line-soft pt-4">
            <button
              onClick={onEdit}
              className="rounded-lg border border-line bg-ink-800 px-3.5 py-2 text-2xs font-semibold text-steel active:bg-ink-700"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg border border-line bg-ink-800 px-3.5 py-2 text-2xs font-semibold text-stress active:bg-ink-700"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConceptLibrary({
  conceptSeen,
  openId,
  onConsumeOpen,
  onEditUserConcept,
  userConceptsRefreshKey,
}: {
  conceptSeen: Record<string, ConceptSeen>;
  openId: string | null;
  onConsumeOpen: () => void;
  /** V5.6 — routes to Settings → Add Concept, pre-filled, for editing a user-added concept. */
  onEditUserConcept: (c: UserConcept) => void;
  /** V5.6 — bump to force the "Your Concepts" list to refetch (e.g. after a save in Settings). */
  userConceptsRefreshKey?: number;
}) {
  const [pins, setPins] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userConcepts, setUserConcepts] = useState<UserConcept[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => setPins(loadPins()), []);
  useEffect(() => {
    if (openId) {
      setSelectedId(openId);
      onConsumeOpen();
    }
  }, [openId, onConsumeOpen]);

  useEffect(() => {
    let cancelled = false;
    setLoadingUser(true);
    fetch("/api/concepts")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setUserConcepts(j.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setUserConcepts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userConceptsRefreshKey]);

  const togglePin = (id: string) => {
    setPins((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      savePins(next);
      return next;
    });
  };

  const curatedEntries: EntryMeta[] = useMemo(
    () =>
      CONCEPTS.map((c) => ({
        id: c.id,
        term: c.term,
        formal: c.formal,
        category: c.category,
        layman: c.layman,
        risk: c.risk,
        cro: c.cro,
        visual: c.visual,
        isUser: false,
        metaLabel: seenLabel(conceptSeen[c.id]),
        themes: conceptSeen[c.id]?.themes,
      })),
    [conceptSeen]
  );

  const userEntries: EntryMeta[] = useMemo(
    () =>
      userConcepts.map((c) => ({
        id: c.id,
        term: c.term,
        formal: c.formal,
        category: c.category,
        layman: c.layman,
        risk: c.risk,
        cro: c.cro,
        aliases: c.aliases,
        visual: c.visual,
        isUser: true,
        metaLabel: addedLabel(c.createdAtISO),
      })),
    [userConcepts]
  );

  // Pinned float to the top of each list; curated additionally favors seen-then-alphabetical.
  const filteredCurated = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? curatedEntries.filter(
          (c) =>
            c.term.toLowerCase().includes(q) ||
            (c.formal ?? "").toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q)
        )
      : curatedEntries;
    return [...list].sort((a, b) => {
      const pa = pins.has(a.id) ? 1 : 0;
      const pb = pins.has(b.id) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const sa = conceptSeen[a.id] ? 1 : 0;
      const sb = conceptSeen[b.id] ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return a.term.localeCompare(b.term);
    });
  }, [query, curatedEntries, pins, conceptSeen]);

  const sortedUser = useMemo(() => {
    return [...userEntries].sort((a, b) => {
      const pa = pins.has(a.id) ? 1 : 0;
      const pb = pins.has(b.id) ? 1 : 0;
      return pb - pa; // otherwise keep API order (newest first)
    });
  }, [userEntries, pins]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return curatedEntries.find((e) => e.id === selectedId) ?? userEntries.find((e) => e.id === selectedId) ?? null;
  }, [selectedId, curatedEntries, userEntries]);

  async function deleteUserConcept(id: string) {
    setUserConcepts((prev) => prev.filter((c) => c.id !== id));
    setSelectedId(null);
    try {
      const res = await fetch(`/api/concepts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await res.json();
      if (j.ok) setUserConcepts(j.items ?? []);
    } catch {
      // best-effort; a manual refresh will resync if this silently failed
    }
  }

  function editSelected() {
    if (!selected || !selected.isUser) return;
    const raw = userConcepts.find((c) => c.id === selected.id);
    if (raw) onEditUserConcept(raw);
    setSelectedId(null);
  }

  return (
    <section className="rise">
      <CollapsibleSection
        id="yourconcepts"
        n=""
        title="Your Concepts"
        hint={`${userConcepts.length} item${userConcepts.length === 1 ? "" : "s"}`}
        defaultOpen={userConcepts.length > 0}
      >
        {loadingUser ? (
          <p className="text-2xs text-fg-faint">Loading…</p>
        ) : (
          <EntryList
            entries={sortedUser}
            pins={pins}
            onOpen={setSelectedId}
            onTogglePin={togglePin}
            emptyMessage="Nothing added yet — use Settings → Add Concept to paste some text and get started."
          />
        )}
      </CollapsibleSection>

      <div className="mt-4">
        <CollapsibleSection
          id="allconcepts"
          n=""
          title="All Concepts"
          hint={query ? `${filteredCurated.length} of ${curatedEntries.length}` : `${curatedEntries.length} items`}
          defaultOpen
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search concepts…  (e.g. carry, IRRBB, CET1)"
            className="mb-3 w-full rounded-xl border border-line bg-ink-800 px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-faint"
          />
          <EntryList
            entries={filteredCurated}
            pins={pins}
            onOpen={setSelectedId}
            onTogglePin={togglePin}
            emptyMessage="No concepts match your search."
          />
          <p className="mt-4 text-2xs leading-relaxed text-fg-faint">
            Concepts are collected automatically as themes mention them, and you can pin the ones you care about —
            pinned concepts float to the top. Each entry shows where you first met it and how often it has recurred.
          </p>
        </CollapsibleSection>
      </div>

      {selected ? (
        <Detail
          entry={selected}
          pinned={pins.has(selected.id)}
          onPin={() => togglePin(selected.id)}
          onClose={() => setSelectedId(null)}
          onEdit={selected.isUser ? editSelected : undefined}
          onDelete={selected.isUser ? () => deleteUserConcept(selected.id) : undefined}
        />
      ) : null}
    </section>
  );
}
