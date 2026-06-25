# v4.5.2 — Bloomberg: per-briefing grouping, twice-daily ingest, run history, analyze-persistence

Five changes. ✅ Python `py_compile` clean; TS `tsc` + `npm run build` clean; `/api/bloomberg` registered.

## Files

| In this download | Repo path | Change |
|---|---|---|
| `cron-bloomberg.py` | `api/cron-bloomberg.py` | newsletter detection, per-briefing KV keys, run logging |
| `vercel.json` | `vercel.json` | two Bloomberg crons (05:30 & 19:00 IST); old 12:30 removed |
| `types.ts` | `lib/types.ts` | `BloombergRun`, `ingested_at`, `bloombergRuns` on DashboardData |
| `snapshotStore.ts` | `lib/snapshotStore.ts` | per-briefing readers, analyzed-set (+TTL), runs, `kvSetEx` |
| `bloomberg-route.ts` | `app/api/bloomberg/route.ts` | returns all briefings + analyzed set (rename to `route.ts`) |
| `research-analyze-route.ts` | `app/api/research/analyze/route.ts` | records analyzed Bloomberg headline (rename to `route.ts`) |
| `dashboard-route.ts` | `app/api/dashboard/route.ts` | adds `bloombergRuns` to payload (rename to `route.ts`) |
| `ResearchWorkspace.tsx` | `components/research/ResearchWorkspace.tsx` | grouped-by-briefing panel + persisted ✓ |
| `RunHistory.tsx` | `components/RunHistory.tsx` | `BloombergRunHistory` sub-list |
| `page.tsx` | `app/page.tsx` | renders Bloomberg ingestion under Generation History |

The three `*-route.ts` each become `route.ts` in their own folder.

## 1 + 2 · Per-briefing grouping & separate storage

Detection is deterministic in Python from the subject + start of body (not the model), mapping to a fixed vocabulary: Evening/Morning Briefing Americas, Evening/Morning Briefing Asia, Markets Daily (+ an `other` bucket). Each briefing is stored under its **own** key `bloomberg:type:{key}` with its **own 36h TTL**. So morning and evening coexist; the same briefing next day overwrites only its own key; and a briefing that goes quiet expires on its own after 36h. The Research panel reads all present briefings and renders each as its own labelled group (header + lead + stories), freshest first, each with its own freshness/staleness line.

> Subjects can drift — detection matches the briefing phrases ("evening briefing americas", "markets daily", etc.) case-insensitively in subject **and** the first ~600 chars of the body, so a reworded subject still classifies as long as the briefing name appears. If Bloomberg renames a briefing outright, add a phrase to `NEWSLETTER_TYPES` in the Python.

## 3 · Twice-daily cron

`vercel.json` now runs the extractor at **00:00 UTC (05:30 IST)** and **13:30 UTC (19:00 IST)**. The 05:30 run catches the Americas evening brief (~02:30–03:00 IST); 19:00 catches the Americas morning brief. The old single 12:30 IST slot is removed. Each run only looks back 24h and dedupes, so the two runs don't double-process.

## 4 · Bloomberg runs in Today's history

Every run writes a capped (15), newest-first record to `bloomberg:runs` in your exact shape — `{ run_time, emails_found, processed, failed, newsletter_types[] }` — including no-mail runs, so the cron heartbeat is visible. The dashboard surfaces these as a **separate "Bloomberg ingestion" sub-list** under Generation History (kept distinct from the editorial log since the fields differ), showing processed/found, failures, and the latest briefings ingested.

## 5 · "Analyze this" persistence (the reload bug)

The ✓ was in-memory React state, so it reset on reload. Now: analyzing a Bloomberg story records its **headline** in `bloomberg:analyzed` (KV, 48h TTL); the panel reads that set on load and marks those stories done. It persists across reloads and clears with the digest cycle. (It keys on the Bloomberg headline — "this story was analyzed" — not the saved analysis title, which differs.)

## Deploy

```
npm run build
git add . && git commit -m "v4.5.2: Bloomberg per-briefing grouping + twice-daily + run history + analyze persistence"
git push
```

No new env vars.

## Test

1. Trigger `/api/cron-bloomberg?secret=<CRON_SECRET>` → logs show `run` with `newsletter_types`.
2. Research → Bloomberg panel shows **separate groups** per briefing (e.g. "Evening Briefing — Americas", "Markets Daily").
3. Analyze a story → reload the app → it still shows **✓ Analyzed**.
4. Today → Generation History → a "Bloomberg ingestion" sub-list appears with run records.

## Caveat

Detection phrases are based on the briefing names you gave; eyeball the first runs to confirm each of your 5 briefings classifies to the right group (the `newsletter_types` in the run log is the quickest check). Anything unmatched lands in the generic "Bloomberg" group rather than being lost.
