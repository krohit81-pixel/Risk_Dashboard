// components/shared/AppFooter.tsx
// V5.3 — extracted so the print/PDF views (single item + briefing books) can reuse the exact
// same credits as the main app footer, rather than a second hand-maintained copy that can drift.

export function AppFooterText({ light = false }: { light?: boolean }) {
  return (
    <p className={`text-2xs leading-relaxed ${light ? "text-neutral-500" : "text-fg-faint"}`}>
      <span className={`font-semibold ${light ? "text-neutral-700" : "text-fg-muted"}`}>Prepared by Rohit Kohli</span>
      <br />
      Macro: FRED · Markets: Yahoo Finance · News: Finnhub, Marketaux, NewsData.
      Personal decision-support and learning tool — not investment advice, not Mizuho output.
    </p>
  );
}

export function AppFooter() {
  return (
    <footer className="pt-2 text-center">
      <AppFooterText />
    </footer>
  );
}
