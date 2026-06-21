# V4.1a — Apply Guide

Save parity + full-piece capture. Saved items now carry the **bulleted impact areas, every plain-English twin, and the deeper sections** (lenses, signals, leadership questions, talking point, follow-up, what-to-understand; editorial first/second-order + key takeaway). Learn renders them with a **Learning/Executive toggle (Learning default)** and a *Full detail* expander.

✅ Validated: `tsc --noEmit` clean **and** `npm run build` compiled successfully against your repo.

## Files to drop in (overwrite, except the one marked NEW)

| File in this download | Goes to (repo path) | What changed |
|---|---|---|
| `savedMappers.ts` | `lib/savedMappers.ts` | **NEW** — raw item → full SavedItem (exec + layman + deeper detail) |
| `savedStore.ts` | `lib/savedStore.ts` | extended `SavedItem` + new `SavedDetail` (all optional → old saves still valid) |
| `SavedList.tsx` | `components/saved/SavedList.tsx` | Learning/Executive toggle, bulleted impact, twins, Full-detail expander |
| `ResearchWorkspace.tsx` | `components/research/ResearchWorkspace.tsx` | uses `savedFromAnalysis` |
| `CroConversation.tsx` | `components/intel/CroConversation.tsx` | `rawThemes` prop; maps from raw |
| `EditorialIntelligence.tsx` | `components/intel/EditorialIntelligence.tsx` | `rawCards` prop; maps from raw |
| `JapanAsiaWatch.tsx` | `components/intel/JapanAsiaWatch.tsx` | `raw` prop; maps from raw |
| `page.tsx` | `app/page.tsx` | passes raw `data.intelligence.*` to the three sections |

> These were edited in place against a fresh clone of your repo, so each file already contains your existing code plus the changes — safe to overwrite.

## No new packages, no env changes

Nothing new to install; `RESEARCH_DAILY_CAP` from v4.1 is unchanged. (If you haven't deployed v4.1 yet, deploy these together — v4.1a builds on it.)

## The one subtlety worth knowing

Saved themes/editorial/Japan are mapped from the **raw** (unresolved) snapshot data, not the on-screen version. Reason: when you're in Learning view, the live objects have already had their executive text replaced by plain-English — so saving from the resolved object would lose the executive original. `page.tsx` now passes the raw data alongside, and the mappers read from it, so **both** views are captured no matter which view you save from. (Research already carried both, so it's unaffected.)

## Recommended before pushing

```
npm run build
```

If it compiles, file placement is correct → deploy via your usual push:

```
git add .
git commit -m "V4.1a: save parity + full-piece capture + Learning view in Learn"
git push
```

A failed Vercel build won't replace your live site, so you can't break production by pushing.

## Sanity check after deploy

1. Save a Research analysis → open the **Learn** tab → it shows bullets for impact and opens in **Learning** by default; toggle to **Executive** and the text switches.
2. Save a **CRO Conversation** theme (try saving while in Learning view *and* while in Executive view) → in Learn, the *Full detail* expander shows lenses, signals, leadership questions, talking point and follow-up, and the toggle flips every field between plain-English and executive.
3. Older items saved before this release still render (they just won't have the deeper sections — expected).

## Storage note (your Supabase question)

Staying on **KV** — these records are text-only and small, with no relational/auth/concurrency need. The move to Supabase is a separate future workstream (multi-device sync, editable concept library, notes, search). The signal to revisit: raising the 50-item cap into the hundreds, or adding notes/editing.

## Docs

`risk-dashboard-master-context-v4_1a.md` and `engineering-reference-v4_1a.md` are the updated context docs (changelog, new Saved-items engineering section documenting the schema, the raw-mapping requirement, and the KV decision). Worth uploading these to the Claude Project knowledge so future sessions start current.
