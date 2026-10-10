import { describe, expect, it } from "vitest";
import { buildWeekStrip, weekAverages, weekDates, weekMonths } from "@/lib/week-strip";

describe("week strip", () => {
  it("returns Monday..Sunday for any day of the week, including Sunday", () => {
    // 2026-10-10 is a Saturday; 2026-10-11 is the Sunday that closes the same week.
    const expected = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
    expect(weekDates("2026-10-10")).toEqual(expected);
    expect(weekDates("2026-10-11")).toEqual(expected);
    expect(weekDates("2026-10-05")).toEqual(expected);
  });

  it("reports both months when a week crosses a month boundary", () => {
    expect(weekMonths("2026-10-29")).toEqual(["2026-10", "2026-11"]);
    expect(weekMonths("2026-10-10")).toEqual(["2026-10"]);
  });

  it("keeps date-only semantics across the DST change", () => {
    // US DST ended 2026-11-01 and EU DST ended 2026-10-25; weeks must still be exactly seven distinct dates.
    for (const d of ["2026-10-25", "2026-11-01", "2026-03-29", "2026-03-08"]) {
      const days = weekDates(d);
      expect(new Set(days).size).toBe(7);
      expect(days).toContain(d);
    }
  });

  it("uses live figures for the selected day and the month history for the rest", () => {
    const strip = buildWeekStrip(
      "2026-10-10",
      "2026-10-10",
      2400,
      {
        "2026-10-05": { calories: 2400, protein: 150 },
        "2026-10-10": { calories: 999, protein: 1 }, // stale cache for the selected day
      },
      { calories: 1200, protein: 100 }
    );
    expect(strip[0]).toMatchObject({ date: "2026-10-05", label: "M", calories: 2400, percent: 100 });
    expect(strip[5]).toMatchObject({ date: "2026-10-10", calories: 1200, percent: 50, isSelected: true, isToday: true });
  });

  it("leaves future days empty and untracked days at null/0 without dividing by a missing goal", () => {
    const strip = buildWeekStrip("2026-10-10", "2026-10-10", 0, {});
    expect(strip[6]).toMatchObject({ date: "2026-10-11", calories: null, isFuture: true, percent: 0 });
    expect(strip[1].calories).toBeNull();
    expect(strip.every((d) => d.percent === 0)).toBe(true);
  });

  it("averages only days with logged calories", () => {
    const strip = buildWeekStrip("2026-10-10", "2026-10-10", 2400, {
      "2026-10-05": { calories: 2000, protein: 100 },
      "2026-10-06": { calories: 0, protein: 0 },
      "2026-10-07": { calories: 2400, protein: 140 },
    });
    expect(weekAverages(strip)).toEqual({ calories: 2200, protein: 120, loggedDays: 2 });
    expect(weekAverages(buildWeekStrip("2026-10-10", "2026-10-10", 2400, {}))).toEqual({ calories: 0, protein: 0, loggedDays: 0 });
  });
});
