# v5.1.2 — cosmetic: "Weekly Learning Summary" wrapping (+ carries the v5.1.1 fix)

Files: `app/page.tsx` · `app/api/saved/route.ts` (→ `app/api/saved/route.ts`). ✅ tsc + build clean. No new env.

## 1 · Weekly section title no longer wraps
"Weekly Learning Summary" was long enough to wrap to two lines (and pushed its "generated weekly" hint onto two lines too). Renamed to **"Weekly Summary"**, so section 04 sits on one line like the others.

## 2 · Includes the v5.1.1 fix (in case it never deployed)
Your screenshot shows **v5.1.0** live, so v5.1.1 didn't land. This bundle re-includes the v5.1.1 `saved/route.ts` change so applying v5.1.2 brings it in regardless: `mizuhoLens` and `articleDate` are persisted on saved analyses (they were being stripped by the save whitelist, so the Mizuho lens vanished on reopen).

## Deploy
```
npm run build
git add . && git commit -m "v5.1.2: weekly summary title (one line) + persist mizuhoLens/articleDate"
git push
```

## On the deploy not landing (worth a quick check)
Since v5.1.0 deployed fine and v5.1.1 changed only two small files, a failed *build* is unlikely — it's more likely the push/deploy didn't trigger or Vercel didn't pick it up. Quick things to check:
- Vercel dashboard → your project → **Deployments**: is there a new deployment for the v5.1.1 commit? If it's there but **Failed**, open it and read the build log (paste it here and I'll diagnose).
- Confirm the commit actually **pushed to the branch Vercel builds** (usually `main`) — `git log origin/main -1` should show your v5.1.1 commit.
- If the deployment isn't listed at all, the GitHub→Vercel hook may not have fired — a fresh commit (this v5.1.2) often nudges it.
- Hard-refresh the app after deploy; the header should read **v5.1.2**.
