// app/api/research/analyze/route.ts
// Research workspace — analyze user-supplied content. COMPLETELY ISOLATED from the daily
// snapshot: computes and returns, persists nothing (saving is a separate explicit action).
// Text is the reliable path; URL is best-effort (paywalls/bot-blocks are expected to fail
// gracefully with a "paste the text instead" hint).

import { NextResponse } from "next/server";
import { analyzeContent } from "@/lib/analyze";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIN_USABLE_CHARS = 400;

/** Strip HTML to readable-ish text. Lightweight — no readability dependency. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchUrlText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return { ok: false, error: "Only http(s) URLs are supported." };
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // A normal UA improves odds; many premium sites will still block — handled below.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      return { ok: false, error: `The page returned ${res.status} (often a paywall or bot block).` };
    }
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("html") && !ctype.includes("text")) {
      return { ok: false, error: "That link isn't a readable web page (PDF/other not supported yet)." };
    }
    const html = await res.text();
    const text = htmlToText(html);
    if (text.length < MIN_USABLE_CHARS) {
      return { ok: false, error: "Couldn't extract enough readable text (often paywalled or JS-rendered)." };
    }
    return { ok: true, text };
  } catch (e) {
    const msg = (e as Error).name === "AbortError" ? "The page took too long to respond." : "Couldn't reach that page.";
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  let body: { mode?: string; text?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const mode = body.mode === "url" ? "url" : "text";

  try {
    if (mode === "url") {
      const url = (body.url || "").trim();
      if (!url) return NextResponse.json({ ok: false, error: "Enter a URL." }, { status: 400 });
      const fetched = await fetchUrlText(url);
      if (!fetched.ok) {
        // Graceful fallback — guide the user to the reliable path.
        return NextResponse.json(
          { ok: false, error: `${fetched.error} Try pasting the article text instead.`, fallbackToText: true },
          { status: 422 }
        );
      }
      const analysis = await analyzeContent(fetched.text, { sourceType: "url", originalUrl: url });
      return NextResponse.json({ ok: true, analysis });
    }

    const text = (body.text || "").trim();
    if (text.length < 200) {
      return NextResponse.json(
        { ok: false, error: "Paste a bit more text (at least a few sentences) to analyze." },
        { status: 400 }
      );
    }
    const analysis = await analyzeContent(text, { sourceType: "text" });
    return NextResponse.json({ ok: true, analysis });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Analysis failed — the model couldn't process this content. Please try again." },
      { status: 500 }
    );
  }
}
