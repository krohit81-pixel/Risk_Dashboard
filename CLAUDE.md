# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A mobile-first (iPhone Safari, add-to-homescreen) morning risk briefing for a global-bank CRO,
personalized to Mizuho. Next.js 14 App Router, TypeScript, Tailwind, single client page
(`app/page.tsx`) driving four tabs (Home / Markets / Research / Learn) plus a Settings panel
reached from a header hamburger button. No test suite — see Verification below.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000 — runs with zero API keys (sample/curated fallbacks)
npm run build    # production build
npm run lint     # next lint (not auto-run; ESLint isn't configured with a preset yet — first
                  # run prompts an interactive setup, so it's not CI-safe as-is)
```

There is no automated test suite. **Verification in this repo means `npx tsc --noEmit`** —
run it after any change and treat a clean pass as the bar before calling work done. A full
`npm run build` also works but requires live env vars (Supabase, FRED, etc.) or it can hang on
data-fetching steps in a sandboxed/offline environment — prefer `tsc --noEmit` for iteration.

## Versioning convention (do this on every change)

The repo bumps a version on essentially every change-set, in two places kept in sync:
- `lib/version.ts` → `APP_VERSION` (renders in the header, e.g. "v5.7.0")
- `package.json` → `"version"`

Follow semver-ish judgment: bug fixes / visual tweaks bump the patch (5.6.3 → 5.6.4), a
restructure or new feature bumps the minor (5.6.5 → 5.7.0). Check `git log --oneline` for the
existing cadence and commit-message style before picking the next number.

## Architecture

### The two-clock model
This is the single most important thing to understand before changing data flow:

- **Live data spine** (indicators, market quotes, FRED macro series) refreshes on every request
  — `app/api/dashboard/route.ts` calls `fetchIndicators()` fresh each time (`revalidate = 0`).
- **Editorial layer** (CRO Conversation themes, Editorial Intelligence, Japan & Asia Watch,
  weekly summary) is generated **on a schedule** (Vercel Cron, see `vercel.json`), frozen for
  the day, and read from storage (`lib/snapshotStore.ts` / `lib/snapshotEngine.ts`) — it is
  **not** regenerated on page load. A manual "Regenerate" action exists (`/api/regenerate`,
  surfaced in Settings → Generation History) for on-demand re-runs.

Don't wire new editorial-style content into the live per-request path; it belongs in the
generation pipeline (`lib/intelligence.ts`, `lib/snapshotEngine.ts`) so it stays frozen/cheap.

### LLM provider chain
`lib/llm.ts` tries **Gemini first** (free tier, `GEMINI_API_KEY`), and only falls back to
Anthropic (`ANTHROPIC_API_KEY`) if Gemini errors or returns nothing. Neither key present →
curated fallback content, not a broken UI. Any new LLM-generated field should follow the same
pattern: grounded (model may only use supplied source material, never invent), schema-validated
before persistence, and must degrade to curated/static content on failure — generation failures
must never overwrite a last-good snapshot.

### Storage layers
- **Supabase** (`lib/supabase.ts`) is primary for anything that must persist across deploys:
  saved items (`lib/savedStore.ts`), user-added concepts (`lib/userConcepts.ts`).
- **Vercel KV** holds the frozen daily snapshot, run history, theme-seen tracking, regenerate
  status. Falls back to an in-memory store when KV isn't provisioned (fine for `npm run dev`,
  not durable on serverless).
- **localStorage** (client-only) holds UI state: `CollapsibleSection` open/closed per `id`,
  pinned concepts (`learn:pins`), theme preference (via `next-themes`).
- Everything degrades gracefully with **no env vars at all** — see `.env.local.example` for the
  full progressive-enablement list (FRED → live macro, Marketaux/Finnhub/NewsData → live news,
  Gemini/Anthropic → live editorial writing).

### Navigation structure (`app/page.tsx`)
Single `tab` state: `"today" | "markets" | "research" | "learn" | "settings"`. The bottom nav
bar only lists the first four (labelled Home/Markets/Research/Learn); `"settings"` is reached
only via the header's hamburger button and isn't in the nav bar — that's intentional, not a bug.
Executive/Learning view toggle lives in the sticky header itself (not page content) so it's
"fixed at the top," and only applies to Home-tab sections 03+ (CRO Conversation, Editorial
Intelligence, Japan & Asia Watch) — Markets/Research/Learn always render in default wording.

**`CollapsibleSection` id gotcha:** open/closed state persists in `localStorage` keyed by the
`id` prop (`collapse:<id>`). If you relocate a section between tabs, give it a **new** id — reusing
the old one carries over its old open/closed state, which can make a section render pre-expanded
(or collapsed-and-seemingly-missing) for existing users. This bit us once (v5.6.3); Settings
section ids are now prefixed `settings-*` specifically to avoid colliding with their old
Learn-tab ids.

### Risk color semantics (repo-wide convention)
Color always encodes the **direction of risk**, never the raw sign of the number. A falling
S&P is red (risk-off); a falling VIX is green (risk-on). This logic lives per-indicator in
`RISK_ON_RISE` (`lib/overnight.ts`) and `riskUpIsBad` on `Indicator` (`lib/types.ts`) — reuse
these rather than re-deriving color from `trend` directly.

### Content areas and where they live
- `lib/riskEngine.ts` — composite score/status/brief generation from live deltas.
- `lib/intelligence.ts` — the single theme engine (`THEMES`); the radar and CRO Conversation
  both draw from this one set so they can't drift apart.
- `lib/mizuhoTopRisks.ts` / `lib/mizuhoKnowledgeData.ts` — versioned-locally reference data
  (Mizuho's own published positions/top-risk framework), never fetched at runtime; the
  "Mizuho lens" interpretation and Settings → Mizuho Reference both read from here.
  `lib/bankEarnings.ts` is the curated FALLBACK BASELINE for the Bank Earnings prototype
  (Settings) — update it by hand when you want to move the baseline itself forward.
  `AS_OF` in that file records how current the baseline is; update it whenever the baseline is
  hand-refreshed. As of V5.8.0 a live-ish overlay sits on top: `lib/bankEarningsStore.ts` (KV,
  per-bank) + `lib/bankEarningsRefresh.ts` (fetches real news via the existing Marketaux/
  NewsData/Finnhub adapters, one batched grounded LLM call extracts updated figures + a
  `plainEnglish` twin, schema-validated before being written to the overlay). Triggered by the
  "Refresh Earnings" button in Settings → Generation History (`app/api/bank-earnings/refresh/
  route.ts`); `app/api/bank-earnings/route.ts` serves baseline+overlay merged. Same two-clock
  shape as the daily editorial: the baseline file is never overwritten, and a failed/empty
  refresh just leaves it as the last-good fallback.
  `lib/concepts.ts` (curated glossary) vs `lib/userConcepts.ts` (user-added, Supabase-backed) are
  deliberately separate — Concept Library (Learn tab) renders both together but they're different
  data sources with different CRUD paths (`/api/concepts` is user-concepts only).
- `app/api/cron/editorial/route.ts` / `app/api/cron/weekly/route.ts` — the scheduled generation
  entrypoints; protected by `CRON_SECRET`.
- `api/cron-bloomberg.py` (repo root, **not** under `app/`) — a separate Python cron job for
  newsletter ingestion, deployed as its own Vercel function (see `vercel.json` `functions`);
  `requirements.txt` at repo root is for this script, not the Next.js app.

## Style conventions to match

- Tailwind only, via CSS-variable-backed theme colors (`bg-ink-800`, `text-fg-muted`, `text-steel`,
  `text-calm`/`text-stress`/`text-elevated`, …) defined in `app/globals.css` under `.dark`/`.light`
  — never hardcode hex colors in components, use the existing token names so dark/light both work.
- Text sizes bottom out at `text-2xs` (11px) / `text-[10px]` for dense chip/badge rows; there's a
  `dense` prop pattern on `Chip`/`SeverityPill`/`HorizonPill` (`components/ui.tsx`,
  `components/intel/intelUi.tsx`) for tight card headers — extend that rather than inventing a
  new size scale.
- No icon library is installed; the app deliberately uses either plain unicode/emoji or small
  inline `currentColor` SVGs (`components/shared/NavIcons.tsx`) so nav/badge colors stay
  monochrome and theme-aware without a dependency.
