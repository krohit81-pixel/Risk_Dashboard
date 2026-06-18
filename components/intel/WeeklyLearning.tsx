// components/intel/WeeklyLearning.tsx
"use client";

import type { WeeklyLearning } from "@/lib/types";
import { Card } from "../ui";

function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((c) => (
        <span key={c} className="rounded-md border border-calm/25 bg-calm/10 px-2 py-0.5 text-2xs font-medium text-calm">
          {c}
        </span>
      ))}
    </div>
  );
}

export function WeeklyLearningSection({ data }: { data: WeeklyLearning }) {
  return (
    <section className="rise">
      <Card className="px-4 py-3.5">
        <p className="text-2xs font-semibold uppercase tracking-wide text-steel">Key lessons this week</p>
        <ul className="mt-1 space-y-0.5">
          {data.keyLessons.map((l, i) => (
            <li key={i} className="text-[13px] leading-relaxed text-fg-muted">• {l}</li>
          ))}
        </ul>

        <p className="mt-3 text-2xs font-semibold uppercase tracking-wide text-steel">Concepts learned</p>
        <ChipRow items={data.conceptsLearned} />

        <p className="mt-3 text-2xs font-semibold uppercase tracking-wide text-steel">
          Questions to explore next week
        </p>
        <ChipRow items={data.questionsNextWeek} />
      </Card>
    </section>
  );
}
