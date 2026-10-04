import fs from "fs";
import { expect, test } from "@playwright/test";
import type { PrismaClient } from "@prisma/client";
import { collectConsoleErrors, createThrowawayUser, expectNoOverflow, signInAs, testDb } from "./support/test-db";

/**
 * Full backup → change/delete data → restore through the real UI, then every stable area shows the restored state.
 * meal_test only, throwaway account. Runs in the desktop and iPhone 13 projects.
 */
test.use({ timezoneId: "Asia/Amman" });

let db: PrismaClient;
let user: { id: string; email: string };
const DAY = "2026-09-01";

test.beforeAll(async () => {
  db = await testDb();
  user = await createThrowawayUser(db, "restore");
  const userId = user.id;
  await db.userSettings.create({ data: { userId, timezone: "Asia/Amman", dailyCalories: 2345, dailyProtein: 165, dailyCarbs: 210, dailyFat: 72 } });
  await db.goalRevision.create({ data: { userId, effectiveDate: "2026-08-15", dailyCalories: 2345, dailyProtein: 165, dailyCarbs: 210, dailyFat: 72 } });
  const food = await db.food.create({
    data: { userId, name: "P9 Restore Granola", category: "Grains", caloriesPer100g: 450, proteinPer100g: 10, carbsPer100g: 60, fatPer100g: 18, servings: { create: [{ label: "1 bowl", grams: 60, isDefault: true }] } },
  });
  const recipe = await db.recipe.create({
    data: { userId, name: "P9 Restore Chili", servings: 4, caloriesPerServing: 520, proteinPerServing: 38, ingredients: { create: [{ rawName: "granola?", quantity: 10, unit: "g", grams: 10, calories: 45, foodId: food.id }] } },
  });
  // A year of logging: 365 days, ~3 entries a day.
  const rows = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.UTC(2025, 9, 1 + i)).toISOString().slice(0, 10);
    rows.push({ userId, date: d, mealCategory: "breakfast", name: "P9 Restore Granola", servings: 1, servingUnit: "bowl", calories: 270, protein: 6, carbs: 36, fat: 10.8, fiber: 4, foodId: food.id });
    rows.push({ userId, date: d, mealCategory: "dinner", name: "P9 Restore Chili", servings: 1, servingUnit: "serving", calories: 520, protein: 38, carbs: 40, fat: 20, fiber: 9, recipeId: recipe.id });
    rows.push({ userId, date: d, mealCategory: "snack", name: "Apple", servings: 1, calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4 });
  }
  rows.push({ userId, date: DAY, mealCategory: "lunch", name: "P9 Restore Marker Lunch", servings: 1, calories: 611, protein: 40, carbs: 50, fat: 20, fiber: 5 });
  await db.foodLogEntry.createMany({ data: rows });
  await db.weightEntry.createMany({
    data: Array.from({ length: 200 }, (_, i) => ({ userId, date: new Date(Date.UTC(2026, 2, 1 + i)).toISOString().slice(0, 10), entryType: "daily", weightKg: Math.round((90 - i * 0.1) * 10) / 10, time: "07:00" })),
  });
  await db.userSettings.update({ where: { userId }, data: { currentWeightKg: 70.1 } });
  await db.waterLogEntry.createMany({ data: Array.from({ length: 100 }, (_, i) => ({ userId, date: new Date(Date.UTC(2026, 5, 1 + i)).toISOString().slice(0, 10), amountMl: 500 })) });
  await db.mealPlan.create({ data: { userId, weekStartDate: "2026-08-31", meals: { create: [{ dayOfWeek: "monday", mealCategory: "dinner", recipeId: recipe.id }] } } });
  await db.workoutRoutineEntry.create({ data: { userId, workoutType: "running_moderate" } });
});

test.afterAll(async () => {
  await db.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await db.$disconnect();
});

test("download backup, change data, restore it, and every area reflects the restored state", async ({ page }) => {
  test.setTimeout(300_000);
  await signInAs(page, user.email);
  const errors = collectConsoleErrors(page);
  const userId = user.id;

  // 1. Download the backup through the UI.
  await page.goto("/settings");
  const t0 = Date.now();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download backup" }).click()]);
  const backupMs = Date.now() - t0;
  const file = (await download.path())!;
  const size = fs.statSync(file).size;
  console.log(`[perf] backup download ${backupMs} ms, ${(size / 1024).toFixed(0)} KB`);

  // 2. Change and delete identifiable data.
  await db.foodLogEntry.deleteMany({ where: { userId, date: DAY } });
  await db.recipe.update({ where: { id: (await db.recipe.findFirstOrThrow({ where: { userId } })).id }, data: { name: "Renamed after backup" } });
  await db.food.updateMany({ where: { userId }, data: { name: "Renamed food after backup" } });
  await db.weightEntry.deleteMany({ where: { userId, date: { gte: "2026-09-01" } } });
  await db.userSettings.update({ where: { userId }, data: { dailyCalories: 1500 } });

  // 3. Restore through the UI: choose file → preview → confirm.
  await page.reload();
  const tPreview = Date.now();
  await page.getByLabel("Restore").setInputFiles(file);
  const preview = page.getByTestId("restore-preview");
  await expect(preview).toBeVisible({ timeout: 30_000 });
  console.log(`[perf] upload + validation + preview ${Date.now() - tPreview} ms`);
  await expect(preview).toContainText("format version 1");
  await expect(preview).toContainText("1,096 food log entries");
  await expect(preview).toContainText("200 weight entries");
  await expectNoOverflow(page);
  // Nothing has changed yet.
  expect(await db.foodLogEntry.count({ where: { userId, date: DAY } })).toBe(0);

  await page.getByRole("button", { name: "Restore backup…" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("This will replace your current meal, weight, recipe and settings data");
  await expect(dialog).toContainText("Your account, password and sign-in are not changed");
  await expectNoOverflow(page);
  const t1 = Date.now();
  await dialog.getByRole("button", { name: "Restore backup" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 120_000 });
  console.log(`[perf] restore (UI round trip) ${Date.now() - t1} ms`);

  // 4. Every area reflects the restored data.
  await page.goto(`/?date=${DAY}`);
  await expect(page.getByText("P9 Restore Marker Lunch")).toBeVisible();

  await page.goto("/foods");
  await page.getByRole("radio", { name: /My Foods/ }).click();
  await expect(page.getByText("P9 Restore Granola").first()).toBeVisible();
  await expect(page.getByText("Renamed food after backup")).toHaveCount(0);

  await page.goto("/recipes");
  await expect(page.getByText("P9 Restore Chili").first()).toBeVisible();
  await expect(page.getByText("Renamed after backup")).toHaveCount(0);

  await page.goto(`/history?month=2026-09&date=${DAY}`);
  // The restored marker lunch (611 kcal) is back in the day's totals: 4 entries, not the 3 left after deletion.
  await expect(page.getByRole("button", { name: /September 1, 2026, 1,496 kcal logged across 4 entries/ })).toBeVisible();

  await page.goto("/weight");
  await expect(page.getByText("70.1").first()).toBeVisible(); // latest daily reading, re-derived after restore

  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByLabel("Calories", { exact: true })).toHaveValue("2345");

  expect(await db.foodLogEntry.count({ where: { userId } })).toBe(1096);
  expect((await db.userSettings.findUniqueOrThrow({ where: { userId } })).currentWeightKg).toBe(70.1);
  expect(errors).toEqual([]);
});
