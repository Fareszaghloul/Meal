"use client";

/**
 * Client cache + write queue for the daily log.
 *
 *  - `useDay(date)` returns cached DayData instantly and revalidates in the background.
 *  - Mutations apply optimistically, then go through a persistent outbox (localStorage)
 *    that retries on network/server failure and survives reloads. A validation error
 *    (4xx) reverts the optimistic change and reports it; nothing is silently dropped.
 *  - Entries carry a client-generated UUID so a retried POST can never duplicate.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api, ApiError } from "@/lib/client/api";
import { toast } from "@/components/ui/Toast";
import { roundNutrients, scaleNutrients, sumNutrients, toNutrients } from "@/lib/nutrition/core";
import type { DayData, MealCategory, MealItem } from "@/lib/domain";
import type { DateString } from "@/lib/dates";
import type { MealItemInput, MealItemPatch } from "@/lib/validation";

type Listener = () => void;

interface Op {
  id: string;
  kind: "create" | "update" | "delete" | "water-add" | "water-undo";
  url: string;
  method: "POST" | "PUT" | "DELETE";
  body?: unknown;
  date: DateString;
  entryId?: string;
  attempts: number;
}

const OUTBOX_KEY = "mealprep.outbox.v1";

const cache = new Map<DateString, DayData>();
const inflight = new Map<DateString, Promise<DayData>>();
const listeners = new Set<Listener>();
let outbox: Op[] = loadOutbox();
let processing = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let syncState: "idle" | "saving" | "offline" | "error" = "idle";

function emit() {
  for (const l of listeners) l();
}

function loadOutbox(): Op[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveOutbox() {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch {
    /* storage full or unavailable: queue still lives in memory */
  }
}

export function getSyncState() {
  return { state: syncState, pending: outbox.length };
}

function recompute(day: DayData): DayData {
  return { ...day, totals: roundNutrients(sumNutrients(day.entries)) };
}

function setDay(date: DateString, updater: (d: DayData) => DayData) {
  const current = cache.get(date);
  if (!current) return;
  cache.set(date, recompute(updater(current)));
  emit();
}

export async function fetchDay(date: DateString, force = false): Promise<DayData> {
  if (!force && cache.has(date)) return cache.get(date)!;
  const existing = inflight.get(date);
  if (existing) return existing;
  const p = api<DayData>(`/api/day?date=${date}`)
    .then((data) => {
      // Re-apply pending optimistic ops for this date on top of server truth.
      cache.set(date, applyPending(data));
      emit();
      return cache.get(date)!;
    })
    .finally(() => inflight.delete(date));
  inflight.set(date, p);
  return p;
}

function applyPending(day: DayData): DayData {
  let d = day;
  for (const op of outbox) {
    if (op.date !== day.date) continue;
    if (op.kind === "create") {
      const body = op.body as MealItem;
      if (!d.entries.some((e) => e.id === body.id)) d = { ...d, entries: [...d.entries, { ...body, _pending: "saving" }] };
    } else if (op.kind === "delete") {
      d = { ...d, entries: d.entries.filter((e) => e.id !== op.entryId) };
    } else if (op.kind === "update") {
      d = { ...d, entries: d.entries.map((e) => (e.id === op.entryId ? { ...e, ...(op.body as Partial<MealItem>), _pending: "saving" } : e)) };
    } else if (op.kind === "water-add") {
      d = { ...d, water: { ...d.water, totalMl: d.water.totalMl + (op.body as { amountMl: number }).amountMl } };
    }
  }
  return recompute(d);
}

export function invalidateAll() {
  cache.clear();
  emit();
}

export function prefetchDay(date: DateString) {
  if (!cache.has(date) && !inflight.has(date)) void fetchDay(date).catch(() => undefined);
}

/* ───────────── outbox ───────────── */

function enqueue(op: Omit<Op, "attempts">) {
  outbox.push({ ...op, attempts: 0 });
  saveOutbox();
  void flush();
}

export async function flush() {
  if (processing || outbox.length === 0) return;
  processing = true;
  syncState = "saving";
  emit();
  while (outbox.length > 0) {
    const op = outbox[0];
    try {
      const result = await api<unknown>(op.url, { method: op.method, json: op.body });
      outbox.shift();
      saveOutbox();
      onSuccess(op, result);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, "Offline", "offline");
      if (err.retryable) {
        op.attempts += 1;
        saveOutbox();
        syncState = err.status === 0 ? "offline" : "error";
        emit();
        processing = false;
        scheduleFlush(Math.min(30_000, 1000 * 2 ** Math.min(op.attempts, 5)));
        return;
      }
      // Permanent failure: drop it, revert the optimistic change, tell the user.
      outbox.shift();
      saveOutbox();
      onPermanentFailure(op, err);
    }
  }
  processing = false;
  syncState = "idle";
  emit();
}

function scheduleFlush(ms: number) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, ms);
}

function onSuccess(op: Op, result: unknown) {
  if (op.kind === "create" || op.kind === "update") {
    const item = result as MealItem;
    setDay(op.date, (d) => ({ ...d, entries: d.entries.map((e) => (e.id === item.id ? { ...item } : e)) }));
  } else if (op.kind === "water-add" || op.kind === "water-undo") {
    const r = result as { totalMl?: number };
    if (typeof r?.totalMl === "number") setDay(op.date, (d) => ({ ...d, water: { ...d.water, totalMl: r.totalMl! } }));
  }
  // Any create/delete may affect the food's "recent" ranking; keep it simple.
}

function onPermanentFailure(op: Op, err: ApiError) {
  toast(`Couldn't save: ${err.message}`, { kind: "error" });
  cache.delete(op.date);
  void fetchDay(op.date, true);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flush());
  // Try to flush anything left over from a previous session.
  setTimeout(() => void flush(), 500);
}

/* ───────────── mutations ───────────── */

export function addEntry(input: Omit<MealItemInput, "id"> & { id?: string }): MealItem {
  const id = input.id ?? crypto.randomUUID();
  const item: MealItem = {
    id,
    date: input.date,
    mealCategory: input.mealCategory,
    name: input.name,
    servings: input.servings,
    servingUnit: input.servingUnit ?? "serving",
    foodId: input.foodId ?? null,
    recipeId: input.recipeId ?? null,
    loggedAt: new Date().toISOString(),
    ...roundNutrients(toNutrients(input)),
  };
  setDay(input.date, (d) => ({ ...d, entries: [...d.entries, { ...item, _pending: "saving" }] }));
  enqueue({ id, kind: "create", url: "/api/food-log", method: "POST", body: { ...item, loggedAt: undefined }, date: input.date, entryId: id });
  return item;
}

export function updateEntry(current: MealItem, patch: MealItemPatch) {
  const next: MealItem = { ...current, ...patch, servingUnit: patch.servingUnit ?? current.servingUnit } as MealItem;
  const macroTouched = ["calories", "protein", "carbs", "fat", "fiber"].some((k) => k in patch);
  if (patch.servings !== undefined && !macroTouched && current.servings > 0) {
    Object.assign(next, roundNutrients(scaleNutrients(toNutrients(current), patch.servings / current.servings)));
  }
  const movedDate = patch.date && patch.date !== current.date;
  setDay(current.date, (d) => ({
    ...d,
    entries: movedDate ? d.entries.filter((e) => e.id !== current.id) : d.entries.map((e) => (e.id === current.id ? { ...next, _pending: "saving" } : e)),
  }));
  if (movedDate) cache.delete(patch.date!);
  enqueue({ id: crypto.randomUUID(), kind: "update", url: `/api/food-log/${current.id}`, method: "PUT", body: patch, date: movedDate ? patch.date! : current.date, entryId: current.id });
}

export function deleteEntry(item: MealItem) {
  setDay(item.date, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== item.id) }));
  enqueue({ id: crypto.randomUUID(), kind: "delete", url: `/api/food-log/${item.id}`, method: "DELETE", date: item.date, entryId: item.id });
}

export function duplicateEntry(item: MealItem, mealCategory: MealCategory = item.mealCategory) {
  const { id, loggedAt, _pending, ...rest } = item;
  void id;
  void loggedAt;
  void _pending;
  return addEntry({ ...rest, mealCategory });
}

export function addWater(date: DateString, amountMl: number) {
  setDay(date, (d) => ({ ...d, water: { ...d.water, totalMl: d.water.totalMl + amountMl } }));
  enqueue({ id: crypto.randomUUID(), kind: "water-add", url: "/api/water-log", method: "POST", body: { date, amountMl }, date });
}

export function undoWater(date: DateString) {
  enqueue({ id: crypto.randomUUID(), kind: "water-undo", url: `/api/water-log?date=${date}`, method: "DELETE", date });
}

/** Server-side copies (yesterday's meal, templates) — awaited, then the day is refetched. */
export async function copyEntries(body: { fromDate: DateString; toDate: DateString; fromMealCategory?: MealCategory; toMealCategory?: MealCategory; entryIds?: string[] }) {
  const created = await api<MealItem[]>("/api/food-log/copy", { method: "POST", json: body });
  cache.delete(body.toDate);
  await fetchDay(body.toDate, true);
  return created;
}

export async function logTemplate(templateId: string, date: DateString, mealCategory: MealCategory) {
  const created = await api<MealItem[]>(`/api/templates/${templateId}`, { method: "POST", json: { date, mealCategory } });
  cache.delete(date);
  await fetchDay(date, true);
  return created;
}

/* ───────────── hooks ───────────── */

const subscribe = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useDay(date: DateString) {
  const day = useSyncExternalStore(subscribe, () => cache.get(date) ?? null, () => null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setError(null);
    fetchDay(date).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [date]);
  const refresh = useCallback(() => fetchDay(date, true), [date]);
  return { day, error, refresh };
}

let lastSnapshot = getSyncState();
function syncSnapshot() {
  const next = getSyncState();
  if (next.state !== lastSnapshot.state || next.pending !== lastSnapshot.pending) lastSnapshot = next;
  return lastSnapshot;
}
const serverSync = { state: "idle" as const, pending: 0 };

export function useSyncStatus() {
  return useSyncExternalStore(subscribe, syncSnapshot, () => serverSync);
}
