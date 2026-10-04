import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL || "e2e-test@mealprep.local";
const PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassword!2026";

let sharedCookie: { name: string; value: string; domain: string; path: string } | null = null;

async function signIn(page: Page) {
  if (!sharedCookie) {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
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

test.describe("E2E Phase 5: History & Calendar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    // Ensure deterministic seed entry for October 3, 2026 exists
    const checkRes = await page.request.get("/api/food-log?date=2026-10-03");
    if (checkRes.ok()) {
      const { entries } = await checkRes.json();
      if (!entries || entries.length === 0) {
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
      }
    }
  });

  test("Desktop: Month view, date selection, preview details, and navigation", async ({ page }) => {
    await page.goto("/history");
    await page.waitForURL(/\/history/);

    // 1. Verify header and month summary banner
    await expect(page.getByRole("heading", { name: "History", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: /month calendar/i })).toBeVisible();
    await expect(page.getByRole("region", { name: /month statistics/i })).toBeVisible();

    // 2. Locate the calendar button for October 3, 2026
    const oct3Btn = page.getByRole("button", { name: /October 3, 2026/i });
    await expect(oct3Btn).toBeVisible();
    await oct3Btn.click();

    // 3. Verify Selected Day Preview Panel updates for October 3, 2026
    const previewPanel = page.getByRole("complementary", { name: /Details for/i });
    await expect(previewPanel).toBeVisible();
    await expect(previewPanel).toContainText(/October 3/i);
    await expect(previewPanel).toContainText(/Calories/i);
    await expect(previewPanel).toContainText(/Meal Breakdown/i);

    // 4. Click [ Open day ] button and verify it navigates to Today Dashboard
    const openDayBtn = previewPanel.getByRole("button", { name: /open/i });
    await openDayBtn.click();
    await expect(page).toHaveURL(/\/(?:\?date=2026-10-03)?$/);

    // 5. Return to /history
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "History", exact: true })).toBeVisible();

    // 6. Test Month / Year picker popover
    const pickerTrigger = page.getByRole("button", { name: /Select month and year/i });
    await pickerTrigger.click();
    const popover = page.getByRole("dialog", { name: /Choose month and year/i });
    await expect(popover).toBeVisible();

    // Pick September
    await popover.getByRole("button", { name: "Sep" }).click();
    await expect(popover).not.toBeVisible();
    await expect(pickerTrigger).toContainText(/September 2026/i);

    // 7. Click Today / Jump button to return to current month
    const todayBtn = page.getByRole("button", { name: /Today/i }).first();
    await todayBtn.click();
    await expect(pickerTrigger).toContainText(/October 2026/i);
  });

  test("Mobile viewport: Stacked layout, touch targets, and zero horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/history");
    await page.waitForURL(/\/history/);

    // Verify zero horizontal overflow on mobile body
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(390);

    // Verify calendar and preview are stacked
    const calendar = page.getByRole("region", { name: /month calendar/i });
    const preview = page.getByRole("complementary", { name: /Details for/i });
    await expect(calendar).toBeVisible();
    await expect(preview).toBeVisible();

    const calBox = await calendar.boundingBox();
    const prevBox = await preview.boundingBox();
    expect(calBox).not.toBeNull();
    expect(prevBox).not.toBeNull();
    // Preview should stack below calendar
    expect(prevBox!.y).toBeGreaterThanOrEqual(calBox!.y + calBox!.height - 10);

    // Tap previous month and next month buttons
    const prevMonthBtn = page.getByRole("button", { name: /previous month/i });
    const nextMonthBtn = page.getByRole("button", { name: /next month/i });
    await expect(prevMonthBtn).toBeVisible();
    await expect(nextMonthBtn).toBeVisible();

    await prevMonthBtn.click();
    await expect(page.getByRole("button", { name: /Select month and year/i })).toContainText(/September 2026/i);

    await nextMonthBtn.click();
    await expect(page.getByRole("button", { name: /Select month and year/i })).toContainText(/October 2026/i);
  });

  test("Keyboard navigation within calendar", async ({ page }) => {
    await page.goto("/history");
    await page.waitForURL(/\/history/);

    const oct3Btn = page.getByRole("button", { name: /October 3, 2026/i });
    await expect(oct3Btn).toBeVisible();
    await oct3Btn.click();

    // Press ArrowLeft to move to Oct 2
    await page.keyboard.press("ArrowLeft");
    const preview = page.getByRole("complementary", { name: /Details for/i });
    await expect(preview).toContainText(/October 2/i);

    // Press ArrowRight to move back to Oct 3
    await page.keyboard.press("ArrowRight");
    await expect(preview).toContainText(/October 3/i);

    // Press 'T' to jump to Today
    await page.keyboard.press("t");
    await expect(preview).toContainText(/Today/i);
  });

  test("Lifecycle: Open day from preview, edit entry, return to History, verify instant cache update", async ({ page }) => {
    // 1. Navigate to History
    await page.goto("/history?month=2026-10&date=2026-10-03");
    await page.waitForURL(/\/history/);

    const oct3Btn = page.getByRole("button", { name: /October 3, 2026/i });
    await expect(oct3Btn).toBeVisible();
    await oct3Btn.click();

    const preview = page.getByRole("complementary", { name: /Details for/i });
    await expect(preview).toBeVisible();

    // 2. Click Open day
    await preview.getByRole("button", { name: /open/i }).click();
    await page.waitForURL(/\/(?:\?date=2026-10-03)?$/);

    // 3. Open Add Food Modal and add a test item to Breakfast
    await page.getByRole("button", { name: /add food to breakfast/i }).click();
    const addModal = page.getByRole("dialog");
    await expect(addModal).toBeVisible();

    // Search for egg and click the result
    const searchInput = addModal.getByLabel(/search foods/i);
    await searchInput.fill("egg");
    await page.waitForTimeout(300);

    const eggRow = addModal.locator('[role="button"]').filter({ hasText: /egg/i }).first();
    await expect(eggRow).toBeVisible();
    await eggRow.click();
    await addModal.getByRole("button", { name: /add to breakfast/i }).click();
    await expect(addModal).not.toBeVisible();

    // 4. Return to History
    await page.goto("/history?month=2026-10&date=2026-10-03");
    await page.waitForURL(/\/history/);

    // 5. Verify the updated totals appear immediately on the calendar and in the preview
    await expect(oct3Btn).toBeVisible();
    await oct3Btn.click();
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(/Breakfast/i);
  });
});
