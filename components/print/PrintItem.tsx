// components/print/PrintItem.tsx
// V5.3 — full-detail, always-expanded, light-themed rendering of ONE saved item for print/PDF
// export. Unlike the in-app card (collapsed by default, dark theme), this shows everything —
// print/export is explicitly "for reading later," so nothing should be hidden behind a toggle.
//
// V5.11 — added a second render path: `mode="share"`. The full version above includes the
// Mizuho Top-Risk alignment and "Through Mizuho's lens" sections, which the user explicitly
// doesn't want to hand to someone outside the bank when sharing "an interesting read" — share
// mode renders ONLY the title/date/source, the plain-English "Simple explanation," and the
// original article text. Both modes pull from fields already on SavedItem; share mode adds
// nothing new, it just omits the Mizuho/risk-lens sections.

import type { SavedItem } from "@/lib/savedStore";
import { AppFooterText } from "@/components/shared/AppFooter";

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 break-inside-avoid">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="text-[13px] leading-relaxed text-neutral-800">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="list-disc space-y-1 pl-4">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

/** Shared by both modes: the plain-English "what happened + mechanics" section, built from
 *  fields already on SavedItem (layman.whatHappened, detail.whatToUnderstand). */
function SimpleExplanationSection({ item }: { item: SavedItem }) {
  const simple = item.layman?.whatHappened;
  const mechanics = item.detail?.whatToUnderstand;
  if (!simple && !mechanics) return null;
  return (
    <Section label="Simple explanation">
      {simple ? <p>{simple}</p> : null}
      {mechanics ? (
        <p className={simple ? "mt-2" : undefined}>
          <span className="font-semibold text-neutral-900">The mechanics — </span>
          {mechanics}
        </p>
      ) : null}
    </Section>
  );
}

function OriginalTextSection({ item }: { item: SavedItem }) {
  if (!item.originalText) return null;
  return (
    <Section label="Original article text">
      <p className="whitespace-pre-wrap">{item.originalText}</p>
    </Section>
  );
}

function SourceLine({ item }: { item: SavedItem }) {
  return (
    <p className="mt-1.5 text-[11px] text-neutral-500">
      {item.articleDate ? `Published ${fmt(item.articleDate)}` : item.analysisDateISO ? `Analyzed ${fmt(item.analysisDateISO)}` : ""}
      {item.sourceLabel ? ` · ${item.sourceLabel}` : item.sources ? ` · ${item.sources}` : ""}
      {item.originalUrl ? (
        <>
          {" · "}
          <a href={item.originalUrl} className="underline">
            {item.originalUrl}
          </a>
        </>
      ) : null}
    </p>
  );
}

/** V5.11 — deliberately minimal: no category/severity/kind chips, no bank-risk framing, no
 *  Mizuho anything. Just what the user asked for — "the original article text, source name,
 *  and the simple version" — so a recipient outside the bank sees an article + a plain-English
 *  take, not Mizuho's internal risk categorization of it. */
function PrintItemShare({ item }: { item: SavedItem }) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0">
      <header className="mb-6 border-b border-neutral-200 pb-4">
        <h1 className="text-[22px] font-bold leading-snug text-neutral-900">{item.title}</h1>
        <SourceLine item={item} />
      </header>

      <SimpleExplanationSection item={item} />
      <OriginalTextSection item={item} />

      <footer className="mt-10 border-t border-neutral-200 pt-3">
        <AppFooterText light />
      </footer>
    </article>
  );
}

function PrintItemFull({ item }: { item: SavedItem }) {
  const lens = item.mizuhoLens;
  return (
    <article className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0">
      <header className="mb-6 border-b border-neutral-200 pb-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          {item.category ? <span className="rounded-full border border-neutral-300 px-2 py-0.5">{item.category}</span> : null}
          {item.severity ? <span className="rounded-full border border-neutral-300 px-2 py-0.5">{item.severity}</span> : null}
          <span className="rounded-full border border-neutral-300 px-2 py-0.5">{item.kind}</span>
        </div>
        <h1 className="text-[22px] font-bold leading-snug text-neutral-900">{item.title}</h1>
        <SourceLine item={item} />
      </header>

      {item.whatHappened ? (
        <Section label="What happened · sourced">
          <p>{item.whatHappened}</p>
        </Section>
      ) : null}

      <Section label="Why it matters · interpretation">
        <p>{item.interpretation}</p>
      </Section>

      {item.detail?.firstOrder || item.detail?.secondOrder ? (
        <div className="mt-4 grid grid-cols-2 gap-4 break-inside-avoid">
          {item.detail?.firstOrder ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">First-order</p>
              <p className="text-[13px] leading-relaxed text-neutral-800">{item.detail.firstOrder}</p>
            </div>
          ) : null}
          {item.detail?.secondOrder ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Second-order</p>
              <p className="text-[13px] leading-relaxed text-neutral-800">{item.detail.secondOrder}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {item.bankingImpact ? (
        <Section label="Bank risk">
          <p>{item.bankingImpact}</p>
        </Section>
      ) : null}

      {item.detail?.keyTakeaway ? (
        <div className="mt-4 break-inside-avoid rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Key takeaway</p>
          <p className="text-[13px] leading-relaxed text-neutral-900">{item.detail.keyTakeaway}</p>
        </div>
      ) : null}

      {item.detail?.whatToUnderstand ? (
        <Section label="What to understand">
          <p>{item.detail.whatToUnderstand}</p>
        </Section>
      ) : null}

      {item.focus?.length ? (
        <Section label="What should I focus on">
          <div className="space-y-1.5">
            {item.focus.map((f, i) => (
              <p key={i}>{f.text}</p>
            ))}
          </div>
        </Section>
      ) : null}

      {item.whyMizuho?.length ? (
        <Section label="Mizuho Top-Risks alignment">
          <BulletList items={item.whyMizuho} />
        </Section>
      ) : null}

      {lens && (lens.context || lens.interpretation) ? (
        <div className="mt-4 break-inside-avoid rounded-lg border border-neutral-200 px-3.5 py-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Through Mizuho&rsquo;s lens {lens.repoVersion ? `· repository v${lens.repoVersion}` : ""}
          </p>
          {lens.context ? <p className="text-[13px] leading-relaxed text-neutral-800">{lens.context}</p> : null}
          {lens.interpretation ? <p className="mt-2 text-[13px] leading-relaxed text-neutral-800">{lens.interpretation}</p> : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-600">
            {lens.businesses?.length ? <span>Businesses: {lens.businesses.join(", ")}</span> : null}
            {lens.riskStripes?.length ? <span>Stripes: {lens.riskStripes.join(", ")}</span> : null}
            {lens.impacts?.length ? <span>Moves: {lens.impacts.join(", ")}</span> : null}
          </div>
        </div>
      ) : null}

      {item.relatedConcepts?.length ? (
        <Section label="Related concepts">
          <p className="text-neutral-600">{item.relatedConcepts.join(", ")}</p>
        </Section>
      ) : null}

      {/* V5.11 — appended last: collapsed-by-default in the live app, but this print view
          never hides anything, so both render in full here too. */}
      <SimpleExplanationSection item={item} />
      <OriginalTextSection item={item} />

      <footer className="mt-10 border-t border-neutral-200 pt-3">
        <AppFooterText light />
      </footer>
    </article>
  );
}

export function PrintItem({ item, mode = "full" }: { item: SavedItem; mode?: "full" | "share" }) {
  return mode === "share" ? <PrintItemShare item={item} /> : <PrintItemFull item={item} />;
}
