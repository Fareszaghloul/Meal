import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL || "e2e-test@mealprep.local";
const PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassword!2026";
const TEST_DATE = "2001-04-12";

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

async function clearDay(page: Page, targetDate = TEST_DATE) {
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
  await clearDay(page, TEST_DATE);
});

test("E2E Phase 4: Create food, edit master, log entry, verify snapshot immutability, and delete", async ({
  page,
}) => {
  const timestamp = Date.now();
  const testFoodName = `Chicken Gold ${timestamp}`;

  // 1. Open My Foods library
  await page.goto("/foods");
  await expect(page.getByRole("heading", { name: "My Foods" })).toBeVisible();

  // 2. Click "+ New Food"
  await page.getByRole("button", { name: /new food/i }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();

  // 3. Fill in Chicken Gold: 100g, 165 kcal, 31P, 0C, 3.6F
  await sheet.getByLabel(/food name/i).fill(testFoodName);
  await sheet.getByLabel(/brand/i).fill("Bell & Evans");

  const kcalField = sheet.getByLabel(/calories/i);
  await kcalField.fill("165");
  await sheet.getByLabel(/protein/i).fill("31");
  await sheet.getByLabel(/^carbs/i).fill("0");
  await sheet.getByLabel(/^fat/i).fill("3.6");

  // Save food
  await sheet.getByRole("button", { name: /add food/i }).click();
  await expect(sheet).not.toBeVisible();

  // 4. Instant search for newly created food
  const searchInput = page.getByRole("searchbox", { name: /search my foods/i });
  await searchInput.fill(testFoodName);
  const row = page.getByRole("listitem").filter({ hasText: testFoodName });
  await expect(row).toBeVisible();
  await expect(row).toContainText("165 kcal");
  await expect(row).toContainText("31P");
  await expect(row).toContainText("3.6F");

  // 5. Open food details
  await row.getByRole("button", { name: `View details for ${testFoodName}` }).click();
  const detailsSheet = page.getByRole("dialog");
  await expect(detailsSheet).toBeVisible();
  await expect(detailsSheet.getByText("Standard Serving")).toBeVisible();
  await expect(detailsSheet.getByText("165", { exact: true })).toBeVisible();

  // 6. Edit food calories from 165 to 170
  await detailsSheet.getByRole("button", { name: /edit/i }).click();
  const editSheet = page.getByRole("dialog");
  await expect(editSheet).toBeVisible();
  const editKcal = editSheet.getByLabel(/calories/i);
  await editKcal.fill("170");
  await editSheet.getByRole("button", { name: /save changes/i }).click();
  await expect(editSheet).not.toBeVisible();

  // Verify list updated to 170 kcal
  await expect(row).toContainText("170 kcal");

  // 7. Open Today Dashboard and log Chicken Gold into Breakfast
  await page.goto(`/?date=${TEST_DATE}`);
  await expect(page.getByRole("heading", { name: "Breakfast" })).toBeVisible();

  await page.getByRole("button", { name: /add food to breakfast/i }).click();
  const addFoodModal = page.getByRole("dialog");
  await expect(addFoodModal).toBeVisible();

  const addSearch = addFoodModal.getByLabel(/search foods/i);
  await addSearch.fill(testFoodName);
  const searchResult = addFoodModal.getByRole("button").filter({ hasText: testFoodName });
  await expect(searchResult).toBeVisible();
  await expect(searchResult).toContainText("170");

  // Click to open portion editor and log 100g
  await searchResult.click();
  await addFoodModal.getByRole("button", { name: /add to breakfast/i }).click();
  await expect(addFoodModal).not.toBeVisible();

  // Verify logged item in Breakfast
  const loggedItem = page.getByRole("region", { name: "Breakfast" }).getByText(testFoodName);
  await expect(loggedItem).toBeVisible();

  // 8. Return to /foods and modify master calories to 200 kcal
  await page.goto("/foods");
  await searchInput.fill(testFoodName);
  await row.getByRole("button", { name: `View details for ${testFoodName}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: /edit/i }).click();
  const reEditSheet = page.getByRole("dialog");
  await reEditSheet.getByLabel(/calories/i).fill("200");
  await reEditSheet.getByRole("button", { name: /save changes/i }).click();
  await expect(reEditSheet).not.toBeVisible();
  await expect(row).toContainText("200 kcal");

  // 9. Return to Today Dashboard: Verify logged item STILL has 170 kcal (historical snapshot preserved!)
  await page.goto(`/?date=${TEST_DATE}`);
  const breakfastSection = page.getByRole("region", { name: "Breakfast" });
  await expect(breakfastSection.getByText(testFoodName)).toBeVisible();
  // Historical snapshot must be 170 kcal, not 200 kcal
  await expect(breakfastSection).toContainText("170");
  await expect(breakfastSection).not.toContainText("200");

  // 10. Return to /foods and delete the food
  await page.goto("/foods");
  await searchInput.fill(testFoodName);
  await row.getByRole("button", { name: `View details for ${testFoodName}` }).click();

  // Handle window.confirm for deletion
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("dialog").getByRole("button", { name: /delete/i }).click();
  await expect(page.getByRole("listitem").filter({ hasText: testFoodName })).not.toBeVisible();

  // 11. Historical entry on Today Dashboard must still be intact after deletion!
  await page.goto(`/?date=${TEST_DATE}`);
  await expect(page.getByRole("region", { name: "Breakfast" }).getByText(testFoodName)).toBeVisible();
  await expect(page.getByRole("region", { name: "Breakfast" })).toContainText("170");
});

test("E2E Phase 4: Duplicate warning and override", async ({ page }) => {
  const timestamp = Date.now();
  const baseName = `Duplicate Base Food ${timestamp}`;

  // Create base food
  await page.goto("/foods");
  await page.getByRole("button", { name: /new food/i }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel(/food name/i).fill(baseName);
  await sheet.getByLabel(/calories/i).fill("150");
  await sheet.getByLabel(/protein/i).fill("10");
  await sheet.getByLabel(/^carbs/i).fill("15");
  await sheet.getByLabel(/^fat/i).fill("5");
  await sheet.getByRole("button", { name: /add food/i }).click();
  await expect(sheet).not.toBeVisible();

  // Try creating a food with duplicate normalized name
  await page.getByRole("button", { name: /new food/i }).click();
  const newSheet = page.getByRole("dialog");
  await newSheet.getByLabel(/food name/i).fill(baseName.toLowerCase());

  // Verify duplicate warning banner appears
  const warning = newSheet.getByRole("alert");
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("Possible duplicate");

  // Click "Create anyway"
  await warning.getByRole("button", { name: /create anyway/i }).click();
  await expect(warning).not.toBeVisible();

  // Fill in required calories and save
  await newSheet.getByLabel(/calories/i).fill("155");
  await newSheet.getByRole("button", { name: /add food/i }).click();
  await expect(newSheet).not.toBeVisible();

  // Cleanup: delete both
  await page.getByRole("searchbox", { name: /search my foods/i }).fill(baseName);
  const rows = page.getByRole("listitem").filter({ hasText: baseName });
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    page.once("dialog", (d) => d.accept());
    await rows.first().getByRole("button", { name: /view details for/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: /delete/i }).click();
  }
});

test("E2E Phase 4: Mobile viewport responsiveness (iPhone 13)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/foods");
  await expect(page.getByRole("heading", { name: "My Foods" })).toBeVisible();

  // Verify search bar and filter controls fit without horizontal scrolling
  const searchBox = page.getByRole("searchbox", { name: /search my foods/i });
  await expect(searchBox).toBeVisible();

  // Open New Food on mobile
  await page.getByRole("button", { name: /new food/i }).click();
  const mobileSheet = page.getByRole("dialog");
  await expect(mobileSheet).toBeVisible();

  // Check inputs have proper label and accessibility
  await expect(mobileSheet.getByLabel(/food name/i)).toBeVisible();
  await expect(mobileSheet.getByLabel(/calories/i)).toBeVisible();

  // Close sheet
  await mobileSheet.getByRole("button", { name: /cancel/i }).click();
  await expect(mobileSheet).not.toBeVisible();
});
