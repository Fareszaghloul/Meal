import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BASE, call } from "./helpers";
import type { DayStatus, MonthHistoryResponse } from "@/lib/domain";

const HISTORY_TEST_DATE = "1999-05-15";
const HISTORY_TEST_MONTH = "1999-05";

async function cleanupHistoryTestDate() {
  const { body } = await call<{ entries: { id: string }[] }>(`/api/food-log?date=${HISTORY_TEST_DATE}`);
  for (const e of body?.entries ?? []) {
    await call(`/api/food-log/${e.id}`, { method: "DELETE" });
  }
}

describe("History API", () => {
  beforeAll(async () => {
    await cleanupHistoryTestDate();
  });

  afterAll(async () => {
    await cleanupHistoryTestDate();
  });

  it("fetches month history with aggregated day totals and month summary", async () => {
    // 1. Log a food item on HISTORY_TEST_DATE
    const logRes = await call<{ item: { id: string } }>("/api/food-log", {
      method: "POST",
      json: {
        date: HISTORY_TEST_DATE,
        mealCategory: "breakfast",
        name: "Test History Oats",
        servings: 1,
        servingUnit: "bowl",
        calories: 350,
        protein: 15,
        carbs: 55,
        fat: 6,
      },
    });
    expect(logRes.status).toBe(201);

    // 2. Fetch month history for 1999-05
    const { status, body } = await call<MonthHistoryResponse>(`/api/history/month?month=${HISTORY_TEST_MONTH}`);
    expect(status).toBe(200);
    expect(body.month).toBe(HISTORY_TEST_MONTH);
    expect(body.goals).toBeDefined();
    expect(body.summary).toBeDefined();
    expect(body.summary.loggedDays).toBe(1);
    expect(body.summary.avgCalories).toBe(350);

    // Verify 1999-05-15 entry in days map
    const day = body.days[HISTORY_TEST_DATE];
    expect(day).toBeDefined();
    expect(day.date).toBe(HISTORY_TEST_DATE);
    expect(day.calories).toBe(350);
    expect(day.protein).toBe(15);
    expect(day.mealCalories.breakfast).toBe(350);
    expect(day.entryCount).toBe(1);
  });

  it("enhances /api/days range query with protein, carbs, fat, and meal breakdowns", async () => {
    const { status, body } = await call<DayStatus[]>(`/api/days?from=1999-05-01&to=1999-05-31`);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    const testDay = body.find((d) => d.date === HISTORY_TEST_DATE);
    expect(testDay).toBeDefined();
    expect(testDay!.calories).toBe(350);
    expect(testDay!.protein).toBe(15);
    expect(testDay!.mealsLogged).toBe(1);
  });

  it("handles months with zero logged data gracefully", async () => {
    const { status, body } = await call<MonthHistoryResponse>("/api/history/month?month=2000-06");
    expect(status).toBe(200);
    expect(body.month).toBe("2000-06");
    expect(body.summary.loggedDays).toBe(0);
    expect(body.summary.totalCalories).toBe(0);
    expect(body.summary.avgCalories).toBe(0);
    expect(body.summary.avgProtein).toBe(0);
    expect(Object.keys(body.days).length).toBe(0);
  });

  it("validates month format strictly and rejects invalid values", async () => {
    const r1 = await call("/api/history/month?month=invalid");
    expect(r1.status).toBe(400);

    const r2 = await call("/api/history/month?month=2026-99");
    expect(r2.status).toBe(400);

    const r3 = await call("/api/history/month?month=1899-01");
    expect(r3.status).toBe(400);

    const r4 = await call("/api/history/month");
    expect(r4.status).toBe(400);
  });

  it("rejects unauthorized access without session cookie", async () => {
    const res = await fetch(`${BASE}/api/history/month?month=2026-10`);
    expect(res.status).toBe(401);
  });
});
