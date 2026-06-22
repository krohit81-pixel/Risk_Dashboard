// components/intel/CroConversation.tsx
"use client";

import { useState } from "react";
import type { CroTheme } from "@/lib/types";
import { Card, SeverityPill, Chip } from "../ui";
import { Linkify } from "../learn/Linkify";
import { SaveButton } from "../saved/SaveButton";
import { MizuhoAlignmentBlock } from "./MizuhoAlignment";
import type { SavedItem } from "@/lib/savedStore";
import { savedFromTheme } from "@/lib/savedMappers";
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

function ThemeCard({ theme: t, raw, learning, onOpenConcept, savedIds, onToggleSave, snapshotISO }: { theme: CroTheme; raw?: CroTheme; learning: boolean; onOpenConcept?: (id: string) => void; savedIds?: Set<string>; onToggleSave?: (i: SavedItem) => void; snapshotISO?: string }) {
  // Map from the RAW theme so BOTH executive + layman variants are captured (resolved
  // themes lose the executive original when the Learning view is active).
  const savedItem: SavedItem = savedFromTheme(raw ?? t, snapshotISO);
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
      {t.whatsNew ? (
        <p className="mt-2 rounded-lg border border-calm/30 bg-calm/5 px-2.5 py-1.5 text-2xs leading-relaxed text-calm">
          <span className="font-semibold">What&rsquo;s new: </span>
          {t.whatsNew}
        </p>
      ) : null}
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
      <MizuhoAlignmentBlock items={t.mizuhoAlignment} learning={learning} />

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
        {onToggleSave ? (
          <span className="ml-auto">
            <SaveButton item={savedItem} saved={Boolean(savedIds?.has(savedItem.id))} onToggle={onToggleSave} />
          </span>
        ) : null}
      </ItemFooter>
    </Card>
  );
}

export function CroConversation({
  themes,
  rawThemes,
  expandedCount,
  learning,
  onOpenConcept,
  savedIds,
  onToggleSave,
  snapshotISO,
}: {
  themes: CroTheme[];
  rawThemes?: CroTheme[];
  expandedCount: number;
  learning: boolean;
  onOpenConcept?: (id: string) => void;
  savedIds?: Set<string>;
  onToggleSave?: (i: SavedItem) => void;
  snapshotISO?: string;
}) {
  const cards = themes.filter((t) => t.expanded);
  const rawById = new Map((rawThemes ?? []).map((t) => [t.id, t]));
  return (
    <section className="rise">
      <p className="mb-3 text-[13px] italic leading-relaxed text-fg-muted">
        Ranked by banking, risk and market significance {"\u2014"} not popularity. {expandedCount}{" "}
        {expandedCount === 1 ? "theme" : "themes"} met the threshold today.
      </p>
      <div className="space-y-3">
        {cards.map((t) => (
          <ThemeCard key={t.id} theme={t} raw={rawById.get(t.id)} learning={learning} onOpenConcept={onOpenConcept} savedIds={savedIds} onToggleSave={onToggleSave} snapshotISO={snapshotISO} />
        ))}
      </div>
      {cards.some((t) => t.mizuhoAlignment?.length) ? (
        <p className="mt-3 text-[10px] leading-relaxed text-fg-faint">
          Mizuho Top Risk mappings are AI interpretation against Mizuho's published framework (Mar 2025),
          not Mizuho's own view or exposure.
        </p>
      ) : null}
    </section>
  );
}
