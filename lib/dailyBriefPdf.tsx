// lib/dailyBriefPdf.tsx
// V5.13 — server-side PDF for the "Daily Risk Brief" email (app/api/cron/editorial/route.ts).
// Built with @react-pdf/renderer rather than headless-Chromium-prints-a-page: no browser to
// launch in a serverless function, nothing to time out, small/fast/reliable — the deliberate
// tradeoff (per explicit choice) is a SEPARATE layout here, in react-pdf's own styling API, not
// literally the app's Tailwind CSS. Colors below are the exact light-theme RGB tokens from
// app/globals.css's `.light` block (same values PrintItem.tsx's print pages use), so it reads
// as the same family, not a re-skin — any future palette change there should be mirrored here.
//
// Content mirrors the Home tab's default-visible depth (a card's main content once tapped
// open), not literally every nested "Go deeper" toggle (lenses/questions/talking points) —
// keeps a daily email to a sane length. Say the word if you want that deeper layer included too.

import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import type {
  MorningBrief,
  Development,
  OvernightChange,
  CroTheme,
  EditorialCard,
  JapanAsiaWatch,
  RadarItem,
  Severity,
} from "./types";

// Disable @react-pdf's default font-lookup (hyphenation etc.) — avoids a network/file lookup
// for the standard 14 PDF fonts (Helvetica family), which need no registration at all.
Font.registerHyphenationCallback((word) => [word]);

const COLOR = {
  fg: "#111827",
  fgMuted: "#5B6472",
  fgFaint: "#8890A0",
  line: "#E0E3E9",
  lineSoft: "#EDEFF3",
  card: "#FAFBFC",
  calm: "#12A583",
  elevated: "#B45F06",
  stress: "#DC2626",
  steel: "#3B6FD1",
  mizuho: "#7C5CF0",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  Low: COLOR.calm,
  Moderate: COLOR.elevated,
  Elevated: COLOR.elevated,
  High: COLOR.stress,
};

const TONE_COLOR: Record<OvernightChange["tone"], string> = {
  positive: COLOR.calm,
  negative: COLOR.stress,
  neutral: COLOR.fgMuted,
};

const styles = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingVertical: 36, fontSize: 10.5, color: COLOR.fg, fontFamily: "Helvetica" },
  masthead: { marginBottom: 4, fontSize: 9, fontFamily: "Helvetica-Bold", color: COLOR.steel, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: COLOR.fg, marginBottom: 3 },
  dateLine: { fontSize: 10, color: COLOR.fgMuted, marginBottom: 18 },
  hr: { borderBottomWidth: 1, borderBottomColor: COLOR.line, marginBottom: 16 },

  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 8 },
  sectionNum: { fontSize: 9, fontFamily: "Helvetica-Bold", color: COLOR.fgFaint, marginRight: 8 },
  sectionTitle: { fontSize: 12.5, fontFamily: "Helvetica-Bold", color: COLOR.fg, textTransform: "uppercase" },
  sectionHint: { fontSize: 9, color: COLOR.fgFaint, marginLeft: 8 },

  card: { borderWidth: 1, borderColor: COLOR.line, borderRadius: 4, backgroundColor: COLOR.card, padding: 12, marginBottom: 8 },
  cardTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: COLOR.fg, marginBottom: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  chip: { fontSize: 8, fontFamily: "Helvetica-Bold", borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginRight: 5, marginBottom: 3, textTransform: "uppercase" },

  label: { fontSize: 8.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6, marginBottom: 2 },
  body: { fontSize: 10, lineHeight: 1.45, color: COLOR.fgMuted },

  gridRow: { flexDirection: "row", marginTop: 6 },
  gridCol: { flex: 1, paddingRight: 8 },

  keyBox: { marginTop: 8, borderWidth: 1, borderColor: COLOR.lineSoft, backgroundColor: "#F4F6F9", borderRadius: 4, padding: 8 },
  keyLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: COLOR.fgFaint, marginBottom: 2 },
  keyText: { fontSize: 10, lineHeight: 1.4, color: COLOR.fg },

  bulletRow: { flexDirection: "row", marginBottom: 2 },
  bulletDot: { fontSize: 10, color: COLOR.mizuho, marginRight: 5 },
  bulletText: { fontSize: 9.5, lineHeight: 1.4, color: COLOR.fgMuted, flex: 1 },

  movRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: COLOR.lineSoft, paddingVertical: 5 },
  movLabel: { fontSize: 10, color: COLOR.fg },
  movDelta: { fontSize: 10, fontFamily: "Helvetica-Bold" },

  footerLine: { fontSize: 8.5, color: COLOR.fgFaint, lineHeight: 1.4 },
  footerName: { fontFamily: "Helvetica-Bold", color: COLOR.fgMuted },
  sourceLine: { fontSize: 8.5, color: COLOR.fgFaint, marginTop: 6 },
});

function Chip({ text, color }: { text: string; color: string }) {
  return <Text style={[styles.chip, { color, borderColor: color }]}>{text}</Text>;
}

function SectionHeader({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionNum}>{n}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

function Bullets({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <View style={{ marginTop: 4 }}>
      {items.map((b, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>{"•"}</Text>
          <Text style={styles.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

function SourceFooter({ source, confidence }: { source?: string; confidence?: string }) {
  if (!source && !confidence) return null;
  return (
    <Text style={styles.sourceLine}>
      {source ? source : ""}
      {source && confidence ? "  ·  " : ""}
      {confidence ? `Confidence: ${confidence}` : ""}
    </Text>
  );
}

// ── Morning Brief ──
function MorningBriefSection({ brief }: { brief: MorningBrief }) {
  const statusColor =
    brief.status === "High" ? COLOR.stress : brief.status === "Elevated" ? COLOR.elevated : brief.status === "Moderate" ? COLOR.elevated : COLOR.calm;
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: COLOR.fgFaint, textTransform: "uppercase" }}>
          Daily Risk Brief
        </Text>
        <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: statusColor }}>
          {brief.status} risk environment
        </Text>
      </View>
      <Text style={{ fontSize: 10, color: COLOR.fgMuted, marginTop: 3, marginBottom: 6 }}>{brief.changeFromYesterday}</Text>
      {brief.paragraph.map((p, i) => (
        <Text key={i} style={[styles.body, { marginBottom: 4 }]}>
          {p}
        </Text>
      ))}
    </View>
  );
}

// ── What Changed (overnight movers) ──
// V5.13 — lib/overnight.ts's fmtDelta() uses the proper Unicode minus sign (U+2212, "−"), which
// reads correctly with the app's webfont (Inter) but silently disappears in @react-pdf's
// standard Helvetica (not a bug in the shared text — Helvetica's base encoding just doesn't
// carry that glyph). Every negative delta was rendering with no sign at all ("6 bps" instead
// of "−6 bps") before this. Scoped to this PDF path only — the live app's own rendering is
// untouched, and correct as-is.
function pdfSafeText(s: string): string {
  return s.replace(/−/g, "-");
}

function OvernightSection({ items }: { items: OvernightChange[] }) {
  if (!items.length) return null;
  return (
    <View>
      {items.map((o) => (
        <View key={o.id} style={styles.movRow}>
          <Text style={styles.movLabel}>{o.label}</Text>
          <Text style={[styles.movDelta, { color: TONE_COLOR[o.tone] }]}>{pdfSafeText(o.deltaText)}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Top Developments ──
function DevelopmentsSection({ items }: { items: Development[] }) {
  return (
    <View>
      {items.map((d) => (
        <View key={d.id} style={styles.card} wrap={false}>
          <View style={styles.chipRow}>
            <Chip text={d.category} color={COLOR.steel} />
            <Chip text={d.severity} color={SEVERITY_COLOR[d.severity]} />
          </View>
          <Text style={styles.cardTitle}>{d.headline}</Text>
          <Text style={styles.body}>{d.whyItMatters}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Today's CRO Conversation ──
function ThemeCardPdf({ t }: { t: CroTheme }) {
  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.chipRow}>
        <Chip text={t.category} color={COLOR.steel} />
        <Chip text={t.severity} color={SEVERITY_COLOR[t.severity]} />
        <Chip text={t.horizon} color={COLOR.fgFaint} />
      </View>
      <Text style={styles.cardTitle}>{t.title}</Text>

      <Text style={styles.label}>
        <Text style={{ color: COLOR.elevated }}>Why it matters</Text>
      </Text>
      <Text style={styles.body}>{t.whyItMatters}</Text>

      <Text style={styles.label}>
        <Text style={{ color: COLOR.steel }}>Banking impact</Text>
      </Text>
      <Text style={styles.body}>{t.bankingImpact}</Text>

      {t.mizuho?.length ? (
        <>
          <Text style={[styles.label, { color: COLOR.mizuho }]}>Why Mizuho cares</Text>
          <Bullets items={t.mizuho} />
        </>
      ) : null}

      <SourceFooter source={t.source} confidence={t.confidence} />
    </View>
  );
}

function CroConversationSection({ themes }: { themes: CroTheme[] }) {
  const expanded = themes.filter((t) => t.expanded);
  if (!expanded.length) {
    return <Text style={styles.body}>No themes met today&rsquo;s significance threshold.</Text>;
  }
  return (
    <View>
      {expanded.map((t) => (
        <ThemeCardPdf key={t.id} t={t} />
      ))}
    </View>
  );
}

// ── Editorial Intelligence ──
function EditorialSection({ cards }: { cards: EditorialCard[] }) {
  if (!cards.length) return <Text style={styles.body}>No additional editorial items today.</Text>;
  return (
    <View>
      {cards.map((c) => (
        <View key={c.id} style={styles.card} wrap={false}>
          <View style={styles.chipRow}>
            <Chip text={c.category} color={COLOR.steel} />
            <Chip text={c.severity} color={SEVERITY_COLOR[c.severity]} />
            <Chip text={c.horizon} color={COLOR.fgFaint} />
          </View>
          <Text style={styles.cardTitle}>{c.title}</Text>

          <Text style={[styles.label, { color: COLOR.steel }]}>What happened {"·"} sourced</Text>
          <Text style={styles.body}>{c.whatHappened}</Text>

          <Text style={[styles.label, { color: COLOR.elevated }]}>Why it matters {"·"} interpretation</Text>
          <Text style={styles.body}>{c.whyItMatters}</Text>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={[styles.label, { color: COLOR.steel }]}>First-order</Text>
              <Text style={styles.body}>{c.firstOrder}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.label, { color: COLOR.steel }]}>Second-order</Text>
              <Text style={styles.body}>{c.secondOrder}</Text>
            </View>
          </View>

          <Text style={[styles.label, { color: COLOR.steel }]}>Bank risk {"·"} {c.bankRiskKind}</Text>
          <Text style={styles.body}>{c.bankRisk}</Text>

          <View style={styles.keyBox}>
            <Text style={styles.keyLabel}>Key takeaway</Text>
            <Text style={styles.keyText}>{c.keyTakeaway}</Text>
          </View>

          <SourceFooter source={c.source} confidence={c.confidence} />
        </View>
      ))}
    </View>
  );
}

// ── Japan & Asia Watch ──
function JapanSection({ data }: { data: JapanAsiaWatch }) {
  return (
    <View style={styles.card}>
      <Text style={styles.body}>{data.narrative}</Text>
      {!data.empty ? (
        <>
          {data.mizuho?.length ? (
            <>
              <Text style={[styles.label, { color: COLOR.mizuho }]}>Why Mizuho cares</Text>
              <Bullets items={data.mizuho} />
            </>
          ) : null}
          <SourceFooter source={data.source} confidence={data.confidence} />
        </>
      ) : null}
    </View>
  );
}

// ── Also on the Radar ──
function RadarSectionPdf({ items }: { items: RadarItem[] }) {
  return (
    <View>
      {items.map((r, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>{"•"}</Text>
          <Text style={styles.bulletText}>
            {r.title}
            {r.source ? `  —  ${r.source}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

export interface DailyBriefData {
  dateLabel: string;
  brief: MorningBrief;
  overnight: OvernightChange[];
  developments: Development[];
  themes: CroTheme[];
  editorial: EditorialCard[];
  japanAsia: JapanAsiaWatch;
  radar: RadarItem[];
}

function DailyBriefDocument({ data }: { data: DailyBriefData }) {
  return (
    <Document title={`Daily Risk Brief — ${data.dateLabel}`} author="Risk Intelligence">
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.masthead}>Risk Intelligence</Text>
        <Text style={styles.title}>Daily Risk Brief</Text>
        <Text style={styles.dateLine}>{data.dateLabel}</Text>
        <View style={styles.hr} />

        <MorningBriefSection brief={data.brief} />

        <SectionHeader n="01" title="What Changed" hint="biggest movers, risk-ranked" />
        <OvernightSection items={data.overnight} />

        <SectionHeader n="02" title="Top Developments" hint="last 24-72h" />
        <DevelopmentsSection items={data.developments} />

        <SectionHeader n="03" title="Today's CRO Conversation" hint="ranked themes" />
        <CroConversationSection themes={data.themes} />

        <SectionHeader n="04" title="Editorial Intelligence" hint="other developments" />
        <EditorialSection cards={data.editorial} />

        <SectionHeader n="05" title="Japan & Asia Watch" hint="daily narrative" />
        <JapanSection data={data.japanAsia} />

        {data.radar.length ? (
          <>
            <SectionHeader n="06" title="Also on the Radar" hint="high-relevance near-misses" />
            <RadarSectionPdf items={data.radar} />
          </>
        ) : null}

        <View style={[styles.hr, { marginTop: 24 }]} />
        <Text style={styles.footerLine}>
          <Text style={styles.footerName}>Prepared by Rohit Kohli</Text>
          {"\n"}Personal decision-support and learning tool {"—"} not investment advice, not Mizuho output.
        </Text>
      </Page>
    </Document>
  );
}

/** Renders the Daily Risk Brief to a PDF buffer, ready to attach to an email. */
export async function renderDailyBriefPdf(data: DailyBriefData): Promise<Buffer> {
  return renderToBuffer(<DailyBriefDocument data={data} />);
}
