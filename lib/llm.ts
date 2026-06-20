// lib/llm.ts
// Provider-agnostic, grounded LLM interpretation. Prefers Google Gemini (free
// tier) when GEMINI_API_KEY is set; falls back to Anthropic if ANTHROPIC_API_KEY
// is set; otherwise returns null and the snapshot engine uses curated content.
//
// The model may ONLY interpret the stories it is given — it must not introduce
// facts. Output is requested as strict JSON and validated by the caller against
// the snapshot schema before persistence.

export function llmAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

/** Which provider is active (for logging/metadata). */
export function llmProvider(): "gemini" | "anthropic" | "none" {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

const ANTHROPIC_MODEL = process.env.LLM_MODEL || "claude-haiku-4-5-20251001";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** fetch with an abort timeout. Returns the Response, or null on timeout/error. */
async function fetchTimeout(
  url: string,
  opts: RequestInit,
  ms: number
): Promise<{ res: Response | null; timedOut: boolean; error?: Error }> {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, ms);
  try {
    return { res: await fetch(url, { ...opts, signal: ctrl.signal }), timedOut: false };
  } catch (e) {
    return { res: null, timedOut, error: e as Error };
  } finally {
    clearTimeout(timer);
  }
}

// On Vercel Pro (maxDuration up to 300s) we can give each provider real room.
const GEMINI_TIMEOUT = Number(process.env.GEMINI_TIMEOUT_MS || 90000);
const ANTHROPIC_TIMEOUT = Number(process.env.ANTHROPIC_TIMEOUT_MS || 60000);

export type LlmReason = "ok" | "timeout" | "invalid_json" | "http_error" | "no_key" | "exception";

/** Rich result from a single provider attempt, for diagnostics. */
interface ProviderResult<T> {
  data: T | null;
  reason: LlmReason;
  status?: number; // HTTP status when available
  message?: string; // short, non-sensitive error message
  errorType?: string; // error class/name
}

/** Is Gemini explicitly turned off via config? (e.g. DISABLE_GEMINI=1) */
function geminiDisabled(): boolean {
  const v = (process.env.DISABLE_GEMINI || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Pull a short, non-sensitive error message out of an API error body. */
function apiErrorMessage(body: string): string {
  try {
    const j = JSON.parse(body);
    const m = j?.error?.message ?? j?.message ?? body;
    return String(m).slice(0, 200);
  } catch {
    return String(body).slice(0, 200);
  }
}

/** Send a prompt, return parsed JSON, or null on any failure (caller falls back). */
export async function interpret<T>(system: string, user: string): Promise<T | null> {
  return (await interpretWithProvider<T>(system, user)).data;
}

/**
 * Gemini first (free); Anthropic only as fallback. Every decision point emits an
 * explicit diagnostic so an unattended run reveals exactly why a provider was
 * used: unavailable, skipped, attempted+failed, rate-limited, unauthorized,
 * crashed, or succeeded. Never logs key values — only boolean presence.
 */
export async function interpretWithProvider<T>(
  system: string,
  user: string
): Promise<{ data: T | null; provider: "gemini" | "anthropic" | "none"; reason: LlmReason }> {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  console.log(`[gen] providers available gemini=${hasGemini} anthropic=${hasAnthropic}`);
  console.log(`[gen] provider selection starting`);

  // ── Gemini (primary) ──
  if (geminiDisabled()) {
    console.log(`[gen] provider=gemini skipped reason=config_disabled`);
  } else if (!hasGemini) {
    console.log(`[gen] provider=gemini skipped reason=missing_api_key`);
  } else {
    console.log(`[gen] attempting provider=gemini`);
    let g: ProviderResult<T>;
    try {
      g = await geminiInterpret<T>(system, user);
    } catch (e) {
      const err = e as Error;
      g = { data: null, reason: "exception", message: err?.message?.slice(0, 200), errorType: err?.name };
    }
    if (g.data) {
      console.log(`[gen] provider=gemini success`);
      console.log(`[gen] llm provider=gemini reason=ok`);
      return { data: g.data, provider: "gemini", reason: "ok" };
    }
    console.log(
      `[gen] provider=gemini failed reason=${g.reason}` +
        (g.status !== undefined ? ` status=${g.status}` : "") +
        (g.errorType ? ` type=${g.errorType}` : "") +
        (g.message ? ` message=${JSON.stringify(g.message)}` : "")
    );
    console.log(
      hasAnthropic ? `[gen] falling back to anthropic` : `[gen] no fallback available (anthropic key missing)`
    );
    if (!hasAnthropic) {
      console.log(`[gen] llm provider=none reason=${g.reason}`);
      return { data: null, provider: "none", reason: g.reason };
    }
  }

  // ── Anthropic (fallback, or primary when Gemini absent/disabled) ──
  if (hasAnthropic) {
    console.log(`[gen] attempting provider=anthropic`);
    let a: ProviderResult<T>;
    try {
      a = await anthropicInterpret<T>(system, user);
    } catch (e) {
      const err = e as Error;
      a = { data: null, reason: "exception", message: err?.message?.slice(0, 200), errorType: err?.name };
    }
    if (a.data) {
      console.log(`[gen] provider=anthropic success`);
      console.log(`[gen] llm provider=anthropic reason=ok`);
      return { data: a.data, provider: "anthropic", reason: "ok" };
    }
    console.log(
      `[gen] provider=anthropic failed reason=${a.reason}` +
        (a.status !== undefined ? ` status=${a.status}` : "") +
        (a.errorType ? ` type=${a.errorType}` : "") +
        (a.message ? ` message=${JSON.stringify(a.message)}` : "")
    );
    console.log(`[gen] llm provider=none reason=${a.reason}`);
    return { data: null, provider: "none", reason: a.reason };
  }

  // ── Nothing available ──
  console.log(`[gen] llm provider=none reason=no_key`);
  return { data: null, provider: "none", reason: "no_key" };
}

// ── Google Gemini (free tier) ──
async function geminiInterpret<T>(system: string, user: string): Promise<ProviderResult<T>> {
  const key = process.env.GEMINI_API_KEY!;
  const { res, timedOut, error } = await fetchTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
          maxOutputTokens: 8192,
          // gemini-2.5-flash is a reasoning model; hidden thinking tokens count against
          // maxOutputTokens and were truncating the JSON (finishReason=MAX_TOKENS) at ~4.7k
          // chars, forcing slow Anthropic fallbacks that blew the 180s cron ceiling.
          // Disabling thinking frees the whole budget for the actual JSON output.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      cache: "no-store",
    },
    GEMINI_TIMEOUT
  );
  if (!res) {
    return timedOut
      ? { data: null, reason: "timeout", message: `aborted after ${GEMINI_TIMEOUT}ms`, errorType: "AbortError" }
      : { data: null, reason: "http_error", message: error?.message?.slice(0, 200) ?? "network error", errorType: error?.name ?? "FetchError" };
  }
  if (!res.ok) {
    let message = "";
    try {
      message = apiErrorMessage(await res.text());
    } catch {
      /* ignore */
    }
    return { data: null, reason: "http_error", status: res.status, message };
  }
  try {
    const json: any = await res.json();
    const cand = json?.candidates?.[0];
    const finishReason: string = cand?.finishReason ?? "";
    const text: string = (cand?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("\n") || "";
    const { data, fenceDetected, extractionRequired } = parseLlmJson<T>(text);
    console.log(
      `[gen] gemini response: length=${text.length} fences=${fenceDetected} finishReason=${finishReason || "n/a"}`
    );
    if (data) {
      if (extractionRequired) console.log(`[gen] gemini json recovered via extraction`);
      return { data, reason: "ok" };
    }
    // All recovery attempts failed — log the raw head (model output only, no keys) so we can see why.
    console.log(`[gen] gemini json parse FAILED — raw first 1000 chars: ${JSON.stringify(text.slice(0, 1000))}`);
    const truncated = finishReason === "MAX_TOKENS";
    return {
      data: null,
      reason: "invalid_json",
      message: truncated
        ? "unparseable JSON (response truncated: finishReason=MAX_TOKENS)"
        : "model output was not parseable JSON after fence-strip + extraction",
    };
  } catch (e) {
    const err = e as Error;
    return { data: null, reason: "invalid_json", message: err?.message?.slice(0, 200), errorType: err?.name };
  }
}

// ── Anthropic (optional fallback) ──
async function anthropicInterpret<T>(system: string, user: string): Promise<ProviderResult<T>> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const { res, timedOut, error } = await fetchTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 8000, system, messages: [{ role: "user", content: user }] }),
      cache: "no-store",
    },
    ANTHROPIC_TIMEOUT
  );
  if (!res) {
    return timedOut
      ? { data: null, reason: "timeout", message: `aborted after ${ANTHROPIC_TIMEOUT}ms`, errorType: "AbortError" }
      : { data: null, reason: "http_error", message: error?.message?.slice(0, 200) ?? "network error", errorType: error?.name ?? "FetchError" };
  }
  if (!res.ok) {
    let message = "";
    try {
      message = apiErrorMessage(await res.text());
    } catch {
      /* ignore */
    }
    return { data: null, reason: "http_error", status: res.status, message };
  }
  try {
    const json: any = await res.json();
    const stopReason: string = json?.stop_reason ?? "";
    const text: string =
      (json.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || "";
    const { data, extractionRequired } = parseLlmJson<T>(text);
    if (data) {
      if (extractionRequired) console.log(`[gen] anthropic json recovered via extraction`);
      return { data, reason: "ok" };
    }
    console.log(`[gen] anthropic json parse FAILED — raw first 1000 chars: ${JSON.stringify(text.slice(0, 1000))}`);
    const truncated = stopReason === "max_tokens";
    return {
      data: null,
      reason: "invalid_json",
      message: truncated ? "unparseable JSON (response truncated: stop_reason=max_tokens)" : "model output was not parseable JSON",
    };
  } catch (e) {
    const err = e as Error;
    return { data: null, reason: "invalid_json", message: err?.message?.slice(0, 200), errorType: err?.name };
  }
}

/** Pull the first balanced JSON object/array out of a model response (string-aware). */
export function extractJson<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) return null;
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null; // never balanced → likely truncated
}

/**
 * Robust JSON recovery for LLM output. Tries, in order:
 *   1. strip ```json / ``` fences + trim, then JSON.parse directly;
 *   2. balanced, string-aware extraction of the first JSON value (handles prose
 *      before/after the object).
 * Reports what was needed so the caller can log it. Only after BOTH fail should
 * the caller treat the response as invalid and fall back.
 */
export function parseLlmJson<T>(text: string): {
  data: T | null;
  fenceDetected: boolean;
  extractionRequired: boolean;
} {
  const fenceDetected = text.includes("```");
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return { data: JSON.parse(cleaned) as T, fenceDetected, extractionRequired: false };
  } catch {
    /* fall through to extraction */
  }
  const data = extractJson<T>(cleaned);
  return { data, fenceDetected, extractionRequired: data !== null };
}

/** System prompt enforcing grounding + the CRO voice + hype-free tone. */
export const CRO_SYSTEM_PROMPT = `You are a risk-intelligence analyst preparing a daily briefing for the incoming Head of Risk at Mizuho, a Japanese global bank.

STRICT RULES:
- Interpret ONLY the news stories provided. Never introduce facts, numbers, names, or events that are not in the input.
- Every theme must be traceable to the source cluster it came from.
- Be concise, fact-based and hype-free. Never write "markets are watching closely" or similar filler.
- Rank by CRO relevance (banking, credit, market, liquidity, capital, Japan) — never by popularity.
- Do NOT speculate about Mizuho's actual positions or exposures. Provide strategic context only.
- Confidence: "High" only when an item is supported by multiple sources or anchored to hard data; "Medium" for single-source or emerging narratives; "Low" for speculative.
- Output VALID JSON ONLY, matching the requested schema. No prose outside the JSON.`;
