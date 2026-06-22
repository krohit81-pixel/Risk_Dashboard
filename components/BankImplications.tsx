// components/BankImplications.tsx
"use client";

import type { BankImplication } from "@/lib/types";
import { Card } from "./ui";

const LENSES: { key: keyof BankImplication; label: string }[] = [
  { key: "creditRisk", label: "Credit Risk" },
  { key: "marketRisk", label: "Market Risk" },
  { key: "liquidityRisk", label: "Liquidity Risk" },
  { key: "capital", label: "Capital" },
  { key: "profitability", label: "Profitability" },
];

export function BankImplications({ items }: { items: BankImplication[] }) {
  return (
    <section className="rise">
      <div className="space-y-3">
        {items.map((it) => (
          <Card key={it.riskId ?? it.development} className="overflow-hidden">
            <div className="border-b border-line-soft bg-ink-850 px-4 py-2.5">
              <h3 className="text-[14px] font-semibold text-fg">{it.development}</h3>
              {it.riskName ? (
                <p className="mt-0.5 text-2xs text-fg-faint">
                  Linked to emerging risk:{" "}
                  <span className="font-semibold text-elevated">{it.riskName}</span>
                </p>
              ) : null}
            </div>
            <div className="divide-y divide-line-soft/60">
              {LENSES.map(({ key, label }) => (
                <div key={key} className="flex gap-3 px-4 py-2.5">
                  <span className="w-[88px] shrink-0 text-2xs font-semibold uppercase tracking-wide text-steel">
                    {label}
                  </span>
                  <span className="text-[13px] leading-relaxed text-fg-muted">
                    {String(it[key])}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
