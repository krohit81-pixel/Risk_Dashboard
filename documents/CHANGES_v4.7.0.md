# v4.7.0 — backlog batch (8 items)

✅ `tsc` + `npm run build` clean; Python `py_compile` clean. No new env vars required (item 7 adds optional ones).

## Files
`components/intel/CroConversation.tsx` · `components/saved/SavedList.tsx` · `lib/snapshotEngine.ts` · `lib/weeklyEngine.ts` · `lib/types.ts` · `components/EmergingRisks.tsx` · `components/RiskHeatMap.tsx` · `lib/snapshotStore.ts` · `api/cron-bloomberg.py` · `lib/version.ts` · `package.json`

---

## 1 · Week-over-week deltas feed the weekly re-rate
`buildWeekContext` now gives the model concrete moves per indicator — `prev`, `Δ`, and a `w/w` change for daily series (from the 4.6.0 history) — instead of just value + trend word. So a real move (spreads widening, vol jumping, a new CPI print) is visible evidence to re-rate against.

## 2 · Loosened the anchor
The re-rate prompt now states the spine ratings are **last week's** and tells the model to re-evaluate from this week's evidence rather than default to them — move a rating when the deltas support it, hold only when evidence genuinely hasn't shifted, and rewrite each one-line read for the week. Avoids both over-reacting and rubber-stamping. (Risk ids/regions still fixed — spine stays curated.)

## 3 · "Reviewed" date per region & risk
Every heat-map region and emerging risk now carries a `reviewedISO`, stamped whenever the weekly job re-rates it. Renders as a small **"Reviewed Jun 27"** line on each emerging-risk card and in the expanded region detail. So a held Amber reads as a deliberate "reviewed, still Amber," not staleness — exactly the signal you asked for. (Absent until the next weekly run writes it.)

## 4 · Risk-horizon alignment fixed
The CRO card header had **two** `ml-auto` elements (HorizonPill + the NEW badge), which made "· risk horizon" float to center. Removed the duplicate, so it right-aligns cleanly. Editorial/Japan cards were already correct (single `ml-auto`) and are untouched.

## 5 · CRO Conversation cards collapsible, collapsed by default
Each theme card now shows pills + title when collapsed; tap the title (chevron on the right) to expand the full body. Default collapsed, matching the Learn-tab pattern. The inner "Go deeper" toggle still works inside the expanded card.

## 6 · Bloomberg / site labels on saved Research capsules
The "Pasted" bug is fixed: `sourceChip` now reads **both** `sourceLabel` and the older `sources` field, so pre-4.6 Bloomberg saves relabel to **"Bloomberg"** too (the screenshot item had `sources` set but no `sourceLabel`). And URL analyses now show the **site name** — "CNBC URL", "Reuters URL", etc. — derived from the link's host (with a friendly-name map for common outlets).

## 7 · Configurable email provider + keywords (extractor)
No more hardcoding. New optional env vars:
- `IMAP_HOST` (default `imap.aol.com`), `IMAP_EMAIL` / `IMAP_PASSWORD` (fall back to `AOL_EMAIL` / `AOL_APP_PASSWORD`).
- `INGEST_SENDERS` — comma-separated From-header substrings (default Bloomberg). Add CNBC, Reuters, etc.; the IMAP search unions across all of them.
- `EXTRA_NEWSLETTERS` — add briefing/source keywords without code. Two formats:
  - compact: `CNBC=cnbc;Bloomberg Weekend=bloomberg weekend|weekend reading`
  - JSON: `[{"key":"cnbc","label":"CNBC","match":["cnbc"]}]`

The two knobs stay separate, as discussed: `INGEST_SENDERS` = *which emails to pull*; `EXTRA_NEWSLETTERS` = *how to classify/label them* (extends the current header/footer matcher). The extractor also publishes its known type keys to `bloomberg:type_index`, and the Research panel reads that — so env-added types actually appear without a code change.

## 8 · Fewer morning-cron Anthropic escalations
Root cause from your log: with only 3 clusters, the prompt demanded "3-5 themes **and** 1-2 editorial cards, each on a different cluster" — unsatisfiable, so Gemini under-produced (1 theme) and we escalated. Fixes:
- **Theme count is now bound to clusters**: "you have N clusters → produce one theme per cluster." Editorial cards are explicitly optional and only when there are >3 clusters; with ≤3, return an empty editorial array and use every cluster as a theme.
- **Gemini gets a sharpened re-ask** on under-production *before* escalating to Anthropic. Only if that also fails do we fall back. Keeps the morning run on Gemini in exactly the logged case.

(Couldn't reproduce the live LLM path here — validated logic/build. Watch the next light-volume morning: logs should show `re-asking Gemini once (sharpened)` and `provider=gemini` rather than jumping to Anthropic.)

---

## Deploy
```
npm run build
git add . && git commit -m "v4.7: weekly deltas + reviewed dates, CRO card collapse/align, source labels, configurable ingest, fewer escalations"
git push
```
Optional env (item 7) only needed if you want to add sources beyond Bloomberg.

## Test
1. CRO Conversation: cards collapsed by default; "· risk horizon" right-aligned; tap title to expand.
2. Learn → Saved Analyses: old Bloomberg saves now show "Bloomberg"; URL saves show "CNBC URL"/etc.
3. After the next Saturday weekly run: emerging-risk cards + region details show "Reviewed <date>"; ratings should move where the week's deltas warrant.
4. Next light morning: cron log shows the Gemini re-ask before any Anthropic escalation.
