// components/print/PrintBook.tsx
// V5.3 — renders a compiled briefing book: cover/preface, "Actions on me" (learn / ask
// leadership / investigate), then each matched item in compact form (title, category,
// what-happened, why-it-matters, key takeaway). Full per-item detail (Mizuho lens, etc.) is
// intentionally left to the item's own /print/[id] page — a 40-item book at full depth would
// be unreadably long; this is a compiled digest, not a dump of every field.

import type { BriefingBook } from "@/lib/briefingBook";
import { AppFooterText } from "@/components/shared/AppFooter";

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function ActionList({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  if (!items.length) return null;
  return (
    <div className="break-inside-avoid">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
        {title}
      </p>
      <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-neutral-800">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export function PrintBook({ book }: { book: BriefingBook }) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0">
      {/* Cover */}
      <header className="mb-8 border-b-2 border-neutral-900 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Global Risk Intelligence — Briefing Book</p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight text-neutral-900">{book.title}</h1>
        <p className="mt-1 text-[13px] text-neutral-600">{book.subtitle}</p>
        <p className="mt-3 text-[11px] text-neutral-500">
          Generated {fmt(book.generatedISO)} · {book.stats.itemCount} item{book.stats.itemCount === 1 ? "" : "s"}
          {book.stats.truncatedForPrompt ? ` (preface reflects the most recent items)` : ""}
        </p>
      </header>

      {book.gap ? (
        <p className="text-[13px] leading-relaxed text-neutral-600">{book.gap}</p>
      ) : (
        <>
          {/* Preface */}
          {book.preface ? (
            <section className="mb-8 break-inside-avoid">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Preface</p>
              <p className="text-[14px] leading-relaxed text-neutral-800">{book.preface}</p>
            </section>
          ) : null}

          {/* Actions on me */}
          {book.actionItems.toLearn.length || book.actionItems.toAsk.length || book.actionItems.toInvestigate.length ? (
            <section className="mb-8 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3.5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-700">Actions on me</p>
              <div className="space-y-3">
                <ActionList title="What to learn" items={book.actionItems.toLearn} accent="#2563EB" />
                <ActionList title="Ask leadership" items={book.actionItems.toAsk} accent="#D97706" />
                <ActionList title="Investigate further" items={book.actionItems.toInvestigate} accent="#DC2626" />
              </div>
            </section>
          ) : null}

          {/* Compiled items */}
          <section>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Compiled items ({book.items.length})
            </p>
            <div className="space-y-5">
              {book.items.map((it) => (
                <div key={it.id} className="break-inside-avoid border-b border-neutral-200 pb-4">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    {it.category ? <span className="rounded-full border border-neutral-300 px-1.5 py-0.5">{it.category}</span> : null}
                    {it.severity ? <span className="rounded-full border border-neutral-300 px-1.5 py-0.5">{it.severity}</span> : null}
                    <span className="ml-auto normal-case text-neutral-400">{fmt(it.savedAtISO)}</span>
                  </div>
                  <h3 className="text-[14.5px] font-semibold leading-snug text-neutral-900">{it.title}</h3>
                  {it.whatHappened ? <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-700">{it.whatHappened}</p> : null}
                  <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-700">
                    <span className="font-medium text-neutral-500">Why it matters: </span>
                    {it.interpretation}
                  </p>
                  {it.detail?.keyTakeaway ? (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-900">
                      <span className="font-medium text-neutral-500">Key takeaway: </span>
                      {it.detail.keyTakeaway}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="mt-10 border-t border-neutral-200 pt-3">
        <AppFooterText light />
      </footer>
    </article>
  );
}
