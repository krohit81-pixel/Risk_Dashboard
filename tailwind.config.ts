import type { Config } from "tailwindcss";

// V5.4 — colors reference CSS custom properties (defined per-theme in globals.css) instead of
// fixed hex, so the same utility classes (bg-ink-800, text-fg-faint, ...) work under both
// dark and light mode. RGB-triplet format (not hex strings) is required for Tailwind's
// opacity-modifier syntax (bg-steel/15, border-elevated/30, ...) — used extensively across
// the app — to keep working with variable-based colors.
function themeColor(varName: string) {
  return `rgb(var(${varName}) / <alpha-value>)`;
}

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: themeColor("--ink-950"),
          900: themeColor("--ink-900"),
          850: themeColor("--ink-850"),
          800: themeColor("--ink-800"),
          700: themeColor("--ink-700"),
        },
        line: themeColor("--line"),
        "line-soft": themeColor("--line-soft"),
        fg: themeColor("--fg"),
        "fg-muted": themeColor("--fg-muted"),
        "fg-faint": themeColor("--fg-faint"),
        calm: themeColor("--calm"),
        elevated: themeColor("--elevated"),
        stress: themeColor("--stress"),
        steel: themeColor("--steel"),
        mizuho: themeColor("--mizuho"),
        amber: themeColor("--amber"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
      maxWidth: {
        app: "560px",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
