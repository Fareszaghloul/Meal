import { expect, test, type Page } from "@playwright/test";
import { addDays, todayLocal } from "../../src/lib/dates";

const EMAIL = process.env.TEST_EMAIL || "e2e-test@mealprep.local";
const PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassword!2026";

const TODAY = todayLocal();
const DAY_MINUS_2 = addDays(TODAY, -2);
const DAY_MINUS_5 = addDays(TODAY, -5);

let sharedCookie: { name: string; value: string; domain: string; path: string } | null = null;

async function signIn(page: Page) {
  if (!sharedCookie) {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name === "mealprep_session");
    if (session) {
      sharedCookie = {
        name: session.name,
        value: session.value,
        domain: session.domain,
        path: session.path,
      };
    }
  } else {
    await page.context().addCookies([sharedCookie]);
  }
}

async function clearTestLogs(page: Page) {
  const from = addDays(TODAY, -40);
  const daysRes = await page.request.get(`/api/days?from=${from}&to=${TODAY}`);
  if (daysRes.ok()) {
    const days = (await daysRes.json()) as Array<{ date: string }>;
    for (const d of days || []) {
      const foodRes = await page.request.get(`/api/food-log?date=${d.date}`);
      if (foodRes.ok()) {
        const { entries } = await foodRes.json();
        for (const e of entries || []) {
          await page.request.delete(`/api/food-log/${e.id}`);
        }
      }
    }
  }
  // Clear daily weights
  const wRes = await page.request.get("/api/weight");
  if (wRes.ok()) {
    const { entries, inbody } = await wRes.json();
    for (const e of [...(entries || []), ...(inbody || [])]) {
      await page.request.delete(`/api/weight?id=${e.id}`);
    }
  }
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await clearTestLogs(page);
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ baseURL: "http://localhost:3101" });
  await signIn(page);
  await clearTestLogs(page);
  // Restore deterministic History seed entry for 2026-10-03
  await page.request.post("/api/food-log", {
    data: {
      date: "2026-10-03",
      mealCategory: "breakfast",
      name: "Oatmeal with Berries",
      servings: 1,
      servingUnit: "bowl",
      calories: 350,
      protein: 12,
      carbs: 60,
      fat: 6,
      fiber: 8,
    },
  });
  await page.close();
});

test("E2E Analytics 1: Desktop critical flow — periods, summaries, charts, macros, and meal patterns", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop only test");

  // 1. Seed deterministic entries
  // Seed food log on DAY_MINUS_2 (lunch)
  const f1 = await page.request.post("/api/food-log", {
    data: {
      date: DAY_MINUS_2,
      mealCategory: "lunch",
      name: "Grilled Chicken Breast",
      servings: 200,
      servingUnit: "g",
      calories: 330,
      protein: 62,
      carbs: 0,
      fat: 7,
    },
  });
  expect(f1.ok()).toBe(true);

  // Seed food log on DAY_MINUS_5 (dinner)
  const f2 = await page.request.post("/api/food-log", {
    data: {
      date: DAY_MINUS_5,
      mealCategory: "dinner",
      name: "Salmon and Rice",
      servings: 1,
      servingUnit: "serving",
      calories: 650,
      protein: 45,
      carbs: 50,
      fat: 22,
    },
  });
  expect(f2.ok()).toBe(true);

  // Seed daily weight entries on DAY_MINUS_5 and DAY_MINUS_2
  const w1 = await page.request.post("/api/weight", {
    data: { date: DAY_MINUS_5, time: "08:00", entryType: "daily", weightKg: 82.0 },
  });
  expect(w1.ok()).toBe(true);

  const w2 = await page.request.post("/api/weight", {
    data: { date: DAY_MINUS_2, time: "08:00", entryType: "daily", weightKg: 81.6 },
  });
  expect(w2.ok()).toBe(true);

  // InBody scan (must be excluded from daily weight trend)
  const wInBody = await page.request.post("/api/weight", {
    data: { date: DAY_MINUS_2, entryType: "inbody", weightKg: 90.0, bodyFatPct: 16.5 },
  });
  expect(wInBody.ok()).toBe(true);

  // 2. Open /analytics
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

  // 3. Verify default 30D period is selected
  const btn30 = page.getByRole("radio", { name: "30D" });
  await expect(btn30).toHaveAttribute("aria-checked", "true");

  // 4. Verify primary summary cards
  const calCard = page.getByTestId("metric-avg-calories");
  await expect(calCard).toBeVisible();
  // Average on logged days = (330 + 650) / 2 = 980 / 2 = 490 kcal
  await expect(calCard).toContainText("490 kcal");

  const proCard = page.getByTestId("metric-avg-protein");
  await expect(proCard).toBeVisible();
  // Average protein = (62 + 45) / 2 = 53.5 g -> formatted via fmt.g as 54 g
  await expect(proCard).toContainText("54 g");

  const covCard = page.getByTestId("metric-coverage");
  await expect(covCard).toBeVisible();
  await expect(covCard).toContainText("2 / 30");

  const weightCard = page.getByTestId("metric-weight-trend");
  await expect(weightCard).toBeVisible();
  await expect(weightCard).toContainText("81.6 kg");

  // 5. Verify Calorie Trend Chart & Weight Trend Chart
  const calChart = page.getByTestId("calorie-trend-container");
  await expect(calChart).toBeVisible();
  await expect(calChart.locator("svg")).toBeVisible();

  const weightChart = page.getByTestId("weight-analytics-container");
  await expect(weightChart).toBeVisible();
  await expect(weightChart.locator("svg")).toBeVisible();

  // 6. Verify Macronutrient Profile & Meal Distribution
  await expect(page.getByRole("heading", { name: "Macronutrient Profile" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meal Distribution" })).toBeVisible();
  await expect(page.getByText("Lunch")).toBeVisible();
  await expect(page.getByText("Dinner")).toBeVisible();

  // 7. Verify Frequently Logged Foods
  await expect(page.getByRole("heading", { name: "Frequently Logged Foods" })).toBeVisible();
  await expect(page.getByText("Grilled Chicken Breast")).toBeVisible();
  await expect(page.getByText("Salmon and Rice")).toBeVisible();

  // 8. Test Period Selector Switch: 7D
  const btn7 = page.getByRole("radio", { name: "7D" });
  await btn7.click();
  await expect(btn7).toHaveAttribute("aria-checked", "true");
  await expect(covCard).toContainText("2 / 7");

  // 9. Switch back to 30D (instant from cache)
  await btn30.click();
  await expect(btn30).toHaveAttribute("aria-checked", "true");
  await expect(covCard).toContainText("2 / 30");
});

test("E2E Analytics 2: Live invalidation — adding food on Today updates Analytics", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop only test");

  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  const covCard = page.getByTestId("metric-coverage");
  const initialText = await covCard.innerText();

  // Now log a food item on TODAY via Today dashboard or API
  const res = await page.request.post("/api/food-log", {
    data: {
      date: TODAY,
      mealCategory: "snack",
      name: "Apple & Almonds",
      servings: 1,
      servingUnit: "serving",
      calories: 250,
      protein: 5,
      carbs: 25,
      fat: 12,
    },
  });
  expect(res.ok()).toBe(true);

  // Return to or reload analytics
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

  // Logging coverage should reflect the new day
  await expect(covCard).toBeVisible();
  const updatedText = await covCard.innerText();
  expect(updatedText).not.toEqual(initialText);

  // Clean up
  const { id } = await res.json();
  await page.request.delete(`/api/food-log/${id}`);
});

test("E2E Analytics 3: Mobile viewport responsiveness and touch targets (375x812, 390x844, 430x932)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile viewport only");

  const viewports = [
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

    // Verify zero horizontal scroll overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Verify touch targets and period selector: approximately 44px hit area
    const btn7 = page.getByRole("radio", { name: "7D" });
    await expect(btn7).toBeVisible();
    const box7 = await btn7.boundingBox();
    expect(box7!.height).toBeGreaterThanOrEqual(42);

    // Switch period on mobile
    await btn7.click();
    await expect(btn7).toHaveAttribute("aria-checked", "true");

    const btn30 = page.getByRole("radio", { name: "30D" });
    await btn30.click();
    await expect(btn30).toHaveAttribute("aria-checked", "true");

    // Re-verify zero horizontal overflow after period change
    const newScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const newClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(newScrollWidth).toBeLessThanOrEqual(newClientWidth + 1);
  }
});
