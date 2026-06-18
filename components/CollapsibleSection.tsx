// components/CollapsibleSection.tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders the section header (number · title · hint) with a chevron toggle and
 * shows/hides its children. Open/closed state persists across refreshes in
 * localStorage. Pass lockOpen for always-expanded sections (no chevron).
 */
export function CollapsibleSection({
  id,
  n,
  title,
  hint,
  defaultOpen = true,
  lockOpen = false,
  children,
}: {
  id: string;
  n: string;
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  lockOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (lockOpen) return;
    try {
      const v = localStorage.getItem(`collapse:${id}`);
      if (v === "open") setOpen(true);
      else if (v === "closed") setOpen(false);
    } catch {
      /* ignore */
    }
  }, [id, lockOpen]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(`collapse:${id}`, next ? "open" : "closed");
    } catch {
      /* ignore */
    }
  };

  const show = lockOpen || open;

  return (
    <div className="rise">
      <button
        type="button"
        onClick={lockOpen ? undefined : toggle}
        aria-expanded={show}
        className={`mb-3 flex w-full items-baseline gap-2.5 text-left ${
          lockOpen ? "cursor-default" : "cursor-pointer"
        }`}
      >
        <span className="tnum text-2xs font-semibold tracking-widest text-fg-faint">{n}</span>
        <span className="text-sm font-semibold uppercase tracking-wide text-fg-muted">{title}</span>
        {hint ? <span className="text-2xs text-fg-faint">{hint}</span> : null}
        {!lockOpen ? (
          <span className="ml-auto text-xs text-fg-faint">{show ? "▾" : "▸"}</span>
        ) : null}
      </button>
      {show ? children : null}
    </div>
  );
}
