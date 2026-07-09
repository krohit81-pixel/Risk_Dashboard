"use client";

// components/learn/MizuhoReference.tsx
// V5.1 — Learn tab reference view of the Mizuho Knowledge Repository (disclosed positions),
// shown as compact structured cards. Reads the embedded copy (client-safe); the same content
// is what gets seeded to KV and used by the "Through Mizuho's lens" interpretation.
//
// V5.2.1 — repository is now multi-card (core disclosures, risk governance, risk management/
// RAF, business model). Pulls each card by id rather than assuming one flat object shape.

import { MIZUHO_KNOWLEDGE, MIZUHO_CARDS } from "@/lib/mizuhoKnowledgeData";

const K = MIZUHO_KNOWLEDGE;
const cardById = (id: string) => MIZUHO_CARDS.find((c) => c.id === id);
const core = cardById("core_disclosures")!.content as any;
const governance = cardById("risk_governance")?.content as any;
const riskMgmt = cardById("risk_management")?.content as any;
const bizModel = cardById("business_model")?.content as any;

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

/** Grouped bullet list, e.g. { "First Line": ["Own risk", ...], ... } */
function Groups({ groups, color }: { groups: Record<string, string[]>; color: string }) {
  return (
    <div className="space-y-2">
      {Object.entries(groups).map(([label, items]) => (
        <div key={label}>
          <p className="mb-1 text-[11px] font-semibold text-fg">{label}</p>
          <Bullets items={items} color={color} />
        </div>
      ))}
    </div>
  );
}

/** A left-to-right numbered flow, e.g. governance/RAF cycles. */
function Flow({ steps, color }: { steps: readonly string[]; color: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px]">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="rounded-md px-1.5 py-0.5 font-medium" style={{ backgroundColor: `${color}14`, color }}>
            {s}
          </span>
          {i < steps.length - 1 ? <span className="text-fg-faint">→</span> : null}
        </span>
      ))}
    </div>
  );
}

export function MizuhoReference() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-fg-faint">
        Mizuho&rsquo;s own disclosed positions (repository v{K.version} · {K.last_updated}), across {MIZUHO_CARDS.length} knowledge
        cards. This is the reference the &ldquo;Through Mizuho&rsquo;s lens&rdquo; interpretation draws on — point-in-time
        disclosure, not live data.
      </p>

      <Card title="Capital & Liquidity" source="Basel Pillar 3" accent="#5B8DEF">
        <Metrics
          rows={[
            ["CET1", core.capital.key_metrics.cet1],
            ["Tier 1", core.capital.key_metrics.tier1],
            ["Total capital", core.capital.key_metrics.total_capital],
            ["Leverage", core.capital.key_metrics.leverage],
            ["LCR", core.capital.key_metrics.lcr],
            ["NSFR", core.capital.key_metrics.nsfr],
          ]}
        />
        <div className="mt-2.5">
          <Bullets items={core.capital.interpretation} color="#5B8DEF" />
        </div>
      </Card>

      <Card title="Financial Profile" source="FY25 Financial Statements" accent="#2DD4A7">
        <Metrics
          rows={[
            ["Ordinary income", core.financials.metrics.ordinary_income],
            ["Ordinary profit", core.financials.metrics.ordinary_profit],
            ["Net profit", core.financials.metrics.net_profit],
            ["Guidance", core.financials.metrics.guidance],
            ["Total assets", core.financials.metrics.assets],
          ]}
        />
        <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Earnings drivers</p>
        <Pills items={core.financials.drivers} color="#2DD4A7" />
        <p className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Risk focus</p>
        <Pills items={core.financials.risk_focus} color="#F2545B" />
      </Card>

      <Card title="Strategy & Targets" source="FY25 Investor Presentation" accent="#F5A524">
        <p className="text-[12.5px] italic leading-relaxed text-fg-muted">&ldquo;{core.strategy.vision}&rdquo;</p>
        <div className="mt-2.5">
          <Metrics
            rows={[
              ["ROE target", core.strategy.targets.roe],
              ["Payout", core.strategy.targets.payout],
              ["Buyback", core.strategy.targets.buyback],
              ["Valuation", core.strategy.targets.pb_target],
            ]}
          />
        </div>
        <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Macro view</p>
        <Bullets items={core.strategy.macro_view} color="#F5A524" />
      </Card>

      <Card title="Risk Philosophy" accent="#F2545B">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Discipline</p>
        <Bullets items={core.risk_philosophy.discipline} color="#F2545B" />
        <p className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Decision framework</p>
        <Pills items={core.risk_philosophy.decision_framework} color="#F2545B" />
      </Card>

      {/* ── V5.2.1 additions ── */}

      {governance ? (
        <Card title="Risk Governance" source="Integrated Report 2025" accent="#22D3EE">
          <p className="text-[12.5px] leading-relaxed text-fg-muted">{governance.summary}</p>
          <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Governance structure</p>
          <Groups groups={governance.structure} color="#22D3EE" />
          <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Three lines</p>
          <Groups groups={governance.three_lines} color="#22D3EE" />
          <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Governance cycle</p>
          <Flow steps={governance.governance_cycle} color="#22D3EE" />
          <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Leadership would ask</p>
          <Bullets items={cardById("risk_governance")?.leadershipQuestions ?? []} color="#22D3EE" />
        </Card>
      ) : null}

      {riskMgmt ? (
        <Card title="Risk Appetite & Top Risks" source="Integrated Report 2025" accent="#F97316">
          <p className="text-[12.5px] leading-relaxed text-fg-muted">{riskMgmt.summary}</p>
          <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">RAF cycle</p>
          <Flow steps={riskMgmt.raf_cycle} color="#F97316" />
          <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Top risks (by category)</p>
          <Groups groups={riskMgmt.top_risks} color="#F97316" />
          <p className="mt-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Second-order reasoning</p>
          <Bullets items={riskMgmt.second_order_reasoning} color="#F97316" />
        </Card>
      ) : null}

      {bizModel ? (
        <Card title="Business Model" source="Integrated Report 2025" accent="#A78BFA">
          <p className="text-[12.5px] leading-relaxed text-fg-muted">{bizModel.summary}</p>
          <div className="mt-2.5 space-y-2.5">
            {Object.entries(bizModel.business_lines as Record<string, any>).map(([name, bl]) => (
              <div key={name} className="rounded-lg border border-line-soft bg-ink-850 px-2.5 py-2">
                <p className="text-[11.5px] font-semibold text-fg">{name}</p>
                {bl.products ? (
                  <div className="mt-1">
                    <Pills items={bl.products} color="#A78BFA" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">News → business mapping</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {Object.entries(bizModel.news_to_business_map as Record<string, string>).map(([news, biz]) => (
              <div key={news} className="flex items-baseline justify-between gap-2 border-b border-line/40 pb-1">
                <span className="text-[11px] text-fg-faint">{news}</span>
                <span className="text-[11px] font-medium text-fg">{biz}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">Strategic focus areas</p>
          <Pills items={bizModel.strategic_focus_areas} color="#A78BFA" />
        </Card>
      ) : null}

      <Card title="Executive Questions" accent="#B79BFF">
        <Bullets items={K.executive_questions} color="#B79BFF" />
      </Card>
    </div>
  );
}
