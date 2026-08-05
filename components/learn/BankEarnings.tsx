"use client";

// components/learn/BankEarnings.tsx
// V5.7.0 — "Bank Earnings" prototype: latest-quarter results for 15 major banks, grouped by
// region, each as a collapsible card (highlights / market reaction / risk watch / plain
// English). Lives in Settings, per the same "reference material" pattern as Mizuho Reference.
//
// V5.8.0 — reads from /api/bank-earnings instead of importing the static baseline directly,
// so a bank refreshed via Settings → Generation History → "Refresh Earnings" shows up here
// without a redeploy. `refreshKey` (passed from page.tsx) forces a refetch after a refresh run.

import { useCallback, useEffect, useState } from "react";
import {
  REGION_LABEL,
  REGION_FLAG,
  REGION_NOTES,
  type BankEarnings as BankEarningsEntry,
  type Region,
  type StockReactionDirection,
} from "@/lib/bankEarnings";
import { BankEarningsCompare } from "./BankEarningsCompare";

const REACTION_STYLE: Record<StockReactionDirection, { cls: string }> = {
  up: { cls: "border-calm/30 bg-calm/10 text-calm" },
  down: { cls: "border-stress/30 bg-stress/10 text-stress" },
  mixed: { cls: "border-line bg-ink-700 text-fg-muted" },
};

function ReactionPill({ direction, changeText }: { direction: StockReactionDirection; changeText: string }) {
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "◆";
  return (
    <span
      className={`inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-2xs font-bold ${REACTION_STYLE[direction].cls}`}
    >
      <span aria-hidden>{arrow}</span>
      {changeText}
    </span>
  );
}

function fmtRefreshed(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function BankCard({
  bank,
  overlayMeta,
}: {
  bank: BankEarningsEntry;
  overlayMeta?: { refreshedISO: string; sourceNote: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-ink-800 px-3.5 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={open}
      >
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[14.5px] font-semibold text-fg">{bank.name}</span>
            <span className="text-2xs text-fg-faint">{bank.ticker}</span>
            {overlayMeta ? (
              <span className="rounded-full border border-calm/30 bg-calm/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-calm">
                ↻ refreshed {fmtRefreshed(overlayMeta.refreshedISO)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-2xs text-fg-faint">
            {bank.period} · {bank.reportDate}
          </p>
        </div>
        <ReactionPill direction={bank.stockReaction.direction} changeText={bank.stockReaction.changeText} />
        <span className="mt-0.5 flex-none text-xs text-fg-faint">{open ? "▾" : "▸"}</span>
      </button>

      {bank.periodNote ? (
        <p className="mt-2 rounded-lg border border-elevated/25 bg-elevated/5 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-elevated">
          {bank.periodNote}
        </p>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-3">
          <p className="text-[13px] leading-relaxed text-fg-muted">{bank.headline}</p>

          <div className="rounded-lg border border-steel/25 bg-steel/5 px-2.5 py-2">
            <p className="text-2xs font-semibold uppercase tracking-wide text-steel">Plain English</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{bank.plainEnglish}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {bank.metrics.map((m) => (
              <div key={m.label} className="flex items-baseline justify-between gap-2 border-b border-line/40 pb-1">
                <span className="text-[10.5px] text-fg-faint">{m.label}</span>
                <span className="text-[12.5px] font-semibold text-fg">{m.value}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-steel">Highlights</p>
            <ul className="space-y-1">
              {bank.highlights.map((h, i) => (
                <li key={i} className="flex gap-1.5 text-[12.5px] leading-relaxed text-fg-muted">
                  <span className="flex-none text-steel">•</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-line-soft bg-ink-850 px-2.5 py-2">
            <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Market reaction</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{bank.stockReaction.detail}</p>
          </div>

          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-stress">Risk watch</p>
            <ul className="space-y-1">
              {bank.riskWatch.map((r, i) => (
                <li key={i} className="flex gap-1.5 text-[12.5px] leading-relaxed text-fg-muted">
                  <span className="flex-none text-stress">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {overlayMeta ? (
            <p className="text-[10px] leading-relaxed text-fg-faint">
              Refreshed from {overlayMeta.sourceNote} on {fmtRefreshed(overlayMeta.refreshedISO)}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const REGIONS: Region[] = ["US", "Europe", "Asia"];

export function BankEarnings({ refreshKey }: { refreshKey?: number } = {}) {
  const [banks, setBanks] = useState<BankEarningsEntry[] | null>(null);
  const [asOf, setAsOf] = useState<string>("");
  const [overlayMeta, setOverlayMeta] = useState<Record<string, { refreshedISO: string; sourceNote: string }>>({});
  const [error, setError] = useState(false);
  const [view, setView] = useState<"list" | "compare">("list");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/bank-earnings", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const json = await r.json();
      setBanks(json.banks ?? []);
      setAsOf(json.asOf ?? "");
      setOverlayMeta(json.overlayMeta ?? {});
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (error && !banks) {
    return <p className="text-xs text-fg-faint">Couldn't load Bank Earnings — try refreshing.</p>;
  }
  if (!banks) {
    return <p className="text-xs text-fg-faint">Loading…</p>;
  }

  if (view === "compare") {
    return <BankEarningsCompare onBack={() => setView("list")} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] leading-relaxed text-fg-faint">
          Latest reported quarter for 15 major banks — highlights, plain-English summary, market reaction, and
          risk-management watch items. Curated baseline compiled as of {asOf}; banks with a "refreshed" tag were
          updated by the Refresh Earnings action (Settings → Generation History) from real news, not the static
          baseline. Verify against primary filings before relying on any figure.
        </p>
        <button
          type="button"
          onClick={() => setView("compare")}
          className="flex-none whitespace-nowrap rounded-lg border border-steel/30 bg-steel/10 px-2.5 py-1.5 text-2xs font-semibold text-steel transition active:scale-95"
        >
          📊 Compare Banks
        </button>
      </div>

      {REGIONS.map((region) => {
        const regionBanks = banks.filter((b) => b.region === region);
        if (!regionBanks.length) return null;
        return (
          <div key={region}>
            <p className="mb-2 flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide text-fg-faint">
              <span aria-hidden>{REGION_FLAG[region]}</span>
              {REGION_LABEL[region]}
              <span className="text-fg-faint">· {regionBanks.length}</span>
            </p>
            {REGION_NOTES[region] ? (
              <p className="mb-2 rounded-lg border border-steel/25 bg-steel/5 px-3 py-2 text-[11px] leading-relaxed text-steel">
                {REGION_NOTES[region]}
              </p>
            ) : null}
            <div className="space-y-2">
              {regionBanks.map((b) => (
                <BankCard key={b.id} bank={b} overlayMeta={overlayMeta[b.id]} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
