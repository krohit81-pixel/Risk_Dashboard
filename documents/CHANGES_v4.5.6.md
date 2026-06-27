# v4.5.6 — Learn tab: saved cards collapsed by default

Small change. ✅ `tsc` clean.

## Files
| In this download | Repo path | Change |
|---|---|---|
| `SavedList.tsx` | `components/saved/SavedList.tsx` | saved cards now start **collapsed** (title only); tap the title to expand |
| `version.ts` | `lib/version.ts` | `APP_VERSION` → 4.5.6 |
| `package.json` | `package.json` | version → 4.5.6 |

## What changed
On the Learn tab, each saved analysis used to render fully expanded, so 17 items meant a very long scroll. Now every card opens **collapsed** — showing just the kind pill, title, and Remove — and you expand only the ones you want by tapping the title. Nothing about the content or save format changes; it's purely the default open/closed state.

The per-card toggle and the Learning/Executive switch are unchanged.

## Deploy
```
npm run build
git add . && git commit -m "v4.5.6: Learn saved cards collapsed by default"
git push
```
