// components/research/StockHealthCard.tsx
// V5.15 — "Stock Health" mode result display, reused by both the live Research result view
// (StockHealthResultView, with save/export chrome) and a re-opened saved item in Learn
// (StockHealthCard alone, via components/saved/SavedList.tsx) — one content renderer so the
// two surfaces can't drift apart, matching the CollapsibleNote-sharing precedent already
// established for Research's Simple-explanation/Original-text sections.
"use client";

import { useState } from "react";
import type { MetricCategory, StockHealthAssessment, StockMetric } from "@/lib/types";
import type { SavedItem } from "@/lib/savedStore";
import { AssessmentPill } from "@/components/ui";

const SECTION_LABEL: Record<Exclude<MetricCategory, "other">, string> = {
  valuation: "Valuation",
  profitability: "Profitability",
  financialRisk: "Financial Risk",
  shareholderReturns: "Shareholder Returns",
};
const SECTION_ORDER: Exclude<MetricCategory, "other">[] = [
  "valuation",
  "profitability",
  "financialRisk",
  "shareholderReturns",
];

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const RATING: Record<StockHealthAssessment["overall"]["rating"], { label: string; style: string }> = {
  attractive: { label: "Attractive", style: "border-calm/30 bg-calm/10 text-calm" },
  reasonable: { label: "Reasonable", style: "border-steel/30 bg-steel/10 text-steel" },
  caution: { label: "Caution", style: "border-elevated/30 bg-elevated/10 text-elevated" },
  highRisk: { label: "High Risk", style: "border-stress/30 bg-stress/10 text-stress" },
};

function MetricRow({ m }: { m: StockMetric }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line-soft last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 py-2 text-left"
      >
        <span className="flex-1 text-[12.5px] font-medium leading-tight text-fg-muted">{m.label}</span>
        <span className="tnum shrink-0 text-[12.5px] font-semibold text-fg">{m.value}</span>
        <span className="ml-1 shrink-0"><AssessmentPill assessment={m.assessment} dense /></span>
        <span className="shrink-0 text-2xs text-fg-faint">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div className="mb-2 space-y-1.5 rounded-lg border border-line-soft bg-ink-850 px-3 py-2.5">
          <p className="text-[12px] leading-relaxed text-fg-muted">{m.meaning}</p>
          <p className="text-[12px] leading-relaxed text-fg-muted">
            <span className="font-semibold text-steel">Why it matters — </span>
            {m.whyItCares}
          </p>
          <p className="text-[12px] leading-relaxed text-fg-muted">
            <span className="font-semibold text-elevated">{m.assessmentWhy}</span>
          </p>
          {m.benchmarkRange ? (
            <p className="text-[11px] text-fg-faint">Typical range: {m.benchmarkRange}</p>
          ) : null}
          <p className="text-[11px] text-fg-faint">Updates: {m.updateFrequency}</p>
          <p className="text-[11px] italic text-fg-faint">{m.caveat}</p>
          {m.checkNext ? (
            <p className="text-[12px] leading-relaxed text-fg-muted">
              <span className="font-semibold text-fg">Check next — </span>
              {m.checkNext}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: StockMetric[] }) {
  if (!rows.length) return null;
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-faint">{title}</p>
      <div className="rounded-xl border border-line bg-ink-800 px-3">
        {rows.map((m) => (
          <MetricRow key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}

/** Pure content renderer — the sections/lists, no save/export chrome. */
export function StockHealthCard({ assessment: a }: { assessment: StockHealthAssessment }) {
  const byCategory = (cat: MetricCategory) => a.metrics.filter((m) => m.category === cat);
  const rating = RATING[a.overall.rating];
  const name = a.companyName || a.ticker;

  return (
    <div>
      {/* V5.16 — name + "as of" date at the top. The screenshot itself carries no visible data-
          freshness timestamp, so "as of" is when this screenshot was analyzed, not necessarily
          the live market moment — said explicitly rather than implying a real-time quote. */}
      <div className="mb-2 flex items-baseline justify-between gap-2">
        {name ? <h3 className="text-[15px] font-semibold leading-snug text-fg">{name}{a.ticker && a.companyName ? ` (${a.ticker})` : ""}</h3> : <span />}
        <span className="shrink-0 text-2xs text-fg-faint">As of {fmt(a.analyzedISO)}</span>
      </div>

      {/* Overall Risk Signal — the prominent top-of-page band the user asked for. */}
      <div className={`rounded-xl border px-3.5 py-3 ${rating.style}`}>
        <p className="text-2xs font-semibold uppercase tracking-wide opacity-80">Overall Stock Health</p>
        <p className="mt-0.5 text-base font-bold">{rating.label}</p>
        <div className="mt-2 space-y-1 text-[12.5px] leading-relaxed opacity-90">
          <p><span className="font-semibold">Valuation — </span>{a.overall.valuation}</p>
          <p><span className="font-semibold">Profitability — </span>{a.overall.profitability}</p>
          <p><span className="font-semibold">Financial strength — </span>{a.overall.financialStrength}</p>
          <p><span className="font-semibold">Income — </span>{a.overall.income}</p>
          {a.overall.redFlags ? <p><span className="font-semibold">Red flags — </span>{a.overall.redFlags}</p> : null}
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-fg-faint">
        {a.sectorBasis === "sector"
          ? "Benchmarks below use an inferred sector context."
          : "Sector could not be confidently inferred — benchmarks below use a broad-market heuristic."}{" "}
        Tap a row for the full explanation.
      </p>

      {SECTION_ORDER.map((cat) => (
        <Section key={cat} title={SECTION_LABEL[cat]} rows={byCategory(cat)} />
      ))}
      <Section title="Other" rows={byCategory("other")} />

      {a.keyPositives.length ? (
        <div className="mt-3">
          <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-calm">🟢 Key Positives</p>
          <ul className="space-y-1 text-[12.5px] leading-relaxed text-fg-muted">
            {a.keyPositives.map((p, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-calm">•</span>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {a.keyRisks.length ? (
        <div className="mt-3">
          <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-stress">🔴 Key Risks / Concerns</p>
          <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-fg-muted">
            {a.keyRisks.map((r, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-stress">•</span>
                <span>
                  {r.risk} <span className="text-fg-faint">— check: {r.checkNext}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {a.thingsToInvestigate.length ? (
        <div className="mt-3">
          <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-elevated">🟡 Things to Investigate</p>
          <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-fg-muted">
            {a.thingsToInvestigate.map((r, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-elevated">•</span>
                <span>
                  {r.area} <span className="text-fg-faint">— check: {r.checkNext}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {a.dataLimitations.length ? (
        <div className="mt-3 rounded-lg border border-line-soft bg-ink-850 px-3 py-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Can&rsquo;t be determined from this screenshot</p>
          <ul className="mt-1 space-y-0.5 text-[11.5px] leading-relaxed text-fg-faint">
            {a.dataLimitations.map((d, i) => (
              <li key={i}>• {d}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-[10px] leading-relaxed text-fg-faint">
        Screening/educational assessment based only on the values in the screenshot provided — not a
        recommendation to buy or sell, and not investment advice.
      </p>
    </div>
  );
}

/** Live-result wrapper: header + StockHealthCard + Save/Export/Analyze-another actions —
 *  same action-row pattern as the rest of Research (ResearchWorkspace.tsx). */
export function StockHealthResultView({
  assessment,
  savedItem,
  onToggleSave,
  savedIds,
  onReset,
}: {
  assessment: StockHealthAssessment;
  savedItem: SavedItem;
  onToggleSave?: (item: SavedItem) => void;
  savedIds?: Set<string>;
  onReset: () => void;
}) {
  const isSaved = Boolean(savedIds?.has(savedItem.id));

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wide text-steel">📊 Stock Health</span>
        <span className="text-2xs text-fg-faint">From screenshot</span>
      </div>

      {/* Name + "as of" date render inside StockHealthCard itself (V5.16), so it's identical
          here, in a re-opened saved item, and (separately) in the PDF export. */}
      <div className="mt-1.5 rounded-xl border border-line bg-ink-800 px-4 py-3.5">
        <StockHealthCard assessment={assessment} />
      </div>

      <div className="flex gap-2">
        {onToggleSave ? (
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
          onClick={onReset}
          className="flex-1 rounded-xl border border-line bg-ink-800 px-4 py-2.5 text-2xs font-semibold text-steel active:bg-ink-700"
        >
          🔄 Analyze another
        </button>
      </div>

      {isSaved ? (
        <div className="mt-2 flex gap-2">
          <a
            href={`/print/item?id=${encodeURIComponent(savedItem.id)}&mode=full`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-line bg-ink-800 px-3 py-2.5 text-center text-2xs font-semibold text-fg-muted active:bg-ink-700"
          >
            <span>🖨️ Export — Full</span>
          </a>
          <a
            href={`/print/item?id=${encodeURIComponent(savedItem.id)}&mode=share`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-line bg-ink-800 px-3 py-2.5 text-center text-2xs font-semibold text-fg-muted active:bg-ink-700"
          >
            <span>🔗 Export — Share</span>
          </a>
        </div>
      ) : (
        <p className="mt-2 text-center text-[10px] text-fg-faint">Save this analysis to enable Print / Export PDF</p>
      )}
    </>
  );
}
