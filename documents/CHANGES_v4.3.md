# V4.3 — Apply Guide

Four fixes: a **transient Gemini retry**, **robust theme persistence**, a **"what's new" delta** on recurring themes, and **Bank Implications linked 1:1 to Emerging Risks**. ✅ `tsc --noEmit` clean **and** `npm run build` compiled successfully against your repo.

## Files (overwrite — no new files this release)

| In this download | Repo path | Change |
|---|---|---|
| `llm.ts` | `lib/llm.ts` | single transient retry (503/429/5xx/timeout) before Anthropic fallback |
| `snapshotStore.ts` | `lib/snapshotStore.ts` | `resolveTopicId` + closed topic vocabulary |
| `snapshotEngine.ts` | `lib/snapshotEngine.ts` | uses the resolver; computes "what's new" vs prior snapshot |
| `types.ts` | `lib/types.ts` | `CroTheme.whatsNew`; `BankImplication.riskId`/`riskName` |
| `weeklyEngine.ts` | `lib/weeklyEngine.ts` | weekly job generates one implication per emerging risk |
| `CroConversation.tsx` | `components/intel/CroConversation.tsx` | renders the "what's new" callout |
| `BankImplications.tsx` | `components/BankImplications.tsx` | shows the linked emerging-risk on each implication |

No new env vars required. Optional: `GEMINI_RETRY_MS` (default 35000) tunes the retry gap.

## What each fix does

**Transient retry.** This morning's 503 "high demand" would now trigger one ~35s retry on Gemini before any fallback — most such blips clear on the second try, sparing your Anthropic credits. Only transient errors retry; a bad key or invalid JSON falls through immediately. One attempt only, so it stays inside the 180s cron budget.

**Robust theme persistence.** Stops trusting the model's free-text `topicId`. A theme maps to a canonical topic only when its **title** actually supports it (keyword vocabulary), otherwise it gets a specific title-derived id. This fixes new stories inheriting an old theme's "Day 5" via a reused broad slug — and the reverse (recurring themes wrongly showing NEW).

**"What's new."** Recurring themes now show a green "What's new" line when something changed since the prior snapshot — a severity change or a newly added signal. It's a deterministic diff (no LLM call, no quota cost); it shows nothing when nothing material changed.

**Risks ↔ Implications linked.** Bank Implications are now keyed 1:1 to Emerging Risks. The weekly job generates one implication per risk, so all five risks get a linked bank implication (previously 5 risks / 3 unrelated implications), and each implication card shows which risk it belongs to.

## Important sequencing note for the linkage

The full 5-linked-implications set is **produced by the weekly job**. Until your next weekly run (Saturday, or a manual trigger), the Markets tab still shows the cold-start curated 3 (unlinked) — that's expected, not a regression. To see the linked set immediately, trigger the weekly job once:

```
curl "https://<your-app>/api/cron/weekly?secret=<CRON_SECRET>"
```

Then Markets → Implications shows five cards, each tagged "Linked to emerging risk: …".

## Deploy

```
npm run build
git add . && git commit -m "V4.3: transient retry + robust theme persistence + what's-new + risk↔implication link"
git push
```

## Caveats (honest)

- I validated compilation, the full build, and all deterministic logic. The parts I **can't** validate here are model-behaviour-dependent: whether the new topic vocabulary catches your real themes well, and whether the weekly per-risk implications read sensibly (no Anthropic key in my environment). Both are grounded and fail soft, but watch the first daily runs (theme tagging / "what's new" relevance) and the first weekly run (implication quality).
- The topic vocabulary is curated and finite — a recurring theme outside it persists by title slug and can drift if the model heavily rewords the title. Tunable by adding entries to `TOPIC_VOCAB`.

## Docs

`risk-dashboard-master-context-v4_3.md` and `engineering-reference-v4_3.md` updated (changelog, v4.3 engineering section, theme-persistence debt note). Worth uploading both to the Project knowledge.
