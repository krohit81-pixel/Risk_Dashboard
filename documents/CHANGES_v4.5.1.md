# v4.5.1 — Bloomberg digest: TTL + staleness guard

Small follow-up so the Research Bloomberg panel never shows a stale digest indefinitely. Two coordinated changes; no new env vars, no schema change. ✅ Python `py_compile` clean; TS `tsc` + `npm run build` clean.

## Files (overwrite)

| In this download | Repo path | Change |
|---|---|---|
| `cron-bloomberg.py` | `api/cron-bloomberg.py` | `bloomberg:latest` now written with a **36h TTL** (`LATEST_TTL_HOURS`) |
| `ResearchWorkspace.tsx` | `components/research/ResearchWorkspace.tsx` | **staleness guard** in the Bloomberg panel |

## What changes

**TTL (the "expires on its own" part).** `bloomberg:latest` is now written via `setex(..., 36h, ...)` instead of a permanent `set`. If the extractor stops running (no new Bloomberg mail, or a cron failure), the key self-deletes after 36h and the panel simply disappears — no stale digest pinned forever. Each successful run refreshes the 36h clock. The dated `bloomberg:{date}` keys are unchanged (kept as lightweight history). Tune via `LATEST_TTL_HOURS`.

**Staleness guard (the display part).** The panel computes the digest's age from `publication_date`:
- **Today / yesterday** (0–1 days): full interactive panel. A "· yesterday" hint shows when it's a day old, so you're never unsure whether you're looking at today's.
- **2+ days old:** the interactive panel is replaced by a muted one-line note — "Bloomberg — last digest {date} · no newer update" — so old stories are never presented as actionable. (With the 36h TTL this path is rarely hit, but it covers the in-between window and the dated-key case.)

Together: the panel shows the current digest, labels its freshness, quietly steps aside when stale, and the key never lingers indefinitely.

## Not included (by design)

Per the discussion, no per-story "dismiss" / "clear" control — it would need persisted state (KV) for a marginal benefit and risks an accidental affordance next to the frequently-used Analyze button. Analyzing a story still doesn't remove it from the digest; it's a queue you skim, not a checklist you clear.

## Deploy

```
npm run build
git add . && git commit -m "v4.5.1: Bloomberg latest TTL + panel staleness guard"
git push
```

## Test

- Normal: today's digest → full panel as before.
- Staleness display: temporarily set an old `publication_date` in a test value, or lower `LATEST_TTL_HOURS`, to see the muted note / expiry behavior.
