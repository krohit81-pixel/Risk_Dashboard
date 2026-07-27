"use client";

// components/learn/ConceptStudio.tsx
// V5.5 — "Add Concept" prototype screen: paste text → Analyze (Gemini converts it into the
// app's standard concept format) → review/edit the draft → Save. Deliberately separate from
// the curated static library (lib/concepts.ts) for this iteration — see CHANGES for the scope
// reasoning.
// V5.6 — moved into Settings ("maintenance" part of Add Concept). The "Your concepts" list now
// lives under Concept Library (components/learn/UserConceptsList.tsx); this component only
// handles create/edit. It can be driven externally: pass `editTarget` (a UserConcept) to open
// it pre-filled for editing — e.g. when the user taps "Edit" from the Concept Library list.

import { useEffect, useState } from "react";
import type { UserConcept } from "@/lib/userConcepts";
import type { ConceptDraft } from "@/lib/conceptAnalyze";
import { ProgressRing } from "@/components/shared/ProgressRing";

const CATEGORIES = ["Market", "Credit", "Capital", "Liquidity", "Macro", "Japan"] as const;

type FormState = {
  term: string;
  formal: string;
  category: (typeof CATEGORIES)[number];
  aliasesText: string; // comma-separated in the UI, parsed to array on save
  layman: string;
  risk: string;
  cro: string;
};

const EMPTY_FORM: FormState = { term: "", formal: "", category: "Market", aliasesText: "", layman: "", risk: "", cro: "" };

function draftToForm(d: ConceptDraft): FormState {
  return { term: d.term, formal: d.formal, category: d.category, aliasesText: d.aliases.join(", "), layman: d.layman, risk: d.risk, cro: d.cro };
}
function conceptToForm(c: UserConcept): FormState {
  return { term: c.term, formal: c.formal || "", category: c.category, aliasesText: c.aliases.join(", "), layman: c.layman, risk: c.risk, cro: c.cro };
}

export function ConceptStudio({
  editTarget,
  onEditConsumed,
  onSaved,
}: {
  /** Set from outside (e.g. Concept Library's "Edit" button) to open the form pre-filled. */
  editTarget?: UserConcept | null;
  /** Called once the editTarget has been loaded into the form, so the caller can clear it. */
  onEditConsumed?: () => void;
  /** Called after a successful save/update, so callers can refresh their own concept lists. */
  onSaved?: () => void;
}) {
  const [rawText, setRawText] = useState("");
  const [termHint, setTermHint] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null); // non-null once a draft exists (from analyze OR edit)
  const [editingId, setEditingId] = useState<string | null>(null); // set when editing an existing saved concept
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!editTarget) return;
    setForm(conceptToForm(editTarget));
    setEditingId(editTarget.id);
    setRawText(editTarget.sourceText || "");
    onEditConsumed?.();
  }, [editTarget, onEditConsumed]);

  async function analyze() {
    if (rawText.trim().length < 10 || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/concepts/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText, termHint: termHint || undefined }),
      });
      const j = await res.json();
      if (!j.ok) {
        setAnalyzeError(j.error || "Analysis failed.");
      } else {
        setForm(draftToForm(j.draft));
        setEditingId(null);
      }
    } catch (e) {
      setAnalyzeError(String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    if (!form || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          term: form.term,
          formal: form.formal,
          category: form.category,
          aliases: form.aliasesText.split(",").map((a) => a.trim()).filter(Boolean),
          layman: form.layman,
          risk: form.risk,
          cro: form.cro,
          sourceText: rawText || undefined,
        }),
      });
      const j = await res.json();
      if (!j.ok) {
        setSaveError(j.error || "Save failed.");
      } else {
        discard();
        onSaved?.();
      }
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setForm(null);
    setEditingId(null);
    setRawText("");
    setTermHint("");
    setAnalyzeError(null);
    setSaveError(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-fg-faint">
        Paste any text about a concept (a term, a paragraph from an article, a rough note). Analyze converts it into
        the standard library format for you to review before saving. Your saved concepts appear under Concept
        Library, in the Learn tab.
      </p>

      {!form ? (
        <>
          <input
            value={termHint}
            onChange={(e) => setTermHint(e.target.value)}
            placeholder="Term (optional — e.g. Net Interest Income)"
            className="w-full rounded-xl border border-line bg-ink-800 px-3 py-2.5 text-[13px] text-fg placeholder:text-fg-faint"
          />
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste text here…"
            rows={5}
            className="w-full rounded-xl border border-line bg-ink-800 px-3 py-2.5 text-[13px] text-fg placeholder:text-fg-faint"
          />
          {analyzing ? (
            <div className="flex justify-center py-1">
              <ProgressRing active estimateSeconds={10} stages={["Reading the text…", "Drafting the concept…"]} />
            </div>
          ) : (
            <button
              onClick={analyze}
              disabled={rawText.trim().length < 10}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
                rawText.trim().length < 10 ? "bg-ink-800 text-fg-faint" : "bg-steel/15 text-steel active:bg-steel/25"
              }`}
            >
              Analyze
            </button>
          )}
          {analyzeError ? <p className="text-2xs text-stress">{analyzeError}</p> : null}
        </>
      ) : (
        <div className="space-y-2.5 rounded-xl border border-steel/25 bg-steel/5 px-3.5 py-3.5">
          <p className="text-2xs font-semibold uppercase tracking-wide text-steel">
            {editingId ? "Editing" : "Review draft"} — edit anything before saving
          </p>

          <Field label="Term">
            <input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Formal name">
            <input value={form.formal} onChange={(e) => setForm({ ...form, formal: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as FormState["category"] })}
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Aliases (comma-separated)">
            <input value={form.aliasesText} onChange={(e) => setForm({ ...form, aliasesText: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Layman (plain English)">
            <textarea value={form.layman} onChange={(e) => setForm({ ...form, layman: e.target.value })} rows={2} className={inputCls} />
          </Field>
          <Field label="Risk (CRO language)">
            <textarea value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })} rows={2} className={inputCls} />
          </Field>
          <Field label="Why a CRO cares">
            <textarea value={form.cro} onChange={(e) => setForm({ ...form, cro: e.target.value })} rows={2} className={inputCls} />
          </Field>

          {saveError ? <p className="text-2xs text-stress">{saveError}</p> : null}

          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving || !form.term || !form.layman}
              className="flex-1 rounded-xl bg-steel/15 px-4 py-2.5 text-sm font-semibold text-steel active:bg-steel/25 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Save to library"}
            </button>
            <button onClick={discard} className="rounded-xl border border-line bg-ink-800 px-4 py-2.5 text-sm font-semibold text-fg-muted active:bg-ink-700">
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-line bg-ink-850 px-2.5 py-2 text-[13px] text-fg placeholder:text-fg-faint";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-fg-faint">{label}</label>
      {children}
    </div>
  );
}
