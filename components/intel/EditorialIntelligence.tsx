// components/intel/EditorialIntelligence.tsx
"use client";

import type { EditorialCard } from "@/lib/types";
import { SaveButton } from "../saved/SaveButton";
import type { SavedItem } from "@/lib/savedStore";
import { savedFromEditorial } from "@/lib/savedMappers";
import { Card, SeverityPill, Chip } from "../ui";
import {
  HorizonPill,
  UnderstandBlock,
  ItemFooter,
  SourceLink,
  ConfidenceChip,
  SourcedTag,
  InterpretationTag,
  AnchorChip,
} from "./intelUi";

export function EditorialIntelligence({
  cards,
  rawCards,
  learning,
  savedIds,
  onToggleSave,
  snapshotISO,
}: {
  cards: EditorialCard[];
  rawCards?: EditorialCard[];
  learning: boolean;
  savedIds?: Set<string>;
  onToggleSave?: (i: SavedItem) => void;
  snapshotISO?: string;
}) {
  const rawById = new Map((rawCards ?? []).map((c) => [c.id, c]));
  return (
    <section className="rise">
      <div className="space-y-3">
        {cards.map((c) => (
          <Card key={c.id} className="px-4 py-3.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Chip>{c.category}</Chip>
              <SeverityPill severity={c.severity} />
              <HorizonPill horizon={c.horizon} />
            </div>
            <h3 className="text-[15px] font-semibold leading-snug text-fg">{c.title}</h3>

            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
              <span className="text-2xs font-semibold uppercase tracking-wide text-steel">
                What happened{" "}
              </span>
              <span className="text-steel">· sourced — </span>
              {c.whatHappened}
            </p>
            {c.anchor ? (
              <div className="mt-2">
                <AnchorChip anchor={c.anchor} />
              </div>
            ) : null}
            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
              <span className="text-2xs font-semibold uppercase tracking-wide text-elevated">
                Why it matters{" "}
              </span>
              <span className="text-elevated">· interpretation — </span>
              {c.whyItMatters}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wide text-steel">First-order</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{c.firstOrder}</p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wide text-steel">Second-order</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{c.secondOrder}</p>
              </div>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">
              <span className="text-2xs font-semibold uppercase tracking-wide text-steel">
                Bank risk · {c.bankRiskKind} —{" "}
              </span>
              {c.bankRisk}
            </p>

            <div className="mt-3 rounded-lg border border-line-soft bg-ink-850 px-3 py-2">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Key takeaway</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-fg">{c.keyTakeaway}</p>
            </div>

            {learning ? <UnderstandBlock text={c.whatToUnderstand} /> : null}

            <ItemFooter>
              <SourceLink source={c.source} />
              <ConfidenceChip confidence={c.confidence} />
              {onToggleSave ? (
                <span className="ml-auto">
                  <SaveButton
                    item={savedFromEditorial(rawById.get(c.id) ?? c, snapshotISO)}
                    saved={Boolean(savedIds?.has(c.id))}
                    onToggle={onToggleSave}
                  />
                </span>
              ) : null}
            </ItemFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
