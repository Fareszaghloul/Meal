import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, latestPossibleLocalDate } from "@/lib/dates";
import { weightInput, weightPatch } from "@/lib/validation";
import { checkRateLimit } from "@/lib/security/rate-limiter";

const ok = { date: "2026-10-03", weightKg: 82.4 };
const bad = (over: Record<string, unknown>) => weightInput.safeParse({ ...ok, ...over }).success;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("weight input", () => {
  it("accepts a normal weigh-in and defaults to daily", () => {
    const v = weightInput.parse(ok);
    expect(v).toMatchObject({ date: "2026-10-03", weightKg: 82.4, entryType: "daily" });
  });

  it("accepts numeric strings but rejects non-numeric, non-finite and out-of-range weights", () => {
    expect(weightInput.parse({ ...ok, weightKg: "79.4" }).weightKg).toBe(79.4);
    for (const w of ["abc", "", null, undefined, "Infinity", "-Infinity", "NaN", 0, -5, 5, 19.99, 500.01, 99999]) expect(bad({ weightKg: w }), String(w)).toBe(false);
    for (const w of [20, 20.0, 82.4, 500]) expect(bad({ weightKg: w }), String(w)).toBe(true);
  });

  it("rejects bad or future dates", () => {
    for (const d of ["", "2026-13-01", "2026-02-30", "03/10/2026", "garbage", 20261003]) expect(bad({ date: d }), String(d)).toBe(false);
    expect(bad({ date: "2099-01-01" })).toBe(false);
    expect(bad({ date: addDays(latestPossibleLocalDate(), 1) })).toBe(false);
    expect(bad({ date: latestPossibleLocalDate() })).toBe(true);
  });

  it("time must be HH:mm (24-hour) or empty", () => {
    for (const t of ["8:30", "abc", "24:00", "12:60", "12:5", "12:30:00"]) expect(bad({ time: t }), t).toBe(false);
    for (const t of ["00:00", "08:30", "23:59"]) expect(bad({ time: t }), t).toBe(true);
    expect(weightInput.parse({ ...ok, time: "" }).time).toBeNull();
    expect(weightInput.parse({ ...ok, time: null }).time).toBeNull();
    expect(weightInput.parse(ok).time).toBeUndefined();
  });

  it("entryType is a strict enum", () => {
    expect(bad({ entryType: "foo" })).toBe(false);
    expect(bad({ entryType: "inbody" })).toBe(true);
  });

  it("notes are capped at 500 characters", () => {
    expect(bad({ notes: "x".repeat(500) })).toBe(true);
    expect(bad({ notes: "x".repeat(501) })).toBe(false);
    expect(weightInput.parse({ ...ok, notes: "   " }).notes).toBe("");
  });

  it("InBody metrics are bounded; blank means none", () => {
    const scan = { entryType: "inbody" };
    expect(bad({ ...scan, bodyFatPct: "15.4", smmKg: "34.8", bmi: "23.5" })).toBe(true);
    expect(weightInput.parse({ ...ok, ...scan, bodyFatPct: "" }).bodyFatPct).toBeNull();
    for (const [k, v] of [["bodyFatPct", 2], ["bodyFatPct", 61], ["smmKg", 4], ["smmKg", 201], ["bmi", 9], ["bmi", 61], ["bodyFatPct", "x"]] as const) expect(bad({ ...scan, [k]: v }), `${k}=${v}`).toBe(false);
  });

  it("unknown fields are dropped (no mass assignment)", () => {
    const v = weightInput.parse({ ...ok, userId: "someone-else", id: "x", createdAt: "2000-01-01" }) as Record<string, unknown>;
    expect(v.userId).toBeUndefined();
    expect(v.id).toBeUndefined();
    expect(v.createdAt).toBeUndefined();
  });
});

describe("weight patch", () => {
  it("leaves absent fields absent so a patch never wipes data", () => {
    expect(weightPatch.parse({ weightKg: 80 })).toEqual({ weightKg: 80 });
    expect(weightPatch.parse({})).toEqual({});
  });

  it("an explicit blank clears; the same bounds apply", () => {
    expect(weightPatch.parse({ time: "", notes: "" })).toEqual({ time: null, notes: null });
    expect(weightPatch.safeParse({ weightKg: 5 }).success).toBe(false);
    expect(weightPatch.safeParse({ entryType: "foo" }).success).toBe(false);
    expect(weightPatch.safeParse({ date: "2099-01-01" }).success).toBe(false);
  });
});

describe("latestPossibleLocalDate", () => {
  it("is the date at UTC+14, the earliest 'today' anywhere on Earth", () => {
    expect(latestPossibleLocalDate(new Date("2026-10-04T09:59:00Z"))).toBe("2026-10-04");
    expect(latestPossibleLocalDate(new Date("2026-10-04T10:00:00Z"))).toBe("2026-10-05");
    expect(latestPossibleLocalDate(new Date("2026-12-31T12:00:00Z"))).toBe("2027-01-01");
  });
});

describe("OCR rate limit", () => {
  it("allows a short burst and then blocks, per identifier", () => {
    vi.stubEnv("NODE_ENV", "production"); // the limiter is bypassed under NODE_ENV=test
    const id = `ocr:unit-${Math.random()}`;
    const results = Array.from({ length: 8 }, () => checkRateLimit(id, "OCR").success);
    expect(results).toEqual([true, true, true, true, true, true, false, false]);
    expect(checkRateLimit(`ocr:other-${Math.random()}`, "OCR").success).toBe(true);
  });
});
