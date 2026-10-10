import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { assertTestDatabase } from "@/lib/testing/safety-guard";
import { BASE, login } from "./helpers";
import { addDays, todayInTimezone } from "@/lib/dates";

/**
 * Phase 9: settings semantics, timezone, goal revisions, backup / export / restore.
 * Runs only against meal_test (safety guard). Uses throwaway users created and deleted by this file,
 * so destructive restores never touch the shared e2e / test-user-a / test-user-b accounts.
 */

const RUN = Date.now().toString(36);
const PASSWORD = "P9-TestPassword!2026";
let db: PrismaClient;
const users: Record<"owner" | "other" | "fresh", { id: string; email: string; cookie: string }> = {} as never;

async function createUser(key: keyof typeof users) {
  const email = `p9-${key}-${RUN}@mealprep.test`;
  const u = await db.user.create({
    data: { email, displayName: `P9 ${key}`, passwordHash: await hash(PASSWORD, { memoryCost: 65536, timeCost: 3, parallelism: 4, outputLen: 32 }), role: "user" },
  });
  users[key] = { id: u.id, email, cookie: await login(email, PASSWORD) };
}

async function req<T = unknown>(who: keyof typeof users | null, path: string, init: RequestInit & { json?: unknown; raw?: string } = {}) {
  const headers: Record<string, string> = { ...(who ? { cookie: users[who].cookie } : {}) };
  if (init.json !== undefined || init.raw !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { ...init, headers, body: init.raw ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined) });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* CSV etc. */
  }
  return { status: res.status, body: body as T, text, headers: res.headers };
}

const patch = (who: keyof typeof users, json: unknown) => req<Record<string, unknown>>(who, "/api/settings", { method: "PATCH", json });

/* ───────── fixtures ───────── */

let systemFoodId: string;

/** A dataset touching every backed-up table and every relation. */
async function seedComplex(userId: string) {
  await db.goalRevision.deleteMany({ where: { userId } }); // earlier tests in this file changed targets today
  await db.userSettings.upsert({
    where: { userId },
    update: { dailyCalories: 2400, dailyProtein: 170, dailyFiber: 30, timezone: "Asia/Amman", measurementSystem: "imperial", goalWeightKg: 80.5, birthDate: "1995-06-15", age: 31,
      // As the app would have synced them from the InBody scan below.
      currentBodyFatPct: 24.5, currentSmmKg: 35.2, currentBmi: 25.1 },
    create: { userId, dailyCalories: 2400, dailyProtein: 170, dailyFiber: 30, timezone: "Asia/Amman", measurementSystem: "imperial", goalWeightKg: 80.5 },
  });
  const oats = await db.food.create({
    data: {
      userId,
      name: 'P9 Oats, "rolled"',
      category: "Grains",
      caloriesPer100g: 379,
      proteinPer100g: 13,
      carbsPer100g: 68,
      fatPer100g: 6.5,
      fiberPer100g: 10,
      brand: "Brand, Inc.",
      isFavorite: true,
      useCount: 7,
      servings: { create: [{ label: "1 cup", grams: 80, isDefault: true, sortOrder: 0 }, { label: "1 tbsp", grams: 5, sortOrder: 1 }] },
    },
  });
  const whey = await db.food.create({ data: { userId, name: "P9 Whey", category: "Supplements", caloriesPer100g: 400, proteinPer100g: 80, carbsPer100g: 8, fatPer100g: 6 } });
  const recipe = await db.recipe.create({
    data: {
      userId,
      name: "P9 Overnight Oats",
      servings: 2.5,
      servingLabel: "jar",
      caloriesPerServing: 410.25,
      proteinPerServing: 30,
      ingredients: {
        create: [
          { rawName: "oats", quantity: 80, unit: "g", grams: 80, calories: 303.2, protein: 10.4, foodId: oats.id, sortOrder: 0 },
          { rawName: "system thing", quantity: 1, unit: "piece", grams: 50, calories: 40, foodId: systemFoodId, sortOrder: 1 },
          { rawName: "pinch of salt", quantity: 1, unit: "g", sortOrder: 2 },
        ],
      },
      instructions: { create: [{ stepNumber: 1, instruction: "Mix,\nthen chill." }, { stepNumber: 2, instruction: "Eat." }] },
      tags: { create: [{ tag: { connectOrCreate: { where: { name: "p9-breakfast" }, create: { name: "p9-breakfast" } } } }] },
    },
  });
  await db.foodLogEntry.createMany({
    data: [
      // Snapshot nutrition intentionally differs from the master food: history must survive as stored.
      { userId, date: "2026-09-01", mealCategory: "breakfast", name: 'P9 Oats, "rolled"', servings: 1, servingUnit: "cup", calories: 123.4, protein: 4.4, carbs: 20, fat: 2, fiber: 3, foodId: oats.id, loggedAt: new Date("2026-09-01T07:00:00Z") },
      { userId, date: "2026-09-01", mealCategory: "lunch", name: "P9 Overnight Oats", servings: 1.5, servingUnit: "jar", calories: 615.4, protein: 45, carbs: 70, fat: 12, fiber: 9, recipeId: recipe.id, loggedAt: new Date("2026-09-01T12:00:00Z") },
      { userId, date: "2026-09-02", mealCategory: "snack", name: "System snack", servings: 2, calories: 80, protein: 1, carbs: 18, fat: 0.5, fiber: 2, sodium: 120, foodId: systemFoodId },
      { userId, date: "2026-09-02", mealCategory: "dinner", name: "Manual, with comma", servings: 1, calories: 700, protein: 40, carbs: 60, fat: 30, fiber: 5, totalSugars: 12 },
    ],
  });
  await db.waterLogEntry.createMany({ data: [{ userId, date: "2026-09-01", amountMl: 500 }, { userId, date: "2026-09-02", amountMl: 750 }] });
  await db.weightEntry.createMany({
    data: [
      { userId, date: "2026-08-30", time: "07:00", entryType: "daily", weightKg: 82.3 },
      { userId, date: "2026-09-01", time: "07:10", entryType: "daily", weightKg: 81.9, notes: "after run, \"tired\"" },
      { userId, date: "2026-09-02", entryType: "daily", weightKg: 81.55 },
      { userId, date: "2026-09-01", entryType: "inbody", weightKg: 82, bodyFatPct: 24.5, smmKg: 35.2, bmi: 25.1 },
    ],
  });
  await db.workoutRoutineEntry.create({ data: { userId, workoutType: "running_moderate", durationMinutes: 30, sessionsPerWeek: 2.5 } });
  await db.mealTemplate.create({
    data: {
      userId,
      name: "P9 Usual breakfast",
      useCount: 3,
      items: [
        { name: "Oats", servings: 1, servingUnit: "cup", calories: 300, protein: 10, carbs: 50, fat: 5, fiber: 8, totalSugars: null, addedSugars: null, saturatedFat: null, transFat: null, sodium: null, foodId: oats.id, recipeId: null },
        { name: "Jar", servings: 1, servingUnit: "jar", calories: 410, protein: 30, carbs: 40, fat: 10, fiber: 6, totalSugars: null, addedSugars: null, saturatedFat: null, transFat: null, sodium: null, foodId: null, recipeId: recipe.id },
      ],
    },
  });
  await db.mealPlan.create({
    data: {
      userId,
      weekStartDate: "2026-08-31",
      notes: "P9 plan",
      meals: { create: [{ dayOfWeek: "monday", mealCategory: "breakfast", recipeId: recipe.id, servings: 1, calories: 410 }, { dayOfWeek: "tuesday", mealCategory: "dinner", customName: "Out", servings: 1, calories: 900, isCompleted: true, sortOrder: 1 }] },
    },
  });
  const pantryOats = await db.pantryItem.create({
    data: { userId, foodId: oats.id, name: "Oats", quantity: 500, unit: "g", category: "Grains", storageLocation: "Fridge", expiryDate: "2026-10-20", lowStockThreshold: 200 },
  });
  const shopping = await db.shoppingListItem.create({ data: { userId, foodId: systemFoodId, name: "System thing", quantity: 2, unit: "piece", category: "Produce", isChecked: true, notes: "ripe" } });

  // Phases 1–3 data: a planned meal logged as a food entry (with the pantry usage it caused), saved meals,
  // day templates that reference them, prep tasks and an adaptive-nutrition recommendation.
  const loggedEntry = await db.foodLogEntry.create({
    data: { userId, date: "2026-08-31", mealCategory: "breakfast", name: "P9 Overnight Oats (planned)", servings: 1, calories: 410, protein: 30, carbs: 50, fat: 9, recipeId: recipe.id, loggedAt: new Date("2026-08-31T08:00:00Z") },
  });
  const plannedBreakfast = await db.meal.findFirstOrThrow({ where: { mealPlan: { userId }, dayOfWeek: "monday" } });
  await db.meal.update({ where: { id: plannedBreakfast.id }, data: { status: "logged", foodLogEntryId: loggedEntry.id, loggedAt: new Date("2026-08-31T08:00:00Z") } });
  await db.pantryTransaction.createMany({
    data: [
      { userId, pantryItemId: pantryOats.id, type: "MEAL_USAGE", quantity: 80, unit: "g", sourceType: "meal", sourceId: plannedBreakfast.id, createdAt: new Date("2026-08-31T08:00:01Z") },
      { userId, pantryItemId: pantryOats.id, type: "ADD", quantity: 500, unit: "g", sourceType: "shopping", sourceId: shopping.id, createdAt: new Date("2026-08-30T10:00:00Z") },
      { userId, pantryItemId: pantryOats.id, type: "ADJUSTMENT", quantity: -20, unit: "g", sourceType: "manual", sourceId: null, createdAt: new Date("2026-08-30T11:00:00Z") },
    ],
  });
  const savedBreakfast = await db.savedMeal.create({
    data: {
      userId,
      name: "P9 Saved breakfast",
      mealCategory: "breakfast",
      isFavorite: true,
      useCount: 4,
      items: { create: [{ foodId: oats.id, quantity: 1, servingUnit: "cup", calories: 300, protein: 10, carbs: 50, fat: 5, sortOrder: 0 }, { recipeId: recipe.id, quantity: 1, calories: 410, protein: 30, carbs: 50, fat: 9, sortOrder: 1 }, { foodId: systemFoodId, customName: "Side", calories: 80, sortOrder: 2 }] },
    },
  });
  await db.dayTemplate.create({
    data: {
      userId,
      name: "P9 Training day",
      description: "High carb",
      useCount: 2,
      items: { create: [{ mealCategory: "breakfast", savedMealId: savedBreakfast.id, calories: 710, sortOrder: 0 }, { mealCategory: "lunch", recipeId: recipe.id, servings: 2, calories: 820, sortOrder: 1 }, { mealCategory: "snack", foodId: whey.id, customName: "Shake", calories: 120, sortOrder: 2 }] },
    },
  });
  await db.prepSession.create({ data: { userId, weekStart: "2026-08-31", tasks: { create: [{ label: "Soak oats", completed: true, sortOrder: 0 }, { label: "Portion jars", sortOrder: 1 }] } } });
  await db.nutritionRecommendation.create({
    data: { userId, dataStartDate: "2026-08-01", dataEndDate: "2026-08-28", previousCalories: 2300, recommendedCalories: 2400, calorieChange: 100, observedWeeklyRate: -0.9, targetWeeklyRate: -0.5, confidence: "medium", reason: "Losing faster than planned", status: "accepted" },
  });
  await db.goalRevision.createMany({
    data: [
      { userId, effectiveDate: "2026-08-01", dailyCalories: 2300, dailyProtein: 160, dailyCarbs: 220, dailyFat: 70, goalType: "lose", goalWeeklyRateKg: 0.5, goalWeightKg: 80 },
      { userId, effectiveDate: "2026-09-01", dailyCalories: 2400, dailyProtein: 170, dailyCarbs: 220, dailyFat: 70, dailyFiber: 30, goalType: "lose", goalWeeklyRateKg: 0.5, goalWeightKg: 80.5 },
    ],
  });
  return { oats, whey, recipe };
}

interface Backup {
  format: string;
  version: number;
  createdAt: string;
  data: Record<string, unknown[] | Record<string, unknown>> & {
    foods: Array<Record<string, unknown> & { id: string; name: string }>;
    recipes: Array<Record<string, unknown> & { id: string; name: string; ingredients: Array<{ foodId: string | null }> }>;
    foodLog: Array<Record<string, unknown> & { foodId: string | null; recipeId: string | null; calories: number }>;
    mealTemplates: Array<{ items: Array<{ foodId: string | null; recipeId: string | null }> }>;
    mealPlans: Array<{ meals: Array<{ recipeId: string | null }> }>;
    pantry: Array<{ foodId: string | null }>;
    shoppingList: Array<{ foodId: string | null }>;
    settings: Record<string, unknown>;
  };
}

/** Domain state independent of generated ids: references become content keys, arrays become sorted multisets. */
function normalize(file: Backup) {
  const d = structuredClone(file.data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x = d as any;
  // Backup-local ids on the rows added in Phases 1–3 become content keys too.
  const logKey = new Map<string, string>((x.foodLog ?? []).map((e: any) => [e.id, `log:${e.date}|${e.name}|${e.loggedAt}`]));
  const mealKey = new Map<string, string>(
    (x.mealPlans ?? []).flatMap((p: any) => p.meals.map((m: any) => [m.id, `meal:${p.weekStartDate}|${m.dayOfWeek}|${m.mealCategory}|${m.sortOrder}`]))
  );
  const pantryKey = new Map<string, string>((x.pantry ?? []).map((p: any) => [p.id, `pantry:${p.name}`]));
  const shopKey = new Map<string, string>((x.shoppingList ?? []).map((i: any) => [i.id, `shop:${i.name}`]));
  const savedKey = new Map<string, string>((x.savedMeals ?? []).map((m: any) => [m.id, `saved:${m.name}`]));
  (x.foodLog ?? []).forEach((e: any) => (e.id = logKey.get(e.id)));
  (x.mealPlans ?? []).forEach((p: any) => p.meals.forEach((m: any) => ((m.id = mealKey.get(m.id)), (m.foodLogEntryId = m.foodLogEntryId ? (logKey.get(m.foodLogEntryId) ?? "MISSING") : null))));
  (x.pantry ?? []).forEach((p: any) => (p.id = pantryKey.get(p.id)));
  (x.shoppingList ?? []).forEach((i: any) => (i.id = shopKey.get(i.id)));
  (x.pantryTransactions ?? []).forEach((t: any) => {
    t.pantryItemId = pantryKey.get(t.pantryItemId) ?? "MISSING";
    t.sourceId = t.sourceId === null ? null : t.sourceType === "meal" ? (mealKey.get(t.sourceId) ?? "MISSING") : (shopKey.get(t.sourceId) ?? "MISSING");
  });
  (x.savedMeals ?? []).forEach((m: any) => (m.id = savedKey.get(m.id)));
  const foodKey = new Map(d.foods.map((f) => [f.id, `food:${f.name}`]));
  const recipeKey = new Map(d.recipes.map((r) => [r.id, `recipe:${r.name}`]));
  const f = (id: string | null) => (id === null ? null : (foodKey.get(id) ?? `system:${id}`));
  const r = (id: string | null) => (id === null ? null : (recipeKey.get(id) ?? `MISSING:${id}`));
  d.foods.forEach((x) => (x.id = foodKey.get(x.id)!));
  d.recipes.forEach((x) => {
    x.id = recipeKey.get(x.id)!;
    x.ingredients.forEach((i) => (i.foodId = f(i.foodId)));
  });
  d.foodLog.forEach((e) => ((e.foodId = f(e.foodId)), (e.recipeId = r(e.recipeId))));
  d.mealTemplates.forEach((t) => t.items.forEach((i) => ((i.foodId = f(i.foodId)), (i.recipeId = r(i.recipeId)))));
  d.mealPlans.forEach((p) => p.meals.forEach((m) => (m.recipeId = r(m.recipeId))));
  d.pantry.forEach((p) => (p.foodId = f(p.foodId)));
  d.shoppingList.forEach((s) => (s.foodId = f(s.foodId)));
  (x.savedMeals ?? []).forEach((m: any) => m.items.forEach((i: any) => ((i.foodId = f(i.foodId)), (i.recipeId = r(i.recipeId)))));
  (x.dayTemplates ?? []).forEach((t: any) =>
    t.items.forEach((i: any) => ((i.foodId = f(i.foodId)), (i.recipeId = r(i.recipeId)), (i.savedMealId = i.savedMealId ? (savedKey.get(i.savedMealId) ?? "MISSING") : null)))
  );
  const sortDeep = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortDeep).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sortDeep(x)]));
    return v;
  };
  return sortDeep(d);
}

const backupOf = async (who: keyof typeof users) => {
  const res = await req<Backup>(who, "/api/backup");
  expect(res.status).toBe(200);
  return res;
};
const restore = (who: keyof typeof users, body: unknown) =>
  req<{ counts: Record<string, number>; durationMs: number; error?: string; code?: string }>(who, "/api/backup/restore?confirm=replace", {
    method: "POST",
    raw: typeof body === "string" ? body : JSON.stringify(body),
  });
const preview = (who: keyof typeof users, body: unknown) =>
  req<{ supported: boolean; problem: string | null; version: number; counts: Record<string, number>; error?: string; code?: string }>(who, "/api/backup/preview", {
    method: "POST",
    raw: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeAll(async () => {
  await assertTestDatabase();
  db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
  systemFoodId = (await db.food.findFirstOrThrow({ where: { userId: null }, orderBy: { name: "asc" } })).id;
  for (const k of ["owner", "other", "fresh"] as const) await createUser(k);
}, 120_000);

afterAll(async () => {
  if (db) {
    await db.user.deleteMany({ where: { email: { startsWith: "p9-", endsWith: `${RUN}@mealprep.test` } } });
    await db.$disconnect();
  }
});

/* ───────── settings ───────── */

describe("Settings API", () => {
  it("GET creates defaults for a new account: no secrets, no invented goal weight, timezone unset, one anchor revision", async () => {
    const { status, body } = await req<Record<string, unknown> & { goalHistory: unknown[] }>("other", "/api/settings");
    expect(status).toBe(200);
    for (const k of ["cloudApiKey", "usdaApiKey", "ollamaUrl", "ollamaModel", "hasCloudApiKey", "userId", "id"]) expect(body).not.toHaveProperty(k);
    expect(body.goalWeightKg).toBeNull();
    expect(body.timezone).toBeNull();
    expect(body.currentWeightKg).toBeNull();
    expect(body.goalHistory).toHaveLength(1);
  });

  it("PATCH only changes supplied fields", async () => {
    const before = (await req<Record<string, unknown>>("other", "/api/settings")).body;
    const { status, body } = await patch("other", { measurementSystem: "imperial" });
    expect(status).toBe(200);
    expect(body.measurementSystem).toBe("imperial");
    for (const k of ["dailyCalories", "dailyProtein", "dailyCarbs", "dailyFat", "dailyFiber", "goalWeightKg", "goalType", "heightCm", "age"]) expect(body[k]).toEqual(before[k]);
  });

  it.each([
    ["string number", { dailyCalories: "2000" }],
    ["Infinity as string", { dailyProtein: "Infinity" }],
    ["negative target", { dailyProtein: -5 }],
    ["absurd calories", { dailyCalories: 100_000 }],
    ["too few calories", { dailyCalories: 10 }],
    ["zero fiber (use null for no target)", { dailyFiber: 0 }],
    ["zero goal weight", { goalWeightKg: 0 }],
    ["invalid enum", { measurementSystem: "furlongs" }],
    ["invalid goal type", { goalType: "bulk" }],
    ["free-text timezone", { timezone: "GMT+3 lol" }],
    ["offset timezone", { timezone: "+03:00" }],
    ["empty patch", {}],
    ["unknown field (mass assignment)", { userId: "someone-else", dailyCalories: 2000 }],
    ["role escalation attempt", { role: "admin" }],
  ])("rejects %s with 400", async (_name, body) => {
    const before = (await req<Record<string, unknown>>("other", "/api/settings")).body;
    const res = await patch("other", body);
    expect(res.status).toBe(400);
    const after = (await req<Record<string, unknown>>("other", "/api/settings")).body;
    expect(after).toEqual(before);
  });

  it("refuses to overwrite derived currentWeightKg", async () => {
    const res = await patch("other", { currentWeightKg: 70 });
    expect(res.status).toBe(400);
    expect((res.body as { code: string }).code).toBe("derived_field");
    expect((await req<{ currentWeightKg: number | null }>("other", "/api/settings")).body.currentWeightKg).toBeNull();
    expect(await db.weightEntry.count({ where: { userId: users.other.id } })).toBe(0);
  });

  it("a first weigh-in before the settings row exists still sets the derived current weight", async () => {
    expect(await db.userSettings.count({ where: { userId: users.fresh.id } })).toBe(0);
    const res = await req("fresh", "/api/weight", { method: "POST", json: { date: "2026-09-01", entryType: "daily", weightKg: 80.4 } });
    expect(res.status).toBe(201);
    expect((await req<{ currentWeightKg: number }>("fresh", "/api/settings")).body.currentWeightKg).toBe(80.4);
    await db.weightEntry.deleteMany({ where: { userId: users.fresh.id } });
  });

  it("parallel weigh-in deletes never leave a stale derived current weight", async () => {
    const ids: string[] = [];
    for (let d = 1; d <= 6; d++) {
      const r = await req<{ id: string }>("other", "/api/weight", { method: "POST", json: { date: `2026-08-0${d}`, entryType: "daily", weightKg: 80 + d / 10 } });
      ids.push(r.body.id);
    }
    expect((await req<{ currentWeightKg: number }>("other", "/api/settings")).body.currentWeightKg).toBe(80.6);
    const t0 = Date.now();
    const statuses = await Promise.all(ids.map((id) => req("other", `/api/weight?id=${id}`, { method: "DELETE" }).then((r) => r.status)));
    console.log(`[perf] 6 parallel weigh-in deletes: ${Date.now() - t0} ms`);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200]);
    expect((await req<{ currentWeightKg: number | null }>("other", "/api/settings")).body.currentWeightKg).toBeNull();
  }, 90_000);

  it("refuses admin server settings for a normal user", async () => {
    expect((await patch("other", { ollamaUrl: "http://evil.example" })).status).toBe(403);
    expect((await patch("other", { usdaApiKey: "x" })).status).toBe(403);
  });

  it("stores timezones canonically and null targets as null", async () => {
    const res = await patch("other", { timezone: "asia/amman", dailyFiber: null, goalWeightKg: null });
    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe("Asia/Amman");
    expect(res.body.dailyFiber).toBeNull();
    expect(res.body.goalWeightKg).toBeNull();
  });

  it("is per-user: B never sees or changes A's settings", async () => {
    await patch("owner", { dailyCalories: 3111 });
    const b = await req<Record<string, unknown>>("other", "/api/settings");
    expect(b.body.dailyCalories).not.toBe(3111);
    await patch("other", { dailyCalories: 1999 });
    expect((await req<Record<string, unknown>>("owner", "/api/settings")).body.dailyCalories).toBe(3111);
  });

  it("requires authentication", async () => {
    expect((await req(null, "/api/settings")).status).toBe(401);
    expect((await req(null, "/api/settings", { method: "PATCH", json: { dailyCalories: 2000 } })).status).toBe(401);
  });
});

describe("Goal revisions", () => {
  const revisions = () => db.goalRevision.findMany({ where: { userId: users.other.id }, orderBy: { effectiveDate: "asc" } });

  it("a target change records a revision effective today in the user's timezone; same-day edits update it (latest wins)", async () => {
    await patch("other", { timezone: "Pacific/Kiritimati" });
    const today = todayInTimezone("Pacific/Kiritimati");
    await patch("other", { dailyCalories: 2222, dailyProtein: 150 });
    await patch("other", { dailyCalories: 2333 });
    const revs = await revisions();
    const todays = revs.filter((r) => r.effectiveDate === today);
    expect(todays).toHaveLength(1);
    expect(todays[0].dailyCalories).toBe(2333);
    expect(todays[0].dailyProtein).toBe(150);
  });

  it("unit, timezone and sodium/water changes never create a revision", async () => {
    const before = await revisions();
    await patch("other", { measurementSystem: "metric" });
    await patch("other", { measurementSystem: "imperial" });
    await patch("other", { timezone: "Europe/London" });
    await patch("other", { dailySodium: 2300, dailyWaterGoalMl: 3000 });
    await patch("other", { dailyCalories: 2333 }); // same value: not a change
    expect(await revisions()).toEqual(before);
  });

  it("goal weight is stored in canonical kg, unchanged by unit switches", async () => {
    await patch("other", { goalWeightKg: 74.843 });
    await patch("other", { measurementSystem: "metric" });
    await patch("other", { measurementSystem: "imperial" });
    const s = await req<{ goalWeightKg: number }>("other", "/api/settings");
    expect(s.body.goalWeightKg).toBe(74.843);
    const latest = (await revisions()).at(-1)!;
    expect(latest.goalWeightKg).toBe(74.843);
  });

  it("settings returns goal history newest first, with the first known date", async () => {
    const s = await req<{ goalHistory: Array<{ effectiveDate: string }>; firstGoalDate: string }>("other", "/api/settings");
    const dates = s.body.goalHistory.map((g) => g.effectiveDate);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(s.body.firstGoalDate).toBe(dates.at(-1));
  });

  it("legacy import goals go through the same path and record a revision", async () => {
    const before = (await revisions()).length;
    const res = await req("other", "/api/import?dryRun=false", { method: "POST", json: { app: "mealprep", version: 1, exportedAt: "x", goals: { dailyCalories: 2555, dailyFiber: 0 } } });
    expect(res.status).toBe(200);
    const s = await req<{ dailyCalories: number; dailyFiber: number | null }>("other", "/api/settings");
    expect(s.body.dailyCalories).toBe(2555);
    expect(s.body.dailyFiber).toBeNull(); // legacy 0 meant "no target"
    expect((await revisions()).length).toBeGreaterThanOrEqual(before);
    expect((await revisions()).at(-1)!.dailyCalories).toBe(2555);
  });
});

describe("Timezone-aware future weigh-in validation", () => {
  const post = (date: string) => req("other", "/api/weight", { method: "POST", json: { date, entryType: "daily", weightKg: 80 } });

  it.each(["Pacific/Kiritimati", "Asia/Amman", "America/New_York"])("%s: today is accepted, tomorrow is refused", async (tz) => {
    await patch("other", { timezone: tz });
    const today = todayInTimezone(tz);
    expect((await post(today)).status).toBe(201);
    expect((await post(addDays(today, 1))).status).toBe(400);
  });

  it("a date that is already today in Kiritimati is refused for a New York user while New York is still on the previous day", async () => {
    await patch("other", { timezone: "America/New_York" });
    const ny = todayInTimezone("America/New_York");
    const kiritimati = todayInTimezone("Pacific/Kiritimati");
    // UTC+14 vs UTC-4/-5: the dates differ for most of each day.
    if (kiritimati > ny) expect((await post(kiritimati)).status).toBe(400);
    await db.weightEntry.deleteMany({ where: { userId: users.other.id } });
  });
});

describe("Analytics against historical goals", () => {
  beforeAll(async () => {
    const userId = users.fresh.id;
    await req("fresh", "/api/settings"); // creates settings + an anchor dated today
    await db.goalRevision.deleteMany({ where: { userId } });
    await db.goalRevision.createMany({
      data: [
        { userId, effectiveDate: "2026-10-01", dailyCalories: 2300, dailyProtein: 150, dailyCarbs: 200, dailyFat: 70 },
        { userId, effectiveDate: "2026-10-15", dailyCalories: 2500, dailyProtein: 180, dailyCarbs: 200, dailyFat: 70 },
      ],
    });
    const log = (date: string, calories: number, protein: number) => ({ userId, date, mealCategory: "lunch", name: "P9 analytics", calories, protein, carbs: 0, fat: 0, fiber: 0 });
    await db.foodLogEntry.createMany({
      data: [
        log("2026-09-30", 2300, 200), // before the first known revision: target unknown
        log("2026-10-05", 2300, 160), // vs 2300/150: in range, protein met
        log("2026-10-20", 2000, 170), // vs 2500/180: out of range, protein not met
      ],
    });
  });
  afterAll(async () => {
    await db.foodLogEntry.deleteMany({ where: { userId: users.fresh.id } });
    await db.goalRevision.deleteMany({ where: { userId: users.fresh.id } });
  });

  it("each day is judged against the goal in effect on it", async () => {
    const { status, body } = await req<{ stats: Record<string, number | null>; goalHistoryFrom: string }>("fresh", "/api/analytics?to=2026-10-30&period=30d");
    expect(status).toBe(200);
    expect(body.stats.daysLogged).toBe(2);
    expect(body.stats.daysWithCalorieGoal).toBe(2);
    expect(body.stats.daysInCalorieRange).toBe(1);
    expect(body.stats.daysWithProteinGoal).toBe(2);
    expect(body.stats.daysMeetingProtein).toBe(1);
    expect(body.goalHistoryFrom).toBe("2026-10-01");
  });

  it("days before the first revision are excluded from adherence, not judged against today's goal", async () => {
    const { body } = await req<{ stats: Record<string, number | null> }>("fresh", "/api/analytics?to=2026-10-30&period=90d");
    expect(body.stats.daysLogged).toBe(3);
    expect(body.stats.daysWithCalorieGoal).toBe(2);
    expect(body.stats.daysWithProteinGoal).toBe(2);
    expect(body.stats.daysMeetingProtein).toBe(1); // Sep 30's 200 g would count if it were wrongly judged against a current target
  });

  it("a period entirely before goal history has no adherence numbers", async () => {
    const { body } = await req<{ stats: Record<string, number | null> }>("fresh", "/api/analytics?to=2026-09-30&period=7d");
    expect(body.stats.daysLogged).toBe(1);
    expect(body.stats.daysInCalorieRange).toBeNull();
    expect(body.stats.daysMeetingProtein).toBeNull();
  });
});

/* ───────── backup / export / restore ───────── */

describe("Backup download", () => {
  beforeAll(async () => {
    await seedComplex(users.owner.id);
  }, 60_000);

  it("is a versioned, complete, user-scoped file with a dated filename", async () => {
    const res = await backupOf("owner");
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="meal-backup-\d{4}-\d{2}-\d{2}\.json"/);
    expect(res.headers.get("content-disposition")).toContain(todayInTimezone("Asia/Amman"));
    const b = res.body;
    expect(b.format).toBe("meal-backup");
    expect(b.version).toBe(1);
    expect(b.data.foods).toHaveLength(2);
    expect(b.data.recipes).toHaveLength(1);
    expect(b.data.foodLog).toHaveLength(5);
    expect(b.data.savedMeals as unknown[]).toHaveLength(1);
    expect(b.data.dayTemplates as unknown[]).toHaveLength(1);
    expect(b.data.pantryTransactions as unknown[]).toHaveLength(3);
    expect(b.data.prepSessions as unknown[]).toHaveLength(1);
    expect(b.data.nutritionRecommendations as unknown[]).toHaveLength(1);
    expect(b.data.weight as unknown[]).toHaveLength(4);
    expect(b.data.goalRevisions as unknown[]).toHaveLength(2);
    expect(b.data.mealPlans[0].meals).toHaveLength(2);
    expect(b.data.foodLog.find((e) => e.calories === 123.4)).toBeTruthy();
  });

  it("contains no secrets, auth data, derived weight, or other users' records", async () => {
    await db.userSettings.update({ where: { userId: users.owner.id }, data: { cloudApiKey: "sk-secret-cloud", usdaApiKey: "usda-secret" } });
    const { text } = await backupOf("owner");
    for (const needle of ["passwordHash", "tokenHash", "sk-secret-cloud", "usda-secret", "cloudApiKey", "usdaApiKey", "ollamaUrl", "currentWeightKg", "userId", users.owner.id, users.owner.email, "$argon2"]) {
      expect(text).not.toContain(needle);
    }
    const other = await backupOf("other");
    expect(other.text).not.toContain("P9 Oats");
    expect(other.text).not.toContain("P9 Overnight Oats");
  });

  it("requires authentication and ignores any userId parameter", async () => {
    expect((await req(null, "/api/backup")).status).toBe(401);
    const res = await req<Backup>("other", `/api/backup?userId=${users.owner.id}`);
    expect(res.text).not.toContain("P9 Oats");
  });
});

describe("CSV exports", () => {
  it("food log CSV uses stored snapshots and escapes commas, quotes and newlines", async () => {
    const oats = await db.food.findFirstOrThrow({ where: { userId: users.owner.id, name: { startsWith: "P9 Oats" } } });
    await db.food.update({ where: { id: oats.id }, data: { caloriesPer100g: 999 } }); // master change must not leak into history
    const res = await req("owner", "/api/export?format=csv&table=food-log");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/meal-food-log-\d{4}-\d{2}-\d{2}\.csv/);
    const lines = res.text.replace(/^﻿/, "").split("\r\n");
    expect(lines[0]).toBe("date,meal,food,brand,source,servings,serving_unit,calories_kcal,protein_g,carbs_g,fat_g,fiber_g,sugars_g,sodium_mg");
    expect(res.text).toContain('2026-09-01,breakfast,"P9 Oats, ""rolled""","Brand, Inc.",food,1,cup,123.4,4.4,20,2,3,,');
    expect(res.text).toContain('"Manual, with comma"');
    expect(res.text).not.toContain("999");
  });

  it("weight CSV keeps canonical kg and adds pounds for an imperial user", async () => {
    const res = await req("owner", "/api/export?format=csv&table=weight");
    const lines = res.text.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe("date,time,entry_type,weight_kg,weight_lb,body_fat_pct,smm_kg,bmi,notes");
    expect(lines).toContain('2026-09-01,07:10,daily,81.9,180.6,,,,"after run, ""tired"""');
    expect(lines).toContain("2026-09-01,,inbody,82,180.8,24.5,35.2,25.1,");
  });

  it("exports are scoped to the session user", async () => {
    expect((await req(null, "/api/export?format=csv&table=food-log")).status).toBe(401);
    const res = await req("other", `/api/export?format=csv&table=food-log&userId=${users.owner.id}`);
    expect(res.text).not.toContain("P9 Oats");
  });
});

describe("Restore", () => {
  let original: Backup;
  let originalNorm: unknown;

  beforeAll(async () => {
    original = (await backupOf("owner")).body;
    originalNorm = normalize(original);
  });

  it("previews without writing", async () => {
    const before = normalize((await backupOf("other")).body);
    const res = await preview("other", original);
    expect(res.status).toBe(200);
    expect(res.body.supported).toBe(true);
    expect(res.body.version).toBe(1);
    expect(res.body.counts.foodLog).toBe(5);
    expect(res.body.counts.recipes).toBe(1);
    expect(normalize((await backupOf("other")).body)).toEqual(before);
  });

  it("requires explicit confirmation and authentication", async () => {
    const r = await req("owner", "/api/backup/restore", { method: "POST", raw: JSON.stringify(original) });
    expect(r.status).toBe(400);
    expect((await req(null, "/api/backup/restore?confirm=replace", { method: "POST", raw: JSON.stringify(original) })).status).toBe(401);
    expect((await req(null, "/api/backup/preview", { method: "POST", raw: JSON.stringify(original) })).status).toBe(401);
  });

  it("round-trips: modify/delete everything, restore, and the normalized domain state matches", async () => {
    const userId = users.owner.id;
    await db.foodLogEntry.deleteMany({ where: { userId } });
    await db.recipe.deleteMany({ where: { userId } });
    await db.food.create({ data: { userId, name: "Junk added after backup", category: "x", caloriesPer100g: 1, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 } });
    await db.weightEntry.create({ data: { userId, date: "2026-09-20", entryType: "daily", weightKg: 99 } });
    await patch("owner", { dailyCalories: 1800, measurementSystem: "metric" });

    const res = await restore("owner", original);
    expect(res.status).toBe(200);
    expect(res.body.counts.foodLog).toBe(5);

    const after = (await backupOf("owner")).body;
    expect(normalize(after)).toEqual(originalNorm);

    // Derived state is recomputed from restored history, not trusted from the file.
    const s = await req<{ currentWeightKg: number; dailyCalories: number }>("owner", "/api/settings");
    expect(s.body.currentWeightKg).toBe(81.55);
    expect(s.body.dailyCalories).toBe(2400);
    // Historical snapshots restore exactly.
    const snap = await db.foodLogEntry.findFirstOrThrow({ where: { userId, calories: 123.4 } });
    expect(snap.protein).toBe(4.4);
    // Account and sessions untouched.
    expect((await req("owner", "/api/auth/me")).status).toBe(200);
  }, 60_000);

  it("keeps Phases 1–3 links working after restore: unlogging a restored planned meal removes its log entry and returns its pantry usage", async () => {
    const userId = users.owner.id;
    const meal = await db.meal.findFirstOrThrow({ where: { mealPlan: { userId }, status: "logged" } });
    expect(meal.foodLogEntryId).not.toBeNull();
    const pantryBefore = await db.pantryItem.findFirstOrThrow({ where: { userId, name: "Oats" } });
    const res = await req("owner", "/api/meal-plan/unlog", { method: "POST", json: { mealId: meal.id } });
    expect(res.status).toBe(200);
    expect(await db.foodLogEntry.count({ where: { id: meal.foodLogEntryId! } })).toBe(0);
    expect((await db.pantryItem.findUniqueOrThrow({ where: { id: pantryBefore.id } })).quantity).toBe(pantryBefore.quantity + 80);
    // Put the owner back to the original backup for the tests below.
    expect((await restore("owner", original)).status).toBe(200);
  }, 60_000);

  it("restores into a fresh account and reconstructs the same domain data; the source account is unchanged", async () => {
    await db.foodLogEntry.deleteMany({ where: { userId: users.fresh.id } });
    const res = await restore("fresh", original);
    expect(res.status).toBe(200);
    expect(normalize((await backupOf("fresh")).body)).toEqual(originalNorm);
    expect(normalize((await backupOf("owner")).body)).toEqual(originalNorm);
    // Fresh ids: no row was written under the owner, and the two accounts share no record ids.
    const ownerIds = new Set((await db.food.findMany({ where: { userId: users.owner.id } })).map((f) => f.id));
    const freshFoods = await db.food.findMany({ where: { userId: users.fresh.id } });
    expect(freshFoods).toHaveLength(2);
    expect(freshFoods.some((f) => ownerIds.has(f.id))).toBe(false);
  }, 60_000);

  it("user B restoring user A's file only ever writes B's own data", async () => {
    const ownerBefore = normalize((await backupOf("owner")).body);
    const res = await restore("other", original);
    expect(res.status).toBe(200);
    expect(normalize((await backupOf("owner")).body)).toEqual(ownerBefore);
    expect(await db.food.count({ where: { userId: users.other.id } })).toBe(2);
  }, 60_000);

  describe("rejects malicious or broken files with a clean 4xx and no changes", () => {
    const mutate = (fn: (b: Backup & Record<string, unknown>) => void) => {
      const b = structuredClone(original) as Backup & Record<string, unknown>;
      fn(b);
      return b;
    };
    const cases: Array<[string, () => unknown, number]> = [
      ["truncated JSON", () => JSON.stringify(original).slice(0, 500), 400],
      ["unsupported version", () => ({ ...original, version: 2 }), 400],
      ["not a backup", () => ({ app: "mealprep", version: 1 }), 400],
      ["a userId on a food", () => mutate((b) => Object.assign(b.data.foods[0], { userId: users.other.id })), 422],
      ["a system-owned food (userId null)", () => mutate((b) => Object.assign(b.data.foods[0], { userId: null })), 422],
      ["session records", () => mutate((b) => Object.assign(b.data, { sessions: [{ tokenHash: "x" }] })), 422],
      ["a password field in settings", () => mutate((b) => Object.assign(b.data.settings, { passwordHash: "x" })), 422],
      ["derived currentWeightKg in settings", () => mutate((b) => Object.assign(b.data.settings, { currentWeightKg: 50 })), 422],
      ["a malformed id", () => mutate((b) => (b.data.foods[0].id = "../../etc")), 422],
      ["an oversized string", () => mutate((b) => (b.data.foods[0].name = "x".repeat(10_000))), 422],
      [
        "an oversized array",
        () => mutate((b) => (b.data.workouts = Array.from({ length: 201 }, () => ({ workoutType: "x", customLabel: null, durationMinutes: 1, sessionsPerWeek: 1, createdAt: new Date().toISOString() })))),
        422,
      ],
      ["an unknown property", () => mutate((b) => Object.assign(b, { extra: true })), 422],
      ["an invalid date", () => mutate((b) => (b.data.foodLog[0].date = "2026-02-30")), 422],
      ["an invalid enum", () => mutate((b) => (b.data.foodLog[0].mealCategory = "brunch")), 422],
      ["a negative nutrient", () => mutate((b) => (b.data.foodLog[0].calories = -1)), 422],
      ["a NUL character", () => mutate((b) => (b.data.foods[0].name = "bad\u0000name")), 422],
      ["duplicate food names", () => mutate((b) => (b.data.foods[1].name = b.data.foods[0].name)), 422],
    ];

    let before: unknown;
    beforeAll(async () => {
      before = normalize((await backupOf("owner")).body);
    });

    it.each(cases)("%s", async (_name, build, expected) => {
      const res = await restore("owner", build());
      expect(res.status).toBe(expected);
      expect(normalize((await backupOf("owner")).body)).toEqual(before);
    }, 60_000);

    it("a file over the size limit is refused with 413", async () => {
      const res = await restore("owner", "x".repeat(26 * 1024 * 1024));
      expect(res.status).toBe(413);
    }, 60_000);
  });

  it("is atomic: a reference that only fails inside the transaction (after the delete phase) rolls everything back", async () => {
    const before = normalize((await backupOf("owner")).body);
    const bad = structuredClone(original);
    bad.data.foodLog.at(-1)!.recipeId = "recipe_that_is_not_in_the_backup";
    // Passes outer parsing; the preview flags it…
    const p = await preview("owner", bad);
    expect(p.status).toBe(200);
    expect(p.body.supported).toBe(false);
    expect(p.body.problem).toMatch(/recipe/);
    // …and a forced restore fails in the relational stage, after deletes ran, and rolls back.
    const res = await restore("owner", bad);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("invalid_reference");
    expect(normalize((await backupOf("owner")).body)).toEqual(before);
    expect((await req<{ currentWeightKg: number }>("owner", "/api/settings")).body.currentWeightKg).toBe(81.55);
  }, 60_000);

  it("re-links system foods that exist and unlinks unknown ones without losing the snapshot", async () => {
    const b = structuredClone(original);
    const sys = b.data.foodLog.find((e) => e.foodId === systemFoodId)!;
    sys.foodId = "system_food_from_another_server";
    const p = await preview("fresh", b);
    expect(p.body.supported).toBe(true);
    expect(await restore("fresh", b).then((r) => r.status)).toBe(200);
    const row = await db.foodLogEntry.findFirstOrThrow({ where: { userId: users.fresh.id, name: "System snack" } });
    expect(row.foodId).toBeNull();
    expect(row.calories).toBe(80);
    const ingredient = await db.recipeIngredient.findFirstOrThrow({ where: { recipe: { userId: users.fresh.id }, rawName: "system thing" } });
    expect(ingredient.foodId).toBe(systemFoodId); // global catalog row is linked, never copied
    expect(await db.food.count({ where: { userId: users.fresh.id } })).toBe(2);
  }, 60_000);
});
