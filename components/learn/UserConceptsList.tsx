"use client";

// components/learn/UserConceptsList.tsx
// V5.6 — "Your concepts" list, split out of ConceptStudio so it can live under Concept
// Library (Learn tab) while the create/edit form ("Add Concept") lives in Settings.
// Tapping Edit hands the concept up to the caller, which is expected to route the user to
// the Settings > Add Concept form pre-filled (see page.tsx openEditUserConcept).

import { useEffect, useState } from "react";
import type { UserConcept } from "@/lib/userConcepts";

export function UserConceptsList({
  onEdit,
  refreshKey,
}: {
  onEdit: (c: UserConcept) => void;
  /** Bump this number from the parent to force a refetch (e.g. after a save in Settings). */
  refreshKey?: number;
}) {
  const [items, setItems] = useState<UserConcept[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/concepts")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setItems(j.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((c) => c.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/concepts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await res.json();
      if (j.ok) setItems(j.items ?? []);
    } catch {
      // best-effort; a manual refresh will resync if this silently failed
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-faint">
        🧩 Your Concepts {loading ? "" : `(${items.length})`}
      </p>
      {loading ? (
        <p className="text-2xs text-fg-faint">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-2xs text-fg-faint">
          Nothing added yet — use Settings → Add Concept to paste some text and get started.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-ink-800 px-3 py-2.5">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full border border-line-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">
                  {c.category}
                </span>
                <span className="text-[13.5px] font-semibold text-fg">{c.term}</span>
              </div>
              {c.formal && c.formal !== c.term ? <p className="mb-1.5 text-[11px] italic text-fg-faint">{c.formal}</p> : null}

              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Plain English</p>
              <p className="mb-1.5 text-[12px] leading-relaxed text-fg-muted">{c.layman}</p>

              {c.risk ? (
                <>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">CRO language</p>
                  <p className="mb-1.5 text-[12px] leading-relaxed text-fg-muted">{c.risk}</p>
                </>
              ) : null}

              {c.cro ? (
                <>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Why a CRO cares</p>
                  <p className="mb-1.5 text-[12px] leading-relaxed text-fg-muted">{c.cro}</p>
                </>
              ) : null}

              {c.aliases?.length ? (
                <p className="text-[11px] text-fg-faint">Also known as: {c.aliases.join(", ")}</p>
              ) : null}

              <div className="mt-2 flex gap-3">
                <button onClick={() => onEdit(c)} className="text-2xs font-semibold text-steel">
                  Edit
                </button>
                <button onClick={() => removeItem(c.id)} className="text-2xs font-semibold text-stress">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
