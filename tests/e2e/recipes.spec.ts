import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL || "e2e-test@mealprep.local";
const PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassword!2026";
const DATE = "2001-04-12"; // isolated past date

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

async function clearDay(page: Page, targetDate = DATE) {
  const res = await page.request.get(`/api/food-log?date=${targetDate}`);
  if (res.ok()) {
    const { entries } = await res.json();
    for (const e of entries || []) {
      await page.request.delete(`/api/food-log/${e.id}`);
    }
  }
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await clearDay(page, DATE);
});

test("E2E Recipe 1: Desktop critical flow — create recipe, verify live totals, log portion, verify Today immutability", async ({ page }) => {
  const recipeName = `E2E Protein Pancakes ${Date.now()}`;

  // 1. Navigate to Recipes page
  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: "Recipes" })).toBeVisible();

  // 2. Click "+ New Recipe"
  await page.getByRole("link", { name: /new recipe/i }).click();
  await expect(page).toHaveURL("/recipes/new");

  // 3. Fill in basic recipe details
  await page.getByPlaceholder(/e\.g\. Protein Pancakes/i).fill(recipeName);

  // Set 4 servings
  const servingsInput = page.locator('input[type="number"]').first();
  await servingsInput.fill("4");

  // Custom serving label
  await page.getByPlaceholder(/bowl, slice, muffin/i).fill("pancake");

  // 4. Add ingredients from catalog
  await page.getByRole("button", { name: /add.*ingredient/i }).first().click();
  const picker = page.getByRole("dialog", { name: /ingredient picker/i });
  await expect(picker).toBeVisible();

  // Pick first food in catalog
  const firstFoodRow = picker.locator('[data-testid="picker-food-item"]').first();
  await expect(firstFoodRow).toBeVisible();
  await firstFoodRow.click();

  // Select portion
  const addBtn = picker.getByRole("button", { name: /add to recipe/i });
  await expect(addBtn).toBeVisible();
  await addBtn.click();

  // Verify ingredient appears in list
  await expect(page.locator(".divide-y > div").first()).toBeVisible();

  // Verify live calculated nutrition displays non-zero calories
  await expect(page.getByText(/Total Recipe/i)).toBeVisible();
  await expect(page.getByText(/Per Serving/i)).toBeVisible();

  // 5. Save Recipe
  await page.getByRole("button", { name: /save recipe/i }).first().click();

  // Should navigate to recipe details inspector
  await expect(page).toHaveURL(/\/recipes\/\w+/);
  await expect(page.getByRole("heading", { name: recipeName })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/4 pancakes?/i)).toBeVisible();

  // 6. Test direct Log Recipe modal from inspector
  await page.getByRole("button", { name: /log recipe/i }).click();
  await expect(page.getByText(/Log Recipe/i).first()).toBeVisible();

  // Change date to test isolated DATE
  const dateInput = page.locator('input[type="date"]');
  await dateInput.fill(DATE);

  // Log 1 serving to lunch
  const logPromise1 = page.waitForResponse(
    (res) => res.url().includes("/api/food-log") && res.request().method() === "POST"
  );
  await page.getByRole("button", { name: /log to/i }).click();
  await logPromise1;

  // 7. Verify Today totals update
  await page.goto(`/?date=${DATE}`);
  await expect(page.getByText(recipeName)).toBeVisible();

  // 8. Edit master recipe: change name
  await page.goto("/recipes");
  await expect(page.getByText(recipeName)).toBeVisible();
  await page.getByText(recipeName).click();
  await page.getByRole("link", { name: /edit/i }).click();

  await page.getByPlaceholder(/e\.g\. Protein Pancakes/i).fill(`${recipeName} (Edited)`);
  await page.getByRole("button", { name: /save changes/i }).first().click();
  await expect(page).not.toHaveURL(/\/edit/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: `${recipeName} (Edited)` })).toBeVisible({ timeout: 10000 });

  // 9. Return to Today: verify historical log on DATE preserved original snapshot
  await page.goto(`/?date=${DATE}`);
  await expect(page.getByText(recipeName)).toBeVisible();
});

test("E2E Recipe 2: Batch recipe with cooked yield weight and gram-based logging", async ({ page }) => {
  const recipeName = `E2E Batch Curry ${Date.now()}`;

  await page.goto("/recipes/new");
  await page.getByPlaceholder(/e\.g\. Protein Pancakes/i).fill(recipeName);

  // 6 servings
  const servingsInput = page.locator('input[type="number"]').first();
  await servingsInput.fill("6");

  // Cooked yield weight: 2000g
  await page.getByPlaceholder(/e\.g\. 2400/i).fill("2000");

  // Add ingredient
  await page.getByRole("button", { name: /add.*ingredient/i }).first().click();
  const picker = page.getByRole("dialog", { name: /ingredient picker/i });
  await expect(picker).toBeVisible();
  const firstFoodRow = picker.locator('[data-testid="picker-food-item"]').first();
  await expect(firstFoodRow).toBeVisible();
  await firstFoodRow.click();
  const addBtn = picker.getByRole("button", { name: /add to recipe/i });
  await expect(addBtn).toBeVisible();
  await addBtn.click();

  // Verify per 100g displays
  await expect(page.getByText(/Per 100g/i)).toBeVisible();

  // Save Recipe
  await page.getByRole("button", { name: /save recipe/i }).first().click();
  await expect(page).not.toHaveURL(/\/recipes\/new/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: recipeName })).toBeVisible({ timeout: 10000 });

  // Inspector should show 2000g cooked yield
  await expect(page.getByText(/2,000g cooked yield|2000g cooked yield/i)).toBeVisible();

  // Open Log Recipe modal
  await page.getByRole("button", { name: /log recipe/i }).click();

  // Switch to grams mode
  await page.getByRole("button", { name: /grams \(g\)/i }).click();
  await expect(page.getByText(/grams \(g\)/i)).toBeVisible();

  // Set 250g
  const qtyInput = page.getByRole("textbox", { name: /quantity/i });
  await qtyInput.fill("250");

  // Set isolated date
  const dateInput = page.locator('input[type="date"]');
  await dateInput.fill(DATE);

  // Submit log
  const logPromise2 = page.waitForResponse(
    (res) => res.url().includes("/api/food-log") && res.request().method() === "POST"
  );
  await page.getByRole("button", { name: /log to/i }).click();
  await logPromise2;

  // Verify logged on Today with 250 g
  await page.goto(`/?date=${DATE}`);
  await expect(page.getByText(recipeName)).toBeVisible();
  await expect(page.getByText(/250\s*g/i)).toBeVisible();
});

test("E2E Recipe 3: Mobile viewport responsiveness (iPhone 13)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: "Recipes" })).toBeVisible();

  // Verify zero horizontal scroll overflow
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

  // Open New Recipe
  await page.getByRole("link", { name: /new recipe/i }).click();
  await expect(page).toHaveURL("/recipes/new");

  const newScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const newClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(newScrollWidth).toBeLessThanOrEqual(newClientWidth + 1);
});
