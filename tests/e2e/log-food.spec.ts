import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL || "e2e-test@mealprep.local";
const PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassword!2026";
const DATE = "2001-03-10"; // far in the past so it never collides with real days

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

async function clearDay(page: Page) {
  const res = await page.request.get(`/api/food-log?date=${DATE}`);
  const { entries } = await res.json();
  for (const e of entries) await page.request.delete(`/api/food-log/${e.id}`);
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await clearDay(page);
});

test("add food to breakfast, adjust quantity, totals update and survive reload", async ({ page }) => {
  await page.goto(`/?date=${DATE}`);
  await expect(page.getByRole("heading", { name: "Breakfast" })).toBeVisible();

  // Breakfast → Add → Quick add
  await page.getByRole("button", { name: "Add food to Breakfast" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: "Quick add" }).click();
  await dialog.getByLabel("Food", { exact: true }).fill("E2E Chicken");
  await dialog.getByLabel("kcal", { exact: true }).fill("165");
  await dialog.getByLabel("Protein", { exact: true }).fill("31");
  await dialog.getByLabel("Fat", { exact: true }).fill("3.6");
  // 100 g serving, quantity 2 → 200 g, 330 kcal
  await dialog.getByLabel("Quantity", { exact: true }).fill("2");
  await expect(dialog.getByText(/Total:/)).toContainText("330 kcal");
  await dialog.getByRole("checkbox", { name: /Save to My foods/ }).uncheck();
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();

  // Row + section + day totals
  const row = page.getByRole("listitem").filter({ hasText: "E2E Chicken" });
  await expect(row).toContainText("200 g");
  await expect(row).toContainText("330");
  const summary = page.getByRole("region", { name: "Today's summary" });
  await expect(summary).toContainText("330");

  // Change quantity via edit → 150 g → 248 kcal (247.5 rounds half up)
  await row.getByRole("button", { name: /E2E Chicken/ }).first().click();
  const edit = page.getByRole("dialog", { name: "Edit entry" });
  await edit.getByLabel("Quantity", { exact: true }).fill("150");
  await expect(edit.getByLabel("kcal", { exact: true })).toHaveValue("248");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(row).toContainText("150 g");
  await expect(summary).toContainText("248");

  // Wait for the write queue to drain, then reload: values must come from the server.
  await expect.poll(async () => (await (await page.request.get(`/api/day?date=${DATE}`)).json()).totals.calories, { timeout: 10_000 }).toBe(248);
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "E2E Chicken" })).toContainText("150 g");
  await expect(page.getByRole("region", { name: "Today's summary" })).toContainText("248");

  // No horizontal overflow on phones
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});

test("date navigation is instant and the history calendar reflects the day", async ({ page }) => {
  await page.request.post("/api/food-log", { data: { date: DATE, mealCategory: "lunch", name: "Cal test", servings: 1, servingUnit: "serving", calories: 500 } });
  await page.goto(`/?date=${DATE}`);
  await expect(page.getByRole("region", { name: "Today's summary" })).toContainText("500");
  await page.getByRole("button", { name: "Next day" }).click();
  await expect(page).toHaveURL(/date=2001-03-11/);
  await page.getByRole("button", { name: "Previous day" }).click();
  await expect(page.getByRole("region", { name: "Today's summary" })).toContainText("500");
});
