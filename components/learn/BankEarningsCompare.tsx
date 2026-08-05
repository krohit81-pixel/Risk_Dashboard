"use client";

// components/learn/BankEarningsCompare.tsx
// V5.10.0 — "Compare Banks": a separate, chart-heavy screen reached from 05 Bank Earnings
// (button at the top of the list), built from lib/bankEarningsMetrics.ts. Hand-drawn inline
// SVG, no chart library — same visual pattern as components/learn/MizuhoQ1Earnings.tsx
// (colors reference CSS custom properties via rgb(var(--x)) since Tailwind classes don't
// apply to raw SVG stroke/fill attributes).

import { useMemo, useState } from "react";
import { BANK_FINANCIALS, FX_NOTE, FX_AS_OF, type BankFinancials } from "@/lib/bankEarningsMetrics";
import { REGION_LABEL, REGION_FLAG, type Region } from "@/lib/bankEarnings";

const C = {
  steel: "rgb(var(--steel))",
  calm: "rgb(var(--calm))",
  stress: "rgb(var(--stress))",
  elevated: "rgb(var(--elevated))",
  mizuho: "rgb(var(--mizuho))",
  fg: "rgb(var(--fg))",
  fgMuted: "rgb(var(--fg-muted))",
  fgFaint: "rgb(var(--fg-faint))",
  line: "rgb(var(--line))",
};

const REGION_COLOR: Record<Region, string> = { US: C.steel, Europe: C.calm, Asia: C.mizuho };

/** Short, unambiguous chart labels — first-word splitting produces confusing collisions
 *  ("Bank of America" → "Bank", "Morgan Stanley" → "Morgan" next to "JPMorgan"). */
const SHORT_LABEL: Record<string, string> = {
  jpm: "JPMorgan",
  gs: "Goldman Sachs",
  citi: "Citigroup",
  bac: "BofA",
  ms: "Morgan Stanley",
  barclays: "Barclays",
  stanchart: "StanChart",
  hsbc: "HSBC",
  ubs: "UBS",
  db: "Deutsche Bank",
  mizuho: "Mizuho",
  mufg: "MUFG",
  smfg: "SMFG",
  dbs: "DBS",
  icbc: "ICBC",
};
function shortLabel(b: BankFinancials): string {
  return SHORT_LABEL[b.id] ?? b.name;
}

function fmtUSD(v: number): string {
  return `$${v.toFixed(v >= 10 ? 1 : 2)}B`;
}

/* ───────────────────────── shared chrome ───────────────────────── */

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-2 mt-5 first:mt-0">
      <p className="text-[13.5px] font-bold text-fg">{title}</p>
      {note ? <p className="text-[10.5px] leading-relaxed text-fg-faint">{note}</p> : null}
    </div>
  );
}

function ChartBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-ink-800 px-3.5 py-3">{children}</div>;
}

function RegionLegend() {
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-fg-faint">
      {(["US", "Europe", "Asia"] as Region[]).map((r) => (
        <span key={r} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: REGION_COLOR[r] }} />
          {REGION_FLAG[r]} {REGION_LABEL[r]}
        </span>
      ))}
    </div>
  );
}

function KpiCard({ label, name, value, sub, accent }: { label: string; name: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink-800 px-3 py-2.5">
      <p className="text-[9.5px] font-bold uppercase tracking-wide text-fg-faint">{label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold text-fg">{name}</p>
      <p className="tnum mt-0.5 text-lg font-bold" style={{ color: accent }}>{value}</p>
      <p className="text-[9.5px] text-fg-faint">{sub}</p>
    </div>
  );
}

/* ───────────────────────── charts ───────────────────────── */

interface RankedItem {
  label: string;
  value: number;
  color: string;
  tag?: string;
}

/** Ranked horizontal bars, largest first. Value assumed >= 0. */
function RankedHBar({ items, fmt }: { items: RankedItem[]; fmt: (v: number) => string }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const rowH = 30;
  const W = 480;
  const padL = 118;
  const padR = 8;
  const padT = 4;
  const H = sorted.length * rowH + padT + 4;
  const plotW = W - padL - padR;
  const max = Math.max(...sorted.map((i) => i.value)) * 1.18 || 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {sorted.map((it, i) => {
        const y = padT + i * rowH;
        const w = Math.max((it.value / max) * plotW, 1);
        return (
          <g key={it.label}>
            <text x={padL - 8} y={y + 15} fontSize="10.5" textAnchor="end" fill={C.fg}>
              {it.label}
            </text>
            <rect x={padL} y={y + 2} width={w} height={18} fill={it.color} rx={4} />
            <text x={padL + w + 6} y={y + 15} fontSize="10" fill={C.fgMuted} fontFamily="monospace">
              {fmt(it.value)}
              {it.tag ? ` ${it.tag}` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface DivergingItem {
  label: string;
  value: number; // signed
  approx?: boolean;
}

/** Diverging horizontal bars around a zero centerline — green positive, red negative. */
function DivergingHBar({ items }: { items: DivergingItem[] }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const rowH = 28;
  const W = 480;
  const padL = 96;
  const padR = 96;
  const padT = 4;
  const H = sorted.length * rowH + padT + 4;
  const plotW = W - padL - padR;
  const zeroX = padL + plotW / 2;
  const maxAbs = Math.max(...sorted.map((i) => Math.abs(i.value))) * 1.25 || 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={zeroX} y1={0} x2={zeroX} y2={H} stroke={C.line} strokeWidth={1} />
      {sorted.map((it, i) => {
        const y = padT + i * rowH;
        const halfW = (Math.abs(it.value) / maxAbs) * (plotW / 2);
        const color = it.value >= 0 ? C.calm : C.stress;
        const barX = it.value >= 0 ? zeroX : zeroX - halfW;
        const labelSide = it.value >= 0 ? "start" : "end";
        const labelX = it.value >= 0 ? zeroX + halfW + 6 : zeroX - halfW - 6;
        return (
          <g key={it.label}>
            <text x={padL - 8} y={y + 14} fontSize="10.5" textAnchor="end" fill={C.fg}>
              {it.label}
            </text>
            <rect x={barX} y={y + 2} width={Math.max(halfW, 1)} height={16} fill={color} rx={3} />
            <text x={labelX} y={y + 14} fontSize="10" textAnchor={labelSide} fill={C.fgMuted} fontFamily="monospace">
              {it.approx ? "~" : ""}
              {it.value > 0 ? "+" : ""}
              {it.value.toFixed(1)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ───────────────────────── main export ───────────────────────── */

export function BankEarningsCompare({ onBack }: { onBack: () => void }) {
  const [profitView, setProfitView] = useState<"runrate" | "reported">("runrate");
  const banks = BANK_FINANCIALS;

  const regionTotals = useMemo(() => {
    const totals: Record<Region, number> = { US: 0, Europe: 0, Asia: 0 };
    for (const b of banks) totals[b.region] += b.quarterlyRunRateUSD;
    return (["US", "Europe", "Asia"] as Region[]).map((r) => ({
      label: `${REGION_FLAG[r]} ${REGION_LABEL[r]}`,
      value: totals[r],
      color: REGION_COLOR[r],
    }));
  }, [banks]);

  const profitItems: RankedItem[] = useMemo(
    () =>
      banks.map((b) => ({
        label: shortLabel(b),
        value: profitView === "runrate" ? b.quarterlyRunRateUSD : b.profitUSD,
        color: REGION_COLOR[b.region],
        tag:
          profitView === "reported"
            ? `(${b.periodLabel}${b.profitBasis === "pretax" ? ", pretax" : ""})`
            : b.profitBasis === "pretax"
              ? "(pretax)"
              : undefined,
      })),
    [banks, profitView]
  );

  const yoyItems: DivergingItem[] = useMemo(
    () =>
      banks
        .filter((b): b is BankFinancials & { yoyGrowthPct: number } => b.yoyGrowthPct !== undefined)
        .map((b) => ({ label: shortLabel(b), value: b.yoyGrowthPct })),
    [banks]
  );
  const yoyExcluded = banks.filter((b) => b.yoyGrowthPct === undefined).map((b) => shortLabel(b));

  const cet1Items: RankedItem[] = useMemo(
    () =>
      banks
        .filter((b): b is BankFinancials & { cet1Pct: number } => b.cet1Pct !== undefined)
        .map((b) => ({ label: shortLabel(b), value: b.cet1Pct, color: REGION_COLOR[b.region] })),
    [banks]
  );
  const cet1Excluded = banks.filter((b) => b.cet1Pct === undefined).map((b) => shortLabel(b));

  const stockItems: DivergingItem[] = useMemo(
    () =>
      banks
        .filter((b): b is BankFinancials & { stockReactionPct: number } => b.stockReactionPct !== undefined)
        .map((b) => ({ label: shortLabel(b), value: b.stockReactionPct, approx: b.stockReactionApprox })),
    [banks]
  );
  const stockExcluded = banks.filter((b) => b.stockReactionPct === undefined).map((b) => shortLabel(b));

  // ── KPI leaderboard (computed, not hardcoded) ──
  const topProfit = [...banks].sort((a, b) => b.quarterlyRunRateUSD - a.quarterlyRunRateUSD)[0];
  const topGrowth = [...banks].filter((b) => b.yoyGrowthPct !== undefined).sort((a, b) => (b.yoyGrowthPct! - a.yoyGrowthPct!))[0];
  const topCapital = [...banks].filter((b) => b.cet1Pct !== undefined).sort((a, b) => (b.cet1Pct! - a.cet1Pct!))[0];
  const topStock = [...banks].filter((b) => b.stockReactionPct !== undefined).sort((a, b) => (b.stockReactionPct! - a.stockReactionPct!))[0];

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-2xs font-semibold text-fg-muted transition active:scale-95"
      >
        ← Back to bank list
      </button>

      <p className="text-[11px] leading-relaxed text-fg-faint">
        All 15 banks, side by side, converted to USD. {FX_NOTE} Figures reflect each bank's most
        recently reported period — quarterly for most, half-year for Barclays/Standard Chartered,
        and FY2025 (full year) for MUFG/SMFG since their Q1 FY2026 results aren't out yet. This
        comparison dataset is a hand-maintained companion to 05 Bank Earnings and isn't yet part
        of the automated Refresh Earnings pipeline — a refreshed bank's text card may run ahead
        of its bars here until this file is updated too.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <KpiCard label="Most profitable · qtr run-rate" name={topProfit.name} value={fmtUSD(topProfit.quarterlyRunRateUSD)} sub={topProfit.periodLabel} accent={C.steel} />
        {topGrowth ? (
          <KpiCard label="Fastest profit growth · YoY" name={topGrowth.name} value={`+${topGrowth.yoyGrowthPct!.toFixed(1)}%`} sub={topGrowth.periodLabel} accent={C.calm} />
        ) : null}
        {topCapital ? (
          <KpiCard label="Strongest capital · CET1" name={topCapital.name} value={`${topCapital.cet1Pct!.toFixed(1)}%`} sub="standardized/primary basis" accent={C.elevated} />
        ) : null}
        {topStock ? (
          <KpiCard
            label="Biggest earnings-day pop"
            name={topStock.name}
            value={`${topStock.stockReactionApprox ? "~" : ""}+${topStock.stockReactionPct!.toFixed(1)}%`}
            sub="same-day stock reaction"
            accent={C.mizuho}
          />
        ) : null}
      </div>

      <SectionHeader title="By Region · Quarterly Run-Rate Profit (USD)" note="Sum of each region's 5 banks, run-rate normalized" />
      <ChartBox>
        <RankedHBar items={regionTotals} fmt={fmtUSD} />
      </ChartBox>

      <SectionHeader title="Net Profit — USD Equivalent" note="Toggle between an even quarterly run-rate (comparable) and each bank's raw reported period" />
      <div className="mb-2 inline-flex rounded-lg border border-line bg-ink-850 p-0.5 text-2xs font-semibold">
        <button
          type="button"
          onClick={() => setProfitView("runrate")}
          className={`rounded-md px-2.5 py-1 transition ${profitView === "runrate" ? "bg-steel/20 text-steel" : "text-fg-faint"}`}
        >
          Quarterly run-rate
        </button>
        <button
          type="button"
          onClick={() => setProfitView("reported")}
          className={`rounded-md px-2.5 py-1 transition ${profitView === "reported" ? "bg-steel/20 text-steel" : "text-fg-faint"}`}
        >
          As reported
        </button>
      </div>
      <ChartBox>
        <RankedHBar items={profitItems} fmt={fmtUSD} />
        <RegionLegend />
        {profitView === "runrate" ? (
          <p className="mt-2 text-[10px] leading-relaxed text-fg-faint">
            Half-year (Barclays, Standard Chartered) and full-year (MUFG, SMFG) figures are divided evenly by
            period length to estimate a quarterly run-rate — an approximation, not an official quarterly number.
            "(pretax)" banks report profit before tax; everyone else is net/after-tax.
          </p>
        ) : (
          <p className="mt-2 text-[10px] leading-relaxed text-fg-faint">
            Raw as-reported figures — period length varies by bank (see tag). "(pretax)" banks report profit
            before tax; everyone else is net/after-tax.
          </p>
        )}
      </ChartBox>

      <SectionHeader title="Profit Growth — Year over Year" note="Only banks that explicitly reported profit/net-income YoY growth (not revenue growth or a vs-estimate beat)" />
      <ChartBox>
        <DivergingHBar items={yoyItems} />
        {yoyExcluded.length ? (
          <p className="mt-2 text-[10px] leading-relaxed text-fg-faint">
            Not shown (no clean profit-YoY figure reported): {yoyExcluded.join(", ")}.
          </p>
        ) : null}
      </ChartBox>

      <SectionHeader title="Capital Strength — CET1 Ratio" note="Standardized/primary basis where a bank discloses more than one" />
      <ChartBox>
        <RankedHBar items={cet1Items} fmt={(v) => `${v.toFixed(1)}%`} />
        <RegionLegend />
        {cet1Excluded.length ? (
          <p className="mt-2 text-[10px] leading-relaxed text-fg-faint">
            Not shown (not confirmed for this period): {cet1Excluded.join(", ")}.
          </p>
        ) : null}
      </ChartBox>

      <SectionHeader title="Earnings-Day Stock Reaction" note="Same-day % move where a single figure was confirmed; ~ marks a reported-range midpoint" />
      <ChartBox>
        <DivergingHBar items={stockItems} />
        {stockExcluded.length ? (
          <p className="mt-2 text-[10px] leading-relaxed text-fg-faint">
            Not shown (unconfirmed / non-numeric reaction reported): {stockExcluded.join(", ")}.
          </p>
        ) : null}
      </ChartBox>

      <p className="mt-1 text-[10px] leading-relaxed text-fg-faint">
        FX and figures compiled as of {FX_AS_OF}. See lib/bankEarningsMetrics.ts for the full per-bank basis notes.
      </p>
    </div>
  );
}
