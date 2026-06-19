// components/saved/SaveButton.tsx
"use client";

import type { SavedItem } from "@/lib/savedStore";

export function SaveButton({
  item,
  saved,
  onToggle,
}: {
  item: SavedItem;
  saved: boolean;
  onToggle: (item: SavedItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(item);
      }}
      className={`inline-flex items-center gap-1 text-2xs font-semibold ${
        saved ? "text-amber" : "text-fg-faint"
      }`}
      aria-label={saved ? "Saved" : "Save for later"}
    >
      {saved ? "★ Saved" : "☆ Save"}
    </button>
  );
}
