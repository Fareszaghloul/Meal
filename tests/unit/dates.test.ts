import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, daysInMonth, diffDays, isDateString, relativeDayLabel, startOfWeek, toDateString, todayLocal } from "@/lib/dates";

afterEach(() => vi.useRealTimers());

describe("local calendar dates", () => {
  it("uses the local date, not UTC, just after midnight", () => {
    // 2026-10-04 00:30 local. In UTC+3 that is still 2026-10-03T21:30Z.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 4, 0, 30));
    expect(todayLocal()).toBe("2026-10-04");
    // The old code (toISOString) would have produced a different day in any zone ahead of UTC.
    const utcDay = new Date().toISOString().slice(0, 10);
    if (new Date().getTimezoneOffset() < 0) expect(utcDay).not.toBe("2026-10-04");
  });

  it("formats single-digit months and days with zero padding", () => {
    expect(toDateString(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
  });

  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    // Around the EU/Jordan DST switch
    expect(addDays("2026-03-27", 1)).toBe("2026-03-28");
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
  });

  it("diffDays and startOfWeek (Monday)", () => {
    expect(diffDays("2026-10-01", "2026-10-03")).toBe(2);
    expect(diffDays("2026-10-03", "2026-10-01")).toBe(-2);
    expect(startOfWeek("2026-10-03")).toBe("2026-09-28"); // Saturday → Monday
    expect(startOfWeek("2026-10-04")).toBe("2026-09-28"); // Sunday → previous Monday
    expect(startOfWeek("2026-09-28")).toBe("2026-09-28");
  });

  it("validates date strings strictly", () => {
    expect(isDateString("2026-10-03")).toBe(true);
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026-13-01")).toBe(false);
    expect(isDateString("26-10-03")).toBe(false);
    expect(isDateString("2026-10-03T00:00:00Z")).toBe(false);
    expect(isDateString(20261003)).toBe(false);
  });

  it("relative labels and month lengths", () => {
    expect(relativeDayLabel("2026-10-03", "2026-10-03")).toBe("Today");
    expect(relativeDayLabel("2026-10-02", "2026-10-03")).toBe("Yesterday");
    expect(relativeDayLabel("2026-10-04", "2026-10-03")).toBe("Tomorrow");
    expect(daysInMonth("2026-02-10")).toBe(28);
    expect(daysInMonth("2028-02-10")).toBe(29);
  });
});
