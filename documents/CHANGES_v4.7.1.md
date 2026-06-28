# v4.7.1 — risk-horizon layout + EXTRA_NEWSLETTERS comma parsing

✅ `tsc` + build clean; `py_compile` clean.

## Files
`components/intel/intelUi.tsx` · `components/intel/CroConversation.tsx` · `api/cron-bloomberg.py` · `lib/version.ts` · `package.json`

## 1 · Risk-horizon layout (really fixed this time)
v4.7.0 removed the duplicate `ml-auto`, but `HorizonPill` still had its own — so when the category pill is long ("Operational Risk & Resilience"), the horizon wrapped to a second line and got pushed right, looking off. Now: the category / severity / horizon pills flow together on the left (horizon uses a new `inline` mode = no `ml-auto`), and only the NEW badge is pinned top-right via `justify-between`. The horizon no longer floats. Editorial / Japan cards are untouched (they still use the default right-aligned `HorizonPill`).

## 2 · EXTRA_NEWSLETTERS now accepts commas
Your value used commas to separate entries (`Bloomberg Weekend=bloomberg weekend,Please Add=please add`), but the parser only split on semicolons — so it mis-parsed into one broken entry, and Weekend/finews never got a real classifier. The compact parser now accepts **both `,` and `;`** as separators (use `|` for multiple phrases within one entry). Your existing value will now parse correctly after redeploy.

## 3 · LOOKBACK_HOURS is now configurable
New optional env `LOOKBACK_HOURS` (default 24). The IMAP `SINCE` window now tracks it too, so widening it actually works — useful if a newsletter arrives and you only add its config afterwards.

---

## Why finews / Weekend weren't picked up (mostly not a bug)
- The **finews** email is dated **Fri 26 Jun**; the cron ran **Sun 28 Jun** with a 24h lookback — so it was 2 days out of window and never fetched (which is also why the cron didn't mark it read; you opened it). Not retroactively ingestible via the normal path.
- **Bloomberg Weekend** was most likely already ingested as a generic "Bloomberg" item by an earlier run *before* you added the keyword, so it's deduped now.
- Both will classify correctly **going forward**, once you fix the config value below and redeploy.

## Action: update your env values

**EXTRA_NEWSLETTERS** — replace `Please Add=please add` (too generic — many newsletters say "please add … to your address book") with a finews-specific keyword:
```
Bloomberg Weekend=bloomberg weekend,finews=finews|where finance meets
```
("finews" matches `finews.com` / `newsletter@finews.ch` in the footer; "where finance meets" is its tagline.)

**INGEST_SENDERS** — yours is already correct:
```
noreply@news.bloomberg.com,newsletter@finews.ch
```

Then **redeploy** (env changes need a new deployment). To pull in the *current* finews email this once: mark it unread in AOL and temporarily set `LOOKBACK_HOURS=72` for one run. (Bloomberg Weekend can't be re-pulled easily — it's deduped — just wait for next Saturday's.)

## Deploy
```
npm run build
git add . && git commit -m "v4.7.1: risk-horizon inline layout + EXTRA_NEWSLETTERS comma parsing + configurable lookback"
git push
```
