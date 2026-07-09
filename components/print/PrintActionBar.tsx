"use client";

// components/print/PrintActionBar.tsx
// V5.3.1 — bottom-fixed action bar for the print views. Two fixes from user feedback:
// 1. Moved from top-sticky to bottom-fixed: a top bar collided with the iOS Dynamic Island
//    on notched iPhones, making it unreachable. Bottom avoids that entirely.
// 2. Added an explicit "Back" link: these pages open in a new tab (target="_blank") so the
//    app state stays intact, but a new tab/window has no back button of its own — on iOS,
//    especially from a home-screen-installed PWA, that can trap the user with no way back
//    short of force-closing the app. A plain <a href="/"> always works, unlike window.close()
//    (unreliable across PWA/standalone contexts), so that's what this uses.
// Respects env(safe-area-inset-bottom) so the bar sits above the home-indicator gesture zone.

export function PrintActionBar() {
  return (
    <div
      className="print:hidden fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 border-t border-neutral-200 bg-white/95 px-4 backdrop-blur"
      style={{ paddingTop: 10, paddingBottom: `calc(10px + env(safe-area-inset-bottom))` }}
    >
      <a
        href="/"
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 active:bg-neutral-100"
      >
        ← Back
      </a>
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white active:bg-neutral-700"
      >
        Print / Save as PDF
      </button>
    </div>
  );
}

/** Bottom padding so page content doesn't sit under the fixed bar (incl. safe-area). */
export function PrintActionBarSpacer() {
  return <div className="print:hidden" style={{ height: `calc(60px + env(safe-area-inset-bottom))` }} />;
}
