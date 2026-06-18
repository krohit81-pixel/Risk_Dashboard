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
): Promise<{ res: Response | null; timedOut: boolean }> {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, ms);
  try {
    return { res: await fetch(url, { ...opts, signal: ctrl.signal }), timedOut: false };
  } catch {
    return { res: null, timedOut };
  } finally {
    clearTimeout(timer);
  }
}

// On Vercel Pro (maxDuration up to 300s) we can give each provider real room.
const GEMINI_TIMEOUT = Number(process.env.GEMINI_TIMEOUT_MS || 90000);
const ANTHROPIC_TIMEOUT = Number(process.env.ANTHROPIC_TIMEOUT_MS || 60000);

export type LlmReason = "ok" | "timeout" | "invalid_json" | "http_error" | "no_key";

/** Send a prompt, return parsed JSON, or null on any failure (caller falls back). */
export async function interpret<T>(system: string, user: string): Promise<T | null> {
  return (await interpretWithProvider<T>(system, user)).data;
}

/**
 * Gemini first (free); on failure, fall back to Anthropic if configured.
 * Reports the provider used and the reason for any failure, for degrade visibility.
 */
export async function interpretWithProvider<T>(
  system: string,
  user: string
): Promise<{ data: T | null; provider: "gemini" | "anthropic" | "none"; reason: LlmReason }> {
  if (process.env.GEMINI_API_KEY) {
    const g = await geminiInterpret<T>(system, user);
    if (g.data) return { data: g.data, provider: "gemini", reason: "ok" };
    if (process.env.ANTHROPIC_API_KEY) {
      const a = await anthropicInterpret<T>(system, user);
      if (a.data) return { data: a.data, provider: "anthropic", reason: "ok" };
      return { data: null, provider: "none", reason: a.reason }; // last reason wins
    }
    return { data: null, provider: "none", reason: g.reason };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const a = await anthropicInterpret<T>(system, user);
    return { data: a.data, provider: a.data ? "anthropic" : "none", reason: a.data ? "ok" : a.reason };
  }
  return { data: null, provider: "none", reason: "no_key" };
}

// ── Google Gemini (free tier) ──
async function geminiInterpret<T>(
  system: string,
  user: string
): Promise<{ data: T | null; reason: LlmReason }> {
  const key = process.env.GEMINI_API_KEY!;
  const { res, timedOut } = await fetchTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 5000 },
      }),
      cache: "no-store",
    },
    GEMINI_TIMEOUT
  );
  if (!res) return { data: null, reason: timedOut ? "timeout" : "http_error" };
  if (!res.ok) return { data: null, reason: "http_error" };
  try {
    const json: any = await res.json();
    const text: string =
      (json?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("\n") || "";
    const data = extractJson<T>(text);
    return { data, reason: data ? "ok" : "invalid_json" };
  } catch {
    return { data: null, reason: "invalid_json" };
  }
}

// ── Anthropic (optional fallback) ──
async function anthropicInterpret<T>(
  system: string,
  user: string
): Promise<{ data: T | null; reason: LlmReason }> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const { res, timedOut } = await fetchTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 5000, system, messages: [{ role: "user", content: user }] }),
      cache: "no-store",
    },
    ANTHROPIC_TIMEOUT
  );
  if (!res) return { data: null, reason: timedOut ? "timeout" : "http_error" };
  if (!res.ok) return { data: null, reason: "http_error" };
  try {
    const json: any = await res.json();
    const text: string =
      (json.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || "";
    const data = extractJson<T>(text);
    return { data, reason: data ? "ok" : "invalid_json" };
  } catch {
    return { data: null, reason: "invalid_json" };
  }
}

/** Pull the first JSON object/array out of a model response (strips fences/prose). */
export function extractJson<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) return null;
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === open) depth++;
    else if (cleaned[i] === close) {
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
  return null;
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
