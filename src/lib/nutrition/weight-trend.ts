import { addDays, type DateString } from "@/lib/dates";
import type { WeightSummary } from "@/lib/domain";

/**
 * The one weight-trend engine.
 *
 * raw daily readings → group by calendar date → mean per date → trailing 7-calendar-day mean of those day values.
 * A day with three weigh-ins therefore counts once, not three times.
 * "Current/latest" is NOT a mean: it is the latest actual reading (see `latestReading`).
 */
export interface WeightPoint {
  date: DateString;
  weightKg: number;
}

export interface WeightReading extends WeightPoint {
  time?: string | null;
  createdAt?: string | Date | null;
}

const stamp = (c: WeightReading["createdAt"]) => (c ? new Date(c).getTime() : 0);

/** Chronological order: date, then time (missing time = earliest of the day), then createdAt. */
export function compareReadings(a: WeightReading, b: WeightReading): number {
  return a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || stamp(a.createdAt) - stamp(b.createdAt);
}

export function latestReading<T extends WeightReading>(rows: T[]): T | null {
  return rows.reduce<T | null>((best, r) => (best === null || compareReadings(r, best) > 0 ? r : best), null);
}

/** One point per calendar date holding the mean of that date's readings, ascending. */
export function dailyMeans(readings: WeightPoint[]): WeightPoint[] {
  const byDate = new Map<DateString, { sum: number; n: number }>();
  for (const r of readings) {
    const d = byDate.get(r.date) ?? { sum: 0, n: 0 };
    d.sum += r.weightKg;
    d.n += 1;
    byDate.set(r.date, d);
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({ date, weightKg: d.sum / d.n }));
}

/** Mean of day values in the `days` ending on `end` (inclusive), over already-grouped days; null if none. */
function windowMean(days: WeightPoint[], end: DateString, span = 7): number | null {
  const start = addDays(end, -(span - 1));
  let sum = 0;
  let n = 0;
  for (const d of days) {
    if (d.date >= start && d.date <= end) {
      sum += d.weightKg;
      n += 1;
    }
  }
  return n === 0 ? null : sum / n;
}

/** Trailing average over day means for readings of any frequency; null if the window is empty. */
export function trailingAverage(readings: WeightPoint[], end: DateString, span = 7): number | null {
  return windowMean(dailyMeans(readings), end, span);
}

export interface TrendDay {
  date: DateString;
  meanKg: number;
  trendKg: number;
}

/** One entry per logged date: the day's mean and its trailing 7-day average. Linear in the number of days. */
export function withTrend(readings: WeightPoint[]): TrendDay[] {
  const days = dailyMeans(readings);
  const out: TrendDay[] = [];
  let left = 0;
  let sum = 0;
  for (let i = 0; i < days.length; i++) {
    sum += days[i].weightKg;
    const start = addDays(days[i].date, -6);
    while (days[left].date < start) sum -= days[left++].weightKg;
    out.push({ date: days[i].date, meanKg: days[i].weightKg, trendKg: sum / (i - left + 1) });
  }
  return out;
}

/**
 * Trend compares 7-day averages a week / a month apart, so a single heavy
 * breakfast doesn't read as a gain. Values are exact kg: rounding happens only when displayed, so a kg→lb
 * conversion never compounds a rounding step. Anchored at `anchor` (default: the latest reading's date).
 */
export function summarize(readings: WeightReading[], anchor?: DateString): Omit<WeightSummary, "goalKg" | "unit"> {
  const latest = latestReading(readings);
  if (!latest) {
    return { latestKg: null, latestDate: null, avg7Kg: null, change7Kg: null, change30Kg: null, startKg: null };
  }
  const first = readings.reduce((a, b) => (compareReadings(b, a) < 0 ? b : a));
  const days = dailyMeans(readings);
  const at = anchor ?? latest.date;
  const avg7 = windowMean(days, at);
  const weekAgo = windowMean(days, addDays(at, -7));
  const monthAgo = windowMean(days, addDays(at, -30));
  return {
    latestKg: latest.weightKg,
    latestDate: latest.date,
    avg7Kg: avg7,
    change7Kg: avg7 !== null && weekAgo !== null ? avg7 - weekAgo : null,
    change30Kg: avg7 !== null && monthAgo !== null ? avg7 - monthAgo : null,
    startKg: first.weightKg,
  };
}
