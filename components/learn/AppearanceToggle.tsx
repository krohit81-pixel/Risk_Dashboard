"use client";

// components/learn/AppearanceToggle.tsx
// V5.4 — the settings-style entry in Learn for switching dark/light. Manual toggle only
// (no "follow system"), per the decision. Reads/writes via next-themes (localStorage-backed).

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function AppearanceToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // avoid a hydration mismatch flash before next-themes settles

  return (
    <div className="rounded-xl border border-line bg-ink-800 px-3.5 py-3">
      <p className="mb-2.5 text-[11px] leading-relaxed text-fg-faint">
        Choose how the app looks. Applies everywhere immediately and remembers your choice on this device.
      </p>
      <div className="flex gap-2">
        {(["dark", "light"] as const).map((t) => {
          const active = mounted && theme === t;
          return (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 rounded-lg border px-3 py-2 text-2xs font-semibold capitalize transition ${
                active ? "border-steel/40 bg-steel/10 text-steel" : "border-line bg-ink-700/40 text-fg-muted active:bg-ink-700"
              }`}
            >
              {t === "dark" ? "\ud83c\udf19 Dark" : "\u2600\ufe0f Light"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
