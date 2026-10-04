import { describe, expect, it, vi } from "vitest";
import { call, login } from "./helpers";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const USER_A_EMAIL = "test-user-a@mealprep.test";
const USER_A_PASSWORD = "TestPassword123!";

const USER_B_EMAIL = "test-user-b@mealprep.test";
const USER_B_PASSWORD = "TestPassword123!";

// Dedicated isolated date window for analytics tests
const T_ANCHOR = "2023-10-30";
const T_DAY1 = "2023-10-25";
const T_DAY2 = "2023-10-28";
const T_PREV_DAY = "2023-09-20";

async function cleanUserLogs(cookie: string) {
  for (const d of [T_DAY1, T_DAY2, T_PREV_DAY]) {
    const res = await call<any>(`/api/food-log?date=${d}`, { headers: { cookie } });
    if (res.status === 200 && res.body?.entries) {
      for (const e of res.body.entries) {
        await call(`/api/food-log/${e.id}`, { method: "DELETE", headers: { cookie } });
      }
    }
  }
  const wRes = await call<any>("/api/weight", { headers: { cookie } });
  if (wRes.status === 200 && (wRes.body?.entries || wRes.body?.inbody)) {
    for (const e of [...(wRes.body.entries || []), ...(wRes.body.inbody || [])]) {
      if (e.date === T_DAY1 || e.date === T_DAY2 || e.date === T_PREV_DAY) {
        await call(`/api/weight?id=${e.id}`, { method: "DELETE", headers: { cookie } });
      }
    }
  }
}

describe("Analytics API (/api/analytics)", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await fetch("http://localhost:3101/api/analytics");
    expect(res.status).toBe(401);
  });

  it("rejects invalid date parameters with 400", async () => {
    const cookie = await login(USER_A_EMAIL, USER_A_PASSWORD);
    const res = await call("/api/analytics?to=not-a-date", { headers: { cookie } });
    expect(res.status).toBe(400);
  });

  it("returns default 30D analytics payload for an empty account without error", async () => {
    const cookie = await login(USER_B_EMAIL, USER_B_PASSWORD);
    const res = await call<any>("/api/analytics?to=2021-01-01", { headers: { cookie } });

    expect(res.status).toBe(200);
    expect(res.body.period).toBe("30d");
    expect(res.body.totalDays).toBe(30);
    expect(res.body.stats.daysLogged).toBe(0);
    expect(res.body.stats.coveragePct).toBe(0);
    expect(res.body.stats.avgCalories).toBeNull();
    expect(res.body.stats.avgProtein).toBeNull();
    expect(res.body.stats.daysInCalorieRange).toBeNull();
    expect(res.body.stats.daysMeetingProtein).toBeNull();
    expect(res.body.mealDistribution).toHaveLength(4);
    expect(res.body.frequentFoods).toEqual([]);
    expect(res.body.weight.latestKg).toBeNull();
  });

  it("calculates accurate statistics, meal distribution, and frequent foods for logged days", async () => {
    const cookie = await login(USER_A_EMAIL, USER_A_PASSWORD);
    await cleanUserLogs(cookie);

    // 1. Create a master food
    const foodRes = await call<any>("/api/foods", {
      method: "POST",
      headers: { cookie },
      json: {
        name: `Analytics Chicken ${Date.now()}`,
        servingSizeGrams: 100,
        servingUnit: "g",
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      },
    });
    expect(foodRes.status).toBe(201);
    const foodId = foodRes.body.id;

    // 2. Log food on T_DAY1 (lunch) and T_DAY2 (dinner)
    const log1 = await call<any>("/api/food-log", {
      method: "POST",
      headers: { cookie },
      json: {
        date: T_DAY1,
        mealCategory: "lunch",
        name: foodRes.body.name,
        foodId,
        servings: 2, // 200g -> 330 kcal, 62g protein
        servingUnit: "g",
        calories: 330,
        protein: 62,
        carbs: 0,
        fat: 7.2,
      },
    });
    expect(log1.status).toBe(201);

    const log2 = await call<any>("/api/food-log", {
      method: "POST",
      headers: { cookie },
      json: {
        date: T_DAY2,
        mealCategory: "dinner",
        name: foodRes.body.name,
        foodId,
        servings: 3, // 300g -> 495 kcal, 93g protein
        servingUnit: "g",
        calories: 495,
        protein: 93,
        carbs: 0,
        fat: 10.8,
      },
    });
    expect(log2.status).toBe(201);

    // Also log in the previous 30-day window (T_PREV_DAY) to test period comparison
    const logPrev = await call<any>("/api/food-log", {
      method: "POST",
      headers: { cookie },
      json: {
        date: T_PREV_DAY,
        mealCategory: "breakfast",
        name: "Morning Oats",
        servings: 1,
        servingUnit: "bowl",
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      },
    });
    expect(logPrev.status).toBe(201);

    // 3. Log a daily weight entry and an InBody scan
    const w1 = await call<any>("/api/weight", {
      method: "POST",
      headers: { cookie },
      json: {
        date: T_DAY1,
        time: "08:00",
        entryType: "daily",
        weightKg: 85.0,
      },
    });
    expect(w1.status).toBe(201);

    const w2 = await call<any>("/api/weight", {
      method: "POST",
      headers: { cookie },
      json: {
        date: T_DAY2,
        time: "08:00",
        entryType: "daily",
        weightKg: 84.5,
      },
    });
    expect(w2.status).toBe(201);

    // InBody scan on T_DAY2 (must be excluded from daily weight trend)
    const wInBody = await call<any>("/api/weight", {
      method: "POST",
      headers: { cookie },
      json: {
        date: T_DAY2,
        entryType: "inbody",
        weightKg: 95.0,
        bodyFatPct: 18.0,
      },
    });
    expect(wInBody.status).toBe(201);

    // 4. Request analytics for 30D ending at T_ANCHOR
    const aRes = await call<any>(`/api/analytics?to=${T_ANCHOR}&period=30d`, {
      headers: { cookie },
    });

    expect(aRes.status).toBe(200);
    const body = aRes.body;

    // Period dates check
    expect(body.period).toBe("30d");
    expect(body.current.to).toBe(T_ANCHOR);
    expect(body.current.from).toBe("2023-10-01");

    // Coverage: 2 days logged out of 30 days
    expect(body.stats.daysLogged).toBe(2);
    expect(body.stats.totalDays).toBe(30);
    expect(body.stats.coveragePct).toBe(7); // 2 / 30 = 6.67% -> 7%

    // Average calories on logged days:
    // Day 1 = 330 kcal, Day 2 = 495 kcal -> sum = 825 / 2 = 412.5 -> 413 kcal
    expect(body.stats.avgCalories).toBe(413);
    // Average protein: (62 + 93) / 2 = 155 / 2 = 77.5g
    expect(body.stats.avgProtein).toBe(77.5);

    // Comparison with previous 30-day period (which has T_PREV_DAY with 300 kcal, 10g protein)
    expect(body.previousStats.daysLogged).toBe(1);
    expect(body.previousStats.avgCalories).toBe(300);
    expect(body.previousStats.avgProtein).toBe(10);

    // Deltas
    expect(body.deltas.avgCalories).toBe(113); // 413 - 300 = +113 kcal
    expect(body.deltas.avgProtein).toBe(67.5); // 77.5 - 10 = +67.5g
    expect(body.deltas.daysLogged).toBe(1); // 2 - 1 = +1

    // Meal distribution
    const lunch = body.mealDistribution.find((m: any) => m.category === "lunch");
    expect(lunch.totalCalories).toBe(330);
    expect(lunch.daysLogged).toBe(1);

    const dinner = body.mealDistribution.find((m: any) => m.category === "dinner");
    expect(dinner.totalCalories).toBe(495);
    expect(dinner.daysLogged).toBe(1);

    // Frequent foods
    expect(body.frequentFoods.length).toBeGreaterThanOrEqual(1);
    expect(body.frequentFoods[0].name).toBe(foodRes.body.name);
    expect(body.frequentFoods[0].count).toBe(2);
    expect(body.frequentFoods[0].totalCalories).toBe(825);

    // Weight trend: should show daily points (85.0 and 84.5), NOT the InBody 95.0!
    expect(body.weight.latestKg).toBe(84.5);
    expect(body.weight.points.some((p: any) => p.meanKg === 95)).toBe(false);

    // Cleanup test data
    await call(`/api/food-log?id=${log1.body.id}`, { method: "DELETE", headers: { cookie } });
    await call(`/api/food-log?id=${log2.body.id}`, { method: "DELETE", headers: { cookie } });
    await call(`/api/food-log?id=${logPrev.body.id}`, { method: "DELETE", headers: { cookie } });
    await call(`/api/weight?id=${w1.body.id}`, { method: "DELETE", headers: { cookie } });
    await call(`/api/weight?id=${w2.body.id}`, { method: "DELETE", headers: { cookie } });
    await call(`/api/weight?id=${wInBody.body.id}`, { method: "DELETE", headers: { cookie } });
    await call(`/api/foods?id=${foodId}`, { method: "DELETE", headers: { cookie } });
  });

  it("enforces strict user isolation: User B cannot see User A's analytics", async () => {
    const cookieA = await login(USER_A_EMAIL, USER_A_PASSWORD);
    const cookieB = await login(USER_B_EMAIL, USER_B_PASSWORD);

    // User A logs an item on T_DAY1
    const logA = await call<any>("/api/food-log", {
      method: "POST",
      headers: { cookie: cookieA },
      json: {
        date: T_DAY1,
        mealCategory: "lunch",
        name: "User A Secret Feast",
        servings: 1,
        servingUnit: "serving",
        calories: 1200,
        protein: 80,
        carbs: 100,
        fat: 40,
      },
    });
    expect(logA.status).toBe(201);

    // User B requests analytics for that same date window
    const bRes = await call<any>(`/api/analytics?to=${T_ANCHOR}&period=30d`, {
      headers: { cookie: cookieB },
    });
    expect(bRes.status).toBe(200);

    // User B must see 0 logged days and no reference to User A's food
    expect(bRes.body.stats.daysLogged).toBe(0);
    expect(bRes.body.frequentFoods.some((f: any) => f.name.includes("User A Secret Feast"))).toBe(false);

    // Cleanup
    await call(`/api/food-log?id=${logA.body.id}`, { method: "DELETE", headers: { cookie: cookieA } });
  });

  it("supports period parameter switching: 7d, 30d, 90d, 6m, 1y", async () => {
    const cookie = await login(USER_A_EMAIL, USER_A_PASSWORD);

    for (const p of ["7d", "30d", "90d", "6m", "1y"] as const) {
      const res = await call<any>(`/api/analytics?to=${T_ANCHOR}&period=${p}`, {
        headers: { cookie },
      });
      expect(res.status).toBe(200);
      expect(res.body.period).toBe(p);
      expect(typeof res.body.totalDays).toBe("number");
      expect(res.body.current.to).toBe(T_ANCHOR);
    }
  });

  it("maintains historical snapshot immutability when master food is deleted", async () => {
    const cookie = await login(USER_A_EMAIL, USER_A_PASSWORD);

    // Create food
    const fRes = await call<any>("/api/foods", {
      method: "POST",
      headers: { cookie },
      json: {
        name: `Immutable Test ${Date.now()}`,
        servingSizeGrams: 100,
        servingUnit: "g",
        calories: 250,
        protein: 20,
        carbs: 30,
        fat: 5,
      },
    });
    const foodId = fRes.body.id;

    // Log food
    const logRes = await call<any>("/api/food-log", {
      method: "POST",
      headers: { cookie },
      json: {
        date: T_DAY1,
        mealCategory: "snack",
        name: fRes.body.name,
        foodId,
        servings: 1,
        servingUnit: "g",
        calories: 250,
        protein: 20,
        carbs: 30,
        fat: 5,
      },
    });

    // Delete master food
    await call(`/api/foods?id=${foodId}`, { method: "DELETE", headers: { cookie } });

    // Request analytics: snapshot must still be preserved
    const aRes = await call<any>(`/api/analytics?to=${T_ANCHOR}&period=30d`, {
      headers: { cookie },
    });
    expect(aRes.status).toBe(200);
    expect(aRes.body.stats.daysLogged).toBeGreaterThanOrEqual(1);
    expect(aRes.body.frequentFoods.some((f: any) => f.name === fRes.body.name)).toBe(true);

    // Cleanup
    await call(`/api/food-log?id=${logRes.body.id}`, { method: "DELETE", headers: { cookie } });
  });
});
