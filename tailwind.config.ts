import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Institutional dark surfaces
        ink: {
          950: "#0A0D13",
          900: "#0B0E14",
          850: "#10141D",
          800: "#141925",
          700: "#1B2230",
        },
        line: "#222B3A",
        "line-soft": "#1A2130",
        // Text
        fg: "#E6EAF2",
        "fg-muted": "#8A94A6",
        "fg-faint": "#5C6678",
        // Functional risk semantics (meaning, not decoration)
        calm: "#2DD4A7",
        elevated: "#F5A524",
        stress: "#F2545B",
        // Restrained brand accent
        steel: "#5B8DEF",
        // Phase 3 semantics: purple = Mizuho strategic context
        mizuho: "#A78BFA",
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
