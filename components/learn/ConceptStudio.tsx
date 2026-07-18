"use client";

// components/learn/ConceptStudio.tsx
// V5.5 — "Add Concept" prototype screen: paste text → Analyze (Gemini converts it into the
// app's standard concept format) → review/edit the draft → Save. Also lists + edits/deletes
// your previously-added concepts. Deliberately separate from the curated static library
// (lib/concepts.ts) for this iteration — see CHANGES for the scope reasoning.

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

export function ConceptStudio() {
  const [rawText, setRawText] = useState("");
  const [termHint, setTermHint] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null); // non-null once a draft exists (from analyze OR edit)
  const [editingId, setEditingId] = useState<string | null>(null); // set when editing an existing saved concept
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [items, setItems] = useState<UserConcept[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  function loadList() {
    setLoadingList(true);
    fetch("/api/concepts")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoadingList(false));
  }
  useEffect(() => {
    loadList();
  }, []);

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
        setItems(j.items ?? []);
        discard();
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

  function editItem(c: UserConcept) {
    setForm(conceptToForm(c));
    setEditingId(c.id);
    setRawText(c.sourceText || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeItem(id: string) {
    try {
      const res = await fetch(`/api/concepts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await res.json();
      if (j.ok) setItems(j.items ?? []);
    } catch {
      // best-effort; list will resync on next load if this silently failed
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-fg-faint">
        Paste any text about a concept (a term, a paragraph from an article, a rough note). Analyze converts it into
        the standard library format for you to review before saving.
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

      <div className="pt-1">
        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-faint">
          Your concepts {loadingList ? "" : `(${items.length})`}
        </p>
        {loadingList ? (
          <p className="text-2xs text-fg-faint">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-2xs text-fg-faint">Nothing added yet — paste some text above to get started.</p>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div key={c.id} className="rounded-xl border border-line bg-ink-800 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full border border-line-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">
                    {c.category}
                  </span>
                  <span className="text-[13.5px] font-semibold text-fg">{c.term}</span>
                </div>
                {c.formal && c.formal !== c.term ? <p className="mb-1.5 text-[11px] italic text-fg-faint">{c.formal}</p> : null}

                <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Plain English</p>
                <p className="mb-1.5 text-[12px] leading-relaxed text-fg-muted">{c.layman}</p>

                {c.risk ? (
                  <>
                    <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">CRO language</p>
                    <p className="mb-1.5 text-[12px] leading-relaxed text-fg-muted">{c.risk}</p>
                  </>
                ) : null}

                {c.cro ? (
                  <>
                    <p className="text-2xs font-semibold uppercase tracking-wide text-fg-faint">Why a CRO cares</p>
                    <p className="mb-1.5 text-[12px] leading-relaxed text-fg-muted">{c.cro}</p>
                  </>
                ) : null}

                {c.aliases?.length ? (
                  <p className="text-[11px] text-fg-faint">Also known as: {c.aliases.join(", ")}</p>
                ) : null}

                <div className="mt-2 flex gap-3">
                  <button onClick={() => editItem(c)} className="text-2xs font-semibold text-steel">
                    Edit
                  </button>
                  <button onClick={() => removeItem(c.id)} className="text-2xs font-semibold text-stress">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
