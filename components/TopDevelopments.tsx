// components/TopDevelopments.tsx
"use client";

import type { Development } from "@/lib/types";
import { Card, SeverityPill, Chip } from "./ui";

export function TopDevelopments({ items }: { items: Development[] }) {
  return (
    <section className="rise">
      <div className="space-y-2.5">
        {items.map((d) => (
          <Card key={d.id} className="px-4 py-3.5">
            <div className="mb-1.5 flex items-center gap-2">
              <Chip>{d.category}</Chip>
              <SeverityPill severity={d.severity} />
              {!d.derived ? (
                <span className="ml-auto text-2xs text-fg-faint">watch</span>
              ) : null}
            </div>
            <h3 className="text-[15px] font-semibold leading-snug text-fg">
              {d.headline}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
              <span className="font-medium text-fg-faint">Why it matters — </span>
              {d.whyItMatters}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
