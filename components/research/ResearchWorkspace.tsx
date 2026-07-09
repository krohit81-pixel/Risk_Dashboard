// components/research/ResearchWorkspace.tsx
"use client";

import { useState, useEffect } from "react";
import type { ResearchAnalysis, FocusItem, BloombergDigest, BloombergStory } from "@/lib/types";
import type { ImageInput } from "@/lib/llm";
import type { SavedItem } from "@/lib/savedStore";
import { savedFromAnalysis } from "@/lib/savedMappers";
import { CONCEPTS } from "@/lib/concepts";
import { MizuhoAlignmentBlock } from "@/components/intel/MizuhoAlignment";
import { Card, SeverityPill, Chip } from "@/components/ui";
import { HorizonPill, UnderstandBlock } from "@/components/intel/intelUi";
import { MizuhoLensBlock } from "@/components/intel/MizuhoLensBlock";
import { ProgressRing } from "@/components/shared/ProgressRing";

const conceptTerm = (id: string) => CONCEPTS.find((c) => c.id === id)?.term ?? id;

/** Trim a newsletter label for the header: "Evening Briefing — Americas" → "Americas — Eve". */
function shortLabel(label: string): string {
  const m = label.match(/(morning|evening)\s+briefing\s*[—–-]\s*(.+)/i);
  if (m) return `${m[2].trim()} — ${m[1].toLowerCase() === "evening" ? "Eve" : "Morn"}`;
  return label;
}

export function ResearchWorkspace({
  onOpenConcept,
  onToggleSave,
  savedIds,
}: {
  onOpenConcept?: (id: string) => void;
  onToggleSave?: (item: SavedItem) => void;
  savedIds?: Set<string>;
}) {
  const [mode, setMode] = useState<"text" | "url" | "image">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [images, setImages] = useState<ImageInput[]>([]);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ResearchAnalysis | null>(null);
  const [learning, setLearning] = useState(false);
  const [quota, setQuota] = useState<{ used: number; cap: number; remaining: number } | null>(null);
  const [bloombergDigests, setBloombergDigests] = useState<BloombergDigest[]>([]);
  const [bbOpen, setBbOpen] = useState(false); // V4.8.4 — Newsletters collapsed by default
  const [wsOpen, setWsOpen] = useState(true); // V4.8.4 — workspace open by default
  const [bbAnalyzed, setBbAnalyzed] = useState<Set<string>>(new Set());

  // Show remaining Research budget for today (cheap GET, no analysis spent).
  useEffect(() => {
    let alive = true;
    fetch("/api/research/analyze")
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.ok && j.quota) setQuota(j.quota);
      })
      .catch(() => {});
    fetch("/api/bloomberg")
      .then((r) => r.json())
      .then((j) => {
        if (!alive || !j?.ok) return;
        if (Array.isArray(j.digests)) setBloombergDigests(j.digests as BloombergDigest[]);
        if (Array.isArray(j.analyzed)) setBbAnalyzed(new Set(j.analyzed as string[]));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const capped = quota ? quota.remaining <= 0 : false;

  // Core POST — shared by manual analyze and one-tap Bloomberg-story analyze.
  async function runAnalyze(payload: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setTranscript(null);
    setShowTranscript(false);
    try {
      const res = await fetch("/api/research/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (j.quota) setQuota(j.quota);
      if (!res.ok || !j.ok) {
        setError(j.error || "Analysis failed. Please try again.");
        if (j.fallbackToText) setMode("text");
        return false;
      }
      setAnalysis(j.analysis as ResearchAnalysis);
      if (j.transcript) setTranscript(j.transcript as string);
      setLearning(false);
      return true;
    } catch {
      setError("Couldn't reach the analyzer. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    const payload =
      mode === "url" ? { mode, url } : mode === "image" ? { mode, images } : { mode, text };
    await runAnalyze(payload);
  }

  async function analyzeStory(story: BloombergStory, edition?: string) {
    if (capped || loading) return;
    const composed = [story.headline, story.summary].filter(Boolean).join("\n\n");
    if (composed.trim().length < 20) return;
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    const sourceLabel = edition ? `Newsletter · ${edition}` : "Newsletter";
    const ok = await runAnalyze({ mode: "text", text: composed, bloombergHeadline: story.headline, sourceLabel });
    if (ok) setBbAnalyzed((prev) => new Set(prev).add(story.headline));
  }

  async function onPickImages(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const next: ImageInput[] = [];
    for (const file of Array.from(files).slice(0, 4 - images.length)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) {
        setError("Each image must be under 5MB.");
        continue;
      }
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] || "");
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(file);
      });
      if (data) next.push({ mimeType: file.type, data });
    }
    setImages((prev) => [...prev, ...next].slice(0, 4));
  }

  function reset() {
    setAnalysis(null);
    setError(null);
    setText("");
    setUrl("");
    setImages([]);
    setTranscript(null);
    setShowTranscript(false);
  }

  const savedItem: SavedItem | null = analysis ? savedFromAnalysis(analysis) : null;
  const isSaved = savedItem ? Boolean(savedIds?.has(savedItem.id)) : false;

  const show = (exec: string, lay?: string) => (learning && lay ? lay : exec);

  return (
    <section className="rise space-y-3">
      {!analysis ? (
        <>
          <BloombergPanel
            digests={bloombergDigests}
            open={bbOpen}
            onToggle={() => setBbOpen((v) => !v)}
            onAnalyze={analyzeStory}
            analyzed={bbAnalyzed}
            disabled={capped || loading}
          />

          <button
            onClick={() => setWsOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-xl border border-line bg-ink-800 px-3.5 py-2.5 text-left"
          >
            <span className="text-2xs font-semibold uppercase tracking-wide text-steel">Analyze your own content</span>
            <span className="ml-auto text-xs text-fg-faint">{wsOpen ? "\u25be" : "\u25b8"}</span>
          </button>

          {wsOpen ? (
            <>
              <p className="text-[13px] leading-relaxed text-fg-muted">
                Paste an article, speech, note or report and analyze it through the same CRO framework as the
                daily briefing. Text is the reliable path; a URL is best-effort (many premium sites block fetching).
                Pasting a link at the top keeps it for &ldquo;Read article&rdquo;.
              </p>

          <div className="flex gap-1.5">
            {(["text", "url", "image"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg border px-3 py-1.5 text-2xs font-semibold transition ${
                  mode === m ? "border-steel/50 bg-steel/10 text-steel" : "border-line bg-ink-800 text-fg-faint"
                }`}
              >
                {m === "text" ? "Paste text" : m === "url" ? "From URL" : "Image"}
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
          ) : mode === "url" ? (
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-xl border border-line bg-ink-800 px-3.5 py-3 text-[13px] text-fg placeholder:text-fg-faint focus:border-steel/50 focus:outline-none"
            />
          ) : (
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-ink-800 px-3.5 py-6 text-center text-2xs text-fg-faint">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickImages(e.target.files)}
                />
                {images.length
                  ? `${images.length} image${images.length > 1 ? "s" : ""} added · tap to add more (up to 4)`
                  : "Tap to add screenshots (up to 4) — photo, library, or paste a clipping"}
              </label>
              {images.length ? (
                <div className="flex flex-wrap gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:${img.mimeType};base64,${img.data}`}
                        alt={`screenshot ${i + 1}`}
                        className="h-16 w-16 rounded-lg border border-line object-cover"
                      />
                      <button
                        onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-ink-900 text-2xs text-fg-muted"
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="text-[10px] leading-relaxed text-fg-faint">
                The image is read for its visible text and run through the same analysis. Long articles can span
                several screenshots.
              </p>
            </div>
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

          {(() => {
            const notReady =
              mode === "text"
                ? text.trim().length < 200
                : mode === "url"
                ? url.trim().length < 8
                : images.length === 0;
            const disabled = capped || loading || notReady;
            return (
              <>
                {loading ? (
                  <ProgressRing
                    active={loading}
                    estimateSeconds={mode === "image" ? 34 : 24}
                    stages={
                      mode === "image"
                        ? ["Reading the image…", "Interpreting through the CRO lens…", "Aligning to Mizuho Top Risks…", "Checking the Mizuho repository…"]
                        : undefined
                    }
                  />
                ) : null}
                <button
                  onClick={analyze}
                  disabled={disabled}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    disabled ? "bg-ink-800 text-fg-faint" : "bg-steel/15 text-steel active:bg-steel/25"
                  }`}
                >
                  {loading
                    ? mode === "image"
                      ? "Reading & analyzing…"
                      : "Analyzing…"
                    : capped
                    ? "Paused until tomorrow"
                    : "Analyze"}
                </button>
              </>
            );
          })()}

          {quota && !capped ? (
            <p className="text-center text-[10px] text-fg-faint">
              {quota.remaining} of {quota.cap} analyses left today
            </p>
          ) : null}
            </>
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
              {analysis.sourceType === "url"
                ? "From URL"
                : analysis.sourceType === "image"
                ? "From image"
                : "Pasted text"}
            </span>
          </div>

          {transcript ? (
            <div className="rounded-xl border border-line bg-ink-800 px-3.5 py-2.5">
              <button
                onClick={() => setShowTranscript((v) => !v)}
                className="flex w-full items-center gap-1.5 text-left text-2xs font-semibold text-steel"
              >
                {showTranscript ? "\u25be Hide transcribed text" : "\u2192 Transcribed text"}
                <span className="font-normal text-fg-faint">(what was read from your image)</span>
              </button>
              {showTranscript ? (
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-fg-muted">{transcript}</p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-xl border border-line bg-ink-800 px-4 py-3.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {analysis.category ? <Chip>{analysis.category}</Chip> : null}
              {analysis.severity ? <SeverityPill severity={analysis.severity} /> : null}
              {analysis.horizon ? <HorizonPill horizon={analysis.horizon} inline /> : null}
            </div>
            <h3 className="text-[15px] font-semibold leading-snug text-fg">{analysis.title}</h3>
            <p className="mt-1 text-2xs text-fg-faint">
              {analysis.articleDate
                ? `Published ${new Date(analysis.articleDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
                : `Analyzed ${new Date(analysis.analyzedISO).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
            {analysis.truncated ? (
              <p className="mt-1 text-[10px] text-elevated">Long content — analyzed the first ~4,000 words.</p>
            ) : null}

            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
              <span className="text-2xs font-semibold uppercase tracking-wide text-steel">What happened </span>
              <span className="text-steel">· sourced — </span>
              {show(analysis.whatHappened, analysis.layman?.whatHappened)}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
              <span className="text-2xs font-semibold uppercase tracking-wide text-elevated">Why it matters </span>
              <span className="text-elevated">· interpretation — </span>
              {show(analysis.whyItMatters, analysis.layman?.whyItMatters)}
            </p>

            {analysis.firstOrder || analysis.secondOrder ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-steel">First-order</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{analysis.firstOrder}</p>
                </div>
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-steel">Second-order</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{analysis.secondOrder}</p>
                </div>
              </div>
            ) : null}

            {analysis.bankRisk ? (
              <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">
                <span className="text-2xs font-semibold uppercase tracking-wide text-steel">
                  Bank risk · {analysis.bankRiskKind} —{" "}
                </span>
                {analysis.bankRisk}
              </p>
            ) : null}

            {analysis.keyTakeaway ? (
              <div className="mt-3 rounded-lg border border-line-soft bg-ink-850 px-3 py-2">
                <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Key takeaway</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-fg">{analysis.keyTakeaway}</p>
              </div>
            ) : null}

            {learning && analysis.whatToUnderstand ? <UnderstandBlock text={analysis.whatToUnderstand} /> : null}

            {/* What should I focus on (reuses the v4.4 personalized focus capability) */}
            <FocusBlock items={analysis.focus} />

            {/* Mizuho alignment — kept below the editorial fields */}
            <MizuhoAlignmentBlock items={analysis.mizuhoAlignment} learning={learning} />
            {analysis.mizuhoAlignment.length === 0 ? (
              <p className="mt-2 text-2xs text-fg-faint">No clean Mizuho Top-Risk match for this content.</p>
            ) : null}

            {/* V5.0 — interpretation through Mizuho's disclosed repository */}
            <MizuhoLensBlock lens={analysis.mizuhoLens} />

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

          {/* Print / Export — active once saved (print reads from Supabase, so it needs a
              persisted id); visible either way so the option is discoverable, not hidden. */}
          {savedItem ? (
            isSaved ? (
              <a
                href={`/print/item?id=${encodeURIComponent(savedItem.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-line bg-ink-800 px-4 py-2.5 text-2xs font-semibold text-fg-muted active:bg-ink-700"
              >
                🖨️ Print / Export PDF
              </a>
            ) : (
              <p className="mt-2 text-center text-[10px] text-fg-faint">Save this analysis to enable Print / Export PDF</p>
            )
          ) : null}
        </>
      )}
    </section>
  );
}

const IMPORTANCE_DOT: Record<string, string> = {
  high: "bg-stress",
  medium: "bg-elevated",
  low: "bg-fg-faint",
};

function BloombergStoryRow({
  story,
  done,
  disabled,
  onAnalyze,
}: {
  story: BloombergStory;
  done: boolean;
  disabled: boolean;
  onAnalyze: (s: BloombergStory) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-ink-800 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${IMPORTANCE_DOT[story.importance ?? "low"] ?? "bg-fg-faint"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-fg">{story.headline}</p>
          {story.theme ? <p className="mt-0.5 text-2xs text-fg-faint">{story.theme}</p> : null}
          {story.summary ? <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{story.summary}</p> : null}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => onAnalyze(story)}
              disabled={disabled || done}
              className={`rounded-lg px-2.5 py-1 text-2xs font-semibold transition ${
                done ? "bg-ink-700 text-fg-faint" : disabled ? "bg-ink-800 text-fg-faint" : "bg-steel/15 text-steel active:bg-steel/25"
              }`}
            >
              {done ? "✓ Analyzed" : "Analyze this →"}
            </button>
            {story.url ? (
              <a
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-line px-2.5 py-1 text-2xs font-semibold text-fg-muted active:bg-ink-700"
              >
                Read article ↗
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** One briefing's section (collapsible header + lead + its stories), with its own staleness guard. */
function BloombergGroup({
  digest,
  analyzed,
  disabled,
  onAnalyze,
  open,
  onToggle,
}: {
  digest: BloombergDigest;
  analyzed: Set<string>;
  disabled: boolean;
  onAnalyze: (s: BloombergStory, edition?: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const stories = digest.today_stories ?? [];
  if (stories.length === 0) return null;
  const label = digest.newsletter_type || digest.edition || "Bloomberg";
  const displayLabel = shortLabel(label); // trimmed for the header; full `label` still used as source
  const dateLabel = digest.publication_date
    ? new Date(digest.publication_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : "";
  // Staleness is about how long since we INGESTED it (KV TTLs at 36h), not how old the
  // content is — weekly briefings (finews, Bloomberg Weekend) are legitimately a few days old.
  const ingestedAgeH = digest.ingested_at
    ? (Date.now() - new Date(digest.ingested_at).getTime()) / 3600000
    : 0;
  if (digest.ingested_at && ingestedAgeH >= 48) {
    return (
      <div className="rounded-lg border border-line bg-ink-800 px-3 py-2">
        <p className="text-2xs text-fg-faint">{displayLabel} — last refreshed {dateLabel || "(unknown)"} · no newer update</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-ink-800/40">
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <span className="text-2xs font-semibold uppercase tracking-wide text-elevated">{displayLabel}</span>
        {dateLabel ? <span className="text-2xs text-fg-faint">{dateLabel}</span> : null}
        <span className="ml-auto text-2xs text-fg-faint">
          {stories.length} {stories.length === 1 ? "story" : "stories"} {open ? "\u25be" : "\u25b8"}
        </span>
      </button>

      {open ? (
        <div className="space-y-2 px-3 pb-3">
          {digest.lead_editorial?.editorial_text ? (
            <p className="rounded-lg border border-line bg-ink-800 px-3 py-2 text-[12px] leading-relaxed text-fg-muted">
              <span className="font-semibold text-fg">Lead{digest.lead_editorial.author ? ` · ${digest.lead_editorial.author}` : ""}: </span>
              {digest.lead_editorial.editorial_text.slice(0, 280)}
              {digest.lead_editorial.editorial_text.length > 280 ? "…" : ""}
            </p>
          ) : null}
          {stories.map((s, i) => (
            <BloombergStoryRow
              key={i}
              story={s}
              done={analyzed.has(s.headline)}
              disabled={disabled}
              onAnalyze={(story) => onAnalyze(story, label)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BloombergPanel({
  digests,
  open,
  onToggle,
  onAnalyze,
  analyzed,
  disabled,
}: {
  digests: BloombergDigest[];
  open: boolean;
  onToggle: () => void;
  onAnalyze: (s: BloombergStory, edition?: string) => void;
  analyzed: Set<string>;
  disabled: boolean;
}) {
  // Only briefings with fresh stories count toward the visible panel.
  const fresh = digests.filter((d) => (d.today_stories ?? []).length > 0);
  // Per-group collapse state (keyed by briefing). Collapsed by default (V4.8).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  if (fresh.length === 0) return null;
  const totalStories = fresh.reduce((n, d) => n + (d.today_stories?.length ?? 0), 0);
  const keyOf = (d: BloombergDigest) => d.newsletter_key || d.subject || d.ingested_at || "bb";

  return (
    <div className="rounded-xl border border-elevated/30 bg-elevated/5">
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left">
        <span className="text-2xs font-semibold uppercase tracking-wide text-elevated">Newsletters — today</span>
        <span className="text-2xs text-fg-faint">{fresh.length} {fresh.length === 1 ? "briefing" : "briefings"}</span>
        <span className="ml-auto text-2xs text-fg-faint">
          {totalStories} {totalStories === 1 ? "story" : "stories"} {open ? "\u25be" : "\u2192"}
        </span>
      </button>

      {open ? (
        <div className="space-y-2 px-3.5 pb-3">
          {fresh.map((d) => {
            const k = keyOf(d);
            return (
              <BloombergGroup
                key={k}
                digest={d}
                analyzed={analyzed}
                disabled={disabled}
                onAnalyze={onAnalyze}
                open={openGroups[k] === true}
                onToggle={() => setOpenGroups((prev) => ({ ...prev, [k]: prev[k] === true ? false : true }))}
              />
            );
          })}
          <p className="text-[10px] leading-relaxed text-fg-faint">
            Each analysis runs through the same CRO framework and counts toward your daily Research budget.
          </p>
        </div>
      ) : null}
    </div>
  );
}


const FOCUS_KIND: Record<FocusItem["kind"], string> = {
  attention: "Attention",
  conversation: "Likely conversation",
  learning: "Learning",
};

export function FocusBlock({ items }: { items?: FocusItem[] }) {
  if (!items || items.length === 0) return null; // allowed-empty: render nothing
  return (
    <div className="mt-3 rounded-xl border border-elevated/30 bg-elevated/5 px-3.5 py-3">
      <p className="text-2xs font-semibold uppercase tracking-wide text-elevated">What should I focus on?</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((f, i) => (
          <li key={i} className="text-[13px] leading-relaxed text-fg-muted">
            <span className="font-semibold text-elevated">{FOCUS_KIND[f.kind]} — </span>
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
