// components/intel/SnapshotHeader.tsx
"use client";

import type { SnapshotMeta } from "@/lib/types";
import { Card } from "../ui";

function istStamp(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000);
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${date} · ${time} IST`;
}

const CONF_COLOR = { High: "text-calm", Medium: "text-elevated", Low: "text-fg-faint" } as const;

const DEGRADE_LABEL: Record<string, string> = {
  no_news: "Curated — no live news today",
  no_llm_key: "Curated — AI key not configured",
  llm_timeout: "Curated — AI timed out",
  llm_invalid_json: "Curated — AI returned invalid output",
  llm_http_error: "Curated — AI service error",
  invalid_output: "Curated — output failed validation",
  carried_forward: "Light news — key themes carried forward",
};

function DegradeNote({ meta }: { meta: SnapshotMeta }) {
  const r = meta.degradeReason;
  if (!r || r === "ok") return null;
  const label = DEGRADE_LABEL[r] ?? r;
  const tone = r === "carried_forward" ? "text-elevated" : "text-stress";
  return (
    <p className={`mt-2 text-2xs font-semibold ${tone}`}>
      ⚠ {label}
      {meta.stale ? " · showing last good briefing" : ""}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-fg-faint">{label}</p>
      <p className="text-[13px] font-semibold text-fg">{value}</p>
    </div>
  );
}

export function SnapshotHeader({ meta }: { meta: SnapshotMeta }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xs font-semibold uppercase tracking-widest text-steel">
          Editorial snapshot
        </p>
        <span className="text-2xs text-fg-faint">{meta.slotLabel}</span>
      </div>
      <p className="mt-1 text-[13px] text-fg-muted">
        Generated{" "}
        <span className="font-semibold text-fg">{istStamp(meta.generatedISO)}</span>
        {meta.llmProvider === "gemini" || meta.llmProvider === "anthropic" ? (
          <span className="text-fg-faint">
            {" "}· by {meta.llmProvider === "gemini" ? "Gemini" : "Anthropic"}
          </span>
        ) : null}
      </p>
      <DegradeNote meta={meta} />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="Articles" value={String(meta.articlesReviewed)} />
        <Stat label="Themes" value={String(meta.themesGenerated)} />
      </div>

      <div className="mt-3 min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-fg-faint">Sources</p>
        <p className="mt-0.5 break-words text-[13px] leading-relaxed text-fg-muted">
          {meta.sources.length
            ? meta.sources.slice(0, 12).join(", ") +
              (meta.sources.length > 12 ? `, +${meta.sources.length - 12} more` : "")
            : "—"}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-fg-faint">Confidence</span>
        <span className={`text-[13px] font-semibold ${CONF_COLOR[meta.confidence]}`}>
          {meta.confidence}
        </span>
      </div>

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wide text-fg-faint">Coverage</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {meta.coverage.map((c) => (
            <span
              key={c.topic}
              className={`text-2xs ${c.covered ? "text-calm" : "text-elevated"}`}
            >
              {c.covered ? "✓" : "⚠"} {c.topic}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
