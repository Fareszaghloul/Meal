import { describe, expect, it } from "vitest";
import { ageOn, canonicalTimezone, isValidTimezone, latestLocalDateForUser, latestPossibleLocalDate, todayInTimezone } from "@/lib/dates";
import { GOAL_REVISION_FIELDS, settingsPatch } from "@/lib/validation";
import { goalOn } from "@/lib/services/settings";
import { calculateNutritionStats, groupEntriesByDay } from "@/lib/nutrition/analytics";
import { toCsv } from "@/lib/csv";
import { backupFile, BACKUP_VERSION, parseBackup, planRestore, referencedFoodIds, type BackupFile } from "@/lib/services/backup";
import { HttpError } from "@/lib/api/route";
import { fromKg, toKg, weightInputValue } from "@/lib/weight-units";

/* ───────── timezone ───────── */

describe("timezone validation", () => {
  it("accepts real IANA zones and canonicalises them", () => {
    expect(canonicalTimezone("Asia/Amman")).toBe("Asia/Amman");
    expect(canonicalTimezone("asia/amman")).toBe("Asia/Amman");
    expect(canonicalTimezone("UTC")).toBe("UTC");
    expect(canonicalTimezone("US/Eastern")).toBe("America/New_York");
    expect(isValidTimezone("Pacific/Kiritimati")).toBe(true);
  });

  it.each(["GMT+3 lol", "+03:00", "Mars/Olympus_Mons", "", "   ", "x".repeat(100), 42, null])("rejects %j", (v) => {
    expect(canonicalTimezone(v)).toBeNull();
  });
});

describe("timezone-local today", () => {
  // 2026-10-04 10:30 UTC
  const morningUtc = new Date("2026-10-04T10:30:00Z");
  // 2026-10-04 21:30 UTC
  const eveningUtc = new Date("2026-10-04T21:30:00Z");

  it("Kiritimati (UTC+14) is already on the next day", () => {
    expect(todayInTimezone("Pacific/Kiritimati", morningUtc)).toBe("2026-10-05");
  });
  it("Amman (UTC+3) rolls over at 21:00 UTC", () => {
    expect(todayInTimezone("Asia/Amman", morningUtc)).toBe("2026-10-04");
    expect(todayInTimezone("Asia/Amman", eveningUtc)).toBe("2026-10-05");
    expect(todayInTimezone("Asia/Amman", new Date("2026-10-04T20:59:59Z"))).toBe("2026-10-04");
  });
  it("New York (EDT, UTC-4) is still on the previous day early in UTC", () => {
    expect(todayInTimezone("America/New_York", new Date("2026-10-05T03:59:00Z"))).toBe("2026-10-04");
    expect(todayInTimezone("America/New_York", new Date("2026-10-05T04:00:00Z"))).toBe("2026-10-05");
  });
  it("handles DST change days", () => {
    // US spring forward 2026-03-08: 07:00 UTC is 03:00 EDT the same day.
    expect(todayInTimezone("America/New_York", new Date("2026-03-08T07:00:00Z"))).toBe("2026-03-08");
    expect(todayInTimezone("America/New_York", new Date("2026-03-08T04:59:00Z"))).toBe("2026-03-07");
  });
  it("without a stored timezone the future bound is the global UTC+14 envelope", () => {
    expect(latestLocalDateForUser(null, morningUtc)).toBe(latestPossibleLocalDate(morningUtc));
    expect(latestLocalDateForUser("America/New_York", morningUtc)).toBe("2026-10-04");
  });
  it("computes age from date strings without timezone shifts", () => {
    expect(ageOn("2003-11-24", "2026-11-23")).toBe(22);
    expect(ageOn("2003-11-24", "2026-11-24")).toBe(23);
    expect(ageOn("2004-02-29", "2026-02-28")).toBe(21);
  });
});

/* ───────── settings patch ───────── */

describe("settings patch validation", () => {
  it("is partial: only supplied fields are present after parsing", () => {
    expect(settingsPatch.parse({ measurementSystem: "imperial" })).toEqual({ measurementSystem: "imperial" });
  });
  it("accepts explicit null for optional targets", () => {
    expect(settingsPatch.parse({ dailyFiber: null, goalWeightKg: null })).toEqual({ dailyFiber: null, goalWeightKg: null });
  });
  it.each([
    { dailyCalories: "2000" },
    { dailyCalories: Number.NaN },
    { dailyCalories: Number.POSITIVE_INFINITY },
    { dailyProtein: -1 },
    { dailyCalories: 20_000 },
    { dailyFiber: 0 },
    { goalWeightKg: 0 },
    { goalWeightKg: 900 },
    { measurementSystem: "si" },
    { timezone: "GMT+3 lol" },
    { currentWeightKg: 80 },
    { userId: "x" },
    {},
  ])("rejects %j", (v) => {
    expect(settingsPatch.safeParse(v).success).toBe(false);
  });
  it("stores the canonical timezone", () => {
    expect(settingsPatch.parse({ timezone: "europe/london" }).timezone).toBe("Europe/London");
  });
  it("display and timezone settings are not goal fields (no revision on unit change)", () => {
    expect(GOAL_REVISION_FIELDS).toEqual(
      expect.arrayContaining(["dailyCalories", "dailyProtein", "dailyCarbs", "dailyFat", "dailyFiber", "goalWeightKg", "goalType", "goalWeeklyRateKg"])
    );
    for (const k of ["measurementSystem", "timezone", "dailySodium", "dailyWaterGoalMl", "theme"]) expect(GOAL_REVISION_FIELDS).not.toContain(k);
  });
});

describe("unit display conversion", () => {
  it("kg → lb → kg display round trip does not drift for stored values", () => {
    for (const kg of [50, 72.5, 80.513, 97.6, 150.25]) {
      const shown = weightInputValue(kg, "lbs");
      // The canonical value is untouched by display; re-entering the shown value lands within display precision.
      expect(Math.abs(toKg(Number(shown), "lbs") - kg)).toBeLessThan(0.05);
      expect(fromKg(kg, "kg")).toBe(kg);
    }
  });
});

/* ───────── goal history ───────── */

describe("goal lookup by effective date", () => {
  const revs = [{ effectiveDate: "2026-10-01", c: 2300 }, { effectiveDate: "2026-10-15", c: 2500 }];
  it("returns null before the first known revision", () => expect(goalOn(revs, "2026-09-30")).toBeNull());
  it("applies a revision from its effective date", () => expect(goalOn(revs, "2026-10-01")?.c).toBe(2300));
  it("keeps the previous revision until the next one starts", () => expect(goalOn(revs, "2026-10-14")?.c).toBe(2300));
  it("switches on the next effective date", () => expect(goalOn(revs, "2026-10-15")?.c).toBe(2500));
  it("uses the latest revision for future dates", () => expect(goalOn(revs, "2027-01-01")?.c).toBe(2500));
});

describe("analytics adherence over a mixed-goal period", () => {
  const day = (date: string, calories: number, protein: number) => ({ id: date, date, mealCategory: "lunch", name: "x", calories, protein, carbs: 0, fat: 0 });
  const map = groupEntriesByDay([day("2026-09-30", 2300, 200), day("2026-10-05", 2300, 160), day("2026-10-20", 2000, 170), day("2026-10-25", 2500, 185)]);
  const goal = (date: string) => {
    const r = goalOn([{ effectiveDate: "2026-10-01", calories: 2300, protein: 150 }, { effectiveDate: "2026-10-15", calories: 2500, protein: 180 }], date);
    return r && { calories: r.calories, protein: r.protein };
  };

  it("judges each day against its own goal and excludes days with no known goal", () => {
    const s = calculateNutritionStats(map, "2026-09-01", "2026-10-31", 61, goal);
    expect(s.daysLogged).toBe(4);
    expect(s.daysWithCalorieGoal).toBe(3);
    expect(s.daysInCalorieRange).toBe(2); // Oct 5 (vs 2300) and Oct 25 (vs 2500)
    expect(s.daysWithProteinGoal).toBe(3);
    expect(s.daysMeetingProtein).toBe(2); // Oct 5 and Oct 25; Sep 30's 200 g is not counted
  });

  it("reports null adherence when no day in range has a known goal", () => {
    const s = calculateNutritionStats(map, "2026-09-01", "2026-09-30", 30, goal);
    expect(s.daysInCalorieRange).toBeNull();
    expect(s.daysMeetingProtein).toBeNull();
    expect(s.daysWithCalorieGoal).toBe(0);
  });

  it("a static goal object still works (unchanged callers)", () => {
    const s = calculateNutritionStats(map, "2026-10-01", "2026-10-31", 31, { calories: 2300, protein: 150 });
    expect(s.daysWithCalorieGoal).toBe(3);
  });
});

/* ───────── CSV ───────── */

describe("CSV", () => {
  const body = (csv: string) => csv.replace(/^﻿/, "");

  it("writes a header, CRLF rows and a UTF-8 BOM", () => {
    const csv = toCsv(["a", "b"], [[1, "x"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(body(csv)).toBe("a,b\r\n1,x\r\n");
  });
  it("quotes commas, quotes, newlines and edge whitespace", () => {
    expect(body(toCsv(["v"], [["a,b"], ['say "hi"'], ["line1\nline2"], ["cr\rlf"], [" padded "]]))).toBe(
      'v\r\n"a,b"\r\n"say ""hi"""\r\n"line1\nline2"\r\n"cr\rlf"\r\n" padded "\r\n'
    );
  });
  it("keeps UTF-8 text and writes empty cells for null", () => {
    expect(body(toCsv(["n", "x"], [["Crème brûlée – 鸡", null]]))).toBe("n,x\r\nCrème brûlée – 鸡,\r\n");
  });
  it("neutralises spreadsheet formulas in text but leaves numbers alone", () => {
    expect(body(toCsv(["v"], [["=HYPERLINK(1)"], ["+1"], ["@x"], [-5]]))).toBe("v\r\n'=HYPERLINK(1)\r\n'+1\r\n'@x\r\n-5\r\n");
  });
});

/* ───────── backup format ───────── */

const T = "2026-10-01T08:00:00.000Z";
const food = (id: string, name: string) => ({
  id, name, brand: null, category: "x", rawOrCooked: "unspecified",
  caloriesPer100g: 100, proteinPer100g: 10, carbsPer100g: 10, fatPer100g: 1, fiberPer100g: 0,
  totalSugarsPer100g: null, addedSugarsPer100g: null, saturatedFatPer100g: null, transFatPer100g: null, sodiumPer100g: null,
  caloriesPerServing: null, proteinPerServing: null, carbsPerServing: null, fatPerServing: null, fiberPerServing: null,
  totalSugarsPerServing: null, addedSugarsPerServing: null, saturatedFatPerServing: null, transFatPerServing: null, sodiumPerServing: null,
  defaultUnit: "g", servingWeightGrams: 100, source: "MANUAL", scannedAt: null, servingSize: null, servingUnit: null, nutritionBasis: "PER_100G",
  barcode: null, externalId: null, sourceUrl: null, importedAt: null, lastSyncedAt: null, isFavorite: false, lastUsedAt: null, useCount: 0, createdAt: T,
  servings: [{ label: "1 cup", grams: 80, isDefault: true, sortOrder: 0 }],
});
const nutr = { calories: 100, protein: 5, carbs: 10, fat: 2, fiber: 1, totalSugars: null, addedSugars: null, saturatedFat: null, transFat: null, sodium: null };
const recipe = (id: string, foodId: string | null) => ({
  id, name: `R ${id}`, description: null, servings: 2, servingLabel: null, yieldWeightGrams: null, prepTimeMinutes: null, cookTimeMinutes: null,
  imageUrl: null, sourceUrl: null, sourcePlatform: null, isFavorite: false,
  caloriesPerServing: 100, proteinPerServing: 5, carbsPerServing: 10, fatPerServing: 2, fiberPerServing: 1,
  totalSugarsPerServing: null, addedSugarsPerServing: null, saturatedFatPerServing: null, transFatPerServing: null, sodiumPerServing: null,
  isNutritionCalculated: true, createdAt: T,
  ingredients: [{ foodId, rawName: "x", quantity: 1, unit: "g", notes: null, sortOrder: 0, grams: 1, ...nutr }],
  steps: [{ stepNumber: 1, instruction: "Mix" }],
  tags: ["a", "a"],
});
function sample(): BackupFile {
  return backupFile.parse({
    format: "meal-backup",
    version: BACKUP_VERSION,
    createdAt: T,
    appVersion: "0.1.0",
    timezone: "Asia/Amman",
    data: {
      settings: { dailyCalories: 2300, timezone: "Asia/Amman" },
      goalRevisions: [{ effectiveDate: "2026-10-01", dailyCalories: 2300, dailyProtein: 150, dailyCarbs: 200, dailyFat: 70, dailyFiber: null, goalWeightKg: null, goalType: "lose", goalWeeklyRateKg: 0.5, createdAt: T }],
      foods: [food("f1", "Oats")],
      recipes: [recipe("r1", "f1")],
      foodLog: [
        { date: "2026-10-01", mealCategory: "breakfast", name: "Oats", servings: 1, servingUnit: "g", ...nutr, foodId: "f1", recipeId: null, loggedAt: T, createdAt: T },
        { date: "2026-10-01", mealCategory: "lunch", name: "R", servings: 1, servingUnit: "serving", ...nutr, foodId: null, recipeId: "r1", loggedAt: T, createdAt: T },
        { date: "2026-10-02", mealCategory: "snack", name: "Sys", servings: 1, servingUnit: "g", ...nutr, foodId: "sys1", recipeId: null, loggedAt: T, createdAt: T },
        { date: "2026-10-02", mealCategory: "snack", name: "Gone", servings: 1, servingUnit: "g", ...nutr, foodId: "gone", recipeId: null, loggedAt: T, createdAt: T },
      ],
      water: [],
      weight: [{ date: "2026-10-01", time: "07:00", entryType: "daily", weightKg: 80, bodyFatPct: null, smmKg: null, bmi: null, notes: null, createdAt: T }],
      workouts: [],
      mealTemplates: [{ name: "T", useCount: 0, createdAt: T, items: [{ name: "Oats", servings: 1, servingUnit: "g", ...nutr, foodId: "f1", recipeId: "r1" }] }],
      mealPlans: [{ weekStartDate: "2026-09-28", notes: null, createdAt: T, meals: [{ dayOfWeek: "monday", mealCategory: "lunch", recipeId: "r1", customName: null, servings: 1, calories: 1, protein: 1, carbs: 1, fat: 1, fiber: null, totalSugars: null, addedSugars: null, saturatedFat: null, transFat: null, sodium: null, isCompleted: false, sortOrder: 0 }] }],
      pantry: [{ foodId: "f1", name: "Oats", quantity: 1, unit: "kg", category: "x" }],
      shoppingList: [],
    },
  });
}

describe("backup parsing", () => {
  const text = (v: unknown) => JSON.stringify(v);
  const code = (fn: () => unknown) => {
    try {
      fn();
      return "ok";
    } catch (e) {
      return e instanceof HttpError ? `${e.status}:${e.code}` : "other";
    }
  };

  it("accepts a valid file", () => expect(code(() => parseBackup(text(sample())))).toBe("ok"));
  it("rejects truncated JSON", () => expect(code(() => parseBackup(text(sample()).slice(0, 100)))).toBe("400:bad_json"));
  it("rejects other formats", () => expect(code(() => parseBackup(text({ app: "mealprep", version: 1 })))).toBe("400:not_a_backup"));
  it("rejects unsupported versions before reading the body", () => expect(code(() => parseBackup(text({ ...sample(), version: 99 })))).toBe("400:unsupported_version"));
  it("rejects oversized files", () => expect(code(() => parseBackup("x".repeat(25 * 1024 * 1024 + 1)))).toBe("413:too_large"));
  it.each([
    ["secret in settings", (b: BackupFile) => Object.assign(b.data.settings, { usdaApiKey: "k" })],
    ["derived current weight", (b: BackupFile) => Object.assign(b.data.settings, { currentWeightKg: 80 })],
    ["userId on a record", (b: BackupFile) => Object.assign(b.data.foodLog[0], { userId: "someone" })],
    ["password anywhere", (b: BackupFile) => Object.assign(b.data, { passwordHash: "x" })],
    ["unknown top-level key", (b: BackupFile) => Object.assign(b, { users: [] })],
  ])("rejects %s (strict schema)", (_n, fn) => {
    const b = sample();
    fn(b);
    expect(code(() => parseBackup(text(b)))).toBe("422:invalid_backup");
  });
});

describe("restore plan (id remapping)", () => {
  let n = 0;
  const plan = (b = sample()) => planRestore("user-new", b.data, { systemFoodIds: new Set(["sys1"]), newId: () => `id${++n}` });

  it("gives every record a fresh id and scopes it to the restoring user", () => {
    const p = plan();
    expect(p.foods[0].id).not.toBe("f1");
    expect(p.foods[0].userId).toBe("user-new");
    expect(p.recipes[0].id).not.toBe("r1");
    expect([...p.foodLog, ...p.weight, ...p.pantry, ...p.goalRevisions].every((r) => r.userId === "user-new")).toBe(true);
  });

  it("remaps every reference consistently", () => {
    const p = plan();
    const fid = p.foods[0].id;
    const rid = p.recipes[0].id;
    expect(p.foodServings[0].foodId).toBe(fid);
    expect(p.recipeIngredients[0].foodId).toBe(fid);
    expect(p.recipeIngredients[0].recipeId).toBe(rid);
    expect(p.recipeSteps[0].recipeId).toBe(rid);
    expect(p.foodLog[0].foodId).toBe(fid);
    expect(p.foodLog[1].recipeId).toBe(rid);
    expect(p.meals[0].recipeId).toBe(rid);
    expect(p.meals[0].mealPlanId).toBe(p.mealPlans[0].id);
    expect(p.pantry[0].foodId).toBe(fid);
    expect((p.mealTemplates[0].items as Array<{ foodId: string; recipeId: string }>)[0]).toMatchObject({ foodId: fid, recipeId: rid });
    expect(p.recipeTagNames).toEqual([{ recipeId: rid, name: "a" }]); // duplicate tag names collapse
  });

  it("keeps system-food links, unlinks unknown foods, and never alters snapshots", () => {
    const p = plan();
    expect(p.foodLog[2].foodId).toBe("sys1");
    expect(p.foodLog[3].foodId).toBeNull();
    expect(p.unlinkedFoodRefs).toBe(1);
    expect(p.foodLog.map((e) => e.calories)).toEqual([100, 100, 100, 100]);
    expect(referencedFoodIds(sample().data).sort()).toEqual(["gone", "sys1"]);
  });

  it("rejects a recipe reference that isn't in the backup", () => {
    const b = sample();
    b.data.foodLog[1].recipeId = "missing";
    expect(() => plan(b)).toThrow(/recipe that isn't in the backup/);
  });

  it("rejects duplicate ids, names, plan weeks and revision dates", () => {
    const dupFood = sample();
    dupFood.data.foods.push({ ...dupFood.data.foods[0], name: "Other" });
    expect(() => plan(dupFood)).toThrow(/duplicate food id/);
    const dupName = sample();
    dupName.data.foods.push({ ...dupName.data.foods[0], id: "f2" });
    expect(() => plan(dupName)).toThrow(/duplicate food name/);
    const dupRev = sample();
    dupRev.data.goalRevisions.push({ ...dupRev.data.goalRevisions[0] });
    expect(() => plan(dupRev)).toThrow(/duplicate goal revision date/);
  });
});
