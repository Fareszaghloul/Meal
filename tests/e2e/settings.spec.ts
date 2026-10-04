import { expect, test } from "@playwright/test";
import type { PrismaClient } from "@prisma/client";
import { todayInTimezone } from "../../src/lib/dates";
import { collectConsoleErrors, createThrowawayUser, expectNoOverflow, signInAs, testDb } from "./support/test-db";

/**
 * Phase 9 Settings, end to end on meal_test with a throwaway account (desktop + iPhone 13 projects).
 * Browser timezone is pinned so "first visit adopts the device timezone" is deterministic.
 */
test.use({ timezoneId: "Asia/Amman" });

let db: PrismaClient;
let user: { id: string; email: string };

test.beforeAll(async () => {
  db = await testDb();
  user = await createThrowawayUser(db, "settings");
});

test.afterAll(async () => {
  await db.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await db.$disconnect();
});

test("settings: units, targets with goal history, analytics, timezone, backup download", async ({ page }) => {
  test.setTimeout(180_000);
  await signInAs(page, user.email);
  const errors = collectConsoleErrors(page);
  const today = todayInTimezone("Asia/Amman");

  // A weigh-in (through the API, so currentWeightKg is derived) and a logged day for Analytics.
  expect((await page.request.post("/api/weight", { data: { date: today, entryType: "daily", weightKg: 80 } })).status()).toBe(201);
  await db.foodLogEntry.create({ data: { userId: user.id, date: today, mealCategory: "lunch", name: "P9 lunch", calories: 2300, protein: 190, carbs: 200, fat: 70 } });

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

  // First visit adopts the device timezone once.
  await expect(page.getByLabel("Timezone")).toHaveValue("Asia/Amman");

  // Units: display changes, stored kg does not.
  await expect(page.getByTestId("current-weight")).toHaveText("80.0 kg");
  await page.getByRole("radio", { name: /Imperial/ }).click();
  await expect(page.getByTestId("current-weight")).toHaveText("176.4 lbs");
  expect((await db.weightEntry.findFirstOrThrow({ where: { userId: user.id } })).weightKg).toBe(80);
  await page.getByRole("radio", { name: /Metric/ }).click();
  await expect(page.getByTestId("current-weight")).toHaveText("80.0 kg");
  expect(await db.goalRevision.count({ where: { userId: user.id } })).toBe(1); // unit changes are not goal changes

  // Current weight is read-only here, with a way to the weight log.
  await expect(page.getByRole("link", { name: "Manage weight history" })).toHaveAttribute("href", "/weight");

  // Change a nutrition target: exact values shown before saving, revision recorded on save.
  const calories = page.getByLabel("Calories", { exact: true });
  await calories.fill("2450");
  await expect(page.getByTestId("targets-pending")).toContainText("2,300 kcal → 2,450 kcal");
  await expect(page.getByTestId("targets-pending")).toContainText("logged food doesn't change");
  await page.getByRole("button", { name: "Save targets" }).click();
  await expect(page.getByTestId("targets-pending")).toHaveCount(0);
  const revisions = await db.goalRevision.findMany({ where: { userId: user.id } });
  expect(revisions).toHaveLength(1); // same-day edit updates today's revision
  expect(revisions[0]).toMatchObject({ effectiveDate: today, dailyCalories: 2450 });
  await page.getByTestId("goal-history").locator("summary").click();
  await expect(page.getByTestId("goal-history")).toContainText("2,450 kcal");

  // Calculator output never saves by itself.
  await expect(page.getByTestId("calculator-output")).toContainText("Maintenance");
  await page.getByRole("button", { name: "Use as targets…" }).click();
  await expect(page.getByTestId("targets-pending")).toContainText("From the calculator");
  expect((await db.userSettings.findUniqueOrThrow({ where: { userId: user.id } })).dailyCalories).toBe(2450);
  await page.getByRole("button", { name: "Discard" }).click();

  // Analytics uses the target in effect each day and says when history starts.
  await page.goto("/analytics");
  await expect(page.getByTestId("goal-history-note")).toContainText("each day's own target");
  await page.goto("/settings");

  // Timezone change saves, and doesn't touch logged dates.
  await page.getByLabel("Timezone").selectOption("America/New_York");
  await expect.poll(async () => (await db.userSettings.findUniqueOrThrow({ where: { userId: user.id } })).timezone).toBe("America/New_York");
  expect((await db.foodLogEntry.findFirstOrThrow({ where: { userId: user.id } })).date).toBe(today);

  // Backup download.
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download backup" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^meal-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const json = JSON.parse(await (await import("fs")).promises.readFile((await download.path())!, "utf8"));
  expect(json).toMatchObject({ format: "meal-backup", version: 1 });

  await expectNoOverflow(page);
  expect(errors).toEqual([]);
});

test("network: request counts for the Settings flows", async ({ page }) => {
  test.setTimeout(180_000);
  await signInAs(page, user.email);
  await page.goto("about:blank"); // leave the post-login Today page (its day prefetches aren't part of Settings)
  const hits: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith("/api/") && !u.pathname.startsWith("/api/auth")) hits.push(`${r.method()} ${u.pathname}${u.search}`);
  });
  const take = () => hits.splice(0, hits.length);
  const report: Record<string, string[]> = {};

  await page.goto("/settings");
  await expect(page.getByLabel("Timezone")).toHaveValue(/.+/, { timeout: 30_000 }); // first visit sets it (cold server compiles the route)
  await page.waitForLoadState("networkidle");
  report["open Settings"] = take();
  expect(report["open Settings"].filter((h) => h === "GET /api/settings")).toHaveLength(1);
  expect(report["open Settings"].filter((h) => !h.startsWith("GET /api/settings") && !h.startsWith("PATCH /api/settings"))).toEqual([]);

  await page.getByRole("radio", { name: /Imperial/ }).click();
  await expect(page.getByTestId("current-weight")).toContainText("lbs");
  await page.waitForLoadState("networkidle");
  report["save one preference"] = take();
  expect(report["save one preference"]).toEqual(["PATCH /api/settings"]);

  await page.getByLabel("Protein", { exact: true }).fill("175");
  await page.getByRole("button", { name: "Save targets" }).click();
  await expect(page.getByTestId("targets-pending")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  report["save nutrition goals"] = take();
  expect(report["save nutrition goals"]).toEqual(["PATCH /api/settings"]);

  await page.getByLabel("Timezone").selectOption("Europe/London");
  await expect(page.getByLabel("Timezone")).toBeEnabled();
  await page.waitForLoadState("networkidle");
  report["change timezone"] = take();
  expect(report["change timezone"]).toEqual(["PATCH /api/settings"]);

  await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download backup" }).click()]);
  report["download backup"] = take();
  expect(report["download backup"]).toEqual(["GET /api/backup"]);

  await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Food log CSV" }).click()]);
  await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Weight CSV" }).click()]);
  report["export CSV"] = take();
  expect(report["export CSV"]).toEqual(["GET /api/export?format=csv&table=food-log", "GET /api/export?format=csv&table=weight"]);

  console.log("[network]", JSON.stringify(report, null, 1));
});
