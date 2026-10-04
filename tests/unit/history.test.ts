import { describe, expect, it } from "vitest";
import {
  daysInMonth,
  formatMonth,
  monthRange,
  parseDate,
  shiftMonth,
} from "@/lib/dates";

describe("History Date Utilities", () => {
  it("shifts months cleanly across year boundaries without Date DST issues", () => {
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
    expect(shiftMonth("2026-10", -1)).toBe("2026-09");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-01-15", -12)).toBe("2025-01");
    expect(shiftMonth("2026-01", 24)).toBe("2028-01");
  });

  it("calculates exact monthRange and days count for standard and leap years", () => {
    // 31-day month
    const oct = monthRange("2026-10");
    expect(oct.from).toBe("2026-10-01");
    expect(oct.to).toBe("2026-10-31");
    expect(oct.daysCount).toBe(31);

    // 30-day month
    const apr = monthRange("2026-04");
    expect(apr.from).toBe("2026-04-01");
    expect(apr.to).toBe("2026-04-30");
    expect(apr.daysCount).toBe(30);

    // Non-leap February (2025: 28 days)
    const feb2025 = monthRange("2025-02");
    expect(feb2025.from).toBe("2025-02-01");
    expect(feb2025.to).toBe("2025-02-28");
    expect(feb2025.daysCount).toBe(28);

    // Leap February (2024: 29 days)
    const feb2024 = monthRange("2024-02");
    expect(feb2024.from).toBe("2024-02-01");
    expect(feb2024.to).toBe("2024-02-29");
    expect(feb2024.daysCount).toBe(29);
  });

  it("formats month and year in human-readable form", () => {
    expect(formatMonth("2026-10")).toBe("October 2026");
    expect(formatMonth("2025-01")).toBe("January 2025");
    expect(formatMonth("2027-12")).toBe("December 2027");
  });

  it("parses dates at local noon to guarantee immunity to UTC/midnight offset shifts", () => {
    const d = parseDate("2026-10-03");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9); // 0-indexed October
    expect(d.getDate()).toBe(3);
    expect(d.getHours()).toBe(12);
  });

  it("computes daysInMonth correctly across all 12 months", () => {
    const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let m = 1; m <= 12; m++) {
      const dateStr = `2025-${String(m).padStart(2, "0")}-01`;
      expect(daysInMonth(dateStr)).toBe(lengths[m - 1]);
    }
  });
});
