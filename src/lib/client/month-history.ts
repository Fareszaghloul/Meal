"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import type { MonthHistoryResponse } from "@/lib/domain";

/**
 * One shared cache of /api/history/month responses.
 * The History screen and the Today week strip read the same entries, so a month is requested once and both stay in sync.
 */
const cache = new Map<string, MonthHistoryResponse>();
// One request per month even if two effects (or React strict mode) ask at the same time.
const inflight = new Map<string, Promise<MonthHistoryResponse>>();

export const peekMonthHistory = (month: string): MonthHistoryResponse | null => cache.get(month) ?? null;

export async function fetchMonthHistory(month: string, force = false): Promise<MonthHistoryResponse> {
  if (!force) {
    const hit = cache.get(month);
    if (hit) return hit;
  }
  const pending = inflight.get(month) ?? api<MonthHistoryResponse>(`/api/history/month?month=${month}`).finally(() => inflight.delete(month));
  inflight.set(month, pending);
  const res = await pending;
  cache.set(month, res);
  return res;
}

/** Drop one month (or every month when null). Callers refetch on their next read. */
export function invalidateMonthHistory(month: string | null) {
  if (month === null) cache.clear();
  else cache.delete(month);
}

/**
 * Month summaries for a few months, kept fresh after every logging mutation (the same
 * "mealprep:day-updated" event History listens to). Missing months resolve as they arrive.
 */
export function useMonthHistories(months: string[]): Record<string, MonthHistoryResponse | undefined> {
  const key = months.join(",");
  const [, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const wanted = key ? key.split(",") : [];
    const load = (force: boolean) => {
      for (const m of wanted) {
        if (!force && cache.has(m)) continue;
        fetchMonthHistory(m, force)
          .then(() => !cancelled && setVersion((v) => v + 1))
          .catch(() => undefined);
      }
    };
    load(false);
    const onUpdated = (e: Event) => {
      const date = (e as CustomEvent<{ date: string | null }>).detail?.date ?? null;
      const month = date ? date.slice(0, 7) : null;
      invalidateMonthHistory(month);
      if (month === null || wanted.includes(month)) load(true);
    };
    window.addEventListener("mealprep:day-updated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("mealprep:day-updated", onUpdated);
    };
  }, [key]);

  const out: Record<string, MonthHistoryResponse | undefined> = {};
  for (const m of months) out[m] = cache.get(m);
  return out;
}
