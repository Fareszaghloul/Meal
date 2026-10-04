import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { addDays, todayLocal, type DateString } from "@/lib/dates";
import type { WeightPageData } from "@/lib/domain";

export type WeightRange = "30" | "90" | "365" | "all";

/** First visible date for a range (the server adds the 6-day trend lead-in itself). */
export const rangeFrom = (range: WeightRange): DateString | undefined => (range === "all" ? undefined : addDays(todayLocal(), -Number(range)));

// One cached payload per range, with in-flight de-duplication. Cleared by invalidateAll() (weight edits, imports).
const cache = new Map<WeightRange, WeightPageData>();
const inflight = new Map<WeightRange, Promise<WeightPageData>>();

export function fetchWeight(range: WeightRange, force = false): Promise<WeightPageData> {
  const hit = cache.get(range);
  if (hit && !force) return Promise.resolve(hit);
  const pending = inflight.get(range);
  if (pending) return pending;
  const from = rangeFrom(range);
  const p = api<WeightPageData>(`/api/weight${from ? `?from=${from}` : ""}`)
    .then((data) => {
      cache.set(range, data);
      return data;
    })
    .finally(() => inflight.delete(range));
  inflight.set(range, p);
  return p;
}

/** Weight page data for a range. Reloads once when a weight change calls invalidateAll(). */
export function useWeightData(range: WeightRange) {
  const [data, setData] = useState<WeightPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = useRef(range);

  const load = useCallback(
    (force = false) => {
      current.current = range;
      setError(null);
      fetchWeight(range, force)
        .then((d) => {
          if (current.current === range) setData(d);
        })
        .catch((e) => {
          if (current.current === range) setError(e instanceof Error ? e.message : "Failed to load");
        });
    },
    [range]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // invalidateAll() dispatches day-updated with a null date; per-day logging events carry a date and don't touch weight.
    const onUpdated = (e: Event) => {
      if ((e as CustomEvent<{ date: DateString | null }>).detail?.date) return;
      cache.clear();
      load(true);
    };
    window.addEventListener("mealprep:day-updated", onUpdated);
    return () => window.removeEventListener("mealprep:day-updated", onUpdated);
  }, [load]);

  return { data, error, reload: () => load(true) };
}
