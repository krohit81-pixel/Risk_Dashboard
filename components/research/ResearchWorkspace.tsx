// components/research/ResearchWorkspace.tsx
"use client";

import { useState, useEffect } from "react";
import type { ResearchAnalysis, BankingImpactArea } from "@/lib/types";
import type { SavedItem } from "@/lib/savedStore";
import { savedFromAnalysis } from "@/lib/savedMappers";
import { CONCEPTS } from "@/lib/concepts";
import { MizuhoAlignmentBlock } from "@/components/intel/MizuhoAlignment";

const conceptTerm = (id: string) => CONCEPTS.find((c) => c.id === id)?.term ?? id;

export function ResearchWorkspace({
  onOpenConcept,
  onToggleSave,
  savedIds,
}: {
  onOpenConcept?: (id: string) => void;
  onToggleSave?: (item: SavedItem) => void;
  savedIds?: Set<string>;
}) {
  const [mode, setMode] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ResearchAnalysis | null>(null);
  const [learning, setLearning] = useState(false);
  const [quota, setQuota] = useState<{ used: number; cap: number; remaining: number } | null>(null);

  // Show remaining Research budget for today (cheap GET, no analysis spent).
  useEffect(() => {
    let alive = true;
    fetch("/api/research/analyze")
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.ok && j.quota) setQuota(j.quota);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const capped = quota ? quota.remaining <= 0 : false;

  async function analyze() {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/research/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "url" ? { mode, url } : { mode, text }),
      });
      const j = await res.json();
      if (j.quota) setQuota(j.quota);
      if (!res.ok || !j.ok) {
        setError(j.error || "Analysis failed. Please try again.");
        if (j.fallbackToText) setMode("text");
      } else {
        setAnalysis(j.analysis as ResearchAnalysis);
        setLearning(false);
      }
    } catch {
      setError("Couldn't reach the analyzer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setAnalysis(null);
    setError(null);
    setText("");
    setUrl("");
  }

  const savedItem: SavedItem | null = analysis ? savedFromAnalysis(analysis) : null;
  const isSaved = savedItem ? Boolean(savedIds?.has(savedItem.id)) : false;

  const show = (exec: string, lay?: string) => (learning && lay ? lay : exec);

  return (
    <section className="rise space-y-3">
      {!analysis ? (
        <>
          <p className="text-[13px] leading-relaxed text-fg-muted">
            Paste an article, speech, note or report and analyze it through the same CRO framework as the
            daily briefing. Text is the reliable path; a URL is best-effort (many premium sites block fetching).
          </p>

          <div className="flex gap-1.5">
            {(["text", "url"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg border px-3 py-1.5 text-2xs font-semibold transition ${
                  mode === m ? "border-steel/50 bg-steel/10 text-steel" : "border-line bg-ink-800 text-fg-faint"
                }`}
              >
                {m === "text" ? "Paste text" : "From URL"}
              </button>
            ))}
          </div>

          {mode === "text" ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the article or report text here…"
              rows={8}
              className="w-full resize-y rounded-xl border border-line bg-ink-800 px-3.5 py-3 text-[13px] leading-relaxed text-fg placeholder:text-fg-faint focus:border-steel/50 focus:outline-none"
            />
          ) : (
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-xl border border-line bg-ink-800 px-3.5 py-3 text-[13px] text-fg placeholder:text-fg-faint focus:border-steel/50 focus:outline-none"
            />
          )}

          {error ? (
            <p className="rounded-lg border border-stress/30 bg-stress/5 px-3 py-2 text-2xs leading-relaxed text-stress">
              {error}
            </p>
          ) : null}

          {capped ? (
            <p className="rounded-lg border border-elevated/30 bg-elevated/5 px-3 py-2 text-2xs leading-relaxed text-elevated">
              Research is paused for today to protect the daily briefing&rsquo;s quota
              {quota ? ` (used ${quota.used} of ${quota.cap})` : ""}. It resets after midnight IST.
            </p>
          ) : null}

          <button
            onClick={analyze}
            disabled={capped || loading || (mode === "text" ? text.trim().length < 200 : url.trim().length < 8)}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
              capped || loading || (mode === "text" ? text.trim().length < 200 : url.trim().length < 8)
                ? "bg-ink-800 text-fg-faint"
                : "bg-steel/15 text-steel active:bg-steel/25"
            }`}
          >
            {loading ? "Analyzing… (~20–30s)" : capped ? "Paused until tomorrow" : "Analyze"}
          </button>

          {quota && !capped ? (
            <p className="text-center text-[10px] text-fg-faint">
              {quota.remaining} of {quota.cap} analyses left today
            </p>
          ) : null}
        </>
      ) : (
        <>
          {/* ── Result header + view toggle ── */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {([["exec", "Executive"], ["learn", "Learning"]] as const).map(([id, label]) => {
                const active = id === "learn" ? learning : !learning;
                return (
                  <button
                    key={id}
                    onClick={() => setLearning(id === "learn")}
                    className={`rounded-lg border px-2.5 py-1 text-2xs font-semibold transition ${
                      active ? "border-steel/50 bg-steel/10 text-steel" : "border-line bg-ink-800 text-fg-faint"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <span className="text-2xs text-fg-faint">
              {analysis.sourceType === "url" ? "From URL" : "Pasted text"}
            </span>
          </div>

          <div className="rounded-xl border border-line bg-ink-800 px-4 py-3.5">
            <h3 className="text-[15px] font-semibold leading-snug text-fg">{analysis.title}</h3>
            {analysis.truncated ? (
              <p className="mt-1 text-[10px] text-elevated">Long content — analyzed the first ~4,000 words.</p>
            ) : null}

            <FieldBlock label="What happened" text={show(analysis.whatHappened, analysis.layman?.whatHappened)} />
            <FieldBlock label="Why it matters" text={show(analysis.whyItMatters, analysis.layman?.whyItMatters)} />
            <ImpactBlock areas={analysis.bankingImpactAreas} fallback={show(analysis.bankingImpact, analysis.layman?.bankingImpact)} learning={learning} />

            <MizuhoAlignmentBlock items={analysis.mizuhoAlignment} learning={learning} />
            {analysis.mizuhoAlignment.length === 0 ? (
              <p className="mt-2 text-2xs text-fg-faint">No clean Mizuho Top-Risk match for this content.</p>
            ) : null}

            {analysis.relatedConcepts.length ? (
              <div className="mt-3">
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-calm">Related concepts</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.relatedConcepts.map((id) => (
                    <button
                      key={id}
                      onClick={() => onOpenConcept?.(id)}
                      className="rounded-full border border-[#1f4036] bg-[#0f211c] px-2.5 py-0.5 text-2xs font-medium text-calm active:bg-[#143029]"
                    >
                      {conceptTerm(id)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {analysis.mizuhoAlignment.length ? (
              <p className="mt-3 text-[10px] leading-relaxed text-fg-faint">
                Mizuho Top Risk mappings are AI interpretation against Mizuho's published framework (Mar 2025),
                not Mizuho's own view or exposure.
              </p>
            ) : null}
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-2">
            {onToggleSave && savedItem ? (
              <button
                onClick={() => onToggleSave(savedItem)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-2xs font-semibold transition ${
                  isSaved ? "border-amber/40 bg-amber/10 text-amber" : "border-line bg-ink-800 text-fg-muted active:bg-ink-700"
                }`}
              >
                {isSaved ? "★ Saved to Learn" : "⭐ Save to Learn"}
              </button>
            ) : null}
            <button
              onClick={reset}
              className="flex-1 rounded-xl border border-line bg-ink-800 px-4 py-2.5 text-2xs font-semibold text-steel active:bg-ink-700"
            >
              🔄 Analyze another
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function FieldBlock({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <p className="mt-2.5 text-[13.5px] leading-relaxed text-fg-muted">
      <span className="font-semibold uppercase tracking-wide text-steel text-2xs">{label}</span>{" "}
      <span className="align-middle">{text}</span>
    </p>
  );
}

function ImpactBlock({
  areas,
  fallback,
  learning,
}: {
  areas?: BankingImpactArea[];
  fallback: string;
  learning: boolean;
}) {
  // No structured areas (older analysis or single blended string) → render as before.
  if (!areas || areas.length === 0) {
    return <FieldBlock label="Banking impact" text={fallback} />;
  }
  return (
    <div className="mt-2.5">
      <p className="font-semibold uppercase tracking-wide text-steel text-2xs">Banking impact</p>
      <ul className="mt-1 space-y-1.5">
        {areas.map((a, i) => (
          <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-fg-muted">
            <span aria-hidden className="mt-[2px] text-steel">•</span>
            <span>
              <span className="font-semibold text-fg">{a.area}.</span>{" "}
              {learning ? a.layman || a.impact : a.impact}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
