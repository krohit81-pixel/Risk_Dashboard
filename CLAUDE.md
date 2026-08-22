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

### Daily Risk Brief email (V5.13)
After the daily cron (`app/api/cron/editorial/route.ts`) saves a snapshot successfully, it
best-effort-builds a PDF covering the same content as the Home tab (Daily Risk Brief, What
Changed, Top Developments, CRO Conversation, Editorial Intelligence, Japan & Asia Watch, Radar)
and emails it to `DAILY_BRIEF_RECIPIENT_EMAIL`. Two deliberate design choices worth knowing:

- **PDF engine is `@react-pdf/renderer`, not headless Chromium.** A real browser printing an
  actual app page would have matched the app's Tailwind styling exactly, but adds a ~50MB
  Chromium dependency and a browser-launch step to a serverless cron function — explicitly
  traded away for a smaller/faster/more reliable deploy. `lib/dailyBriefPdf.tsx` is therefore a
  **separate** layout in react-pdf's own styling API (`StyleSheet.create`, not Tailwind), hand-
  matched to the same light-theme color tokens `app/globals.css`'s `.light` block uses (so it
  reads as the same visual family, not a re-skin) — any future palette change there should be
  mirrored here by hand, there's no shared source.
- **Content depth matches a card's default-open state, not every nested "Go deeper" toggle**
  (lenses/questions/talking-points are omitted) — keeps a daily email a sane length rather than
  reproducing literally everything the live UI can expand to.

**Gotcha hit once already:** `lib/overnight.ts`'s `fmtDelta()` uses the proper Unicode minus
sign (`−`, U+2212) for negative deltas — correct and intentional for the live app (renders fine
in the Inter webfont), but `@react-pdf/renderer`'s standard Helvetica silently drops that glyph
entirely, so every negative "What Changed" mover rendered with **no sign at all** ("6 bps"
instead of "−6 bps") until caught. `dailyBriefPdf.tsx`'s `pdfSafeText()` swaps it for a plain
ASCII hyphen, scoped to this PDF path only — don't "fix" it in `lib/overnight.ts` itself, that
would be the wrong direction (the live app is the one rendering correctly). If a future
generated field ever contains other non-WinAnsi Unicode (rare symbols, unusual dashes), expect
the same silent-drop failure mode and route it through `pdfSafeText()` too.

**Sender identity**: reuses `IMAP_EMAIL`/`IMAP_PASSWORD` — the SAME mailbox
`api/cron-bloomberg.py` already fetches newsletters from via IMAP — for SMTP send instead of
provisioning separate credentials (AOL accepts the same email + app-password for both). Vercel
env vars are shared across the Python and Next.js functions in one project, so no duplication
needed. `lib/dailyBriefEmail.ts` fails soft — returns `{ok:false, reason}`, never throws — a
PDF/email problem must never turn an already-successful snapshot save into a failed cron run.
Manual "Regenerate" (`/api/regenerate`, Settings → Generation History) is a **separate** route
that does NOT send this email — only the actual scheduled cron does — so testing/re-running the
editorial generation from the UI can't accidentally spam the recipient.

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
Intelligence, Japan & Asia Watch) — the header toggle itself doesn't render outside Home at all.
Markets/Research/Learn each own a **local** Executive/Learning toggle instead where they need
one (`MarketsRiskThemes`, `ResearchWorkspace`, `SavedList`), independent of the header state.

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

**Logo assets (v5.10.8, supersedes v5.10.5–7):** the header (top-left of `app/page.tsx`) is
**intentionally logo-free** — just the "Risk Intelligence" title text, no icon/wordmark image.
This was a deliberate visual-cleanup request; don't reintroduce a header logo without checking
first. `public/icons/logo-header.png` was deleted as part of that (it had no other consumer).

**OS-level icons (v5.11.5, supersedes v5.10.7):** `app/icon.png`, `app/apple-icon.png`,
`public/icons/icon-192.png`, `public/icons/icon-512.png` (browser tab / home-screen / PWA
manifest) are now the "RisK Intel" radar/magnifying-glass mark, sourced from
`public/icons/risk intel app icon.png` (note the space in the filename — quote/escape it in any
shell command). That source is a **combined lockup**: the icon glyph sits in the top ~78% with a
"RisK Intel" wordmark stacked below it, on a pre-rounded white "squircle" card baked into the
pixels. None of that is usable as-is for an OS icon — text is illegible at icon sizes, and a
pre-baked rounded-corner card would double up oddly against the corner-mask iOS/Android already
apply themselves — so the glyph was cropped out on its own (bbox-detected by scanning row-density
of non-white pixels for the gap between glyph and text, `y≈975` in the source), re-padded onto a
fresh plain white square, and only *that* gets OS-mask-rounded. Background is white, not black —
a deliberate reversal of the v5.10.7 "black by default" call, because this asset's dark-navy/red
mark is designed for a light backdrop and would go low-contrast on black; the black-default
reasoning was specific to that *previous* asset's own light-on-dark styling, not a fixed rule.

Historical note, kept in case a future logo swap hits the same failure mode: the very first
brand-mark attempt was a soft glow-on-black illustration whose own alpha channel was unusable
(pixels of identical visible brightness randomly read alpha 0 or ~253 right next to each other —
not a real cutout mask), AND whose visual style (letterform shading at similar brightness to its
own ambient glow falloff) made luminance-based key reconstruction structurally unable to produce
a crisp result on white, no matter how the threshold/gamma curve was tuned. Always check a
supplied logo's actual alpha data before trusting it (`numpy` histogram + brightness/alpha
correlation), and don't assume "transparent" or "sharp" without verifying — both were wrong on
the first attempt. (The v5.11.5 asset sidesteps this entirely — it's opaque-on-white, no alpha
channel involved, so the only real work was cropping the glyph away from the wordmark.)

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

### Research workspace export — Full vs Share (v5.11, entry point fixed in v5.11.1)
`analyzeContent()` (`lib/analyze.ts`) persists the full original source content (pasted text /
fetched URL text / image transcript, untruncated) as `ResearchAnalysis.originalText` →
`SavedItem.originalText` (`lib/savedMappers.ts`). This, plus the already-existing
`layman.whatHappened` and `detail.whatToUnderstand`, feed a "Simple explanation" + "Original
text" pair — collapsed by default wherever an analysis renders live (the Research result card
in `components/research/ResearchWorkspace.tsx`, **and** a re-opened saved analysis in
`components/saved/SavedList.tsx`'s `SavedCard` — both import the identical `CollapsibleNote`
component from ResearchWorkspace rather than each rolling their own, specifically so Learn can't
drift out of sync with Research the way it initially did), but always fully expanded in
print/PDF, matching the existing collapsed-in-app/expanded-in-print convention.

`components/print/PrintItem.tsx` takes a `mode: "full" | "share"` prop: `"full"` is the
established always-everything render (now with those two sections appended); `"share"` is
deliberately minimal — title/date/source, Simple explanation, Original text, **nothing else**
(no category/severity chips, no bank risk, no Mizuho alignment, no Mizuho lens, no focus) — for
sharing an analysis outside the bank without exposing Mizuho-specific framing.

**v5.11.1 lesson:** the mode choice first shipped as a toggle discovered only after already
landing on the print page (defaulting to `"full"`) — which in practice meant nobody ever saw a
choice at all; they just always got Full, indistinguishable from the toggle not existing. Fixed
by moving the decision to where the user actually acts: both export entry points (the Research
result card and the Learn saved-card action row) are now two explicit links,
`/print/item?id=…&mode=full` and `&mode=share`, which `app/print/item/page.tsx` reads to set the
print page's initial mode. The on-page toggle still exists as a way to change your mind once
there, but it's no longer the *only* place the choice is offered. General lesson: a default that
silently wins whenever a control goes unnoticed is indistinguishable from that control not
existing — for a real choice, decide at the point of action, not after.

**v5.11.2 polish pass** (same feature, next round of feedback): `CollapsibleNote` dropped its
parenthetical `hint` text — at phone width, label + hint together wrapped the header onto two
lines, which read as broken rather than descriptive; the label alone ("Simple explanation",
"Original text") is self-explanatory. `stripLeadingUrl()` (`lib/format.ts`) strips a leading
URL-only line from Original Text's display — pasted content very often starts with the URL
itself (iOS share-sheet paste pattern), which is redundant with the source line above; render-
time only, the stored `originalText` stays a verbatim, untouched copy. `PrintItem.tsx`'s
`Section` label style bumped from a faint 10px/neutral-500 to a bolder 11px/bold/neutral-700
(`LABEL_CLASS`), and its footer swapped `AppFooterText` (the live app's data-provider credits —
meaningless for a single-article export) for a print-specific one: "Prepared by Rohit Kohli" +
a one-line note that source articles may be paywalled and the publisher's own terms govern
re-sharing. `SavedList.tsx`'s action row (Read/Export Full/Export Share) compacted to fit one
line at phone width — shorter labels, no emoji, tighter padding.

**v5.11.3 — Share PDF visual redesign, and the "vercel.com footer" non-fix.** Two more rounds
of feedback on the same export:
- The reported "footer with the vercel link" is the *browser's own* print header/footer (URL +
  date + "Page X of Y"), injected into its own reserved margin by Chrome/Safari's print engine
  — not this app. Confirmed by checking: no `@page` rule exists anywhere in this codebase, and
  `PrintFooterText` never includes a URL. It cannot be suppressed from page CSS; it's a
  print-dialog toggle ("Headers and footers") on the browser/OS side, off by the user for future
  exports if unwanted. Don't waste time hunting for an app-side fix if this comes up again.
- Share mode's flat/textual look WAS a real, fixable thing, and got its own visual treatment in
  `PrintItemShare` (`components/print/PrintItem.tsx`) — separate from `PrintItemFull`, which is
  untouched and keeps its plain-document styling on purpose (different job: internal reference,
  not something forwarded). Hierarchy now: "Simple Explanation" is a large colored card (the
  actual value — dominant), "The Mechanics" nests inside it with its own accent border, "Original
  Article Text" deliberately recedes below (bold label, muted/gray body — reference material,
  not the main event). **Gotcha for any future colored print element:** Chrome/Safari print
  dialogs often default "Background graphics" off, which silently drops bg-colors/gradients with
  no error — set `print-color-adjust: exact` (+ `-webkit-` prefix) to force them. Applied once on
  each article root (inheritable) rather than repeated per colored element.

**v5.11.4 — Share PDF type scale, sized for how it's actually read.** These PDFs are opened on
a phone, almost always fit-to-page-width — which shrinks a print-point font size much more than
it looks reviewing the same PDF on a laptop. A "bump it a little" pass would have undersold the
fix; Share mode's sizes went up meaningfully across the board (body copy in the Simple
Explanation card to 19px, Original Article Text body to 16px — was 12px, the smallest thing on
the page despite usually being the longest block anyone reads — headers scaled up to match).
`PrintItemFull` untouched, still the original compact size (internal reference document, not
optimized for phone reading the same way). `PrintFooterText` took a `large` prop rather than a
second component, so Share and Full can each get the right size from one shared source of the
actual copy. General note for this print surface: when sizing anything meant to be read on a
phone from a fit-to-width PDF, size for that shrink — verifying by eye on a laptop-width preview
undersells how small it'll actually read.

**v5.12.0 — source-name derivation fixed at both write and read time.** `savedFromAnalysis()`
used to store `sourceLabel || originalUrl || "Pasted text"` in `SavedItem.sources` — when the
optional manual source-name field (Research paste form) was left blank for a URL-mode analysis,
the raw URL landed in `sources` verbatim, surfacing as an unbroken URL string filling the Share
PDF's source pill (and the equivalent line in Full mode / SavedList). The in-app source *chip*
(`sourceChip()` in `components/saved/SavedList.tsx`) never had this bug — it always derived a
friendly site name (`cnbc.com` → "CNBC") via its own `siteName()` helper — so the fix was to
extract that helper to `lib/format.ts` as `siteNameFromUrl()` and use it everywhere `sources` is
read or written, not just in the one place that already worked. Fixed at the mapper (new saves
get a clean `sources` value) AND at every display site (`PrintItem.tsx`'s `SourceLine` and Share
header, `SavedList.tsx`'s "Source:" line) — the display-site fix matters because it also rescues
*already-saved* items whose `sources` still has the old raw-URL value baked into their stored
JSONB payload; the mapper fix alone wouldn't have touched those.

### Markets tab — Emerging Risks & Implications, merged (v5.12.0)
Used to be two separately-scrolled sections, `EmergingRisks.tsx` (id `"emerging"`) and
`BankImplications.tsx` (id `"implications"`), that always covered the exact same 5 themes —
`BankImplication.riskId` is a documented 1:1 link to `EmergingRisk.id`, guaranteed by
`lib/weeklyEngine.ts`'s `mergeMarkets()`, which builds `implications` FROM the emerging-risks
list (`EMERGING_RISKS.map(...)`) rather than as an independent array. Reading them meant
cross-referencing "Persistent Inflation" in one list against "Persistent Inflation" again in the
other. Both retired; `components/MarketsRiskThemes.tsx` renders one card per theme (risk read up
top, its five bank-implication lenses underneath), wired in under a **new** `CollapsibleSection`
id (`"riskthemes"`, neither of the two old ones — see the id gotcha above).

This also added the section's first-ever Learning path: `EmergingRisk.noteLayman` and
`BankImplication.layman.*` already existed on the type (unused — `lib/weeklyEngine.ts`'s
generation prompt never asked for them, and no UI read them), so the actual work was (1)
prompting for `noteLayman` + a `layman` twin of all five implication areas in the weekly re-rate
call, with every field falling back through model → curated base's own layman → executive text
if even that's missing, so a cell is never blank; (2) rewriting `IMPLICATIONS_BASE`
(`lib/fallbackData.ts`) — previously 3 generic market-scenario entries with no `riskId` at all,
usable only before the first weekly job had ever run — into the same 5-entry, risk-keyed shape
`mergeMarkets()` produces, each with a full layman twin; (3) giving `MarketsRiskThemes` its own
local Executive/Learning toggle, matching the established pattern (`ResearchWorkspace`,
`SavedList` each own their state rather than reaching for the header's) rather than wiring into
the header toggle, which per the Navigation structure note above deliberately doesn't reach
Markets at all.

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
