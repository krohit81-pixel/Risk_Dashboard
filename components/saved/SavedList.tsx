// components/saved/SavedList.tsx
"use client";

import { useState } from "react";
import type { SavedItem } from "@/lib/savedStore";
import { FocusBlock } from "@/components/research/ResearchWorkspace";
import { MizuhoLensBlock } from "@/components/intel/MizuhoLensBlock";

const KIND_LABEL: Record<SavedItem["kind"], string> = {
  theme: "CRO Conversation",
  editorial: "Editorial",
  japan: "Japan & Asia",
  analysis: "Research",
};

// V4.6 — color-code saved cards by kind (and, for Research, by source).
const KIND_COLOR: Record<SavedItem["kind"], string> = {
  theme: "#A78BFA", // CRO Conversation — Mizuho purple
  editorial: "#5B8DEF", // Editorial — steel
  japan: "#F5A524", // Japan & Asia — amber
  analysis: "#2DD4A7", // Research — calm green
};

/** Friendly site name from a URL host, e.g. cnbc.com → "CNBC". */
const SITE_NAMES: Record<string, string> = {
  cnbc: "CNBC", reuters: "Reuters", bloomberg: "Bloomberg", ft: "FT", wsj: "WSJ",
  nytimes: "NYT", waPo: "WaPo", washingtonpost: "WaPo", economist: "Economist",
  bbc: "BBC", cnn: "CNN", apnews: "AP", marketwatch: "MarketWatch", barrons: "Barron's",
  nikkei: "Nikkei", scmp: "SCMP", guardian: "Guardian", politico: "Politico",
  axios: "Axios", forbes: "Forbes", businessinsider: "BI", yahoo: "Yahoo",
};
function siteName(url?: string): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const core = (host.split(".").slice(-2, -1)[0] || host).toLowerCase();
    return SITE_NAMES[core] || core.charAt(0).toUpperCase() + core.slice(1);
  } catch {
    return null;
  }
}

/** For a Research analysis, derive a short source label + its own accent color. */
/** Short publisher chip for a newsletter edition/label. */
function newsletterPublisher(edition: string): string {
  const e = edition.toLowerCase();
  if (/briefing|markets daily|bloomberg/.test(e)) return "Bloomberg";
  if (e.includes("finews")) return "finews";
  if (e.includes("daily upside")) return "Daily Upside";
  return edition.trim();
}

function sourceChip(it: SavedItem): { label: string; color: string } | null {
  if (it.kind !== "analysis") return null;
  const raw = it.sourceLabel || it.sources || "";
  // Newsletter-sourced saves: "Newsletter · <edition>" (v4.9) or legacy "Bloomberg · <edition>".
  // Derive the real publisher from the edition rather than assuming Bloomberg.
  const m = raw.match(/^\s*(?:newsletter|bloomberg)\s*·\s*(.+)$/i);
  if (m) return { label: newsletterPublisher(m[1]), color: "#F5A524" };
  const label = raw.toLowerCase();
  if (label.startsWith("bloomberg")) return { label: "Bloomberg", color: "#F5A524" }; // legacy plain "Bloomberg"
  if (label.startsWith("newsletter")) return { label: "Newsletter", color: "#F5A524" };
  if (it.originalUrl || it.sourceType === "url") {
    const site = siteName(it.originalUrl);
    return { label: site ? `${site} URL` : "URL", color: "#5B8DEF" };
  }
  if (it.sourceType === "image") return { label: "Screenshot", color: "#A78BFA" };
  return { label: "Pasted", color: "#8A94A6" };
}

function pillStyle(hex: string) {
  return { borderColor: `${hex}66`, backgroundColor: `${hex}1A`, color: hex };
}

function fmt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function SavedList({
  items,
  onRemove,
}: {
  items: SavedItem[];
  onRemove: (id: string) => void;
}) {
  // V4.1a — Learn renders the saved piece with a Learning/Executive toggle.
  // Default is Learning (plain-English), the highest-value view for prep.
  const [learning, setLearning] = useState(true);

  if (!items?.length) {
    return (
      <p className="text-xs leading-relaxed text-fg-faint">
        Nothing saved yet. Tap <span className="font-semibold text-fg-muted">☆ Save</span> on a theme,
        editorial item, Japan note or Research analysis to keep the full piece here — it stays even after
        the next daily snapshot replaces the live feed.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        {([["learn", "Learning"], ["exec", "Executive"]] as const).map(([id, label]) => {
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

      {items.map((it) => (
        <SavedCard key={it.id} item={it} learning={learning} onRemove={onRemove} />
      ))}
    </div>
  );
}

function SavedCard({
  item: it,
  learning,
  onRemove,
}: {
  item: SavedItem;
  learning: boolean;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false); // collapsed by default — tap the title to expand
  const show = (exec?: string, lay?: string) => (learning && lay ? lay : exec) || "";
  const showList = (exec?: string[], lay?: string[]) =>
    (learning && lay && lay.length ? lay : exec) ?? [];

  const d = it.detail;
  const hasDetail =
    !!d &&
    Boolean(
      d.lenses?.length ||
        d.signals?.length ||
        d.questions?.length ||
        d.talkingPoint ||
        d.followUp ||
        d.whatToUnderstand ||
        d.firstOrder ||
        d.secondOrder ||
        d.keyTakeaway
    );

  const impactAreas = it.bankingImpactAreas ?? [];
  const whyMizuho = showList(it.whyMizuho, it.layman?.whyMizuho);

  return (
    <div className="rounded-xl border border-line bg-ink-800 px-4 py-3">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
          style={pillStyle(KIND_COLOR[it.kind])}
        >
          {KIND_LABEL[it.kind]}
        </span>
        {(() => {
          const sc = sourceChip(it);
          return sc ? (
            <span
              className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={pillStyle(sc.color)}
            >
              {sc.label}
            </span>
          ) : null;
        })()}
        <button onClick={() => onRemove(it.id)} className="ml-auto text-2xs font-semibold text-fg-faint">
          Remove
        </button>
      </div>

      <button onClick={() => setCardOpen((v) => !v)} className="block w-full text-left">
        <h4 className="text-[14.5px] font-semibold leading-snug text-fg">{it.title}</h4>
      </button>

      {cardOpen ? (
        <>
          {it.kind === "analysis" ? (
            <p className="mt-1 text-2xs text-fg-faint">
              {it.articleDate
                ? `Published ${fmt(it.articleDate)}`
                : it.analysisDateISO
                ? `Analyzed ${fmt(it.analysisDateISO)}`
                : ""}
            </p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {it.originalUrl ? (
              <a
                href={it.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg border border-line px-2.5 py-1 text-2xs font-semibold text-fg-muted active:bg-ink-700"
              >
                Read article ↗
              </a>
            ) : null}
            <a
              href={`/print/item?id=${encodeURIComponent(it.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-2xs font-semibold text-fg-muted active:bg-ink-700"
            >
              🖨️ Print / Export PDF
            </a>
          </div>

          {show(it.whatHappened, it.layman?.whatHappened) ? (
            <Line label="What happened">{show(it.whatHappened, it.layman?.whatHappened)}</Line>
          ) : null}

          {show(it.interpretation, it.layman?.interpretation) ? (
            <Line label="Why it matters" tone="interpret">{show(it.interpretation, it.layman?.interpretation)}</Line>
          ) : null}

          {impactAreas.length ? (
            <div className="mt-1">
              <p className="text-2xs font-semibold uppercase tracking-wide text-steel">Banking impact</p>
              <ul className="mt-1 space-y-1">
                {impactAreas.map((a, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-fg-muted">
                    <span aria-hidden className="mt-[2px] text-steel">•</span>
                    <span>
                      <span className="font-semibold text-fg">{a.area}.</span>{" "}
                      {learning ? a.layman || a.impact : a.impact}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : show(it.bankingImpact, it.layman?.bankingImpact) ? (
            <Line label="Banking impact">{show(it.bankingImpact, it.layman?.bankingImpact)}</Line>
          ) : null}

          {whyMizuho.length ? (
            <div className="mt-1.5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-mizuho">Why Mizuho cares</p>
              <ul className="mt-0.5 list-disc pl-4 text-[13px] leading-relaxed text-fg-muted">
                {whyMizuho.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <FocusBlock items={it.focus} />

          <MizuhoLensBlock lens={it.mizuhoLens} />

          {hasDetail ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-3 flex w-full items-center gap-1.5 text-left text-xs font-semibold text-steel"
              >
                {open ? "\u25be Hide detail" : "\u2192 Full detail"}
                <span className="font-normal text-fg-faint">
                  {open ? "" : "\u2014 lenses, signals, questions, talking points"}
                </span>
              </button>

              {open ? (
                <div className="mt-2 space-y-3">
                  {d!.lenses?.length ? (
                    <div className="border-l-2 border-steel/60 pl-3">
                      {d!.lenses.map((l, i) => (
                        <p key={i} className="text-[13px] leading-relaxed text-fg-muted">
                          <span className="font-semibold text-steel">{l.label} — </span>
                          {show(l.question, l.questionLayman)}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {d!.firstOrder || d!.secondOrder ? (
                    <div className="grid grid-cols-1 gap-2">
                      {show(d!.firstOrder, d!.firstOrderLayman) ? (
                        <Sub label="First-order">{show(d!.firstOrder, d!.firstOrderLayman)}</Sub>
                      ) : null}
                      {show(d!.secondOrder, d!.secondOrderLayman) ? (
                        <Sub label="Second-order">{show(d!.secondOrder, d!.secondOrderLayman)}</Sub>
                      ) : null}
                    </div>
                  ) : null}

                  {show(d!.keyTakeaway, d!.keyTakeawayLayman) ? (
                    <div className="rounded-lg border border-line-soft bg-ink-850 px-3 py-2">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Key takeaway</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-fg">
                        {show(d!.keyTakeaway, d!.keyTakeawayLayman)}
                      </p>
                    </div>
                  ) : null}

                  {d!.signals?.length ? (
                    <div>
                      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Signals to watch</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {d!.signals.map((s, i) => (
                          <span key={i} className="rounded-md border border-line bg-ink-700 px-2 py-0.5 text-2xs text-fg-muted">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {showList(d!.questions, d!.questionsLayman).length ? (
                    <div>
                      <p className="text-2xs font-semibold uppercase tracking-wide text-steel">
                        Questions leadership may ask
                      </p>
                      <ul className="mt-1 space-y-1 text-[13px] leading-relaxed text-fg-muted">
                        {showList(d!.questions, d!.questionsLayman).map((q, i) => (
                          <li key={i}>• {q}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {show(d!.talkingPoint, d!.talkingPointLayman) || show(d!.followUp, d!.followUpLayman) ? (
                    <div className="border-l-2 border-elevated/60 pl-3">
                      {show(d!.talkingPoint, d!.talkingPointLayman) ? (
                        <>
                          <p className="text-2xs font-semibold uppercase tracking-wide text-elevated">
                            If this comes up in a meeting
                          </p>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-fg">
                            {show(d!.talkingPoint, d!.talkingPointLayman)}
                          </p>
                        </>
                      ) : null}
                      {show(d!.followUp, d!.followUpLayman) ? (
                        <>
                          <p className="mt-2 text-2xs font-semibold uppercase tracking-wide text-elevated">
                            Follow-up question
                          </p>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">
                            {show(d!.followUp, d!.followUpLayman)}
                          </p>
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  {show(d!.whatToUnderstand, d!.whatToUnderstandLayman) ? (
                    <div className="border-l-2 border-calm/60 pl-3">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-calm">
                        What I should understand
                      </p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">
                        {show(d!.whatToUnderstand, d!.whatToUnderstandLayman)}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {it.sourceLabel || it.sources ? <p className="mt-2 text-2xs text-fg-faint">Source: {it.sourceLabel || it.sources}</p> : null}

          {it.kind === "analysis" ? (
            <p className="mt-1 text-2xs text-fg-faint">
              {it.sourceLabel ? it.sourceLabel : it.sourceType === "url" ? "From URL" : "Pasted text"}
              {it.analysisDateISO ? ` · analyzed ${fmt(it.analysisDateISO)}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-2xs text-fg-faint">
              Saved {fmt(it.savedAtISO)}
              {it.snapshotISO ? ` · from snapshot ${fmt(it.snapshotISO)}` : ""}
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

function Line({ label, children, tone }: { label: string; children: React.ReactNode; tone?: "interpret" }) {
  // Match the Today/Research palette: interpretation ("Why it matters") in gold,
  // sourced/structural labels in steel. (`elevated`/`steel` are the defined tokens;
  // `amber` is NOT a token and renders as no colour — that was the white-text bug.)
  const color = tone === "interpret" ? "text-elevated" : "text-steel";
  return (
    <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
      <span className={`font-semibold ${color}`}>{label}: </span>
      {children}
    </p>
  );
}

function Sub({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">{label}</p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{children}</p>
    </div>
  );
}
