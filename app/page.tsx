// app/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "@/lib/types";
import { relativeTime } from "@/lib/format";
import { APP_VERSION } from "@/lib/version";
import { MorningBrief } from "@/components/MorningBrief";
import { TopDevelopments } from "@/components/TopDevelopments";
import { WhatChanged } from "@/components/WhatChanged";
import { EmergingRisks } from "@/components/EmergingRisks";
import { RiskHeatMap } from "@/components/RiskHeatMap";
import { CroDashboard } from "@/components/CroDashboard";
import { JapanWatch } from "@/components/JapanWatch";
import { BankImplications } from "@/components/BankImplications";
import { CroConversation } from "@/components/intel/CroConversation";
import { EditorialIntelligence } from "@/components/intel/EditorialIntelligence";
import { JapanAsiaWatchSection } from "@/components/intel/JapanAsiaWatch";
import { WeeklyLearningSection } from "@/components/intel/WeeklyLearning";
import { SnapshotHeader } from "@/components/intel/SnapshotHeader";
import { StaleBanner } from "@/components/intel/StaleBanner";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { WhatChangedOvernight } from "@/components/WhatChangedOvernight";
import { ConceptLibrary } from "@/components/learn/ConceptLibrary";
import { MizuhoReference } from "@/components/learn/MizuhoReference";
import { BankEarnings } from "@/components/learn/BankEarnings";
import { MizuhoQ1Earnings } from "@/components/learn/MizuhoQ1Earnings";
import { BriefingBooks } from "@/components/learn/BriefingBooks";
import { AppearanceToggle } from "@/components/learn/AppearanceToggle";
import { ConceptStudio } from "@/components/learn/ConceptStudio";
import { RadarSection } from "@/components/intel/RadarSection";
import { SavedList } from "@/components/saved/SavedList";
import type { SavedItem } from "@/lib/savedStore";
import { RunHistory, BloombergRunHistory } from "@/components/RunHistory";
import type { RunRecord } from "@/lib/runStore";
import { ResearchWorkspace } from "@/components/research/ResearchWorkspace";
import { resolveIntelligence } from "@/lib/layman";
import { AppFooter } from "@/components/shared/AppFooter";
import { HomeIcon, MarketsIcon, ResearchIcon, LearnIcon } from "@/components/shared/NavIcons";
import type { UserConcept } from "@/lib/userConcepts";

// V5.10.4 — the app was single-width (max-w-app, 560px) at every viewport size, including
// iPad/macOS Safari windows far wider than that, wasting most of the screen. This widens the
// shell progressively at standard Tailwind breakpoints (md ~iPad portrait, lg ~iPad landscape/
// small Mac windows, xl ~larger Mac windows) while leaving phone-width layout untouched.
// `<nav>` below must use this exact same string — it's `fixed` and positioned independently of
// `<main>`, so a mismatch here would visually misalign the tab bar from the content edges.
// `ConceptLibrary.tsx`'s full-screen overlay duplicates this string for the same reason (can't
// import a const across the client-component boundary usefully here) — keep both in sync.
const SHELL_WIDTH = "max-w-app md:max-w-2xl lg:max-w-4xl xl:max-w-5xl";

export default function Page() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [learning, setLearning] = useState(false);
  const [tab, setTab] = useState<"today" | "markets" | "research" | "learn" | "settings">("today");
  const [openConceptId, setOpenConceptId] = useState<string | null>(null);
  const openConcept = (id: string) => {
    setOpenConceptId(id);
    setTab("learn");
    window.scrollTo(0, 0);
  };

  // V5.6.1 — today's date in the header (replaces the old top Refresh button; Refresh now
  // lives in Settings → Generation History). Gated on mount to avoid a server/client date mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const todayLabel = mounted
    ? new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : "";

  // ── Add Concept (Settings) ↔ Your Concepts (Learn → Concept Library) ──
  // Editing a saved concept routes the user to Settings → Add Concept, pre-filled.
  const [editConceptTarget, setEditConceptTarget] = useState<UserConcept | null>(null);
  const [conceptRefreshKey, setConceptRefreshKey] = useState(0);
  const openEditUserConcept = (c: UserConcept) => {
    setEditConceptTarget(c);
    setTab("settings");
    window.scrollTo(0, 0);
  };

  // Learning view applies only to the Today intelligence sections (03+).
  const intel = data ? resolveIntelligence(data.intelligence, learning) : null;
  // Markets sections (implications, emerging risks) are not affected by the toggle.
  const implications = data ? data.implications : [];
  const emergingRisks = data ? data.emergingRisks : [];

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("bad response");
      setData((await res.json()) as DashboardData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Save for Later ──
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const savedIds = new Set(savedItems.map((s) => s.id));
  const savedAnalyses = savedItems.filter((s) => s.kind === "analysis");
  const savedDaily = savedItems.filter((s) => s.kind !== "analysis");
  const loadSaved = useCallback(async () => {
    try {
      const r = await fetch("/api/saved", { cache: "no-store" });
      if (r.ok) setSavedItems(((await r.json()).items ?? []) as SavedItem[]);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const toggleSave = useCallback(
    async (item: SavedItem) => {
      const exists = savedItems.some((s) => s.id === item.id);
      setSavedItems((prev) => (exists ? prev.filter((s) => s.id !== item.id) : [item, ...prev]));
      try {
        if (exists) await fetch(`/api/saved?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
        else
          await fetch("/api/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
      } catch {
        loadSaved();
      }
    },
    [savedItems, loadSaved]
  );
  const removeSavedItem = useCallback(
    async (id: string) => {
      setSavedItems((prev) => prev.filter((s) => s.id !== id));
      try {
        await fetch(`/api/saved?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch {
        loadSaved();
      }
    },
    [loadSaved]
  );

  // ── Manual regenerate ──
  const [regenState, setRegenState] = useState<"idle" | "running" | "failed">("idle");
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const loadRuns = useCallback(async () => {
    try {
      const r = await fetch("/api/runs", { cache: "no-store" });
      if (r.ok) setRuns(((await r.json()).runs ?? []) as RunRecord[]);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const regenerate = useCallback(async () => {
    if (regenState === "running") return;
    setRegenState("running");
    try {
      const r = await fetch("/api/regenerate", { method: "POST" });
      if (r.ok) {
        await load();
        setRegenState("idle");
      } else {
        setRegenState("failed");
      }
    } catch {
      setRegenState("failed");
    } finally {
      loadRuns();
    }
  }, [regenState, load, loadRuns]);

  // ── Manual "Refresh Earnings" (V5.8.0) — separate from the editorial regenerate above;
  // re-checks all 15 Bank Earnings entries against real news and updates only banks where a
  // genuinely newer reported quarter was confirmed. earningsRefreshKey bump forces the
  // BankEarnings component to refetch /api/bank-earnings afterwards. ──
  const [earningsRegenState, setEarningsRegenState] = useState<"idle" | "running" | "failed">("idle");
  const [earningsRefreshKey, setEarningsRefreshKey] = useState(0);
  const refreshEarnings = useCallback(async () => {
    if (earningsRegenState === "running") return;
    setEarningsRegenState("running");
    try {
      const r = await fetch("/api/bank-earnings/refresh", { method: "POST" });
      setEarningsRegenState(r.ok ? "idle" : "failed");
      if (r.ok) setEarningsRefreshKey((k) => k + 1);
    } catch {
      setEarningsRegenState("failed");
    } finally {
      loadRuns();
    }
  }, [earningsRegenState, loadRuns]);

  // V5.10.1 — recovery path if a refresh run ever accepts a bad result again: drops the whole
  // overlay back to the curated baseline (lib/bankEarnings.ts). Confirmed since it discards
  // any refreshed banks, not just a broken one.
  const resetEarnings = useCallback(async () => {
    if (earningsRegenState === "running") return;
    if (!window.confirm("Reset all Bank Earnings entries to the curated baseline? This discards any banks updated by Refresh Earnings.")) return;
    try {
      await fetch("/api/bank-earnings/refresh", { method: "DELETE" });
      setEarningsRefreshKey((k) => k + 1);
    } finally {
      loadRuns();
    }
  }, [earningsRegenState, loadRuns]);

  return (
    <main className={`mx-auto min-h-screen w-full ${SHELL_WIDTH}`}>
      {/* Sticky compact header */}
      <header className="safe-top sticky top-0 z-20 border-b border-line bg-ink-900/85 backdrop-blur-md">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-fg">
                Risk Intelligence
                <span className="ml-1.5 align-middle text-[9px] font-medium text-fg-faint">v{APP_VERSION}</span>
              </p>
              <p className="text-2xs text-fg-faint">
                {data ? `Updated ${relativeTime(data.updatedISO)}` : "Loading…"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xs font-semibold text-fg-muted">{todayLabel}</span>
            <button
              onClick={() => {
                setTab("settings");
                window.scrollTo(0, 0);
              }}
              className={`flex h-[30px] w-[30px] flex-none flex-col items-center justify-center gap-[3px] rounded-lg border transition active:scale-95 ${
                tab === "settings" ? "border-steel/40 bg-steel/10" : "border-line bg-ink-800"
              }`}
              aria-label="Settings"
            >
              <span className={`h-[2px] w-4 rounded-full ${tab === "settings" ? "bg-steel" : "bg-fg-muted"}`} />
              <span className={`h-[2px] w-4 rounded-full ${tab === "settings" ? "bg-steel" : "bg-fg-muted"}`} />
              <span className={`h-[2px] w-4 rounded-full ${tab === "settings" ? "bg-steel" : "bg-fg-muted"}`} />
            </button>
          </div>
        </div>

        {/* Executive / Learning view — fixed at the top, alongside the header, while on Home. */}
        {data && tab === "today" ? (
          <div className="border-t border-line-soft px-5 py-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLearning(false)}
                className={`text-[13px] font-semibold transition ${
                  !learning ? "text-fg" : "text-fg-faint"
                }`}
              >
                Executive view
              </button>
              <button
                onClick={() => setLearning(true)}
                className={`text-[13px] font-semibold transition ${
                  learning ? "text-calm" : "text-fg-faint"
                }`}
              >
                Learning view
              </button>
            </div>
            {learning ? (
              <p className="mt-1 text-2xs leading-relaxed text-fg-faint">
                Learning view — rewrites the conversation, editorial and Japan sections in plain English.
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="safe-bottom-content space-y-6 px-4 pt-4">
        {loading && !data ? <Skeleton /> : null}

        {error && !data ? (
          <div className="mt-10 rounded-2xl border border-stress/30 bg-stress/5 px-5 py-8 text-center">
            <p className="text-sm font-semibold text-stress">Couldn’t load the brief</p>
            <p className="mt-1 text-[13px] text-fg-muted">
              Check your connection and try again.
            </p>
            <button
              onClick={load}
              className="mt-4 rounded-lg border border-line bg-ink-800 px-4 py-2 text-[13px] font-semibold text-fg"
            >
              Retry
            </button>
          </div>
        ) : null}

        {data ? (
          <>
            {/* ===== TODAY / HOME ===== */}
            {tab === "today" ? (
              <>
                <MorningBrief brief={data.brief} anyLive={data.anyLive} />

                <CollapsibleSection id="whatchanged" n="01" title="What Changed" hint="biggest movers · risk-ranked" lockOpen>
                  <WhatChangedOvernight items={data.overnight} indicators={data.indicators} />
                  <div className="mt-3">
                    <CollapsibleSection id="allindicators" n="" title="Show all indicators" defaultOpen={false}>
                      <WhatChanged indicators={data.indicators} />
                    </CollapsibleSection>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection id="developments" n="02" title="Top Developments" hint="last 24–72h" defaultOpen>
                  <TopDevelopments items={data.developments} />
                </CollapsibleSection>

                <StaleBanner meta={data.snapshotMeta} />
                <SnapshotHeader meta={data.snapshotMeta} />

                <CollapsibleSection id="conversation" n="03" title="Today's CRO Conversation" hint="ranked themes · tap Go deeper" lockOpen>
                  <CroConversation
                    themes={intel!.themes}
                    rawThemes={data.intelligence.themes}
                    expandedCount={data.intelligence.expandedCount}
                    learning={learning}
                    onOpenConcept={openConcept}
                    savedIds={savedIds}
                    onToggleSave={toggleSave}
                    snapshotISO={data.intelligence.generatedISO}
                  />
                </CollapsibleSection>

                <CollapsibleSection id="editorial" n="04" title="Editorial Intelligence" hint="other developments" defaultOpen={false}>
                  <EditorialIntelligence cards={intel!.editorial} rawCards={data.intelligence.editorial} learning={learning} savedIds={savedIds} onToggleSave={toggleSave} snapshotISO={data.intelligence.generatedISO} />
                </CollapsibleSection>
                <CollapsibleSection id="japanasia" n="05" title="Japan & Asia Watch" hint="daily narrative" defaultOpen={false}>
                  <JapanAsiaWatchSection data={intel!.japanAsia} raw={data.intelligence.japanAsia} learning={learning} savedIds={savedIds} onToggleSave={toggleSave} snapshotISO={data.intelligence.generatedISO} />
                </CollapsibleSection>
                {intel!.radar?.length ? (
                  <CollapsibleSection id="radar" n="06" title="Also on the Radar" hint="high-relevance near-misses" defaultOpen={false}>
                    <RadarSection items={intel!.radar} />
                  </CollapsibleSection>
                ) : null}
              </>
            ) : null}

            {/* ===== MARKETS ===== */}
            {tab === "markets" ? (
              <>
                <CollapsibleSection id="crodash" n="01" title="Key CRO Dashboard" hint="live indicators" defaultOpen>
                  <CroDashboard indicators={data.indicators} />
                </CollapsibleSection>
                <CollapsibleSection id="japanwatch" n="02" title="Japan Watch" hint="carry & rates" defaultOpen>
                  <JapanWatch indicators={data.japanWatch} />
                </CollapsibleSection>
                <CollapsibleSection id="heatmap" n="03" title="Global Risk Heat Map" hint="tap a region" defaultOpen>
                  {data.weeklyRefreshedISO ? (
                    <p className="mb-2 rounded-lg border border-steel/25 bg-steel/5 px-3 py-1.5 text-2xs leading-relaxed text-steel">
                      Weekly view · heat map, emerging risks & implications refreshed{" "}
                      {new Date(data.weeklyRefreshedISO).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  ) : null}
                  <RiskHeatMap regions={data.heatMap} />
                </CollapsibleSection>
                <CollapsibleSection id="emerging" n="04" title="Top Emerging Risks" hint="watchlist" defaultOpen={false}>
                  <EmergingRisks risks={emergingRisks} />
                </CollapsibleSection>
                <CollapsibleSection id="implications" n="05" title="Implications for a Global Bank" hint="CRO playbook" defaultOpen={false}>
                  <BankImplications items={implications} />
                </CollapsibleSection>
              </>
            ) : null}

            {/* ===== RESEARCH ===== */}
            {tab === "research" ? (
              <CollapsibleSection id="research" n="01" title="Research Workspace" hint="analyze any content" lockOpen>
                <ResearchWorkspace
                  onOpenConcept={openConcept}
                  onToggleSave={toggleSave}
                  savedIds={savedIds}
                />
              </CollapsibleSection>
            ) : null}

            {/* ===== LEARN ===== */}
            {tab === "learn" ? (
              <>
                <CollapsibleSection id="analyses" n="01" title="Saved Analyses" accent="#2DD4A7" hint={`${savedAnalyses.length} item${savedAnalyses.length === 1 ? "" : "s"}`} defaultOpen={savedAnalyses.length > 0}>
                  <SavedList items={savedAnalyses} onRemove={removeSavedItem} />
                </CollapsibleSection>
                <CollapsibleSection id="saved" n="02" title="Saved for Later" accent="#A78BFA" hint={`${savedDaily.length} item${savedDaily.length === 1 ? "" : "s"}`} defaultOpen={savedDaily.length > 0}>
                  <SavedList items={savedDaily} onRemove={removeSavedItem} />
                </CollapsibleSection>
                <CollapsibleSection id="learn-library" n="03" title="Concept Library" accent="#5B8DEF" hint="your growing glossary" defaultOpen>
                  <ConceptLibrary
                    conceptSeen={data.conceptSeen ?? {}}
                    openId={openConceptId}
                    onConsumeOpen={() => setOpenConceptId(null)}
                    onEditUserConcept={openEditUserConcept}
                    userConceptsRefreshKey={conceptRefreshKey}
                  />
                </CollapsibleSection>
                <CollapsibleSection id="weekly" n="04" title="Weekly Summary" accent="#F5A524" hint="generated weekly" defaultOpen={false}>
                  <WeeklyLearningSection data={data.intelligence.weekly} />
                </CollapsibleSection>
              </>
            ) : null}

            {/* ===== SETTINGS ===== */}
            {tab === "settings" ? (
              <>
                <p className="-mt-1 mb-1 text-2xs leading-relaxed text-fg-faint">
                  Appearance, references and maintenance tools live here — out of the way of the daily briefing.
                </p>
                <CollapsibleSection id="settings-appearance" n="01" title="Appearance" accent="#5B8DEF" hint="dark / light" defaultOpen>
                  <AppearanceToggle />
                </CollapsibleSection>
                <CollapsibleSection id="settings-briefingbooks" n="02" title="Briefing Books" accent="#2DD4A7" hint="print / PDF" defaultOpen={false}>
                  <BriefingBooks />
                </CollapsibleSection>
                <CollapsibleSection id="settings-addconcept" n="03" title="Add Concept" accent="#2DD4A7" hint="paste → analyze → save" defaultOpen={!!editConceptTarget}>
                  <ConceptStudio
                    editTarget={editConceptTarget}
                    onEditConsumed={() => setEditConceptTarget(null)}
                    onSaved={() => setConceptRefreshKey((k) => k + 1)}
                  />
                </CollapsibleSection>
                <CollapsibleSection id="settings-mizuhoref" n="04" title="Mizuho Reference" accent="#B79BFF" hint="disclosed positions" defaultOpen={false}>
                  <MizuhoReference />
                </CollapsibleSection>
                <CollapsibleSection id="settings-bankearnings" n="05" title="Bank Earnings" accent="#5B8DEF" hint="latest quarter · 15 banks" defaultOpen={false}>
                  <BankEarnings refreshKey={earningsRefreshKey} />
                </CollapsibleSection>
                <CollapsibleSection id="settings-genhistory" n="06" title="Generation History" accent="#F5A524" hint="today's runs" defaultOpen={false}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-2xs leading-relaxed text-fg-faint">
                      Refresh reloads the current briefing. Regenerate re-runs today's editorial (~1–2 minutes; the
                      last good briefing is kept if it fails). Refresh Earnings re-checks all 15 Bank Earnings
                      entries against real news and updates only the ones where a genuinely newer reported quarter
                      was confirmed — safe to click again next quarter. Reset Earnings discards any refreshed
                      entries and reverts every bank to the curated baseline, if a refresh ever produces a bad card.
                    </p>
                    <div className="flex flex-none flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={load}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-2xs font-semibold text-fg-muted transition active:scale-95 disabled:opacity-50"
                      >
                        {loading ? "…" : "↻ Refresh"}
                      </button>
                      <button
                        type="button"
                        onClick={regenerate}
                        disabled={regenState === "running"}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-2xs font-semibold transition ${
                          regenState === "running"
                            ? "border-line bg-ink-800 text-fg-faint"
                            : "border-line bg-ink-800 text-steel active:bg-ink-700"
                        }`}
                      >
                        {regenState === "running" ? "↻ Regenerating…" : regenState === "failed" ? "↻ Retry" : "↻ Regenerate"}
                      </button>
                      <button
                        type="button"
                        onClick={refreshEarnings}
                        disabled={earningsRegenState === "running"}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-2xs font-semibold transition ${
                          earningsRegenState === "running"
                            ? "border-line bg-ink-800 text-fg-faint"
                            : "border-line bg-ink-800 text-steel active:bg-ink-700"
                        }`}
                      >
                        {earningsRegenState === "running"
                          ? "↻ Refreshing earnings…"
                          : earningsRegenState === "failed"
                            ? "↻ Retry earnings"
                            : "↻ Refresh Earnings"}
                      </button>
                      <button
                        type="button"
                        onClick={resetEarnings}
                        disabled={earningsRegenState === "running"}
                        title="Discard any Bank Earnings entries updated by Refresh Earnings and revert to the curated baseline"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-2xs font-semibold text-fg-faint transition active:scale-95 disabled:opacity-50"
                      >
                        ↺ Reset Earnings
                      </button>
                    </div>
                  </div>
                  <RunHistory runs={runs} />
                  <BloombergRunHistory runs={data.bloombergRuns} />
                </CollapsibleSection>
                <CollapsibleSection id="settings-mizuhoq1" n="07" title="Mizuho Q1 Earnings" accent="#B79BFF" hint="FY26 Q1 · USD · Jul 30" defaultOpen={false}>
                  <MizuhoQ1Earnings />
                </CollapsibleSection>
              </>
            ) : null}

            <AppFooter />
          </>
        ) : null}
      </div>

      {/* ===== bottom tab bar ===== */}
      {data ? (
        <nav className={`safe-bottom-nav fixed inset-x-0 bottom-0 z-30 mx-auto flex ${SHELL_WIDTH} border-t border-line bg-ink-900/95 backdrop-blur-md`}>
          {([
            ["today", "Home", HomeIcon],
            ["markets", "Markets", MarketsIcon],
            ["research", "Research", ResearchIcon],
            ["learn", "Learn", LearnIcon],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                window.scrollTo(0, 0);
              }}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold transition ${
                tab === id ? "text-steel" : "text-fg-faint"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
      ) : null}
    </main>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-48 animate-pulse rounded-2xl border border-line bg-ink-800" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl border border-line bg-ink-800"
        />
      ))}
    </div>
  );
}
