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
//
// V5.11.2 — section headers ("What happened", "Simple explanation", …) bumped from a faint
// 10px/neutral-500 label to a bolder, more prominent 11px/bold/neutral-700 one. Also: the
// "Original article text" section strips a leading URL (stripLeadingUrl) since the source line
// above already shows it. Footer replaced with a short, print-specific one.
//
// V5.11.3 — Share mode rebuilt as its own visual treatment (PrintItemFull's plain-document
// styling is untouched — Share needed a different job: something a recipient outside the bank
// would actually enjoy opening, not a report). "Simple explanation" is now the dominant visual
// element (large colored card, its own header), "The mechanics" nested inside with its own
// accent, "Original article text" deliberately recedes (bold label, muted body, gray card) per
// explicit feedback that it should read as reference material, not the main event. Colored
// backgrounds need `print-color-adjust: exact` or Chrome/Safari's print dialog can silently
// drop them if "Background graphics" isn't ticked — applied once on each article root, inherited
// by everything inside rather than repeated per element.
//
// Note on the browser's own print header/footer (URL + date + "Page X of Y"): that's injected
// by the browser's print engine into its own reserved margin, not by this component tree — no
// `@page` rule exists in this codebase and PrintFooterText below never includes a URL. It can't
// be suppressed from page CSS; it's a print-dialog-level toggle ("Headers and footers") on the
// browser/OS side.

import type { SavedItem } from "@/lib/savedStore";
import { stripLeadingUrl } from "@/lib/format";

const LABEL_CLASS = "text-[11px] font-bold uppercase tracking-wide text-neutral-700";

/** Chrome/Safari print dialogs often default "Background graphics" off, which silently drops
 *  any bg-color/gradient — this forces them to print regardless. Inheritable, so setting it
 *  once on the article root covers every colored block inside. */
const FORCE_PRINT_COLORS: React.CSSProperties = {
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
} as React.CSSProperties;

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 break-inside-avoid">
      <p className={`mb-1 ${LABEL_CLASS}`}>{label}</p>
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

/** Full mode only — plain-document styling, matching every other Section on this page. */
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

/** Full mode only. `break-words` guards against a long unbroken token (a tracking-parameter-
 *  laden URL, etc.) forcing the page wider than print allows if one ever slips through. */
function OriginalTextSection({ item }: { item: SavedItem }) {
  if (!item.originalText) return null;
  return (
    <Section label="Original article text">
      <p className="whitespace-pre-wrap break-words">{stripLeadingUrl(item.originalText)}</p>
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
          <a href={item.originalUrl} className="break-all underline">
            {item.originalUrl}
          </a>
        </>
      ) : null}
    </p>
  );
}

/** States the thing that actually matters for something the user might forward: this is a
 *  personal read + take, and some source articles are subscription content, so the original
 *  publisher's own terms govern re-sharing it further. No data-provider credits — meaningless
 *  for a single-article export. */
/** `large` — Share mode's bumped type scale (v5.11.4); Full mode keeps the original compact
 *  size, unchanged. */
function PrintFooterText({ large = false }: { large?: boolean }) {
  return (
    <p className={`leading-relaxed text-neutral-500 ${large ? "text-[13px]" : "text-2xs"}`}>
      <span className="font-semibold text-neutral-700">Prepared by Rohit Kohli</span>
      <br />
      Personal reference, based on the source noted above. Some source articles are
      subscription/paywalled content — please respect the original publisher&rsquo;s terms
      before sharing this further.
    </p>
  );
}

/** V5.11.3 — deliberately minimal on WHAT it includes (no category/severity/kind chips, no
 *  bank-risk framing, no Mizuho anything — same scope as before), but no longer minimal on HOW
 *  it looks: this is the version meant to actually be forwarded and read, so it gets the
 *  visual treatment — a prominent colored "Simple explanation" card up top (the actual value:
 *  what happened + why), "The mechanics" nested inside with its own accent, and the original
 *  article text deliberately receding below as reference material (bold label, muted body,
 *  gray card) rather than competing for attention. */
function PrintItemShare({ item }: { item: SavedItem }) {
  const source = item.sourceLabel || item.sources;
  const dateLabel = item.articleDate
    ? `Published ${fmt(item.articleDate)}`
    : item.analysisDateISO
    ? `Analyzed ${fmt(item.analysisDateISO)}`
    : "";
  const simple = item.layman?.whatHappened;
  const mechanics = item.detail?.whatToUnderstand;

  return (
    <article className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0" style={FORCE_PRINT_COLORS}>
      <header className="mb-8">
        <p className="mb-3 flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-blue-600">
          <span aria-hidden>📊</span> Risk Intelligence · Worth a read
        </p>
        <h1 className="text-[30px] font-extrabold leading-[1.25] text-neutral-900">{item.title}</h1>
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          {source ? (
            <span className="rounded-full bg-blue-100 px-3.5 py-1.5 text-[14px] font-bold text-blue-700">{source}</span>
          ) : null}
          {dateLabel ? <span className="text-[14px] text-neutral-500">{dateLabel}</span> : null}
        </div>
        {item.originalUrl ? (
          <p className="mt-2.5 break-all text-[12px] text-neutral-400">
            <a href={item.originalUrl} className="underline">
              {item.originalUrl}
            </a>
          </p>
        ) : null}
        <div className="mt-6 h-[4px] w-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-400" />
      </header>

      {/* V5.11.4 — every size in this block bumped meaningfully (not by a px or two): these
          PDFs are read on a phone screen, usually fit-to-page-width, which visually shrinks
          print-point sizes a lot more than they look reviewing on a laptop. "A bit bigger"
          undersells it at that scale — sized so the actual explanation is comfortably readable
          with no pinch-zoom. */}
      {simple || mechanics ? (
        <div className="mb-7 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 break-inside-avoid">
          <div className="border-b border-blue-200/80 bg-blue-100/70 px-6 py-4">
            <p className="text-[17px] font-extrabold uppercase tracking-wide text-blue-800">
              <span aria-hidden>💡</span> Simple Explanation
            </p>
          </div>
          <div className="px-6 py-6">
            {simple ? <p className="text-[19px] leading-[1.65] text-neutral-800">{simple}</p> : null}
            {mechanics ? (
              <div className={`${simple ? "mt-5" : ""} rounded-xl border-l-4 border-indigo-400 bg-white px-5 py-4`}>
                <p className="mb-1.5 text-[14px] font-extrabold uppercase tracking-wide text-indigo-600">
                  <span aria-hidden>⚙️</span> The Mechanics
                </p>
                <p className="text-[17px] leading-[1.6] text-neutral-700">{mechanics}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {item.originalText ? (
        <div className="mb-7 break-inside-avoid rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-5">
          <p className="mb-2.5 text-[14px] font-bold uppercase tracking-wide text-neutral-600">
            <span aria-hidden>📰</span> Original Article Text
          </p>
          <p className="whitespace-pre-wrap break-words text-[16px] leading-[1.65] text-neutral-500">
            {stripLeadingUrl(item.originalText)}
          </p>
        </div>
      ) : null}

      <footer className="mt-8 border-t-2 border-blue-100 pt-5">
        <PrintFooterText large />
      </footer>
    </article>
  );
}

function PrintItemFull({ item }: { item: SavedItem }) {
  const lens = item.mizuhoLens;
  return (
    <article className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0" style={FORCE_PRINT_COLORS}>
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
              <p className={`mb-1 ${LABEL_CLASS}`}>First-order</p>
              <p className="text-[13px] leading-relaxed text-neutral-800">{item.detail.firstOrder}</p>
            </div>
          ) : null}
          {item.detail?.secondOrder ? (
            <div>
              <p className={`mb-1 ${LABEL_CLASS}`}>Second-order</p>
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
          <p className={`mb-0.5 ${LABEL_CLASS}`}>Key takeaway</p>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-900">{item.detail.keyTakeaway}</p>
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
          <p className={`mb-1.5 ${LABEL_CLASS}`}>
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
        <PrintFooterText />
      </footer>
    </article>
  );
}

export function PrintItem({ item, mode = "full" }: { item: SavedItem; mode?: "full" | "share" }) {
  return mode === "share" ? <PrintItemShare item={item} /> : <PrintItemFull item={item} />;
}
