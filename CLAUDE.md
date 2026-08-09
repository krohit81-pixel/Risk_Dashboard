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
- `lib/version.ts` → `APP_VERSION` (renders in the header — current: see that file, currently "5.10.2")
- `package.json` → `"version"` (must match `APP_VERSION` exactly — these have drifted before; double-check both when bumping)

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

**Responsive shell (v5.10.4+):** despite "mobile-first," the app was single-width (`max-w-app`,
560px) at *every* viewport, including iPad/macOS Safari windows — there were zero `md:`/`lg:`/
`xl:` classes anywhere in the codebase before this. `SHELL_WIDTH` in `app/page.tsx`
(`"max-w-app md:max-w-2xl lg:max-w-4xl xl:max-w-5xl"`) now widens progressively at standard
Tailwind breakpoints. Three places must all use this exact string or they'll visually
misalign/look narrower than the shell: `<main>` and `<nav>` in `app/page.tsx` (nav is `fixed`,
positioned independently of main), and the full-screen overlay in
`components/learn/ConceptLibrary.tsx` (duplicated as a literal since it's a separate
client component). Any new full-screen fixed overlay needs the same treatment.

**iOS safe-area padding (v5.10.4+):** `.safe-bottom-nav` / `.safe-bottom-content` in
`globals.css` are deliberately separate classes, not one shared `.safe-bottom`. They used to be
the same class applied to both the fixed tab bar and the scrollable content wrapper, which
stacked an extra 1.5rem onto the nav's own padding on top of the home-indicator inset it already
gets from `env(safe-area-inset-bottom)` — a visibly oversized gap below the tab labels on
notched iPhones in standalone/add-to-homescreen mode. `-nav` gets exactly the inset; `-content`
gets the inset plus enough to clear the fixed nav's rendered height, folded into one `calc()`
instead of stacking two paddings.

**Logo assets (v5.10.7, supersedes v5.10.5–6):** the brand mark is a globe+"R"+chart
illustration with flat, opaque shading (not the earlier glow-on-black attempt — see below) —
current source is `public/icons/global_risk_intelligence_attached_logo.svg`, which despite the
extension is **not a real vector**: it's a `<svg>` wrapper around one base64-embedded PNG
(check before assuming any future replacement is actually vector — `grep -o "image/png" <file>`
is enough to tell). Its embedded alpha channel is real and usable this time (correlates with
visible content — checked directly, ~87% brightness/alpha correlation vs. ~50% on the earlier
glow asset, transparent corners read true `(0,0,0,0)`), so no luminance-keying reconstruction
was needed — just crop-to-content-bbox, scale into a padded square, done. `public/icons/logo-
header.png` uses this transparent square directly (genuinely theme-reactive — shows dark or
light behind it live). `app/icon.png`, `app/apple-icon.png`, `public/icons/icon-192.png`,
`public/icons/icon-512.png` (OS-level, can't watch the in-app theme toggle) flatten the same
transparent square onto solid black by deliberate choice, not a technical limitation this time —
this asset actually keys cleanly onto white too, unlike the glow one; black was kept to match
the already-established brand default rather than re-litigate it.

Historical note, kept in case a future logo swap hits the same failure mode: the very first
brand-mark attempt was a soft glow-on-black illustration whose own alpha channel was unusable
(pixels of identical visible brightness randomly read alpha 0 or ~253 right next to each other —
not a real cutout mask), AND whose visual style (letterform shading at similar brightness to its
own ambient glow falloff) made luminance-based key reconstruction structurally unable to produce
a crisp result on white, no matter how the threshold/gamma curve was tuned. Always check a
supplied logo's actual alpha data before trusting it (`numpy` histogram + brightness/alpha
correlation, same as done here), and don't assume "transparent" or "sharp" without verifying —
both were wrong on the first attempt.

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
- `lib/concepts.ts` (curated glossary) vs `lib/userConcepts.ts` (user-added, Supabase-backed) are
  deliberately separate — Concept Library (Learn tab) renders both together but they're different
  data sources with different CRUD paths (`/api/concepts` is user-concepts only).
- `app/api/cron/editorial/route.ts` / `app/api/cron/weekly/route.ts` — the scheduled generation
  entrypoints; protected by `CRON_SECRET`.
- `api/cron-bloomberg.py` (repo root, **not** under `app/`) — a separate Python cron job for
  newsletter ingestion, deployed as its own Vercel function (see `vercel.json` `functions`);
  `requirements.txt` at repo root is for this script, not the Next.js app.

### Bank Earnings suite (Settings → 05, 06, 07)
Grown across V5.7.0–V5.10.1 into several files that each have a distinct, non-overlapping job.
Read this before touching any of them — it's easy to update the wrong layer.

| File | Role |
|---|---|
| `lib/bankEarnings.ts` | **Curated fallback baseline** — 15 banks (5 US/5 Europe/5 Asia), hand-maintained. `AS_OF` records how current it is. `plainEnglish` field per bank (jargon-free summary). Update by hand to move the baseline itself forward. |
| `lib/bankEarningsStore.ts` | KV **overlay** on top of the baseline, keyed per bank id (`refreshedISO`, `sourceNote`). `getMergedBankEarnings()` combines baseline+overlay. `clearEarningsOverlay(id?)` reverts one bank (or all) back to baseline — the Reset Earnings recovery path. |
| `lib/bankEarningsRefresh.ts` | The **refresh engine**. Fetches real news per bank via the existing Marketaux/NewsData/Finnhub adapters (no new keys), filters for genuine newer-quarter evidence (`qualifyCandidates`, `isIndexLevelNoise` — see lesson below), then ONE batched grounded LLM call (`interpretWithProvider`) extracts updated figures + a `plainEnglish` twin for every qualifying bank at once. Schema-validated (`isValidResult`) before anything reaches the overlay. |
| `lib/bankEarningsMetrics.ts` | **Separate, hand-maintained** structured/USD-converted numeric layer (profit, YoY growth, CET1, stock reaction) feeding the Compare Banks charts. Traces every figure back to `lib/bankEarnings.ts` plus documented FX rates. **Not** auto-derived from the refresh overlay — update it by hand alongside the baseline, or Compare Banks will visually lag a bank whose text card was just refreshed. |
| `lib/mizuhoQ1Earnings.ts` + `components/learn/MizuhoQ1Earnings.tsx` | Single-bank **deep-dive companion** for Mizuho (Settings → 07), built from the primary results deck rather than news — resolves gaps (credit costs, NPL ratio) that the 05 card flags as unconfirmed. Static, one-off. Established the hand-drawn inline-SVG chart pattern (`rgb(var(--x))` colors, no chart library) — extend it rather than adding a chart dependency. |
| `components/learn/BankEarnings.tsx` | The 05 list UI. Fetches merged data from `app/api/bank-earnings` (not the static file directly, so a refresh shows up without a redeploy). Houses `ReactionPill`'s defensive short-text guard (see lesson below) and the "📊 Compare Banks" entry point. |
| `components/learn/BankEarningsCompare.tsx` | The **Compare Banks** screen (opened via a button atop 05, not a separate Settings section) — ranked/diverging hand-drawn SVG bar charts across all 15 banks in USD, reading `lib/bankEarningsMetrics.ts`. |
| `app/api/bank-earnings/route.ts` | `GET` — merged baseline+overlay, read fresh every request. |
| `app/api/bank-earnings/refresh/route.ts` | `POST` — runs the refresh engine (KV busy-flag guarded, same last-good-kept pattern as `/api/regenerate`). `GET` — status. `DELETE` (`?id=` optional) — Reset Earnings; clears the overlay back to baseline. |

Settings → 06 Generation History has four buttons total: **Refresh** (reload current briefing),
**Regenerate** (re-run today's editorial), **Refresh Earnings** (the engine above), **Reset
Earnings** (the DELETE recovery path). All four record to `lib/runStore.ts`'s `RunRecord` (the
`job` field distinguishes `"editorial" | "weekly" | "earnings"`; `note` carries a short free-text
summary for jobs whose result isn't just ok/fail, e.g. "15 checked · 1 updated").

**V5.10.1 lesson — keep this in mind for any future refresh-style LLM extraction on this repo:**
a live run once let an unrelated general-market headline ("FTSE 100 lifted by miners rally…")
leak into one bank's `stockReaction.changeText`, because a general index wrap-up incidentally
named the bank as a passing gainer — enough to pass the news filter as it stood. Fixed at three
layers, not just the symptom, and any new grounded-extraction field that renders in a small
fixed UI element (a pill, a chip, a badge) should get the same treatment rather than trusting
the prompt alone:
1. **Filtering** — `isIndexLevelNoise` in `lib/bankEarningsRefresh.ts` drops index-wrap-up
   stories (FTSE 100, Nikkei 225, Dow Jones, S&P 500, STOXX 600, Hang Seng, Nasdaq Composite,
   TOPIX) as candidate evidence for a bank unless that bank is actually named in the article's
   own title, not just its body.
2. **Validation** — `changeText` over 24 characters or containing `.`/`;` is rejected outright;
   that bank's update is dropped (last-good kept) rather than accepted into the overlay.
3. **Display** — `ReactionPill` in `components/learn/BankEarnings.tsx` never trusts its input to
   already be short: anything sentence-shaped falls back to a plain Up/Down/Mixed label (full
   text still reachable via a hover tooltip and always visible in the "Market reaction" detail
   box below).

**V5.10.3 lesson — a "0 updated" refresh used to be a black box.** A run could find real,
qualifying news for several banks and still update none of them, with no way to tell whether the
LLM legitimately couldn't confirm hard figures from thin snippets, or a genuine extraction
returned but failed validation — because the prompt told the model to **omit** any bank it
couldn't confirm from `results` entirely, so the reason (if the model even had one) was never
captured. Fixed by making the model return every qualified bank either way (`hasNewQuarter` +
a short `notConfirmedNote` when false), and giving the validation-rejection path its own
`explainInvalid()` reason instead of a bare drop. Both reasons now flow into `RefreshSummary.skipped`
→ `RunRecord.detail` → a secondary line under the run row in `RunHistory` (truncated with a hover
tooltip, same guard shape as `ReactionPill`). Apply the same shape to any future engine in this
repo that can silently accept-or-drop per-item: always capture *why* a drop happened, not just
that it happened.

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
