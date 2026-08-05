// lib/bankEarningsRefresh.ts
// V5.8.0 — "Refresh Earnings" engine, triggered from Settings → Generation History.
//
// Design (per CLAUDE.md's grounding convention — same shape as the daily editorial job):
//   1. For each of the 15 banks, fetch real news via the SAME adapters already wired into
//      this app (Marketaux / NewsData.io / Finnhub — no new API keys). Each adapter is
//      skipped silently if its key isn't configured, same as everywhere else.
//   2. Keep only articles that (a) name the bank, (b) carry a genuine earnings signal, and
//      (c) were published after the bank's currently-stored report date — i.e. actual
//      evidence of a NEWER quarter, not just re-coverage of what's already on file.
//   3. Banks with no qualifying articles are left untouched (no LLM call spent on them).
//   4. Banks WITH qualifying articles go into ONE batched, grounded LLM call (Gemini-first /
//      Anthropic-fallback, via the existing interpretWithProvider) — same "one call for many
//      items" pattern as the THEMES engine. The model may only use the supplied article
//      snippets; if it can't confirm a genuinely newer reported quarter for a bank, it must
//      say so rather than restate/guess the old numbers.
//   5. Each returned entry is schema-validated before being written to the KV overlay
//      (lib/bankEarningsStore.ts). Invalid or unconfirmed entries are dropped — the curated
//      baseline in lib/bankEarnings.ts is never overwritten by a bad or partial result.

import type { BankEarnings, StockReactionDirection } from "./bankEarnings";
import { BANK_EARNINGS } from "./bankEarnings";
import { saveEarningsOverlayEntries, type BankEarningsOverlayEntry } from "./bankEarningsStore";
import { interpretWithProvider, CRO_SYSTEM_PROMPT } from "./llm";

interface CandidateStory {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedISO: string;
}

async function fetchJson(url: string, ms = 6000): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const EARNINGS_SIGNAL = [
  "earnings", "profit", "net income", "quarterly results", "quarterly profit", "first quarter",
  "second quarter", "third quarter", "fourth quarter", "q1", "q2", "q3", "q4", "half-year",
  "h1 20", "h1 results", "full-year results", "revenue", "net profit",
];

function hasEarningsSignal(text: string): boolean {
  const t = text.toLowerCase();
  return EARNINGS_SIGNAL.some((k) => t.includes(k));
}

function mentionsBank(text: string, bank: BankEarnings): boolean {
  const t = text.toLowerCase();
  const nameHit = t.includes(bank.name.toLowerCase()) || t.includes(bank.name.split(" ")[0].toLowerCase());
  const tickerCore = bank.ticker.split(".")[0].toLowerCase();
  const tickerHit = tickerCore.length >= 2 && t.includes(tickerCore) && !/^\d+$/.test(tickerCore) ? t.includes(tickerCore) : false;
  return nameHit || tickerHit;
}

// V5.10.1 — a refresh run once let an unrelated "FTSE 100 lifted by miners rally…" index-level
// wrap-up through for HSBC: the article incidentally named HSBC as one of several gainers,
// which satisfied mentionsBank()+hasEarningsSignal() even though the story wasn't about HSBC's
// own results. Real earnings coverage almost always names the bank in the HEADLINE; incidental
// mentions inside a general market wrap-up usually don't. Index-level stories are now dropped
// unless the bank is actually named in the title, not just the summary/body.
const INDEX_LEVEL_PATTERNS = [
  /ftse\s*100/i, /nikkei\s*225/i, /dow\s*jones/i, /s&p\s*500/i, /stoxx\s*600/i,
  /hang seng index/i, /nasdaq composite/i, /topix/i,
];

function isIndexLevelNoise(story: CandidateStory, bank: BankEarnings): boolean {
  const title = story.title.toLowerCase();
  if (!INDEX_LEVEL_PATTERNS.some((p) => p.test(title))) return false;
  const namedInTitle = title.includes(bank.name.toLowerCase()) || title.includes(bank.name.split(" ")[0].toLowerCase());
  return !namedInTitle;
}

/** Parse the loosely-formatted reportDate strings used throughout bankEarnings.ts. */
function parseStoredDate(s: string): Date {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date("2000-01-01") : d;
}

/** Fetch candidate articles for one bank from whichever adapters are configured. */
async function fetchCandidatesFor(bank: BankEarnings): Promise<CandidateStory[]> {
  const q = `${bank.name} OR ${bank.ticker.split(".")[0]} earnings OR results OR profit`;
  const out: CandidateStory[] = [];

  const marketauxKey = process.env.MARKETAUX_API_KEY;
  const newsdataKey = process.env.NEWSDATA_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;

  const calls: Promise<void>[] = [];

  if (marketauxKey) {
    calls.push(
      fetchJson(
        `https://api.marketaux.com/v1/news/all?api_token=${marketauxKey}&language=en&filter_entities=false&limit=5&search=${encodeURIComponent(q)}`
      ).then((json) => {
        for (const a of json?.data ?? []) {
          out.push({
            title: a.title ?? "",
            summary: a.description ?? a.snippet ?? "",
            url: a.url ?? "",
            source: a.source ?? "Marketaux",
            publishedISO: a.published_at ?? new Date().toISOString(),
          });
        }
      })
    );
  }

  if (newsdataKey) {
    calls.push(
      fetchJson(
        `https://newsdata.io/api/1/latest?apikey=${newsdataKey}&language=en&q=${encodeURIComponent(`${bank.name} earnings`)}`
      ).then((json) => {
        for (const a of json?.results ?? []) {
          out.push({
            title: a.title ?? "",
            summary: a.description ?? "",
            url: a.link ?? "",
            source: a.source_id ?? "NewsData",
            publishedISO: a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString(),
          });
        }
      })
    );
  }

  // Finnhub's free company-news endpoint is US-symbol-oriented; only worth trying for
  // plain (non-suffixed) tickers. Silently skipped for Tokyo/HK/SG-listed names.
  if (finnhubKey && !bank.ticker.includes(".")) {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
    calls.push(
      fetchJson(
        `https://finnhub.io/api/v1/company-news?symbol=${bank.ticker}&from=${from}&to=${to}&token=${finnhubKey}`
      ).then((json) => {
        if (!Array.isArray(json)) return;
        for (const a of json.slice(0, 10)) {
          out.push({
            title: a.headline ?? "",
            summary: a.summary ?? "",
            url: a.url ?? "",
            source: a.source ?? "Finnhub",
            publishedISO: a.datetime ? new Date(a.datetime * 1000).toISOString() : new Date().toISOString(),
          });
        }
      })
    );
  }

  await Promise.all(calls);
  return out;
}

/** Keep only articles that are genuinely new earnings evidence for this bank. */
function qualifyCandidates(bank: BankEarnings, stories: CandidateStory[]): CandidateStory[] {
  const cutoff = parseStoredDate(bank.reportDate);
  return stories.filter((s) => {
    if (isIndexLevelNoise(s, bank)) return false;
    const text = `${s.title} ${s.summary}`;
    if (!hasEarningsSignal(text)) return false;
    if (!mentionsBank(text, bank)) return false;
    const published = new Date(s.publishedISO);
    if (isNaN(published.getTime())) return false;
    return published.getTime() > cutoff.getTime();
  });
}

interface LlmRefreshResult {
  id: string;
  hasNewQuarter: boolean;
  period?: string;
  reportDate?: string;
  headline?: string;
  metrics?: { label: string; value: string }[];
  highlights?: string[];
  stockReaction?: { direction: StockReactionDirection; changeText: string; detail: string };
  riskWatch?: string[];
  plainEnglish?: string;
  notConfirmedNote?: string;
}

function isValidResult(r: any): r is Required<Omit<LlmRefreshResult, "notConfirmedNote">> & { id: string } {
  if (!r || typeof r !== "object") return false;
  if (typeof r.id !== "string") return false;
  if (r.hasNewQuarter !== true) return false;
  if (typeof r.period !== "string" || !r.period) return false;
  if (typeof r.reportDate !== "string" || !r.reportDate) return false;
  if (typeof r.headline !== "string" || !r.headline) return false;
  if (!Array.isArray(r.metrics) || !r.metrics.length) return false;
  if (!r.metrics.every((m: any) => typeof m?.label === "string" && typeof m?.value === "string")) return false;
  if (!Array.isArray(r.highlights) || !r.highlights.length) return false;
  if (!r.highlights.every((h: any) => typeof h === "string")) return false;
  if (!r.stockReaction || !["up", "down", "mixed"].includes(r.stockReaction.direction)) return false;
  if (typeof r.stockReaction.changeText !== "string" || typeof r.stockReaction.detail !== "string") return false;
  // V5.10.1 — changeText renders inside a small pill, never a paragraph. A refresh run once
  // let a full unrelated news sentence through here; reject anything sentence-shaped so a bad
  // extraction degrades that bank's update instead of corrupting the overlay.
  if (r.stockReaction.changeText.length > 24 || /[.;]/.test(r.stockReaction.changeText)) return false;
  if (!Array.isArray(r.riskWatch) || !r.riskWatch.every((x: any) => typeof x === "string")) return false;
  if (typeof r.plainEnglish !== "string" || !r.plainEnglish) return false;
  return true;
}

export interface RefreshSummary {
  ok: boolean;
  banksChecked: number;
  banksWithNews: number;
  banksUpdated: number;
  provider?: string;
  degradeReason?: string;
  error?: string;
  updatedNames?: string[];
}

export async function refreshBankEarnings(): Promise<RefreshSummary> {
  const banks = BANK_EARNINGS;

  // Step 1 — fetch candidate news per bank (cheap HTTP, parallelized).
  const candidatesByBank = await Promise.all(banks.map((b) => fetchCandidatesFor(b)));

  const qualified: { bank: BankEarnings; stories: CandidateStory[] }[] = [];
  banks.forEach((bank, i) => {
    const q = qualifyCandidates(bank, candidatesByBank[i]);
    if (q.length) qualified.push({ bank, stories: q.slice(0, 5) });
  });

  if (!qualified.length) {
    return { ok: true, banksChecked: banks.length, banksWithNews: 0, banksUpdated: 0, degradeReason: "no_new_news" };
  }

  // Step 2 — one batched, grounded LLM call across all qualifying banks.
  const system = `${CRO_SYSTEM_PROMPT}

You are additionally acting as an earnings-data extractor for a "Bank Earnings" reference screen.
For EACH bank provided below, decide whether the supplied articles give genuine evidence of a
NEWER reported quarter/half than the one currently on file. If yes, extract the updated figures
strictly from the supplied articles. If the articles are ambiguous, re-cover the same old
quarter, or don't contain hard figures, set hasNewQuarter to false for that bank — do NOT guess
or restate stale numbers as if new.

Some candidate articles may be general market/index wrap-ups that only mention the bank in
passing (e.g. as one of several gainers pushing an index to a record). Use ONLY articles that
are actually ABOUT that bank's own results — ignore incidental mentions of the bank inside a
broader market story, and never pull an unrelated headline or index-level fact into this bank's
fields.

Output VALID JSON ONLY: { "results": [ { "id": string, "hasNewQuarter": boolean,
"period": string, "reportDate": string, "headline": string,
"metrics": [{"label": string, "value": string}], "highlights": string[],
"stockReaction": {"direction": "up"|"down"|"mixed", "changeText": string, "detail": string},
"riskWatch": string[], "plainEnglish": string } ] }
"headline" is a one-sentence summary (like "Record profit but capital buffer thins"). "changeText"
is DIFFERENT and must be SHORT — at most ~15 characters, e.g. "+2.3%", "-1.8%", "Unconfirmed",
"Mixed", "Muted", "All-time high". NEVER a sentence, a headline, or unrelated news content; if you
aren't confident of a short reaction value, use "Unconfirmed". The fuller nuance belongs in
"detail", which may be a full sentence. "plainEnglish" must be a short, jargon-free 2-4 sentence
translation of the same facts (no new claims). Omit a bank from "results" entirely if
hasNewQuarter is false.`;

  const user = qualified
    .map(({ bank, stories }) => {
      const articles = stories
        .map((s, i) => `  [${i + 1}] (${s.source}, ${s.publishedISO.slice(0, 10)}) ${s.title} — ${s.summary}`)
        .join("\n");
      return `BANK id="${bank.id}" name="${bank.name}" ticker="${bank.ticker}"\nCurrently on file: ${bank.period}, reported ${bank.reportDate}: "${bank.headline}"\nCandidate articles:\n${articles}`;
    })
    .join("\n\n");

  const { data, provider, reason } = await interpretWithProvider<{ results: LlmRefreshResult[] }>(system, user);

  if (!data || !Array.isArray(data.results)) {
    return {
      ok: false,
      banksChecked: banks.length,
      banksWithNews: qualified.length,
      banksUpdated: 0,
      provider,
      degradeReason: reason,
      error: `llm returned no usable output (${reason})`,
    };
  }

  const nowISO = new Date().toISOString();
  const accepted: BankEarningsOverlayEntry[] = [];
  for (const r of data.results) {
    if (!isValidResult(r)) continue;
    const bank = banks.find((b) => b.id === r.id);
    if (!bank) continue;
    const sourceCount = qualified.find((q) => q.bank.id === r.id)?.stories.length ?? 0;
    const sources = [...new Set((qualified.find((q) => q.bank.id === r.id)?.stories ?? []).map((s) => s.source))];
    accepted.push({
      ...bank,
      period: r.period!,
      reportDate: r.reportDate!,
      periodNote: undefined,
      headline: r.headline!,
      metrics: r.metrics!,
      highlights: r.highlights!,
      stockReaction: r.stockReaction!,
      riskWatch: r.riskWatch!,
      plainEnglish: r.plainEnglish!,
      refreshedISO: nowISO,
      sourceNote: `${sources.slice(0, 3).join(", ") || "news adapters"} (${sourceCount} article${sourceCount === 1 ? "" : "s"})`,
    });
  }

  if (accepted.length) await saveEarningsOverlayEntries(accepted);

  return {
    ok: true,
    banksChecked: banks.length,
    banksWithNews: qualified.length,
    banksUpdated: accepted.length,
    provider,
    degradeReason: reason,
    updatedNames: accepted.map((a) => a.name),
  };
}
