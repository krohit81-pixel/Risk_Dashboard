// lib/snapshotStore.ts
// Persistence for the daily editorial snapshot.
//
// Uses Vercel KV / Upstash (REST) when KV_REST_API_URL + KV_REST_API_TOKEN are
// present. Falls back to an in-memory map for local dev (NOT durable across
// serverless instances — KV is required for the production daily-freeze
// guarantee). All values are JSON strings.

import type { EditorialSnapshot, SnapshotSlot } from "./types";

const URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

export function storeAvailable(): boolean {
  return Boolean(URL && TOKEN);
}

// ── In-memory fallback (per-instance) ──
const mem = new Map<string, string>();

async function cmd(command: unknown[]): Promise<unknown> {
  if (!storeAvailable()) {
    // Emulate the handful of commands we use against the in-memory map.
    const [op, key, val] = command as [string, string, string?];
    if (op === "SET") { mem.set(key, val ?? ""); return "OK"; }
    if (op === "GET") return mem.get(key) ?? null;
    if (op === "DEL") { mem.delete(key); return 1; }
    return null;
  }
  const res = await fetch(URL as string, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV ${command[0]} failed: ${res.status}`);
  const json = (await res.json()) as { result?: unknown };
  return json.result ?? null;
}

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const v = (await cmd(["GET", key])) as string | null;
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: unknown): Promise<void> {
  await cmd(["SET", key, JSON.stringify(value)]);
}

// ── Keys & history ──
const LATEST = "snapshot:latest";
const INDEX = "snapshot:index"; // rolling list of {date, slot, generatedISO}
const WEEKLY = "weekly:latest";
const MAX_HISTORY = 28; // 14 days × 2 slots

interface IndexEntry {
  date: string;
  slot: SnapshotSlot;
  generatedISO: string;
}

function snapKey(date: string, slot: SnapshotSlot): string {
  return `snapshot:${date}:${slot}`;
}

/** Persist a freshly generated snapshot + update the rolling history index. */
export async function saveSnapshot(snap: EditorialSnapshot): Promise<void> {
  const date = istDateKey(new Date(snap.meta.generatedISO));
  await kvSet(snapKey(date, snap.meta.slot), snap);
  await kvSet(LATEST, snap);

  const index = (await kvGet<IndexEntry[]>(INDEX)) ?? [];
  index.unshift({ date, slot: snap.meta.slot, generatedISO: snap.meta.generatedISO });
  // prune
  while (index.length > MAX_HISTORY) {
    const old = index.pop()!;
    await cmd(["DEL", snapKey(old.date, old.slot)]).catch(() => {});
  }
  await kvSet(INDEX, index);
}

export async function getLatestSnapshot(): Promise<EditorialSnapshot | null> {
  return kvGet<EditorialSnapshot>(LATEST);
}

/** Most recent N snapshots (newest first) — powers the weekly summary. */
export async function getRecentSnapshots(n: number): Promise<EditorialSnapshot[]> {
  const index = (await kvGet<IndexEntry[]>(INDEX)) ?? [];
  const out: EditorialSnapshot[] = [];
  for (const e of index.slice(0, n)) {
    const s = await kvGet<EditorialSnapshot>(snapKey(e.date, e.slot));
    if (s) out.push(s);
  }
  return out;
}

export async function getWeekly(): Promise<EditorialSnapshot["intelligence"]["weekly"] | null> {
  return kvGet(WEEKLY);
}
export async function saveWeekly(weekly: EditorialSnapshot["intelligence"]["weekly"]): Promise<void> {
  await kvSet(WEEKLY, weekly);
}

// ── IST time helpers ──

/** Current time shifted to IST (UTC+5:30). */
export function istNow(d = new Date()): Date {
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
}

/** YYYY-MM-DD in IST. */
export function istDateKey(d = new Date()): string {
  return istNow(d).toISOString().slice(0, 10);
}

/** Which slot a given moment belongs to, by IST hour. */
export function slotForNow(d = new Date()): SnapshotSlot {
  const h = istNow(d).getUTCHours();
  // Morning cron ~06:00 IST; evening cron ~20:30 IST. Split at 14:00 IST.
  return h < 14 ? "morning" : "evening";
}

export function slotLabel(slot: SnapshotSlot): string {
  return slot === "morning" ? "Morning briefing" : "Evening update";
}

// ── Theme persistence (NEW / Day-N) ──────────────────────────────
// Tracks the first time each topicId appeared and how many snapshots it has
// featured in, so the UI can show "New today" vs "Day 14 · ongoing".

export interface TopicSeen {
  firstISO: string; // IST date (YYYY-MM-DD) first seen
  lastISO: string;  // IST date last seen
  count: number;    // snapshots featuring this topic
}
type TopicSeenMap = Record<string, TopicSeen>;

const TOPIC_KEY = "ed:topicSeen";
const memTopics: { map: TopicSeenMap } = { map: {} };

/** Stable key for a theme across days (lowercase slug). */
export function normalizeTopicId(id: string): string {
  return (id || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getTopicSeen(): Promise<TopicSeenMap> {
  if (!storeAvailable()) return memTopics.map;
  const map = await kvGet<TopicSeenMap>(TOPIC_KEY);
  return map ?? {};
}

/** Record today's topics; returns the updated map for immediate use. */
export async function recordTopicsSeen(topicIds: string[], dateKey: string): Promise<TopicSeenMap> {
  const map = await getTopicSeen();
  for (const id of topicIds) {
    if (!id) continue;
    const prev = map[id];
    if (prev) {
      // Only increment once per day.
      if (prev.lastISO !== dateKey) prev.count += 1;
      prev.lastISO = dateKey;
    } else {
      map[id] = { firstISO: dateKey, lastISO: dateKey, count: 1 };
    }
  }
  memTopics.map = map;
  if (storeAvailable()) {
    try {
      await kvSet(TOPIC_KEY, map);
    } catch {
      /* ignore */
    }
  }
  return map;
}

/** Whole days between two IST date keys (YYYY-MM-DD). */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

// ── Concept library "seen" tracking (Learn tab auto-collect) ──────
import type { ConceptSeen } from "./types";

type ConceptSeenMap = Record<string, ConceptSeen>;
const CONCEPT_KEY = "learn:conceptSeen";
const memConcepts: { map: ConceptSeenMap } = { map: {} };

export async function getConceptSeen(): Promise<ConceptSeenMap> {
  if (!storeAvailable()) return memConcepts.map;
  const map = await kvGet<ConceptSeenMap>(CONCEPT_KEY);
  return map ?? {};
}

/** Record concept→theme appearances for today; returns updated map. */
export async function recordConceptsSeen(
  hits: { id: string; theme: string }[],
  dateKey: string
): Promise<ConceptSeenMap> {
  const map = await getConceptSeen();
  // de-dupe per concept this run
  const byId = new Map<string, Set<string>>();
  for (const h of hits) {
    if (!byId.has(h.id)) byId.set(h.id, new Set());
    if (h.theme) byId.get(h.id)!.add(h.theme);
  }
  for (const [id, themesSet] of byId) {
    const prev = map[id];
    const themes = [...themesSet];
    if (prev) {
      if (prev.lastISO !== dateKey) prev.count += 1;
      prev.lastISO = dateKey;
      prev.themes = [...new Set([...themes, ...prev.themes])].slice(0, 6);
    } else {
      map[id] = { firstISO: dateKey, lastISO: dateKey, count: 1, themes: themes.slice(0, 6) };
    }
  }
  memConcepts.map = map;
  if (storeAvailable()) {
    try {
      await kvSet(CONCEPT_KEY, map);
    } catch {
      /* ignore */
    }
  }
  return map;
}
