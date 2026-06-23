// lib/focus.ts
// V4.4 — "What should I focus on?" — a dedicated, personalized call run AFTER the
// Mizuho alignment. Deliberately separate (overloading the interpret/align call
// regressed quality in v4.0) and deliberately allowed to return an empty list. It is
// fed the alignment so it can avoid restating the institutional "Why Mizuho cares".

import { interpret } from "./llm";
import { FOCUS_PROFILE } from "./focusProfile";
import type { FocusItem, MizuhoAlignment } from "./types";

const KINDS: FocusItem["kind"][] = ["attention", "conversation", "learning"];

export async function generateFocus(input: {
  title: string;
  whatHappened: string;
  whyItMatters: string;
  bankingImpact: string;
  alignment: MizuhoAlignment[];
}): Promise<FocusItem[]> {
  const system =
    "You help a specific risk executive decide what PERSONALLY deserves their attention. " +
    "You must NOT restate institutional risk relevance (why the bank is exposed) — that is already covered in a separate 'Why Mizuho cares' section. " +
    "Surface only what genuinely applies to THIS person's role and priorities. " +
    "It is correct and expected to return an EMPTY list when nothing meaningfully applies — never invent generic 'keep an eye on this' filler.";

  const profile = `ROLE: ${FOCUS_PROFILE.role}\nPRIORITIES:\n${FOCUS_PROFILE.priorities
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n")}`;

  const already =
    input.alignment.map((a) => `${a.riskName}: ${a.scenarioLabel}`).join("; ") || "(none)";

  const user = `${profile}

ARTICLE
Title: ${input.title}
What happened: ${input.whatHappened}
Why it matters: ${input.whyItMatters}
Banking impact: ${input.bankingImpact}

ALREADY COVERED in "Why Mizuho cares" (do NOT duplicate this institutional mapping): ${already}

Return ONE JSON object:
{ "focus": [ { "kind": "attention" | "conversation" | "learning", "text": "<one practical sentence>" } ] }
- 0 to 5 items. Return an EMPTY array if nothing genuinely applies to this person's role/priorities.
- "attention" = what specifically deserves their attention given their priorities.
- "conversation" = a likely stakeholder discussion this could trigger (CRO, Japan, EMEA, India build).
- "learning" = where they should spend learning effort.
- Do NOT restate the institutional risk mapping above. Be concrete, not generic. JSON only.`;

  const data = await interpret<{ focus?: FocusItem[] }>(system, user);
  const items = (data?.focus ?? []).filter(
    (f): f is FocusItem => !!f && typeof f.text === "string" && f.text.trim().length > 0
  );
  return items.slice(0, 5).map((f) => ({
    kind: KINDS.includes(f.kind) ? f.kind : "attention",
    text: f.text.trim(),
  }));
}
