// components/shared/NavIcons.tsx
// V5.6.2 — minimal, single-color (currentColor) line icons for the bottom tab bar.
// No fills, no per-icon color — they inherit whatever text color the tab button already
// uses (text-steel when active, text-fg-faint otherwise), so the bar stays monochrome.

type IconProps = { className?: string };

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3.5v-5.5h3V20H17a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function MarketsIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 19h16" />
      <path d="M6 19v-5.5" />
      <path d="M11 19V8" />
      <path d="M16 19v-9" />
      <path d="m14.5 5 4.5-.5.5 4.5" strokeLinecap="round" />
      <path d="M19 4.7 13.7 10 10.5 7 5 12.3" />
    </svg>
  );
}

export function ResearchIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m20 20-4.8-4.8" />
    </svg>
  );
}

export function LearnIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M2.5 8 12 4l9.5 4-9.5 4-9.5-4Z" />
      <path d="M6.5 10.2v4.6C6.5 16.5 9 18 12 18s5.5-1.5 5.5-3.2v-4.6" />
      <path d="M21.5 8v6" />
    </svg>
  );
}
