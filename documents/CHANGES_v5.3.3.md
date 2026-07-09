# v5.3.3 — fix: no back button on the item-not-found screen (my incomplete fix from 5.3.1)

Files: `app/print/[id]/page.tsx` · `app/api/saved/route.ts` · `lib/savedStore.ts`. ✅ tsc + build clean.

## Apply map
```
app_print_id/page.tsx    → app/print/[id]/page.tsx    (replaces existing)
app_api_saved/route.ts   → app/api/saved/route.ts     (replaces existing)
lib/savedStore.ts        → lib/savedStore.ts           (replaces existing)
```

## Root cause of "stuck, had to kill the app" — confirmed, not guessed
In v5.3.1 I added the bottom action bar (with the "← Back" link) to fix exactly this trap on the briefing-book page — and applied it to every state there (loading, error, success). But on the **single-item** print page, I only added it to the **success** state. The loading screen and the "Item not found" screen had no action bar at all — reproducing the identical trap I'd just fixed, just on a different screen. That's a genuine miss on my part in the last release, confirmed by re-reading the code, not speculation. Fixed: every state of `/print/[id]` now has the action bar.

## "No progress circle displayed"
The single-item page only ever showed plain "Loading…" text — I'd only added the circular progress ring to the briefing-book page. Added it here too (a short 4-second estimate, since fetching one saved row is much faster than compiling a book).

## "Item not found" — the part I genuinely can't diagnose from here
I don't have live access to your Supabase project, so I can't reproduce or confirm the exact cause of that specific lookup failing. What I found and fixed: `getSavedById` was **silently swallowing real errors** — if the Supabase query itself failed for any reason (a transient issue, a permissions hiccup, anything), it returned `null`, which the print page displayed as "Item not found. It may have been removed." — identical to a genuinely missing id. That's a real bug: a temporary fetch/query error and "this item doesn't exist" are very different situations and were indistinguishable.

Fixed: `getSavedById` now **throws** on a real error instead of returning null (matching how `addSaved`/`removeSaved` already behave); the API route catches that and returns a distinct `error` field; the print page shows a **different message** for "Something went wrong loading this item: …" vs. "Item not found," plus a **"Try again"** button on both.

**If this happens again**, the new error message will actually say what failed (rather than the generic "not found"), which will make it possible to diagnose properly. If you hit it again, the exact error text is the thing to send me.

One thing worth checking on your end: was the item you tried to print one you'd saved a while back, or a very recent one? If it's reproducible on a specific item, tapping "Try again" on the new error screen (or reloading) may now surface the real reason instead of masking it.

## Deploy
```
npm run build
git add . && git commit -m "v5.3.3: action bar on every print-item state, progress ring, surface real errors instead of masking as not-found"
git push
```

## Test
1. Print a saved item that exists → loads with the progress ring, then renders normally, Back button present throughout.
2. Print a made-up/nonexistent id (e.g. edit the URL) → "Item not found" with a working Back button and a Try again button.
3. If the original error recurs, note the exact message shown this time (no longer generic) and send it over.
