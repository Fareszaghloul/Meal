import { round } from "@/lib/nutrition/core";
import { addDays, type DateString } from "@/lib/dates";
import type { WeightSummary } from "@/lib/domain";

export interface WeightPoint {
  date: DateString;
  weightKg: number;
}

/** Mean of readings in the `days` ending on `end` (inclusive); null if none. */
export function trailingAverage(points: WeightPoint[], end: DateString, days = 7): number | null {
  const start = addDays(end, -(days - 1));
  const inWindow = points.filter((p) => p.date >= start && p.date <= end);
  if (inWindow.length === 0) return null;
  return inWindow.reduce((s, p) => s + p.weightKg, 0) / inWindow.length;
}

/** Each point with its trailing 7-day average, for charting a smooth trend over noisy daily readings. */
export function withTrend(points: WeightPoint[]): Array<WeightPoint & { trendKg: number }> {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p) => ({ ...p, trendKg: trailingAverage(sorted, p.date) ?? p.weightKg }));
}

/**
 * Trend compares 7-day averages a week / a month apart, so a single heavy
 * breakfast doesn't read as a gain.
 */
export function summarize(points: WeightPoint[]): Omit<WeightSummary, "goalKg" | "unit"> {
  if (points.length === 0) {
    return { latestKg: null, latestDate: null, avg7Kg: null, change7Kg: null, change30Kg: null, startKg: null };
  }
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const avg7 = trailingAverage(sorted, latest.date);
  const avg7WeekAgo = trailingAverage(sorted, addDays(latest.date, -7));
  const avg7MonthAgo = trailingAverage(sorted, addDays(latest.date, -30));
  const r = (v: number | null) => (v === null ? null : round(v, 1));
  return {
    latestKg: round(latest.weightKg, 1),
    latestDate: latest.date,
    avg7Kg: r(avg7),
    change7Kg: avg7 !== null && avg7WeekAgo !== null ? round(avg7 - avg7WeekAgo, 1) : null,
    change30Kg: avg7 !== null && avg7MonthAgo !== null ? round(avg7 - avg7MonthAgo, 1) : null,
    startKg: round(sorted[0].weightKg, 1),
  };
}
