"use client";

// components/learn/MizuhoReference.tsx
// V5.1 — Learn tab reference view of the Mizuho Knowledge Repository (disclosed positions),
// shown as compact structured cards. Reads the embedded copy (client-safe); the same content
// is what gets seeded to KV and used by the "Through Mizuho's lens" interpretation.

import { MIZUHO_KNOWLEDGE } from "@/lib/mizuhoKnowledgeData";

const K = MIZUHO_KNOWLEDGE;

function Card({
  title,
  source,
  accent,
  children,
}: {
  title: string;
  source?: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-ink-800 px-3.5 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-2xs font-semibold uppercase tracking-wide text-fg">{title}</span>
        {source ? <span className="ml-auto text-[10px] text-fg-faint">{source}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Metrics({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-2 border-b border-line/40 pb-1">
          <span className="text-[11px] text-fg-faint">{k}</span>
          <span className="text-[13px] font-semibold text-fg">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Bullets({ items, color }: { items: readonly string[]; color?: string }) {
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-1.5 text-[12.5px] leading-relaxed text-fg-muted">
          <span className="flex-none" style={{ color: color ?? "#5B8DEF" }}>
            •
          </span>
          {it}
        </li>
      ))}
    </ul>
  );
}

function Pills({ items, color }: { items: readonly string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span
          key={i}
          className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{ borderColor: `${color}55`, backgroundColor: `${color}14`, color }}
        >
          {it}
        </span>
      ))}
    </div>
  );
}

export function MizuhoReference() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-fg-faint">
        Mizuho&rsquo;s own disclosed positions (repository v{K.version} · {K.last_updated}). This is the reference the
        &ldquo;Through Mizuho&rsquo;s lens&rdquo; interpretation draws on — point-in-time disclosure, not live data.
      </p>

      <Card title="Capital & Liquidity" source={K.capital.source} accent="#5B8DEF">
        <Metrics
          rows={[
            ["CET1", K.capital.key_metrics.cet1],
            ["Tier 1", K.capital.key_metrics.tier1],
            ["Total capital", K.capital.key_metrics.total_capital],
            ["Leverage", K.capital.key_metrics.leverage],
            ["LCR", K.capital.key_metrics.lcr],
            ["NSFR", K.capital.key_metrics.nsfr],
          ]}
        />
        <div className="mt-2.5">
          <Bullets items={K.capital.interpretation} color="#5B8DEF" />
        </div>
      </Card>

      <Card title="Financial Profile" source={K.financials.source} accent="#2DD4A7">
        <Metrics
          rows={[
            ["Ordinary income", K.financials.metrics.ordinary_income],
            ["Ordinary profit", K.financials.metrics.ordinary_profit],
            ["Net profit", K.financials.metrics.net_profit],
            ["Guidance", K.financials.metrics.guidance],
            ["Total assets", K.financials.metrics.assets],
          ]}
        />
        <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Earnings drivers</p>
        <Pills items={K.financials.drivers} color="#2DD4A7" />
        <p className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Risk focus</p>
        <Pills items={K.financials.risk_focus} color="#F2545B" />
      </Card>

      <Card title="Strategy & Targets" source={K.strategy.source} accent="#F5A524">
        <p className="text-[12.5px] italic leading-relaxed text-fg-muted">&ldquo;{K.strategy.vision}&rdquo;</p>
        <div className="mt-2.5">
          <Metrics
            rows={[
              ["ROE target", K.strategy.targets.roe],
              ["Payout", K.strategy.targets.payout],
              ["Buyback", K.strategy.targets.buyback],
              ["Valuation", K.strategy.targets.pb_target],
            ]}
          />
        </div>
        <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Focus businesses</p>
        <Pills items={K.strategy.focus_businesses} color="#F5A524" />
        <p className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Macro view</p>
        <Bullets items={K.strategy.macro_view} color="#F5A524" />
      </Card>

      <Card title="Risk Philosophy" accent="#F2545B">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Discipline</p>
        <Bullets items={K.risk_philosophy.discipline} color="#F2545B" />
        <p className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Decision framework</p>
        <Pills items={K.risk_philosophy.decision_framework} color="#F2545B" />
      </Card>

      <Card title="Executive Questions" accent="#B79BFF">
        <Bullets items={K.executive_questions} color="#B79BFF" />
      </Card>
    </div>
  );
}
