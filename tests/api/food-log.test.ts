import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, cleanupTestDates, TEST_DATE, TEST_DATE_NEXT } from "./helpers";
import type { DayData, MealItem } from "@/lib/domain";

const entry = (over: Partial<MealItem> = {}) => ({
  date: TEST_DATE,
  mealCategory: "breakfast",
  name: "Test oats",
  servings: 80,
  servingUnit: "g",
  calories: 304,
  protein: 10.6,
  carbs: 54.4,
  fat: 5.6,
  fiber: 8,
  ...over,
});

describe("food log API", () => {
  beforeAll(cleanupTestDates);
  afterAll(cleanupTestDates);

  it("creates, lists and totals entries for a local date", async () => {
    const c = await call<MealItem>("/api/food-log", { method: "POST", json: entry() });
    expect(c.status).toBe(201);
    expect(c.body.calories).toBe(304);
    const day = await call<DayData>(`/api/day?date=${TEST_DATE}`);
    expect(day.status).toBe(200);
    expect(day.body.entries.map((e) => e.id)).toContain(c.body.id);
    expect(day.body.totals.calories).toBe(304);
    expect(day.body.goals.calories).toBeGreaterThan(0);
  });

  it("is idempotent when the client retries with the same id", async () => {
    const id = crypto.randomUUID();
    const a = await call<MealItem>("/api/food-log", { method: "POST", json: entry({ id, name: "Retry me" }) });
    const b = await call<MealItem>("/api/food-log", { method: "POST", json: entry({ id, name: "Retry me" }) });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.id).toBe(a.body.id);
    const day = await call<DayData>(`/api/day?date=${TEST_DATE}`);
    expect(day.body.entries.filter((e) => e.name === "Retry me")).toHaveLength(1);
  });

  it("rescales nutrients when only the quantity changes, and keeps manual overrides", async () => {
    const c = await call<MealItem>("/api/food-log", { method: "POST", json: entry({ name: "Scale me" }) });
    const half = await call<MealItem>(`/api/food-log/${c.body.id}`, { method: "PUT", json: { servings: 40 } });
    expect(half.status).toBe(200);
    expect(half.body.calories).toBe(152);
    expect(half.body.protein).toBe(5.3);
    expect(half.body.fiber).toBe(4);
    const manual = await call<MealItem>(`/api/food-log/${c.body.id}`, { method: "PUT", json: { calories: 999 } });
    expect(manual.body.calories).toBe(999);
    expect(manual.body.protein).toBe(5.3);
  });

  it("moves between meals and days", async () => {
    const c = await call<MealItem>("/api/food-log", { method: "POST", json: entry({ name: "Move me" }) });
    const moved = await call<MealItem>(`/api/food-log/${c.body.id}`, { method: "PUT", json: { mealCategory: "dinner", date: TEST_DATE_NEXT } });
    expect(moved.body.mealCategory).toBe("dinner");
    expect(moved.body.date).toBe(TEST_DATE_NEXT);
    const next = await call<DayData>(`/api/day?date=${TEST_DATE_NEXT}`);
    expect(next.body.entries.some((e) => e.id === c.body.id)).toBe(true);
  });

  it("copies a meal to another day preserving values", async () => {
    await call("/api/food-log", { method: "POST", json: entry({ name: "Copy A", mealCategory: "lunch" }) });
    await call("/api/food-log", { method: "POST", json: entry({ name: "Copy B", mealCategory: "lunch", calories: 100 }) });
    const r = await call<MealItem[]>("/api/food-log/copy", { method: "POST", json: { fromDate: TEST_DATE, toDate: TEST_DATE_NEXT, fromMealCategory: "lunch", toMealCategory: "snack" } });
    expect(r.status).toBe(201);
    expect(r.body).toHaveLength(2);
    expect(r.body.every((e) => e.mealCategory === "snack" && e.date === TEST_DATE_NEXT)).toBe(true);
    expect(r.body.find((e) => e.name === "Copy B")?.calories).toBe(100);
  });

  it("rejects invalid input with a readable message", async () => {
    const r = await call<{ error: string; code: string }>("/api/food-log", { method: "POST", json: entry({ servings: 0 }) });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("validation");
    expect(r.body.error).toMatch(/Quantity/);
    const bad = await call<{ error: string }>("/api/food-log", { method: "POST", json: entry({ date: "2001-02-30" }) });
    expect(bad.status).toBe(400);
  });

  it("refuses links to foods/recipes the user does not own, and unknown ids", async () => {
    const r = await call<{ code: string }>("/api/food-log", { method: "POST", json: entry({ foodId: "does-not-exist" }) });
    expect(r.status).toBe(404);
    const del = await call(`/api/food-log/does-not-exist`, { method: "DELETE" });
    expect(del.status).toBe(404);
  });

  it("deletes", async () => {
    const c = await call<MealItem>("/api/food-log", { method: "POST", json: entry({ name: "Delete me" }) });
    const d = await call(`/api/food-log/${c.body.id}`, { method: "DELETE" });
    expect(d.status).toBe(200);
    const day = await call<DayData>(`/api/day?date=${TEST_DATE}`);
    expect(day.body.entries.some((e) => e.id === c.body.id)).toBe(false);
  });

  it("requires authentication", async () => {
    const res = await fetch(`${process.env.TEST_BASE_URL || "http://localhost:3100"}/api/day?date=${TEST_DATE}`);
    expect(res.status).toBe(401);
  });
});

describe("foods, templates, water, export", () => {
  afterAll(cleanupTestDates);

  it("creates a food, marks it favorite, logs it and bumps usage", async () => {
    const name = `Test food ${Date.now()}`;
    const f = await call<{ id: string; caloriesPer100g: number }>("/api/foods", {
      method: "POST",
      json: { name, nutritionBasis: "PER_SERVING", servingSize: 50, servingUnit: "g", servingWeightGrams: 50, calories: 100, protein: 5, carbs: 10, fat: 2 },
    });
    expect(f.status).toBe(201);
    expect(f.body.caloriesPer100g).toBe(200);
    const fav = await call<{ isFavorite: boolean }>(`/api/foods/${f.body.id}`, { method: "PATCH", json: { isFavorite: true } });
    expect(fav.body.isFavorite).toBe(true);
    await call("/api/food-log", { method: "POST", json: entry({ name, foodId: f.body.id }) });
    const recent = await call<{ id: string; useCount: number }[]>(`/api/foods?view=recent&limit=5`);
    expect(recent.body[0]?.id).toBe(f.body.id);
    expect(recent.body[0]?.useCount).toBe(1);
    const search = await call<{ id: string }[]>(`/api/foods?q=${encodeURIComponent(name.toUpperCase())}`);
    expect(search.body.some((x) => x.id === f.body.id)).toBe(true);
    const dup = await call<{ error: string }>("/api/foods", { method: "POST", json: { name, calories: 1 } });
    expect(dup.status).toBe(409);
    await call(`/api/foods/${f.body.id}`, { method: "DELETE" });
  });

  it("stores named servings and exposes the built-in library", async () => {
    const name = `Test bread ${Date.now()}`;
    const f = await call<{ id: string; servings: { label: string; grams: number; isDefault: boolean }[] }>("/api/foods", {
      method: "POST",
      json: { name, nutritionBasis: "PER_100G", calories: 250, protein: 9, carbs: 48, fat: 3, servings: [{ label: "1 slice", grams: 30, isDefault: true }, { label: "1 loaf", grams: 500 }] },
    });
    expect(f.status).toBe(201);
    expect(f.body.servings.map((s) => s.label)).toEqual(["1 slice", "1 loaf"]);
    const upd = await call<{ servings: { label: string }[] }>(`/api/foods/${f.body.id}`, { method: "PUT", json: { servings: [{ label: "1 slice", grams: 32 }] } });
    expect(upd.body.servings).toHaveLength(1);
    const bad = await call(`/api/foods/${f.body.id}`, { method: "PUT", json: { servings: [{ label: "", grams: 0 }] } });
    expect(bad.status).toBe(400);
    await call(`/api/foods/${f.body.id}`, { method: "DELETE" });

    const lib = await call<{ id: string; userId: string | null; servings: unknown[] }[]>("/api/foods?view=library&q=banana");
    expect(lib.body.length).toBeGreaterThan(0);
    expect(lib.body[0].userId).toBeNull();
    expect(lib.body[0].servings.length).toBeGreaterThan(0);
    // Library foods can be logged but not deleted by a normal user
    const del = await call(`/api/foods/${lib.body[0].id}`, { method: "DELETE" });
    expect(del.status).toBe(403);
  });

  it("saves a meal template and logs it", async () => {
    const t = await call<{ id: string }>("/api/templates", {
      method: "POST",
      json: { name: "Test template", items: [entry({ name: "T1" }), entry({ name: "T2", calories: 50 })] },
    });
    expect(t.status).toBe(201);
    const logged = await call<MealItem[]>(`/api/templates/${t.body.id}`, { method: "POST", json: { date: TEST_DATE_NEXT, mealCategory: "dinner" } });
    expect(logged.body).toHaveLength(2);
    expect(logged.body[1].calories).toBe(50);
    await call(`/api/templates/${t.body.id}`, { method: "DELETE" });
  });

  it("logs and undoes water", async () => {
    const a = await call<{ totalMl: number }>("/api/water-log", { method: "POST", json: { date: TEST_DATE, amountMl: 250 } });
    expect(a.body.totalMl).toBeGreaterThanOrEqual(250);
    const u = await call<{ totalMl: number }>(`/api/water-log?date=${TEST_DATE}`, { method: "DELETE" });
    expect(u.body.totalMl).toBe(a.body.totalMl - 250);
    const bad = await call("/api/water-log", { method: "POST", json: { date: TEST_DATE, amountMl: -1 } });
    expect(bad.status).toBe(400);
  });

  it("export round-trips through a dry-run import", async () => {
    const exp = await call<{ app: string; entries: unknown[] }>("/api/export");
    expect(exp.status).toBe(200);
    expect(exp.body.app).toBe("mealprep");
    const dry = await call<{ dryRun: boolean; summary: { entries: number; skipped: number } }>("/api/import?dryRun=true", { method: "POST", json: exp.body });
    expect(dry.status).toBe(200);
    expect(dry.body.dryRun).toBe(true);
    expect(dry.body.summary.entries).toBe(0); // everything already exists → skipped
    const csv = await call<string>("/api/export?format=csv&table=entries");
    expect(csv.status).toBe(200);
  });

  it("never returns API keys from settings", async () => {
    const s = await call<Record<string, unknown>>("/api/settings");
    expect(s.body).not.toHaveProperty("cloudApiKey");
    expect(s.body).not.toHaveProperty("usdaApiKey");
  });
});
