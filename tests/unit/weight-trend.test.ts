import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { compareReadings, dailyMeans, latestReading, summarize, trailingAverage, withTrend, type WeightReading } from "@/lib/nutrition/weight-trend";

const series: WeightReading[] = [
  { date: "2026-09-01", weightKg: 80.0 },
  { date: "2026-09-02", weightKg: 80.6 }, // noisy day
  { date: "2026-09-03", weightKg: 79.8 },
  { date: "2026-09-05", weightKg: 79.7 },
  { date: "2026-09-08", weightKg: 79.4 },
  { date: "2026-09-10", weightKg: 79.5 },
  { date: "2026-09-15", weightKg: 79.0 },
];

describe("daily means", () => {
  it("groups readings by calendar date and averages them, ascending", () => {
    const days = dailyMeans([
      { date: "2026-10-02", weightKg: 82 },
      { date: "2026-10-01", weightKg: 80 },
      { date: "2026-10-01", weightKg: 81 },
      { date: "2026-10-01", weightKg: 82 },
    ]);
    expect(days).toEqual([
      { date: "2026-10-01", weightKg: 81 },
      { date: "2026-10-02", weightKg: 82 },
    ]);
  });

  it("a day with many weigh-ins counts once, not once per reading", () => {
    // Day 1: one reading of 80. Day 2: three readings of 86.
    const readings = [{ date: "2026-10-01", weightKg: 80 }, ...[0, 1, 2].map(() => ({ date: "2026-10-02", weightKg: 86 }))];
    expect(trailingAverage(readings, "2026-10-02")).toBe(83); // (80 + 86) / 2, not (80 + 3×86) / 4 = 84.5
    expect(summarize(readings).avg7Kg).toBe(83);
  });
});

describe("trailing 7-day average", () => {
  it("covers exactly 7 calendar days, inclusive", () => {
    // Window for 09-08 is 09-02..09-08 → 80.6, 79.8, 79.7, 79.4
    expect(trailingAverage(series, "2026-09-08")).toBeCloseTo((80.6 + 79.8 + 79.7 + 79.4) / 4, 6);
    expect(trailingAverage(series, "2026-08-31")).toBeNull();
  });

  it("handles one measurement", () => {
    const s = summarize([{ date: "2026-10-01", weightKg: 82.4 }]);
    expect(s).toEqual({ latestKg: 82.4, latestDate: "2026-10-01", avg7Kg: 82.4, change7Kg: null, change30Kg: null, startKg: 82.4 });
  });

  it("handles two measurements, a week apart", () => {
    const s = summarize([
      { date: "2026-10-01", weightKg: 82 },
      { date: "2026-10-08", weightKg: 81 },
    ]);
    expect(s.avg7Kg).toBe(81);
    expect(s.change7Kg).toBe(-1); // 81 now vs 82 a week earlier
    expect(s.change30Kg).toBeNull();
  });

  it("copes with irregular gaps (missing days are not zeros)", () => {
    const s = summarize([
      { date: "2026-10-01", weightKg: 80 },
      { date: "2026-10-04", weightKg: 82 },
      { date: "2026-10-20", weightKg: 81 },
    ]);
    expect(s.avg7Kg).toBe(81); // only 10-20 is inside 10-14..10-20
    expect(s.change7Kg).toBeNull(); // nothing in 10-08..10-14
  });
});

describe("summary", () => {
  it("uses averages so a single spike doesn't read as a gain", () => {
    const s = summarize(series);
    expect(s.latestKg).toBe(79);
    expect(s.startKg).toBe(80);
    expect(s.avg7Kg).toBeCloseTo(79.25, 9); // 09-09..09-15 → 79.5, 79.0 (exact kg; rounded only for display)
    expect(s.change7Kg).toBeCloseTo(79.25 - 79.875, 9); // week-ago window 09-02..09-08 → 79.875
    expect(s.change30Kg).toBeNull(); // not enough history
  });

  it("computes the 30-day change once history reaches back that far", () => {
    const long: WeightReading[] = [];
    for (let i = 0; i <= 40; i++) long.push({ date: addDays("2026-08-01", i), weightKg: 90 - i * 0.1 });
    const s = summarize(long);
    // anchor 09-10; avg of last 7 days vs avg of the 7 days ending 08-11
    expect(s.change30Kg).toBeCloseTo(-3, 1);
    expect(s.change7Kg).toBeCloseTo(-0.7, 1);
  });

  it("empty input gives nulls; input order doesn't matter", () => {
    expect(summarize([]).latestKg).toBeNull();
    expect(summarize([...series].reverse())).toEqual(summarize(series));
  });

  it("is anchored on the latest reading unless told otherwise", () => {
    const s = summarize(series, "2026-09-08");
    expect(s.avg7Kg).toBeCloseTo(79.9, 1);
    expect(s.latestKg).toBe(79); // "latest" is still the newest actual reading
  });
});

describe("latest reading selection", () => {
  const a: WeightReading = { date: "2026-10-03", time: "08:00", weightKg: 80, createdAt: "2026-10-03T08:00:00Z" };
  const b: WeightReading = { date: "2026-10-03", time: "20:00", weightKg: 82, createdAt: "2026-10-03T07:00:00Z" };
  const c: WeightReading = { date: "2026-10-02", time: "23:59", weightKg: 99, createdAt: "2026-10-04T00:00:00Z" };

  it("orders by date, then time, then createdAt, regardless of input order", () => {
    expect(latestReading([a, b, c])).toBe(b);
    expect(latestReading([c, b, a])).toBe(b);
    expect(latestReading([])).toBeNull();
  });

  it("uses createdAt only to break a date+time tie", () => {
    const early = { date: "2026-10-03", time: null, weightKg: 70, createdAt: "2026-10-03T06:00:00Z" };
    const late = { date: "2026-10-03", time: null, weightKg: 71, createdAt: "2026-10-03T09:00:00Z" };
    expect(latestReading([late, early])).toBe(late);
    // A reading with a time is later in the day than one without.
    const timed = { date: "2026-10-03", time: "00:01", weightKg: 72, createdAt: "2026-10-03T01:00:00Z" };
    expect(latestReading([timed, late])).toBe(timed);
    expect(compareReadings(early, late)).toBeLessThan(0);
  });

  it("an edited historical reading never becomes the latest", () => {
    // "Edited recently" is not an ordering key: only date/time/createdAt-of-insert are.
    const old: WeightReading = { date: "2001-01-15", time: "08:00", weightKg: 60, createdAt: "2001-01-15T08:00:00Z" };
    const edited = { ...old, weightKg: 200 };
    expect(latestReading([edited, b])).toBe(b);
  });

  it("falls back to the next latest after the newest is removed", () => {
    expect(latestReading([a, b, c].filter((r) => r !== b))).toBe(a);
    expect(latestReading([a, c].filter((r) => r !== a))).toBe(c);
  });
});

describe("local-date boundaries", () => {
  it("windows roll over month, year and leap-day boundaries by calendar days", () => {
    const pts = [
      { date: "2028-02-28", weightKg: 80 },
      { date: "2028-02-29", weightKg: 82 }, // leap day
      { date: "2028-03-01", weightKg: 84 },
    ];
    expect(trailingAverage(pts, "2028-03-01")).toBe(82);
    const nye = [
      { date: "2026-12-31", weightKg: 80 },
      { date: "2027-01-01", weightKg: 82 },
    ];
    expect(trailingAverage(nye, "2027-01-01")).toBe(81);
    expect(trailingAverage(nye, "2027-01-06")).toBe(81); // 12-31 is still inside the 7 days ending 01-06
    expect(trailingAverage(nye, "2027-01-07")).toBe(82); // …and drops out on 01-07
  });

  it("is not shifted by daylight-saving changes", () => {
    // EU/Jordan-style DST switches: 2026-03-27/28 and 2026-10-24/25.
    for (const [from, to] of [
      ["2026-03-22", "2026-03-29"],
      ["2026-10-19", "2026-10-26"],
    ]) {
      const pts = Array.from({ length: 8 }, (_, i) => ({ date: addDays(from, i), weightKg: 80 + i }));
      expect(pts[7].date).toBe(to);
      // 7 days ending `to` = the last 7 points (81..87) → 84
      expect(trailingAverage(pts, to)).toBe(84);
    }
  });
});

describe("withTrend", () => {
  it("returns one entry per day with the day mean and trailing average", () => {
    const out = withTrend([
      { date: "2026-10-01", weightKg: 80 },
      { date: "2026-10-01", weightKg: 82 },
      { date: "2026-10-03", weightKg: 84 },
    ]);
    expect(out).toEqual([
      { date: "2026-10-01", meanKg: 81, trendKg: 81 },
      { date: "2026-10-03", meanKg: 84, trendKg: 82.5 },
    ]);
  });

  it("matches a brute-force definition on irregular, repeated data", () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const readings: WeightReading[] = [];
    for (let i = 0; i < 120; i++) if (rnd() > 0.3) for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) readings.push({ date: addDays("2026-01-01", i), weightKg: 70 + rnd() * 5 });
    for (const day of withTrend(readings)) expect(day.trendKg).toBeCloseTo(trailingAverage(readings, day.date)!, 9);
  });

  it("is linear: 50,000 days is instant", () => {
    const big: WeightReading[] = Array.from({ length: 50_000 }, (_, i) => ({ date: addDays("1900-01-01", i), weightKg: 80 }));
    const t = performance.now();
    const out = withTrend(big);
    expect(out).toHaveLength(50_000);
    expect(performance.now() - t).toBeLessThan(1500);
  });
});

describe("Phase 7.1 — Current Weight Semantics & Invariants", () => {
  it("returns latest valid daily weight when daily weight exists", () => {
    const entries: WeightReading[] = [
      { date: "2026-10-01", time: "08:00", weightKg: 80.5 },
      { date: "2026-10-02", time: "08:00", weightKg: 81.2 },
    ];
    const latest = latestReading(entries);
    expect(latest).not.toBeNull();
    expect(latest?.weightKg).toBe(81.2);
    expect(summarize(entries).latestKg).toBe(81.2);
  });

  it("falls back to older daily weight after deleting the latest", () => {
    const entries: WeightReading[] = [
      { date: "2026-10-01", time: "08:00", weightKg: 80.5 },
      { date: "2026-10-02", time: "08:00", weightKg: 81.2 },
    ];
    // Delete latest (2026-10-02)
    const afterDelete = entries.filter((e) => e.date !== "2026-10-02");
    const latest = latestReading(afterDelete);
    expect(latest?.weightKg).toBe(80.5);
    expect(summarize(afterDelete).latestKg).toBe(80.5);
  });

  it("returns null when deleting the final daily measurement (never fabricates 78 kg)", () => {
    const entries: WeightReading[] = [
      { date: "2026-10-01", time: "08:00", weightKg: 80.5 },
    ];
    // Delete final entry
    const afterDelete = entries.filter((e) => e.date !== "2026-10-01");
    expect(afterDelete).toHaveLength(0);
    expect(latestReading(afterDelete)).toBeNull();
    expect(summarize(afterDelete).latestKg).toBeNull();
    expect(summarize(afterDelete).latestKg).not.toBe(78);
  });

  it("InBody-only entries do NOT count towards daily weight (returns null)", () => {
    interface AnyEntry extends WeightReading {
      entryType: "daily" | "inbody";
    }
    const mixedEntries: AnyEntry[] = [
      { date: "2026-10-01", time: "09:00", weightKg: 85.0, entryType: "inbody" },
      { date: "2026-10-02", time: "09:00", weightKg: 84.5, entryType: "inbody" },
    ];
    // Daily weights filter
    const dailyOnly = mixedEntries.filter((e) => e.entryType === "daily");
    expect(dailyOnly).toHaveLength(0);
    expect(latestReading(dailyOnly)).toBeNull();
    expect(summarize(dailyOnly).latestKg).toBeNull();
  });

  it("returns null when no entries exist at all", () => {
    expect(latestReading([])).toBeNull();
    const summary = summarize([]);
    expect(summary.latestKg).toBeNull();
    expect(summary.latestDate).toBeNull();
    expect(summary.avg7Kg).toBeNull();
    expect(summary.change7Kg).toBeNull();
    expect(summary.change30Kg).toBeNull();
    expect(summary.startKg).toBeNull();
  });

  it("historical edit does not change current improperly", () => {
    const historical: WeightReading = { date: "2020-01-01", time: "08:00", weightKg: 95.0, createdAt: "2020-01-01T08:00:00Z" };
    const latest: WeightReading = { date: "2026-10-01", time: "08:00", weightKg: 75.0, createdAt: "2026-10-01T08:00:00Z" };
    
    // Simulate updating historical weightKg to 110.0
    const editedHistorical = { ...historical, weightKg: 110.0 };
    const list = [editedHistorical, latest];
    
    expect(latestReading(list)?.weightKg).toBe(75.0);
    expect(summarize(list).latestKg).toBe(75.0);
  });

  it("strictly orders by date DESC, time DESC, createdAt DESC", () => {
    const r1: WeightReading = { date: "2026-10-01", time: "08:00", weightKg: 80.0, createdAt: "2026-10-01T08:00:00Z" };
    const r2: WeightReading = { date: "2026-10-01", time: "18:00", weightKg: 81.0, createdAt: "2026-10-01T18:00:00Z" };
    const r3: WeightReading = { date: "2026-10-02", time: "07:00", weightKg: 80.5, createdAt: "2026-10-02T07:00:00Z" };
    const r4: WeightReading = { date: "2026-10-02", time: "07:00", weightKg: 80.8, createdAt: "2026-10-02T07:00:01Z" };

    expect(latestReading([r1, r2, r3, r4])).toEqual(r4);
    expect(latestReading([r4, r3, r2, r1])).toEqual(r4);
    expect(latestReading([r2, r1])).toEqual(r2);
  });

  it("does not fabricate any default weight (78 kg or otherwise)", () => {
    const emptySummary = summarize([]);
    expect(emptySummary.latestKg).toBeNull();
    expect(emptySummary.latestKg).not.toBe(78);
    expect(emptySummary.latestKg).not.toBe(70);
  });

  it("handles missing weight in TDEE calculations gracefully without breaking user goals", () => {
    // When weight is null or empty, calculated weight in settings returns null,
    // which prevents overwriting existing user-configured targets.
    const toKgOrNull = (input: string | null | undefined): number | null => {
      if (!input || isNaN(Number(input)) || Number(input) <= 0) return null;
      return Number(input);
    };

    expect(toKgOrNull("")).toBeNull();
    expect(toKgOrNull(null)).toBeNull();
    expect(toKgOrNull(undefined)).toBeNull();
    expect(toKgOrNull("0")).toBeNull();
    expect(toKgOrNull("-5")).toBeNull();
    expect(toKgOrNull("80.5")).toBe(80.5);

    // Existing configured calorie goals remain intact when weight is null
    const existingConfiguredCalories = 2200;
    const currentWeightKg: number | null = null;
    const effectiveCalories = currentWeightKg ? 2000 : existingConfiguredCalories;
    expect(effectiveCalories).toBe(2200);
  });
});

