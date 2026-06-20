// app/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "@/lib/types";
import { relativeTime } from "@/lib/format";
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
import { RadarSection } from "@/components/intel/RadarSection";
import { SavedList } from "@/components/saved/SavedList";
import type { SavedItem } from "@/lib/savedStore";
import { RunHistory } from "@/components/RunHistory";
import type { RunRecord } from "@/lib/runStore";
import { ResearchWorkspace } from "@/components/research/ResearchWorkspace";
import { resolveIntelligence } from "@/lib/layman";

export default function Page() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [learning, setLearning] = useState(false);
  const [tab, setTab] = useState<"today" | "markets" | "research" | "learn">("today");
  const [openConceptId, setOpenConceptId] = useState<string | null>(null);
  const openConcept = (id: string) => {
    setOpenConceptId(id);
    setTab("learn");
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-app">
      {/* Sticky compact header */}
      <header className="safe-top sticky top-0 z-20 border-b border-line bg-ink-900/85 backdrop-blur-md">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-steel/15 text-sm font-bold text-steel">
              R
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-fg">Global Risk Intelligence</p>
              <p className="text-2xs text-fg-faint">
                {data ? `Updated ${relativeTime(data.updatedISO)}` : "Loading…"}
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-line bg-ink-800 px-3 py-1.5 text-2xs font-semibold text-fg-muted transition active:scale-95 disabled:opacity-50"
            aria-label="Refresh data"
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </header>

      <div className="safe-bottom space-y-6 px-4 pt-4 pb-24">
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
            {tab === "today" ? (
              <div className="flex flex-col gap-1.5">
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
                  <p className="text-2xs leading-relaxed text-fg-faint">
                    Learning view — rewrites the conversation, editorial and Japan sections in plain English.
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* ===== TODAY ===== */}
            {tab === "today" ? (
              <>
                <MorningBrief brief={data.brief} anyLive={data.anyLive} />

                <CollapsibleSection id="whatchanged" n="01" title="What Changed" hint="biggest movers · risk-ranked" lockOpen>
                  <WhatChangedOvernight items={data.overnight} />
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
                    expandedCount={data.intelligence.expandedCount}
                    learning={learning}
                    onOpenConcept={openConcept}
                    savedIds={savedIds}
                    onToggleSave={toggleSave}
                    snapshotISO={data.intelligence.generatedISO}
                  />
                </CollapsibleSection>

                <CollapsibleSection id="editorial" n="04" title="Editorial Intelligence" hint="other developments" defaultOpen={false}>
                  <EditorialIntelligence cards={intel!.editorial} learning={learning} savedIds={savedIds} onToggleSave={toggleSave} snapshotISO={data.intelligence.generatedISO} />
                </CollapsibleSection>
                <CollapsibleSection id="japanasia" n="05" title="Japan & Asia Watch" hint="daily narrative" defaultOpen={false}>
                  <JapanAsiaWatchSection data={intel!.japanAsia} learning={learning} savedIds={savedIds} onToggleSave={toggleSave} snapshotISO={data.intelligence.generatedISO} />
                </CollapsibleSection>
                {intel!.radar?.length ? (
                  <CollapsibleSection id="radar" n="06" title="Also on the Radar" hint="high-relevance near-misses" defaultOpen={false}>
                    <RadarSection items={intel!.radar} />
                  </CollapsibleSection>
                ) : null}
                <CollapsibleSection id="runs" n="07" title="Generation History" hint="recent runs" defaultOpen={false}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-2xs leading-relaxed text-fg-faint">
                      Re-run today's editorial now. Takes ~1–2 minutes; the last good briefing is kept if it fails.
                    </p>
                    <button
                      type="button"
                      onClick={regenerate}
                      disabled={regenState === "running"}
                      className={`flex-none inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-2xs font-semibold transition ${
                        regenState === "running"
                          ? "border-line bg-ink-800 text-fg-faint"
                          : "border-line bg-ink-800 text-steel active:bg-ink-700"
                      }`}
                    >
                      {regenState === "running" ? "↻ Regenerating…" : regenState === "failed" ? "↻ Retry" : "↻ Regenerate"}
                    </button>
                  </div>
                  <RunHistory runs={runs} />
                </CollapsibleSection>
              </>
            ) : null}

            {/* ===== MARKETS ===== */}
            {tab === "markets" ? (
              <>
                <CollapsibleSection id="crodash" n="01" title="Key CRO Dashboard" hint="live indicators" defaultOpen>
                  <CroDashboard indicators={data.indicators} />
                </CollapsibleSection>
                <CollapsibleSection id="japanwatch" n="02" title="Japan Watch" hint="🇯🇵 carry & rates" defaultOpen>
                  <JapanWatch indicators={data.japanWatch} />
                </CollapsibleSection>
                <CollapsibleSection id="heatmap" n="03" title="Global Risk Heat Map" hint="tap a region" defaultOpen>
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
                <CollapsibleSection id="analyses" n="01" title="Saved Analyses" hint={`${savedAnalyses.length} item${savedAnalyses.length === 1 ? "" : "s"}`} defaultOpen={savedAnalyses.length > 0}>
                  <SavedList items={savedAnalyses} onRemove={removeSavedItem} />
                </CollapsibleSection>
                <CollapsibleSection id="saved" n="02" title="Saved for Later" hint={`${savedDaily.length} item${savedDaily.length === 1 ? "" : "s"}`} defaultOpen={savedDaily.length > 0}>
                  <SavedList items={savedDaily} onRemove={removeSavedItem} />
                </CollapsibleSection>
                <CollapsibleSection id="library" n="03" title="Concept Library" hint="your growing glossary" lockOpen>
                  <ConceptLibrary
                    conceptSeen={data.conceptSeen ?? {}}
                    openId={openConceptId}
                    onConsumeOpen={() => setOpenConceptId(null)}
                  />
                </CollapsibleSection>
                <CollapsibleSection id="weekly" n="04" title="Weekly Learning Summary" hint="generated weekly" defaultOpen={false}>
                  <WeeklyLearningSection data={data.intelligence.weekly} />
                </CollapsibleSection>
              </>
            ) : null}

            <footer className="pt-2 text-center">
              <p className="text-2xs leading-relaxed text-fg-faint">
                <span className="font-semibold text-fg-muted">Prepared by Rohit Kohli</span>
                <br />
                Macro: FRED · Markets: Yahoo Finance · News: Finnhub, Marketaux, NewsData.
                Personal decision-support and learning tool — not investment advice, not Mizuho output.
              </p>
            </footer>
          </>
        ) : null}
      </div>

      {/* ===== bottom tab bar ===== */}
      {data ? (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-app border-t border-line bg-ink-900/95 backdrop-blur-md">
          {([
            ["today", "Today"],
            ["markets", "Markets"],
            ["research", "Research"],
            ["learn", "Learn"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                window.scrollTo(0, 0);
              }}
              className={`flex-1 py-3 text-xs font-semibold transition ${
                tab === id ? "text-steel" : "text-fg-faint"
              }`}
            >
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
