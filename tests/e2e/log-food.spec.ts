import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL || "e2e-test@mealprep.local";
const PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassword!2026";
const DATE = "2001-03-10"; // far in the past so it never collides with real days
const YESTERDAY = "2001-03-09";

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
  await clearDay(page, YESTERDAY);
});

test("E2E 1: search food, portion adjustment, instant update & persistence", async ({ page }) => {
  await page.goto(`/?date=${DATE}`);
  await expect(page.getByRole("heading", { name: "Breakfast" })).toBeVisible();

  // Open Add Food modal
  await page.getByRole("button", { name: /add food to breakfast/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Search universal input
  const searchInput = dialog.getByLabel(/search foods/i);
  await expect(searchInput).toBeFocused();
  await searchInput.fill("egg");

  // Select first egg result
  const eggRow = dialog.getByRole("button", { name: /egg/i }).filter({ hasText: /kcal/i }).first();
  await expect(eggRow).toBeVisible();
  await eggRow.click();

  // Portion editor is now open
  await expect(dialog.getByText(/portion/i).first()).toBeVisible();
  const qtyInput = dialog.getByRole("textbox", { name: "Quantity" });
  await qtyInput.fill("2");

  // Primary Add button
  const addButton = dialog.getByRole("button", { name: /add to breakfast/i });
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Modal closes immediately
  await expect(dialog).toBeHidden();

  // Dashboard has the entry
  const breakfastSection = page.getByRole("region", { name: /breakfast/i }).or(page.locator("section").filter({ hasText: "Breakfast" }));
  await expect(breakfastSection.first()).toContainText("2");

  // Reload page to verify server persistence
  await page.reload();
  await expect(page.getByRole("heading", { name: "Breakfast" })).toBeVisible();
  const rowAfterReload = page.getByRole("listitem").filter({ hasText: /egg/i }).first();
  await expect(rowAfterReload).toBeVisible();
});

test("E2E 2: natural quantity search '4 sunny side up eggs'", async ({ page }) => {
  await page.goto(`/?date=${DATE}`);

  // Open Add food
  await page.getByRole("button", { name: /add food to lunch/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const searchInput = dialog.getByLabel(/search foods/i);
  await searchInput.fill("4 sunny side up eggs");

  // Verify natural quantity badge indicator
  await expect(dialog.getByText(/4 pre-set/i)).toBeVisible();

  // Click the sunny side up egg result (or fallback egg)
  const resultRow = dialog.getByRole("button", { name: /egg/i }).filter({ hasText: /kcal/i }).first();
  await expect(resultRow).toBeVisible();
  await resultRow.click();

  // Portion editor should have quantity prefilled to 4
  const qtyInput = dialog.getByRole("textbox", { name: "Quantity" });
  await expect(qtyInput).toHaveValue("4");

  // Add to lunch
  await dialog.getByRole("button", { name: /add to lunch/i }).click();
  await expect(dialog).toBeHidden();

  // Verify dashboard has the logged item
  await expect(page.locator("body")).toContainText("sunny side up", { ignoreCase: true });
});

test("E2E 3: manual nutrition entry with macro calculation", async ({ page }) => {
  await page.goto(`/?date=${DATE}`);

  await page.getByRole("button", { name: /add food to lunch/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Click manual entry button
  await dialog.getByRole("button", { name: /enter nutrition manually/i }).click();

  // Fill manual form
  await dialog.getByLabel(/food name/i).fill("E2E Power Bowl");
  await dialog.getByLabel(/protein/i).fill("26");
  await dialog.getByLabel(/carbs/i).fill("2");
  await dialog.getByLabel(/fat/i).fill("28");

  // Click calculate from macros helper
  const calcBtn = dialog.getByRole("button", { name: /calculate from macros/i });
  await expect(calcBtn).toBeVisible();
  await calcBtn.click();

  // Verify calories is filled with 364 (26*4 + 2*4 + 28*9 = 104 + 8 + 252 = 364)
  await expect(dialog.getByLabel(/calories/i)).toHaveValue("364");

  // Submit manual food
  await dialog.getByRole("button", { name: /add to lunch/i }).click();
  await expect(dialog).toBeHidden();

  // Verify dashboard updates immediately
  await expect(page.locator("body")).toContainText("E2E Power Bowl");
});

test("E2E 4: repeat yesterday's meal", async ({ page }) => {
  // Pre-seed yesterday's lunch
  await page.request.post("/api/food-log", {
    data: {
      date: YESTERDAY,
      mealCategory: "lunch",
      name: "Yesterday Chicken",
      servings: 150,
      servingUnit: "g",
      calories: 250,
      protein: 45,
      carbs: 0,
      fat: 5,
    },
  });

  await page.goto(`/?date=${DATE}`);
  await page.getByRole("button", { name: /add food to lunch/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Verify Yesterday's Lunch banner is present
  await expect(dialog.getByText(/yesterday’s lunch|yesterday's lunch/i)).toBeVisible();
  await expect(dialog.getByText(/Yesterday Chicken/i).first()).toBeVisible();

  // Click Repeat
  const repeatBtn = dialog.getByRole("button", { name: /repeat/i });
  await repeatBtn.click();
  await expect(dialog).toBeHidden();

  // Verify entry now exists on today's Lunch
  await expect(page.locator("body")).toContainText("Yesterday Chicken");
});

test("E2E 5: mobile viewport and touch interaction", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/?date=${DATE}`);

  await page.getByRole("button", { name: /add food to breakfast/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Check that search is visible and reachable
  const searchInput = dialog.getByLabel(/search foods/i);
  await expect(searchInput).toBeVisible();

  // Verify no horizontal overflow
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);

  // Close modal via Esc
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("E2E 6: rapid double-submit does not duplicate entries", async ({ page }) => {
  await page.goto(`/?date=${DATE}`);
  await page.getByRole("button", { name: /add food to dinner/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: /enter nutrition manually/i }).click();
  await dialog.getByLabel(/food name/i).fill("Single Log Rice");
  await dialog.getByLabel(/calories/i).fill("200");
  await dialog.getByLabel(/carbs/i).fill("45");

  const addBtn = dialog.getByRole("button", { name: /add to dinner/i });
  // Double-click rapidly
  await Promise.all([
    addBtn.click({ clickCount: 2 }),
  ]);

  await expect(dialog).toBeHidden();

  // Verify only 1 entry exists for Single Log Rice
  await expect.poll(async () => {
    const res = await page.request.get(`/api/food-log?date=${DATE}`);
    const { entries } = await res.json();
    return (entries || []).filter((e: any) => e.name === "Single Log Rice").length;
  }, { timeout: 8000 }).toBe(1);
});
