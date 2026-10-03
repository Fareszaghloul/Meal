import { describe, expect, it } from "vitest";
import { summarize, trailingAverage, withTrend } from "@/lib/nutrition/weight-trend";

const series = [
  { date: "2026-09-01", weightKg: 80.0 },
  { date: "2026-09-02", weightKg: 80.6 }, // noisy day
  { date: "2026-09-03", weightKg: 79.8 },
  { date: "2026-09-05", weightKg: 79.7 },
  { date: "2026-09-08", weightKg: 79.4 },
  { date: "2026-09-10", weightKg: 79.5 },
  { date: "2026-09-15", weightKg: 79.0 },
];

describe("weight trend", () => {
  it("trailing average covers exactly 7 calendar days, inclusive", () => {
    // Window for 09-08 is 09-02..09-08 → 80.6, 79.8, 79.7, 79.4
    expect(trailingAverage(series, "2026-09-08")).toBeCloseTo((80.6 + 79.8 + 79.7 + 79.4) / 4, 6);
    expect(trailingAverage(series, "2026-08-31")).toBeNull();
  });

  it("summary uses averages so a single spike doesn't read as a gain", () => {
    const s = summarize(series);
    expect(s.latestKg).toBe(79);
    expect(s.startKg).toBe(80);
    expect(s.avg7Kg).toBe(79.3); // 09-09..09-15 → 79.5, 79.0
    // Week-ago window (ending 09-08): 09-02..09-08 → 79.875
    expect(s.change7Kg).toBe(-0.6);
    expect(s.change30Kg).toBeNull(); // not enough history
  });

  it("empty input gives nulls, unsorted input is handled", () => {
    expect(summarize([]).latestKg).toBeNull();
    const shuffled = [...series].reverse();
    expect(summarize(shuffled)).toEqual(summarize(series));
    expect(withTrend(shuffled).map((p) => p.date)).toEqual(series.map((p) => p.date));
  });
});
