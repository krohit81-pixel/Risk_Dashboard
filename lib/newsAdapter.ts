// lib/newsAdapter.ts
// Phase 3.1 news ingestion: pluggable adapters behind one interface.
// Each adapter activates ONLY when its API key is present; otherwise it returns
// null and is skipped. Add more keys → more articles. All production-safe free
// tiers (NewsAPI.org dev-only and GNews non-commercial free tiers are excluded).
//
// Pipeline downstream (snapshotEngine): merge → de-dup → cluster → relevance
// score → LLM interpretation → snapshot.

export interface RawStory {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedISO: string;
}

export interface NewsAdapter {
  name: string;
  /** Returns null when unconfigured/unavailable so the caller can skip it. */
  fetchRaw(): Promise<RawStory[] | null>;
}

// CRO topic set for the relevance filter (earnings/single-stock/celebrity noise suppressed).
export const CRO_TOPICS = [
  "inflation", "interest rate", "central bank", "treasury", "bond yield", "yield",
  "credit spread", "high yield", "private credit", "commercial real estate", "cre",
  "liquidity", "capital", "basel", "regulation", "supervision", "stress test",
  "boj", "jgb", "yen", "carry trade", "nikkei", "japan", "china", "apac",
  "geopolitic", "sanction", "tariff", "energy price", "recession", "default", "fed",
];

const SUPPRESS = ["earnings beat", "stock surges", "meme", "retail traders", "quarterly profit", "price target"];

// Source quality tiers. Finance wires outrank general/local outlets even on the
// same keywords, so a Reuters/Nikkei/Finnhub story ranks above a local paper.
const TIER1 = ["reuters", "bloomberg", "financial times", "ft.com", "wall street journal", "wsj", "nikkei", "cnbc", "finnhub", "marketaux", "fortune", "the economist", "barron"];
const LOWQ = ["statesville", "sunnewsonline", "dailytimesleader", "mitchellrepublic", "socialnews", "abc15", "kqed"];

function sourceTier(source: string): number {
  const s = source.toLowerCase();
  if (TIER1.some((t) => s.includes(t))) return 3;
  if (LOWQ.some((t) => s.includes(t))) return -2;
  return 0;
}

/** +1 per CRO topic hit, source-tier weighting, heavy penalty for noise. */
export function relevanceScore(story: RawStory): number {
  const text = `${story.title} ${story.summary}`.toLowerCase();
  let score = sourceTier(story.source);
  for (const t of CRO_TOPICS) if (text.includes(t)) score += 1;
  for (const s of SUPPRESS) if (text.includes(s)) score -= 3;
  return score;
}

// CRO-relevant search themes reused across adapters that take a query.
const QUERIES = [
  "inflation OR interest rates OR central bank OR federal reserve",
  "bond yield OR treasury OR credit spread OR high yield",
  "Japan OR yen OR BOJ OR JGB OR Nikkei",
  "bank OR regulation OR commercial real estate OR private credit",
];

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

async function getJson(url: string, ms = 6000): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // network error or timeout → skip this source
  } finally {
    clearTimeout(timer);
  }
}

// ── Marketaux (finance news + sentiment) — 100 req/day free ──
const marketauxAdapter: NewsAdapter = {
  name: "Marketaux",
  async fetchRaw() {
    const key = process.env.MARKETAUX_API_KEY;
    if (!key) return null;
    const results = await Promise.all(
      QUERIES.map((q) =>
        getJson(
          `https://api.marketaux.com/v1/news/all?api_token=${key}` +
            `&language=en&filter_entities=false&limit=3` +
            `&published_after=${isoDaysAgo(3)}&search=${encodeURIComponent(q)}`
        )
      )
    );
    const out: RawStory[] = [];
    for (const json of results) {
      for (const a of json?.data ?? []) {
        out.push({
          title: a.title ?? "",
          summary: a.description ?? a.snippet ?? "",
          url: a.url ?? "",
          source: a.source ?? "Marketaux",
          publishedISO: a.published_at ?? new Date().toISOString(),
        });
      }
    }
    return out.length ? out : null;
  },
};

// ── NewsData.io (business category) — 200 credits/day free, 10/call ──
const newsdataAdapter: NewsAdapter = {
  name: "NewsData.io",
  async fetchRaw() {
    const key = process.env.NEWSDATA_API_KEY;
    if (!key) return null;
    const calls = [
      `https://newsdata.io/api/1/latest?apikey=${key}&language=en&category=business&q=${encodeURIComponent("inflation OR rates OR central bank OR credit OR bond OR yield")}`,
      `https://newsdata.io/api/1/latest?apikey=${key}&language=en&q=${encodeURIComponent("BOJ OR yen OR JGB OR Nikkei OR Bank of Japan OR Tokyo")}`,
    ];
    const results = await Promise.all(calls.map((u) => getJson(u)));
    const out: RawStory[] = [];
    for (const json of results) {
      for (const a of json?.results ?? []) {
        out.push({
          title: a.title ?? "",
          summary: a.description ?? "",
          url: a.link ?? "",
          source: a.source_id ?? "NewsData",
          publishedISO: a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString(),
        });
      }
    }
    return out.length ? out : null;
  },
};

// ── Finnhub (general market news) — 60 req/min free ──
const finnhubAdapter: NewsAdapter = {
  name: "Finnhub",
  async fetchRaw() {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return null;
    const json = await getJson(`https://finnhub.io/api/v1/news?category=general&token=${key}`);
    if (!Array.isArray(json)) return null;
    const out: RawStory[] = json.slice(0, 40).map((a: any) => ({
      title: a.headline ?? "",
      summary: a.summary ?? "",
      url: a.url ?? "",
      source: a.source ?? "Finnhub",
      publishedISO: a.datetime ? new Date(a.datetime * 1000).toISOString() : new Date().toISOString(),
    }));
    return out.length ? out : null;
  },
};

// ── Alpha Vantage (news + sentiment) — 25 req/day free, optional ──
const alphaVantageAdapter: NewsAdapter = {
  name: "Alpha Vantage",
  async fetchRaw() {
    const key = process.env.ALPHAVANTAGE_API_KEY;
    if (!key) return null;
    const url =
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT` +
      `&topics=financial_markets,economy_macro,economy_monetary&limit=50&apikey=${key}`;
    const json = await getJson(url);
    const feed = json?.feed;
    if (!Array.isArray(feed)) return null;
    const out: RawStory[] = feed.slice(0, 40).map((a: any) => ({
      title: a.title ?? "",
      summary: a.summary ?? "",
      url: a.url ?? "",
      source: a.source ?? "Alpha Vantage",
      publishedISO: a.time_published
        ? `${a.time_published.slice(0, 4)}-${a.time_published.slice(4, 6)}-${a.time_published.slice(6, 8)}T00:00:00Z`
        : new Date().toISOString(),
    }));
    return out.length ? out : null;
  },
};

export const ADAPTERS: NewsAdapter[] = [
  marketauxAdapter,
  newsdataAdapter,
  finnhubAdapter,
  alphaVantageAdapter,
];

/** True if at least one configured adapter returns stories. */
export async function anyLiveNews(): Promise<boolean> {
  for (const a of ADAPTERS) {
    const raw = await a.fetchRaw();
    if (raw && raw.length) return true;
  }
  return false;
}
