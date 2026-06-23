# V4.4 — Apply Guide

Two features: **Research screenshot/image input** and a personalized **"What should I focus on?"** section. ✅ `tsc --noEmit` clean **and** `npm run build` compiled successfully against your repo.

## Files (overwrite; NEW where marked)

| In this download | Repo path | Change |
|---|---|---|
| `focusProfile.ts` | `lib/focusProfile.ts` | **NEW** — curated role/priority profile (reference config) |
| `focus.ts` | `lib/focus.ts` | **NEW** — `generateFocus()` dedicated personalized call (allowed-empty) |
| `llm.ts` | `lib/llm.ts` | `extractFromImage()` multimodal transcription + `ImageInput` type |
| `types.ts` | `lib/types.ts` | `FocusItem`; `focus` + `"image"` source on `ResearchAnalysis` |
| `savedStore.ts` | `lib/savedStore.ts` | `focus` + `"image"` source on `SavedItem` |
| `analyze.ts` | `lib/analyze.ts` | calls `generateFocus` after alignment; accepts image source |
| `savedMappers.ts` | `lib/savedMappers.ts` | persists `focus` |
| `research-analyze-route.ts` | `app/api/research/analyze/route.ts` | `mode:"image"` (extract → same pipeline), returns transcript |
| `saved-route.ts` | `app/api/saved/route.ts` | persists `focus` |
| `ResearchWorkspace.tsx` | `components/research/ResearchWorkspace.tsx` | Image tab, upload/preview, transcript block, `FocusBlock` |
| `SavedList.tsx` | `components/saved/SavedList.tsx` | renders `FocusBlock` on saved analyses |

> Two files are named `*-route.ts` in the download to avoid collision — each becomes `route.ts` in its own folder:
> `research-analyze-route.ts` → `app/api/research/analyze/route.ts`; `saved-route.ts` → `app/api/saved/route.ts`.

## No new env vars

Uses your existing `GEMINI_API_KEY`. (You've already set `RESEARCH_DAILY_CAP=10` for Tier 1.)

## How it works

**Screenshots** — Research now has a third tab, "Image." You add up to 4 screenshots (file / photo library / paste); they're transcribed verbatim by Gemini multimodal at temperature 0, and the transcript is fed to the **unchanged** `analyzeContent()` pipeline — so an image is just a third way to get text in. The result shows a collapsible "Transcribed text" block so you can see exactly what was read. If an image yields too little text, it fails gracefully and suggests pasting instead.

**Focus section** — after the Mizuho alignment, a separate `generateFocus()` call produces 0–5 personalized bullets (attention / likely conversation / learning), fed your role-and-priorities profile and the alignment result so it does **not** restate "Why Mizuho cares." It's allowed to be empty — when nothing genuinely applies, the section simply doesn't render (no filler). It's saved with the analysis and shown in Learn too.

Your profile lives in `lib/focusProfile.ts` — edit the role/priorities there anytime (it's plain config, not generated).

## Test after deploy

1. Research → **Image** → add a screenshot of an article → Analyze. You should see "From image", a "Transcribed text" expander, the normal analysis, and (when relevant) a gold "What should I focus on?" block.
2. Try a multi-screenshot article (2–3 images) → transcripts concatenate in order.
3. Save the analysis → open in Learn → the focus section persists.
4. A purely generic article should produce an **empty** focus section (renders nothing) — that's correct, not a bug.

## Deploy

```
npm run build
git add . && git commit -m "V4.4a: Bug Fix + Research screenshot input + personalized focus section"
git push
```

## Caveats (honest)

- I validated compilation, the full build, and all plumbing. The model-dependent parts can't be validated here (no Gemini key in my environment): transcription accuracy on real screenshots, and whether the focus bullets are genuinely non-generic vs duplicative of the alignment. Watch the first few of each. The transcript block exists precisely so you can catch a misread.
- Data posture, as agreed: screenshots go to Gemini via your key; internal/confidential material shouldn't be uploaded (no in-UI warning, per your call).

## Docs

`risk-dashboard-master-context-v4_4.md` and `engineering-reference-v4_4.md` are updated (changelog, v4.4 engineering section, Tier 1 + image-data-posture notes). Worth uploading both to the Project knowledge.
