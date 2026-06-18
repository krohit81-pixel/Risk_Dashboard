// components/intel/CroConversation.tsx
"use client";

import { useState } from "react";
import type { CroTheme } from "@/lib/types";
import { Card, SeverityPill, Chip } from "../ui";
import { Linkify } from "../learn/Linkify";
import {
  HorizonPill,
  LabeledLine,
  MizuhoBlock,
  LensBox,
  Signals,
  QuestionsBlock,
  MeetingBlock,
  UnderstandBlock,
  ItemFooter,
  SourceLink,
  ConfidenceChip,
  InterpretationTag,
  AnchorChip,
} from "./intelUi";

/** NEW tag or "Day N · ongoing" — shows whether a theme is fresh or structural. */
function PersistenceBadge({ theme }: { theme: CroTheme }) {
  if (theme.isNew) {
    return (
      <span className="rounded-full bg-calm px-2 py-0.5 text-2xs font-extrabold tracking-wide text-[#06231d]">
        NEW
      </span>
    );
  }
  if (theme.dayN && theme.dayN > 1) {
    return (
      <span className="text-2xs text-fg-faint">
        Day {theme.dayN} · ongoing{theme.seenCount ? ` · seen ${theme.seenCount}\u00d7` : ""}
      </span>
    );
  }
  return null;
}

function ThemeCard({ theme: t, learning, onOpenConcept }: { theme: CroTheme; learning: boolean; onOpenConcept?: (id: string) => void }) {
  const [open, setOpen] = useState(learning);
  return (
    <Card className="px-4 py-3.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Chip>{t.category}</Chip>
        <SeverityPill severity={t.severity} />
        <HorizonPill horizon={t.horizon} />
        <span className="ml-auto">
          <PersistenceBadge theme={t} />
        </span>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug text-fg">{t.title}</h3>
      {t.anchor ? (
        <div className="mt-2">
          <AnchorChip anchor={t.anchor} />
        </div>
      ) : null}

      <LabeledLine label="Why it matters">{t.whyItMatters}</LabeledLine>
      <LabeledLine label="Banking impact">
        <Linkify text={t.bankingImpact} onOpen={onOpenConcept} />
      </LabeledLine>
      <MizuhoBlock bullets={t.mizuho} />

      {/* Go deeper — mechanics/teaching layer */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 flex w-full items-center gap-1.5 text-left text-xs font-semibold text-steel"
      >
        {open ? "\u25be Hide detail" : "\u2192 Go deeper"}
        <span className="font-normal text-fg-faint">{open ? "" : "\u2014 lenses, signals, talking points"}</span>
      </button>

      {open ? (
        <div className="mt-2">
          <LensBox lenses={t.lenses} />
          <Signals items={t.signals} />
          <QuestionsBlock items={t.questions} />
          <MeetingBlock talkingPoint={t.talkingPoint} followUp={t.followUp} />
          <UnderstandBlock text={t.whatToUnderstand} />
        </div>
      ) : null}

      <ItemFooter>
        <SourceLink source={t.source} />
        <ConfidenceChip confidence={t.confidence} />
        {t.interpretation ? <InterpretationTag /> : null}
      </ItemFooter>
    </Card>
  );
}

export function CroConversation({
  themes,
  expandedCount,
  learning,
  onOpenConcept,
}: {
  themes: CroTheme[];
  expandedCount: number;
  learning: boolean;
  onOpenConcept?: (id: string) => void;
}) {
  const cards = themes.filter((t) => t.expanded);
  return (
    <section className="rise">
      <p className="mb-3 text-[13px] italic leading-relaxed text-fg-muted">
        Ranked by banking, risk and market significance {"\u2014"} not popularity. {expandedCount}{" "}
        {expandedCount === 1 ? "theme" : "themes"} met the threshold today.
      </p>
      <div className="space-y-3">
        {cards.map((t) => (
          <ThemeCard key={t.id} theme={t} learning={learning} onOpenConcept={onOpenConcept} />
        ))}
      </div>
    </section>
  );
}
