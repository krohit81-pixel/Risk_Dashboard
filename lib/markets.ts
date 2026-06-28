// lib/markets.ts
// Server-side market quotes via Yahoo Finance's public chart endpoint.
// Returns null on any failure so the route can fall back cleanly.

const YF_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

export interface Quote {
  value: number;
  previous: number;
  history?: number[]; // recent daily closes, oldest → newest
}

/**
 * Fetch the latest close and the prior close for a Yahoo symbol.
 * symbol examples: "^GSPC", "^IXIC", "^VIX", "JPY=X", "BZ=F"
 */
export async function quote(symbol: string): Promise<Quote | null> {
  const url = `${YF_BASE}/${encodeURIComponent(symbol)}?range=1mo&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: {
        // Yahoo rejects requests without a browser-like UA.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta ?? {};
    const closes: (number | null)[] =
      result.indicators?.quote?.[0]?.close ?? [];
    const clean = closes.filter((c): c is number => typeof c === "number");

    const value =
      typeof meta.regularMarketPrice === "number"
        ? meta.regularMarketPrice
        : clean[clean.length - 1];

    let previous =
      typeof meta.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta.previousClose === "number"
        ? meta.previousClose
        : clean[clean.length - 2];

    // If meta gave us the same point, step back one close.
    if (value === previous && clean.length >= 2) {
      previous = clean[clean.length - 2];
    }

    if (typeof value !== "number" || typeof previous !== "number") return null;
    return { value, previous, history: clean.slice(-22) };
  } catch {
    return null;
  }
}
