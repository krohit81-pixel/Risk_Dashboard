"use client";

// components/learn/MizuhoQ1Earnings.tsx
// V5.9.0 — "Mizuho Q1 Earnings" (Settings → 07): full-detail, USD-converted companion to the
// 05 Bank Earnings Mizuho card, built directly from the primary Q1 FY2026 results deck. Static
// (one-off, not fetched) — see lib/mizuhoQ1Earnings.ts for the data + FX-conversion notes.
//
// Charts are hand-drawn inline SVG (no chart library) — colors reference the CSS custom
// properties directly via style={{ stroke: "rgb(var(--steel))" }} since Tailwind utility
// classes don't apply to raw stroke/fill attributes (same pattern as RiskGauge.tsx).

import {
  AS_OF,
  FX_SPOT_NOTE,
  FX_PLANNED_NOTE,
  SOURCE_NOTE,
  HEADLINE,
  HEADLINE_PLAIN,
  TRAJECTORY_YEARS,
  NBP_TRAJECTORY_USD,
  EXPENSE_RATIO_TRAJECTORY,
  PROFIT_TRAJECTORY_USD,
  ROE_TRAJECTORY,
  TRAJECTORY_PLAIN,
  SEGMENTS,
  CUSTOMER_GROUPS_TOTAL,
  MARKETS_SEGMENTS,
  MARKETS_TOTAL,
  SEGMENT_CHART,
  SEGMENT_PLAIN,
  AMERICAS_METRICS,
  REGION_LOAN_YEARS,
  REGION_LOANS_USD,
  MARGIN_SERIES,
  AMERICAS_NII_TABLE,
  AMERICAS_PLAIN,
  BALANCE_SHEET,
  BALANCE_SHEET_PLAIN,
  CREDIT_COST_YEARS,
  CREDIT_COST_USD,
  NPL_DATES,
  NPL_RATIO,
  ASSET_QUALITY_PLAIN,
  OUTLOOK,
  OUTLOOK_ASSUMPTIONS,
  OUTLOOK_PLAIN,
  type Direction,
  type SegmentRow,
} from "@/lib/mizuhoQ1Earnings";

/* ───────────────────────── shared bits ───────────────────────── */

function SubHeader({ label, accent = "steel" }: { label: string; accent?: "steel" | "stress" }) {
  const colorCls = accent === "stress" ? "text-stress" : "text-steel";
  return (
    <p className={`mb-2 mt-5 text-2xs font-bold uppercase tracking-wide first:mt-0 ${colorCls}`}>{label}</p>
  );
}

function PlainEnglish({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-steel/25 bg-steel/5 px-2.5 py-2">
      <p className="text-2xs font-semibold uppercase tracking-wide text-steel">Plain English</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{text}</p>
    </div>
  );
}

function DirPill({ text, dir }: { text: string; dir: Direction }) {
  const cls = dir === "pos" ? "border-calm/30 bg-calm/10 text-calm" : "border-stress/30 bg-stress/10 text-stress";
  const arrow = dir === "pos" ? "▲" : "▼";
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-2xs font-bold ${cls}`}>
      <span aria-hidden>{arrow}</span>
      {text}
    </span>
  );
}

function StatCard({ label, value, deltaText, direction, note }: { label: string; value: string; deltaText: string; direction: Direction; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink-800 px-3.5 py-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-fg-faint">{label}</p>
      <p className="tnum mt-1 text-xl font-bold text-fg">{value}</p>
      <div className="mt-1.5"><DirPill text={deltaText} dir={direction} /></div>
      {note ? <p className="mt-1.5 text-[10.5px] leading-relaxed text-fg-faint">{note}</p> : null}
    </div>
  );
}

function ChartBox({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-ink-800 px-3.5 py-3">
      <p className="text-[13.5px] font-semibold text-fg">{title}</p>
      <p className="mb-2 text-[10.5px] text-fg-faint">{note}</p>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-fg-faint">
      {items.map((it) => (
        <span key={it.name} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: it.color }} />
          {it.name}
        </span>
      ))}
    </div>
  );
}

/* ───────────────────────── SVG chart primitives ─────────────────────────
   Pure functions of props → JSX. Colors reference CSS vars via inline style
   since stroke/fill attributes ignore Tailwind classes. */

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

function BarLineChart({ labels, bar, line, lineSuffix = "%" }: { labels: string[]; bar: number[]; line: number[]; lineSuffix?: string }) {
  const W = 480, H = 210, padL = 30, padR = 30, padT = 20, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = labels.length;
  const barMax = Math.max(...bar) * 1.18;
  const barMin = Math.min(0, Math.min(...bar));
  const lineMax = Math.max(...line) * 1.1;
  const lineMin = Math.min(...line) * 0.85;
  const bw = (plotW / n) * 0.42;

  const barEls: React.ReactNode[] = [];
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const cx = padL + (plotW / n) * (i + 0.5);
    const v = bar[i];
    const bh = ((v - barMin) / (barMax - barMin)) * plotH;
    const y = padT + plotH - bh;
    const color = i === n - 1 ? C.steel : C.fgFaint;
    barEls.push(
      <rect key={`b${i}`} x={cx - bw / 2} y={y} width={bw} height={bh} fill={color} opacity={i === n - 1 ? 1 : 0.35} rx={3} />,
    );
    barEls.push(
      <text key={`bt${i}`} x={cx} y={y - 5} fontSize="9.5" textAnchor="middle" fill={C.fgMuted} fontFamily="monospace">{v}</text>,
    );
    barEls.push(
      <text key={`lb${i}`} x={cx} y={H - 6} fontSize="9.5" textAnchor="middle" fill={C.fgFaint}>{labels[i]}</text>,
    );
    const lv = line[i];
    const ly = padT + plotH - ((lv - lineMin) / (lineMax - lineMin)) * plotH;
    pts.push([cx, ly, lv]);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {barEls}
      <polyline points={pts.map((p) => `${p[0]},${p[1]}`).join(" ")} fill="none" stroke={C.stress} strokeWidth={2} />
      {pts.map((p, i) => (
        <g key={`p${i}`}>
          <circle cx={p[0]} cy={p[1]} r={3} fill={C.stress} />
          <text x={p[0]} y={p[1] - 8} fontSize="9.5" textAnchor="middle" fill={C.stress} fontFamily="monospace">{p[2]}{lineSuffix}</text>
        </g>
      ))}
    </svg>
  );
}

function HBarChart({ items }: { items: { name: string; valueUsd: number }[] }) {
  const rowH = 32, W = 480, padL = 96, padR = 52, padT = 6;
  const H = items.length * rowH + padT + 6;
  const plotW = W - padL - padR;
  const max = Math.max(...items.map((i) => i.valueUsd)) * 1.15;
  const colors = [C.steel, "rgb(37 81 204)", "rgb(110 143 240)", C.fgFaint, C.calm];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {items.map((it, i) => {
        const y = padT + i * rowH;
        const w = (it.valueUsd / max) * plotW;
        return (
          <g key={it.name}>
            <text x={padL - 8} y={y + 16} fontSize="10.5" textAnchor="end" fill={C.fg}>{it.name}</text>
            <rect x={padL} y={y} width={w} height={20} fill={colors[i % colors.length]} rx={4} />
            <text x={padL + w + 6} y={y + 15} fontSize="10.5" fill={C.fg} fontFamily="monospace">${it.valueUsd.toFixed(2)}B</text>
          </g>
        );
      })}
    </svg>
  );
}

function StackedBarChart({ labels, series }: { labels: string[]; series: { name: string; color: string; values: number[] }[] }) {
  const W = 480, H = 200, padL = 26, padR = 10, padT = 14, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = labels.length;
  const totals = labels.map((_, i) => series.reduce((s, ser) => s + ser.values[i], 0));
  const max = Math.max(...totals) * 1.12;
  const bw = (plotW / n) * 0.5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {labels.map((lbl, i) => {
        const cx = padL + (plotW / n) * (i + 0.5);
        let yCursor = padT + plotH;
        const segs: React.ReactNode[] = [];
        series.forEach((ser) => {
          const v = ser.values[i];
          const h = (v / max) * plotH;
          yCursor -= h;
          segs.push(<rect key={ser.name} x={cx - bw / 2} y={yCursor} width={bw} height={h} fill={ser.color} />);
        });
        return (
          <g key={lbl}>
            {segs}
            <text x={cx} y={padT + plotH - (totals[i] / max) * plotH - 5} fontSize="9.5" textAnchor="middle" fill={C.fgMuted} fontFamily="monospace">{totals[i].toFixed(1)}</text>
            <text x={cx} y={H - 6} fontSize="9.5" textAnchor="middle" fill={C.fgFaint}>{lbl}</text>
          </g>
        );
      })}
    </svg>
  );
}

function MultiLineChart({ labels, series }: { labels: string[]; series: { name: string; color: string; values: number[]; bold?: boolean }[] }) {
  const W = 480, H = 200, padL = 30, padR = 10, padT = 14, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = labels.length;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all) * 1.15;
  const min = Math.min(...all) * 0.85;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {labels.map((lbl, i) => {
        const cx = padL + (plotW / n) * (i + 0.5);
        return <text key={lbl} x={cx} y={H - 6} fontSize="9.5" textAnchor="middle" fill={C.fgFaint}>{lbl}</text>;
      })}
      {series.map((ser) => {
        const pts = ser.values.map((v, i) => {
          const cx = padL + (plotW / n) * (i + 0.5);
          const cy = padT + plotH - ((v - min) / (max - min)) * plotH;
          return [cx, cy] as const;
        });
        return (
          <g key={ser.name}>
            <polyline points={pts.map((p) => `${p[0]},${p[1]}`).join(" ")} fill="none" stroke={ser.color} strokeWidth={ser.bold ? 2.5 : 1.75} />
            {pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={2.75} fill={ser.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function SingleBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const W = 480, H = 190, padL = 24, padR = 10, padT = 14, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = labels.length;
  const maxAbs = Math.max(...values.map(Math.abs)) * 1.3;
  const zeroY = padT + plotH / 2;
  const bw = (plotW / n) * 0.4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke={C.line} strokeWidth={1} />
      {labels.map((lbl, i) => {
        const cx = padL + (plotW / n) * (i + 0.5);
        const v = values[i];
        const h = (Math.abs(v) / maxAbs) * (plotH / 2);
        const y = v >= 0 ? zeroY - h : zeroY;
        const color = v < 0 ? C.stress : C.calm;
        const ty = v >= 0 ? y - 6 : y + h + 13;
        return (
          <g key={lbl}>
            <rect x={cx - bw / 2} y={y} width={bw} height={h} fill={color} rx={3} />
            <text x={cx} y={ty} fontSize="9.5" textAnchor="middle" fill={C.fg} fontFamily="monospace">{v.toFixed(2)}</text>
            <text x={cx} y={H - 6} fontSize="9.5" textAnchor="middle" fill={C.fgFaint}>{lbl}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ───────────────────────── segment table ───────────────────────── */

function SegTable({ rows, total }: { rows: SegmentRow[]; total?: SegmentRow }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-[11px]">
        <thead>
          <tr className="border-b border-line text-fg-faint">
            <th className="pb-1.5 text-left font-semibold">Segment</th>
            <th className="pb-1.5 text-right font-semibold">Gross</th>
            <th className="pb-1.5 text-right font-semibold">NBP</th>
            <th className="pb-1.5 text-right font-semibold">YoY</th>
            <th className="pb-1.5 text-right font-semibold">Profit</th>
            <th className="pb-1.5 text-right font-semibold">YoY</th>
          </tr>
        </thead>
        <tbody className="tnum">
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-line/40">
              <td className="py-1.5 pr-2 text-fg">{r.name}</td>
              <td className="py-1.5 text-right text-fg-muted">${r.grossUsd}B</td>
              <td className="py-1.5 text-right text-fg-muted">${r.nbpUsd}B</td>
              <td className={`py-1.5 text-right font-semibold ${r.nbpDir === "pos" ? "text-calm" : "text-stress"}`}>{r.nbpYoY}</td>
              <td className="py-1.5 text-right text-fg-muted">{r.profitUsd === "—" ? "—" : `$${r.profitUsd}B`}</td>
              <td className={`py-1.5 text-right font-semibold ${r.profitDir === "pos" ? "text-calm" : "text-stress"}`}>{r.profitYoY}</td>
            </tr>
          ))}
          {total ? (
            <tr className="border-t-2 border-fg-faint/40 font-bold">
              <td className="py-1.5 pr-2 text-fg">{total.name}</td>
              <td className="py-1.5 text-right text-fg">${total.grossUsd}B</td>
              <td className="py-1.5 text-right text-fg">${total.nbpUsd}B</td>
              <td className={`py-1.5 text-right ${total.nbpDir === "pos" ? "text-calm" : "text-stress"}`}>{total.nbpYoY}</td>
              <td className="py-1.5 text-right text-fg">{total.profitUsd === "—" ? "—" : `$${total.profitUsd}B`}</td>
              <td className={`py-1.5 text-right ${total.profitDir === "pos" ? "text-calm" : "text-stress"}`}>{total.profitYoY}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────────────────── main export ───────────────────────── */

export function MizuhoQ1Earnings() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-fg-faint">
        Full-detail companion to the Mizuho card in 05 Bank Earnings, built directly from the primary results
        deck rather than compiled from news — resolves that card's unconfirmed credit-cost and NPL figures. All
        figures in USD. Reported {AS_OF}.
      </p>

      <PlainEnglish text={HEADLINE_PLAIN} />

      <SubHeader label="What Changed · vs. FY25 Q1" />
      <div className="grid grid-cols-2 gap-2">
        {HEADLINE.map((h) => (
          <StatCard key={h.label} label={h.label} value={h.valueUsd} deltaText={h.deltaText} direction={h.direction} note={h.note} />
        ))}
      </div>

      <SubHeader label="Trajectory · FY20–FY26 Q1" />
      <div className="space-y-2">
        <ChartBox title="Net Business Profit & Expense Ratio" note="USD, converted at current spot for comparability · FY26 Q1 is one quarter, not annualized">
          <BarLineChart labels={TRAJECTORY_YEARS} bar={NBP_TRAJECTORY_USD} line={EXPENSE_RATIO_TRAJECTORY} />
          <Legend items={[{ name: "Net Business Profit ($B)", color: C.fgFaint }, { name: "Expense Ratio (%)", color: C.stress }]} />
        </ChartBox>
        <ChartBox title="Profit Attributable & ROE" note="USD, converted at current spot for comparability">
          <BarLineChart labels={TRAJECTORY_YEARS} bar={PROFIT_TRAJECTORY_USD} line={ROE_TRAJECTORY} />
          <Legend items={[{ name: "Profit Attributable ($B)", color: C.fgFaint }, { name: "ROE, LTM (%)", color: C.stress }]} />
        </ChartBox>
      </div>
      <PlainEnglish text={TRAJECTORY_PLAIN} />

      <SubHeader label="Segment Engine · FY26 Q1" />
      <ChartBox title="Profit Attributable by Business Line" note="USD, FY26 Q1">
        <HBarChart items={SEGMENT_CHART} />
      </ChartBox>
      <div className="mt-2 rounded-xl border border-line bg-ink-800 px-3.5 py-3">
        <SegTable rows={SEGMENTS} total={CUSTOMER_GROUPS_TOTAL} />
        <div className="mt-2">
          <SegTable rows={MARKETS_SEGMENTS} total={MARKETS_TOTAL} />
        </div>
      </div>
      <PlainEnglish text={SEGMENT_PLAIN} />

      <SubHeader label="Mizuho Americas" />
      <div className="grid grid-cols-2 gap-2">
        {AMERICAS_METRICS.map((m) => (
          <StatCard key={m.label} label={m.label} value={m.value} deltaText={m.delta} direction={m.dir} note={m.note} />
        ))}
      </div>
      <div className="mt-2 space-y-2">
        <ChartBox title="Loans Outside Japan by Region" note="Average balance, USD B — FY24, FY25 vs. FY26 Q1">
          <StackedBarChart
            labels={REGION_LOAN_YEARS}
            series={[
              { name: "Americas", color: C.steel, values: REGION_LOANS_USD.Americas },
              { name: "EMEA", color: C.fgFaint, values: REGION_LOANS_USD.EMEA },
              { name: "APAC", color: "rgb(110 143 240)", values: REGION_LOANS_USD.APAC },
            ]}
          />
          <Legend items={[{ name: "Americas", color: C.steel }, { name: "EMEA", color: C.fgFaint }, { name: "APAC", color: "rgb(110 143 240)" }]} />
        </ChartBox>
        <ChartBox title="International Loan & Deposit Rate Margin" note="BK, all international operations (not split by region in the disclosure)">
          <MultiLineChart
            labels={MARGIN_SERIES.years}
            series={[
              { name: "Returns on Loans (%)", color: C.elevated, values: MARGIN_SERIES.returnsOnLoans },
              { name: "Cost of Deposits (%)", color: C.fgFaint, values: MARGIN_SERIES.costOfDeposits },
              { name: "Net Margin (%)", color: C.calm, values: MARGIN_SERIES.netMargin, bold: true },
            ]}
          />
          <Legend items={[{ name: "Returns on Loans", color: C.elevated }, { name: "Cost of Deposits", color: C.fgFaint }, { name: "Net Margin", color: C.calm }]} />
        </ChartBox>
      </div>
      <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-ink-800 px-3.5 py-3">
        <p className="mb-2 text-[13.5px] font-semibold text-fg">Americas GCIBC Non-Interest Income</p>
        <table className="w-full min-w-[360px] text-[11px]">
          <thead>
            <tr className="border-b border-line text-fg-faint">
              <th className="pb-1.5 text-left font-semibold"></th>
              <th className="pb-1.5 text-right font-semibold">FY25 Q1</th>
              <th className="pb-1.5 text-right font-semibold">FY26 Q1</th>
              <th className="pb-1.5 text-right font-semibold">YoY</th>
            </tr>
          </thead>
          <tbody className="tnum">
            {AMERICAS_NII_TABLE.map((r) => (
              <tr key={r.label} className="border-b border-line/40">
                <td className="py-1.5 pr-2 text-fg">{r.label}</td>
                <td className="py-1.5 text-right text-fg-muted">{r.fy25q1}</td>
                <td className="py-1.5 text-right text-fg-muted">{r.fy26q1}</td>
                <td className={`py-1.5 text-right font-semibold ${r.dir === "pos" ? "text-calm" : "text-stress"}`}>{r.yoy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PlainEnglish text={AMERICAS_PLAIN} />

      <SubHeader label="Balance Sheet · Jun 2026" />
      <div className="grid grid-cols-2 gap-2">
        {BALANCE_SHEET.map((b) => (
          <StatCard key={b.label} label={b.label} value={b.value} deltaText={b.delta} direction={b.dir} />
        ))}
      </div>
      <PlainEnglish text={BALANCE_SHEET_PLAIN} />

      <SubHeader label="Asset Quality" accent="stress" />
      <div className="space-y-2">
        <ChartBox title="Credit-Related Costs" note="USD B — negative bars are costs, positive is a net reversal">
          <SingleBarChart labels={CREDIT_COST_YEARS} values={CREDIT_COST_USD} />
        </ChartBox>
        <ChartBox title="Non-Performing Loan Ratio" note="Banking Act & Financial Reconstruction Act classification">
          <MultiLineChart labels={NPL_DATES} series={[{ name: "NPL Ratio (%)", color: C.steel, values: NPL_RATIO, bold: true }]} />
        </ChartBox>
      </div>
      <PlainEnglish text={ASSET_QUALITY_PLAIN} />

      <SubHeader label="Looking Ahead · FY26 Guidance" />
      <div className="grid grid-cols-2 gap-2">
        {OUTLOOK.map((o) => (
          <StatCard key={o.label} label={o.label} value={o.value} deltaText={o.delta} direction={o.dir} />
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">{OUTLOOK_ASSUMPTIONS}</p>
      <PlainEnglish text={OUTLOOK_PLAIN} />

      <p className="mt-4 text-[10px] leading-relaxed text-fg-faint">
        <span className="font-semibold text-fg-muted">FX basis:</span> quarterly P&amp;L and Jun-2026 balance-sheet
        figures convert JPY at {FX_SPOT_NOTE}; historical FY20–FY25 figures use this same current rate so trends
        reflect volume, not currency moves. FY26 outlook uses {FX_PLANNED_NOTE}. Figures already reported natively
        in USD are shown as-is.
        <br />
        <span className="font-semibold text-fg-muted">Source:</span> {SOURCE_NOTE} Derived summary for internal
        discussion prep only — not a substitute for the primary disclosure or Form 6-K.
      </p>
    </div>
  );
}
