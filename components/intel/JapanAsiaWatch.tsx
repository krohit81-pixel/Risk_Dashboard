// components/intel/JapanAsiaWatch.tsx
"use client";

import type { JapanAsiaWatch as JAW } from "@/lib/types";
import { Card } from "../ui";
import {
  HorizonPill,
  MizuhoBlock,
  LensBox,
  Signals,
  QuestionsBlock,
  UnderstandBlock,
  ItemFooter,
  SourceLink,
  ConfidenceChip,
  InterpretationTag,
} from "./intelUi";

export function JapanAsiaWatchSection({
  data,
  learning,
}: {
  data: JAW;
  learning: boolean;
}) {
  return (
    <section className="rise">
      <Card className="px-4 py-3.5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">
            Japan risk narrative
          </span>
          <HorizonPill horizon={data.horizon} />
        </div>
        <p className="text-[14px] leading-relaxed text-fg">{data.narrative}</p>

        <MizuhoBlock bullets={data.mizuho} />
        <LensBox lenses={[data.lens]} />
        <Signals items={data.signals} />

        {learning ? (
          <>
            <QuestionsBlock items={data.questions} />
            <UnderstandBlock text={data.whatToUnderstand} />
          </>
        ) : null}

        <ItemFooter>
          <SourceLink source={data.source} />
          <ConfidenceChip confidence={data.confidence} />
          {data.interpretation ? <InterpretationTag /> : null}
        </ItemFooter>
      </Card>
    </section>
  );
}
