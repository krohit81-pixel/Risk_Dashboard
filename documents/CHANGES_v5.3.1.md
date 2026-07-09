# v5.3.1 — fix the print-flow UX (dynamic island, missing print option, no way back)

Files: `components/print/PrintActionBar.tsx` (NEW) · `app/print/[id]/page.tsx` · `app/print/book/page.tsx` · `components/research/ResearchWorkspace.tsx`. ✅ tsc + build clean.

## Apply map
```
components_print/PrintActionBar.tsx  → components/print/PrintActionBar.tsx   (NEW)
app_print_id/page.tsx                → app/print/[id]/page.tsx               (replaces v5.3.0)
app_print_book/page.tsx              → app/print/book/page.tsx               (replaces v5.3.0)
ResearchWorkspace.tsx                → components/research/ResearchWorkspace.tsx (replaces existing)
```

## 1 · Print button moved off the Dynamic Island
The action bar was `sticky top-0` — on notched iPhones that overlaps the Dynamic Island and becomes unreachable. Moved to a **bottom-fixed bar** instead (`components/print/PrintActionBar.tsx`, shared by both print views), with `padding-bottom: env(safe-area-inset-bottom)` so it also clears the home-indicator gesture zone at the bottom. Content gets matching bottom padding (`PrintActionBarSpacer`) so the fixed bar never covers the last lines of text.

## 2 · Print option for Research analyses was genuinely missing
You were right — the "Print / Export PDF" link only existed on already-saved items in the Learn tab. There was no way to get to it from the Research tab itself. Added a Print row directly under the Save/Analyze-another buttons on the live analysis result:
- Once you've saved the analysis, it's a working **"🖨️ Print / Export PDF"** link (same `/print/{id}` route).
- Before saving, it shows a small explanatory line — **"Save this analysis to enable Print / Export PDF"** — so the option is visible and its condition is clear, rather than silently absent. (Print reads from Supabase, so it needs a persisted id — an unsaved analysis has nowhere for `/print/{id}` to fetch from. Save-then-print is one tap either way.)

## 3 · No way back from a briefing book — fixed
Both print pages open in a new tab (`target="_blank"`, deliberate — keeps your place in the main app), but a new tab has no back button of its own, and on iOS — especially from a home-screen-installed PWA — that can trap you with no way out short of force-closing. Added an explicit **"← Back"** link (plain `<a href="/">`, not `window.close()` — the latter is unreliable across PWA/standalone contexts, a plain navigation always works) right next to the Print button, present on every state of both pages (loading, error, and the finished document) so there's no dead end.

## Deploy
```
npm run build
git add . && git commit -m "v5.3.1: bottom action bar (dynamic-island fix), print link in Research, back navigation"
git push
```

## Test
1. On an iPhone with a Dynamic Island: open a print view — the action bar sits at the bottom, fully tappable.
2. Analyze an article in Research, save it → "Print / Export PDF" appears right there; tap it → opens the print view.
3. Open a Briefing Book from Learn → tap "← Back" at any point (including while it's still compiling) → returns to the app without needing to force-close.
