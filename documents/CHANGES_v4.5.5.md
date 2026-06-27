# v4.5.5 — Bloomberg collapsible groups, source labels, version badge, stray-dot removal

All four UI/UX asks. ✅ `tsc` + `npm run build` clean. No new env vars.

## Files

| In this download | Repo path | Change |
|---|---|---|
| `version.ts` | `lib/version.ts` | **new** — single source of truth for the app version |
| `package.json` | `package.json` | version bumped to 4.5.5 |
| `page.tsx` | `app/page.tsx` | shows `v4.5.5` next to the app title |
| `ResearchWorkspace.tsx` | `components/research/ResearchWorkspace.tsx` | each Bloomberg briefing is now independently collapsible; Bloomberg analyses tagged with their edition |
| `SavedList.tsx` | `components/saved/SavedList.tsx` | removed the stray "." chevron; shows the Bloomberg source label |
| `types.ts` | `lib/types.ts` | `sourceLabel` on ResearchAnalysis |
| `analyze.ts` | `lib/analyze.ts` | `sourceLabel` carried onto the analysis |
| `savedStore.ts` | `lib/savedStore.ts` | `sourceLabel` on SavedItem |
| `savedMappers.ts` | `lib/savedMappers.ts` | `sourceLabel` carried into the saved item + used as Source |
| `research-analyze-route.ts` | `app/api/research/analyze/route.ts` | accepts `sourceLabel` (rename to `route.ts`) |

`research-analyze-route.ts` → `app/api/research/analyze/route.ts`.

## 1 · Collapsible Bloomberg briefings

Each briefing group (Evening Briefing — Asia, Markets Daily, etc.) now has its own tappable header and collapses independently, with its own story count + chevron. Groups open by default (nothing hidden on load); tap a header to fold one away. The outer "Bloomberg — today" panel collapse is unchanged, so you can fold everything or fold just one briefing.

## 2 · Removed the stray "." in saved cards

That mark was a redundant expand/collapse chevron next to the source pill — redundant because tapping the card title already expands/collapses it. Removed the chevron; the title tap still toggles, so no function lost.

## 3 · Bloomberg analyses now show their edition

Analyzing a Bloomberg story used to save as "Pasted text". It now records the edition, e.g. **"Bloomberg · Evening Briefing — Asia"**, shown both on the saved card's source line and the "Source:" line. (URL and image analyses are unchanged.) Plumbed via a new optional `sourceLabel` that flows analyze → analysis → saved item; when absent, behavior is exactly as before.

## 4 · App version on screen

`lib/version.ts` exports `APP_VERSION` (now `4.5.5`) and it renders as a small muted `v4.5.5` next to "Global Risk Intelligence" in the Today header. `package.json` matches. Bump `APP_VERSION` on each release and it shows up automatically.

> Note: the Python extractor's last change was v4.5.4 (transient backoff). The version badge reflects the **dashboard** deploy; they ride the same push, so 4.5.5 is the current combined state.

## Deploy

```
npm run build
git add . && git commit -m "v4.5.5: collapsible Bloomberg groups + edition source labels + version badge + stray-dot removal"
git push
```

## Test

1. Research → Bloomberg: tap a briefing header → it collapses; others stay; tap again → expands.
2. Analyze a Bloomberg story → Learn → the saved card reads "Bloomberg · {edition}", not "Pasted text".
3. Learn → saved cards no longer show the "." before the title; tapping the title still expands.
4. Today header shows `v4.5.5` next to the title.
