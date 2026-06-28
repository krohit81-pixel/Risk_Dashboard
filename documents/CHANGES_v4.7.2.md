# v4.7.2 — critical: stop the date-check fetch from marking mail read

One file: `api/cron-bloomberg.py` (overwrite). ✅ `py_compile` clean.

## The bug (this is why you saw "read but 0/0 processed")

The candidate loop fetched each email with `(RFC822)` to read its date — and an **RFC822 fetch implicitly sets the `\Seen` (read) flag** per the IMAP spec. That happens *before* the age check, so any email the IMAP search returned got **marked read even when it was then skipped as too old**. v4.7.1 widened the `SINCE` window, which pulled your 26-June emails into that fetch → they were marked read, then skipped by the 24h cutoff → **0/0 processed**, and now they're read so a normal re-run won't find them.

## The fix
- Fetch with **`BODY.PEEK[]`** instead of `RFC822`. PEEK returns the full message **without** setting `\Seen`. Now an email is only ever marked read when it's actually processed (or deduped/junk-skipped) — never by the date check. Out-of-window emails are left untouched and unread.
- Added **diagnostic logging** so this is visible next time: `[bloomberg] N unread candidate(s) … lookback=Xh` and `skipped N email(s) older than Xh — widen LOOKBACK_HOURS`.

(The processing loop already reuses the message parsed in the candidate loop, so there's no second fetch to worry about.)

## To finally ingest the finews / Weekend emails

They were marked read by the buggy run, and finews (26 Jun) is older than the 24h default. After deploying this:

1. **Deploy** this `cron-bloomberg.py` (push).
2. Set env **`LOOKBACK_HOURS=72`** (the finews email is ~60h old; 24h is too short).
3. Confirm **`EXTRA_NEWSLETTERS`** is the corrected value (so it's labelled, not generic):
   ```
   Bloomberg Weekend=bloomberg weekend,finews=finews|where finance meets
   ```
4. **Mark the finews / Weekend emails unread** in AOL again.
5. **Re-run** `/api/cron-bloomberg?secret=<CRON_SECRET>`.

This time the PEEK fetch won't re-consume them, the 72h window includes the 26-Jun finews, and they'll process. Check the Vercel logs — you'll now see the candidate count and a Gemini call per email, and Today → Generation History should show them processed with `finews` / `Bloomberg Weekend` in `newsletter_types`.

Once you've confirmed it works, you can drop `LOOKBACK_HOURS` back to 24 (or leave it higher as a wider safety net — your call; higher just means it looks back further for unread mail).

## Deploy
```
git add . && git commit -m "v4.7.2: BODY.PEEK so date-check never marks mail read + ingest logging"
git push
```
