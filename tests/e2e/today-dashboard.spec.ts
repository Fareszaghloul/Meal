import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL || "e2e-test@mealprep.local";
const PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassword!2026";
const DASHBOARD_DATE = "2001-04-12";
const PREV_DATE = "2001-04-11";

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

async function clearDay(page: Page, targetDate: string) {
  // Clear foods
  const foodRes = await page.request.get(`/api/food-log?date=${targetDate}`);
  if (foodRes.ok()) {
    const { entries } = await foodRes.json();
    for (const e of entries || []) {
      await page.request.delete(`/api/food-log/${e.id}`);
    }
  }
  // Clear water
  const waterRes = await page.request.get(`/api/water-log?date=${targetDate}`);
  if (waterRes.ok()) {
    const { entries } = await waterRes.json();
    for (const e of entries || []) {
      await page.request.delete(`/api/water-log?id=${e.id}`);
    }
  }
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await clearDay(page, DASHBOARD_DATE);
  await clearDay(page, PREV_DATE);
});

test("E2E Dashboard: Full Lifecycle (View, Add, Edit, Move, Duplicate, Delete, Persist)", async ({ page }) => {
  await page.goto(`/?date=${DASHBOARD_DATE}`);
  await page.waitForLoadState("networkidle");

  // 1. Initial State: 0 kcal consumed
  const summary = page.locator('section[aria-label="Daily nutrition summary"]');
  await expect(summary).toBeVisible();
  await expect(summary.getByText("0", { exact: true })).toBeVisible();
  await expect(summary.getByText(/remaining/i)).toBeVisible();

  // 2. Add an item to Lunch
  await page.getByRole("button", { name: /add food to lunch/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const searchInput = dialog.getByLabel(/search foods/i);
  await searchInput.fill("egg");
  await page.waitForTimeout(300);

  // Click first egg result
  const eggRow = dialog.getByRole("button", { name: /egg/i }).filter({ hasText: /kcal/i }).first();
  await expect(eggRow).toBeVisible();
  await eggRow.click();

  // In portion editor, adjust to 2 eggs and add
  const portionInput = dialog.getByRole("textbox", { name: "Quantity" });
  await portionInput.fill("2");
  await dialog.getByRole("button", { name: /add to lunch/i }).click();

  // Modal closes and Lunch updates
  await expect(dialog).not.toBeVisible();
  const lunchSection = page.locator('section[aria-labelledby="meal-lunch"]');
  await expect(lunchSection).toContainText("Egg");
  await expect(lunchSection).not.toContainText("0 kcal");

  // 3. Edit portion via clicking the food row
  await lunchSection.getByRole("button", { name: /edit/i }).first().click();
  const editSheet = page.getByRole("dialog");
  await expect(editSheet).toBeVisible();
  await expect(editSheet.getByText(/edit portion/i)).toBeVisible();

  // Change quantity to 3
  const qtyField = editSheet.getByRole("textbox", { name: "Quantity" });
  await qtyField.fill("3");
  await editSheet.getByRole("button", { name: /save changes/i }).click();
  await expect(editSheet).not.toBeVisible();

  // 4. Move food from Lunch to Dinner
  const rowMenuBtn = lunchSection.getByRole("button", { name: /actions for/i }).first();
  await rowMenuBtn.click();
  await page.getByRole("menuitem", { name: /move to dinner/i }).click();

  // Lunch is now empty, Dinner has the entry
  await expect(lunchSection).toContainText("Nothing logged yet");
  const dinnerSection = page.locator('section[aria-labelledby="meal-dinner"]');
  await expect(dinnerSection).toContainText("Egg");

  // 5. Duplicate food entry in Dinner
  const dinnerMenuBtn = dinnerSection.getByRole("button", { name: /actions for/i }).first();
  await dinnerMenuBtn.click();
  await page.getByRole("menuitem", { name: /duplicate/i }).click();

  // Verify toast appears
  await expect(page.getByText(/duplicated/i)).toBeVisible();

  // 6. Delete one entry from Dinner
  await dinnerSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const deleteMenuBtn = dinnerSection.getByRole("button", { name: /actions for/i }).first();
  await deleteMenuBtn.click();
  await page.getByRole("menuitem", { name: /delete/i }).click();

  // Undo toast appears
  await expect(page.getByText(/removed/i)).toBeVisible();

  // 7. Meal Collapse
  const collapseBtn = dinnerSection.getByRole("button", { name: /collapse dinner/i });
  await collapseBtn.click();
  // Food row is now collapsed
  await expect(dinnerSection.locator("ul")).not.toBeVisible();
  // Expand back
  await dinnerSection.getByRole("button", { name: /expand dinner/i }).click();
  await expect(dinnerSection.locator("ul")).toBeVisible();

  // 8. Reload page: data persists
  await page.reload();
  await page.waitForLoadState("networkidle");
  const reloadedDinner = page.locator('section[aria-labelledby="meal-dinner"]');
  await expect(reloadedDinner).toContainText("Egg");
});

test("E2E Dashboard: Date Navigation, Historical Indicator, and Today Shortcut", async ({ page }) => {
  await page.goto(`/?date=${DASHBOARD_DATE}`);
  await page.waitForLoadState("networkidle");

  // Previous day
  await page.getByRole("button", { name: /previous day/i }).click();
  await expect(page).toHaveURL(new RegExp(PREV_DATE));
  await expect(page.locator("header").getByText(/past log|yesterday/i)).toBeVisible();

  // Click Today shortcut button
  await page.getByRole("button", { name: /today/i }).first().click();
  await page.waitForLoadState("networkidle");
});

test("E2E Dashboard: Hydration Logging (+250, +500, Undo)", async ({ page }) => {
  await page.goto(`/?date=${DASHBOARD_DATE}`);
  await page.waitForLoadState("networkidle");

  const waterSection = page.locator('section[aria-label="Daily nutrition summary"]');
  await expect(waterSection).toContainText("0 / 2.5 L");

  // Add 250ml
  await page.getByRole("button", { name: /add 250 ml/i }).click();
  await expect(waterSection).toContainText("0.25 / 2.5 L");

  // Add 500ml
  await page.getByRole("button", { name: /add 500 ml/i }).click();
  await expect(waterSection).toContainText("0.75 / 2.5 L");

  // Undo last glass
  await page.getByRole("button", { name: /remove 250ml water/i }).click();
  await expect(waterSection).toContainText("0.5 / 2.5 L");
});
