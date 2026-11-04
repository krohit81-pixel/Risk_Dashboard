# Gemini migration — v5.17.2

This addendum supersedes the v5.17.1 reference documents' Gemini model/configuration
description. Product navigation, data sources, storage, and schedules are unchanged.

## Model and request changes

- Both `lib/llm.ts` and `api/cron-bloomberg.py` now default to `gemini-3.5-flash-lite`.
- Both honor the same trimmed `GEMINI_MODEL` environment variable; absent/blank uses the default.
  Previously the Python extractor hardcoded 2.5 and ignored this variable.
- All three TypeScript Gemini paths (text interpretation, image transcription, stock-metric
  extraction) use `thinkingConfig.thinkingLevel: "minimal"`, replacing `thinkingBudget: 0`.
- Python extraction explicitly uses `ThinkingConfig(thinking_level="minimal")`.
- Existing generation/extraction logs now include the selected model ID (never the key).
- Gemini requests omit `temperature`, which is deprecated for this model. The Anthropic
  request configuration, fallback chain, prompts, JSON parsing, and output limits are unchanged.
- Model overrides must support these Gemini 3 request settings. Changing the model string
  alone is not a supported rollback to Gemini 2.5's old request format.
- The existing generateContent API remains in use. This release does not migrate API families.

The shared TypeScript change reaches daily editorial, translation/alignment, Research,
Stock Health, concept drafting, briefing books, and earnings refresh. Newsletter extraction
uses the separate Python change. Weekly generation remains forced-Anthropic.

Google documentation checked November 4, 2026:

- [Deprecations](https://aistudio.google.com/docs/deprecations): 2.5 Flash is deprecated;
  requests automatically route to 3.5 Flash-Lite from December 1, 2026.
- [Migration guide](https://aistudio.google.com/docs/whats-new-gemini-3.6#migrate-to-gemini-3-5-flash-lite):
  use minimal thinking for extraction and remove deprecated sampling parameters.
- [Model capabilities](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite):
  supports text/image input and structured outputs. Access, billing and quotas remain
  specific to the Google project; no assumption of free-tier entitlement is made.

## Deployment requirements

1. Access to the existing Vercel project `global-risk-dashboard` in its owning account.
2. Set `GEMINI_MODEL=gemini-3.5-flash-lite` in Production and any Preview environment used
   for validation. Audit branch-specific overrides too. An old explicit value takes
   precedence over the new source default.
3. Keep the existing `GEMINI_API_KEY`; confirm its project has model access and sufficient
   quota/billing. Keep the Anthropic fallback key. Do not put keys in the repository.
4. Redeploy after updating environment variables so both Next.js and Python receive them.
   No Supabase migration or cron schedule change is required. Keep Daily Brief email parked.
5. Verify Vercel deployment success and version 5.17.2. Check a Research text result, image
   transcription, Stock Health screenshot, and the next editorial/newsletter runs. Inspect
   provider logs to ensure an Anthropic fallback is not hiding a Gemini request failure.
   Do not invoke newsletter ingestion just to test connectivity: it marks processed mail read.

Without authenticated Vercel access, code can be prepared and reviewed, but environment
settings and production rollout cannot be verified. GitHub push-to-deploy behavior is a
project setting; a successful local build does not establish that it is enabled.

## Verification

```sh
npm ci
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
npx tsc --noEmit --incremental false
npm run build
```

The focused tests mock providers and require no secrets or network. They cover all three
TypeScript Gemini payloads, shared model overrides/defaults, image input, numeric metric
coercion, JSON recovery, Gemini retry/Anthropic fallback, forced weekly Anthropic, missing
keys, and Python extraction configuration/fallback. They establish request construction
and control flow, not live model access, content quality, latency, or cost.

### Implementation checks (November 4, 2026)

- Six TypeScript provider tests and three Python extraction tests passed.
- TypeScript validation and a full Next.js production build passed without application keys.
- Installed the Python requirements in an isolated virtual environment and exercised the
  real `google-genai` SDK (2.34.0) against an in-memory HTTP mock. The selected model,
  minimal-thinking payload, JSON response parsing, and absence of temperature passed.
- `git diff --check` passed. No live Gemini call, mailbox access, scheduled generation,
  production deployment, or environment-variable change was performed by these checks.

If a production regression requires reverting, restore the previous code AND its matching
model/environment configuration together. Restoring a 2.5 deployment is time-limited by
Google's retirement/automatic-routing policy; it is not a durable recovery strategy.
