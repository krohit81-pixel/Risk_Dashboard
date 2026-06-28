// components/intel/intelUi.tsx
"use client";

import type { ReactNode } from "react";
import type {
  Confidence,
  DataAnchor,
  Lens,
  RiskHorizon,
} from "@/lib/types";

/* Colour semantics (consistent, not decorative):
   blue/steel = structure, lens, links · amber/elevated = attention,
   interpretation, talking point · teal/calm = learning layer ·
   purple/mizuho = Mizuho context · red/green = direction only. */

const HORIZON: Record<RiskHorizon, string> = {
  Immediate: "text-stress",
  "Medium-term": "text-elevated",
  Structural: "text-steel",
};

export function HorizonPill({ horizon, inline = false }: { horizon: RiskHorizon; inline?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-2xs ${inline ? "" : "ml-auto"}`}>
      <span className={`font-semibold ${HORIZON[horizon]}`}>{horizon}</span>
      <span className="text-fg-faint">risk horizon</span>
    </span>
  );
}

export function ConfidenceChip({ confidence }: { confidence: Confidence }) {
  const c =
    confidence === "High" ? "text-calm" : confidence === "Medium" ? "text-elevated" : "text-fg-faint";
  return <span className={`text-2xs font-semibold ${c}`}>{confidence} confidence</span>;
}

export function SourceLink({ source }: { source: string }) {
  if (!source) return null;
  return <span className="text-2xs font-medium text-steel">↗ {source}</span>;
}

export function InterpretationTag() {
  return <span className="text-2xs font-medium text-elevated">interpretation</span>;
}
export function SourcedTag() {
  return <span className="text-2xs font-medium text-steel">sourced</span>;
}


export function ItemFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft/60 pt-2.5">
      {children}
    </div>
  );
}

/** Small chip showing the live data point the editorial is anchored to. */
export function AnchorChip({ anchor }: { anchor?: DataAnchor }) {
  if (!anchor) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-steel/25 bg-steel/10 px-2 py-0.5 text-2xs font-medium text-steel">
      <span className="tnum">{anchor.label}: {anchor.value}</span>
      <span className="tnum text-fg-muted">{anchor.change}</span>
    </span>
  );
}

export function MizuhoBlock({ bullets }: { bullets: string[] }) {
  if (!Array.isArray(bullets) || !bullets.length) return null;
  return (
    <div className="mt-3 border-l-2 border-mizuho/60 pl-3">
      <p className="text-2xs font-semibold uppercase tracking-wide text-mizuho">
        Why this matters to Mizuho
      </p>
      <ul className="mt-1 space-y-0.5">
        {bullets.map((b, i) => (
          <li key={i} className="text-[13px] leading-relaxed text-fg-muted">• {b}</li>
        ))}
      </ul>
    </div>
  );
}

export function LensBox({ lenses }: { lenses: Lens[] }) {
  if (!Array.isArray(lenses) || !lenses.length) return null;
  return (
    <div className="mt-3 border-l-2 border-steel/60 pl-3">
      {lenses.map((l, i) => (
        <p key={i} className="text-[13px] leading-relaxed text-fg-muted">
          <span className="font-semibold text-steel">{l.kind} — </span>
          {l.question}
        </p>
      ))}
    </div>
  );
}

export function Signals({ items }: { items: string[] }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div className="mt-3">
      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Signals to watch</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span key={s} className="rounded-md border border-line bg-ink-700 px-2 py-0.5 text-2xs text-fg-muted">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Labelled "Why it matters / Banking impact" style row in blue. */
export function LabeledLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
      <span className="text-2xs font-semibold uppercase tracking-wide text-steel">{label} </span>
      {children}
    </p>
  );
}

/* ── Learning-view-only blocks ── */

export function QuestionsBlock({ items }: { items: string[] }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div className="mt-3">
      <p className="text-2xs font-semibold uppercase tracking-wide text-steel">
        Questions leadership may ask
      </p>
      <ul className="mt-1 space-y-0.5">
        {items.map((q, i) => (
          <li key={i} className="text-[13px] leading-relaxed text-fg-muted">• {q}</li>
        ))}
      </ul>
    </div>
  );
}

export function MeetingBlock({
  talkingPoint,
  followUp,
}: {
  talkingPoint: string;
  followUp: string;
}) {
  if (!talkingPoint && !followUp) return null;
  return (
    <div className="mt-3 border-l-2 border-elevated/60 pl-3">
      <p className="text-2xs font-semibold uppercase tracking-wide text-elevated">
        If this comes up in a meeting
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-fg">{talkingPoint}</p>
      <p className="mt-2 text-2xs font-semibold uppercase tracking-wide text-elevated">Follow-up question</p>
      <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{followUp}</p>
    </div>
  );
}

export function UnderstandBlock({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="mt-3 border-l-2 border-calm/60 pl-3">
      <p className="text-2xs font-semibold uppercase tracking-wide text-calm">
        What I should understand
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{text}</p>
    </div>
  );
}
