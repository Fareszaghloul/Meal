import fs from "fs";
import { expect, test, type Page } from "@playwright/test";
import type { PrismaClient } from "@prisma/client";
import { createThrowawayUser, signInAs, testDb } from "./support/test-db";
import { addDays, startOfWeek, todayInTimezone } from "../../src/lib/dates";

/**
 * Responsive audit of every page at phone → desktop widths, on meal_test with a throwaway account seeded with a
 * realistic (and deliberately long-named) dataset. Fails on horizontal overflow at any width. Writes small touch
 * targets and iOS-zooming inputs per page to test-results/mobile-audit.json for review.
 */
const PAGES = [
  "/", "/history", "/analytics", "/weight", "/foods", "/recipes", "/recipes/new", "/saved-meals", "/meal-plan",
  "/weekly-review", "/meal-prep", "/shopping-list", "/pantry", "/settings", "/profile",
];
const WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1440];

test.describe.configure({ mode: "serial" });

let db: PrismaClient;
let user: { id: string; email: string };
const TZ = "Asia/Amman";
test.use({ timezoneId: TZ });

/** Long names on purpose: they are what breaks narrow layouts. */
async function seed(userId: string) {
  const today = todayInTimezone(TZ);
  const week = startOfWeek(today);
  await db.userSettings.create({ data: { userId, timezone: TZ, dailyFiber: 30, goalWeightKg: 80 } });
  const foods = await Promise.all(
    ["Greek yogurt, 2% fat, plain, unsweetened (Almarai)", "Chicken breast, skinless, grilled", "Basmati rice, cooked", "Extra virgin olive oil", "Rolled oats", "Banana, medium"].map((name, i) =>
      db.food.create({ data: { userId, name, brand: i === 0 ? "Almarai Dairy Company" : null, category: "Pantry", caloriesPer100g: 100 + i * 40, proteinPer100g: 10, carbsPer100g: 12, fatPer100g: 3, servings: { create: [{ label: "1 serving", grams: 150, isDefault: true }] } } })
    )
  );
  const recipes = await Promise.all(
    ["Slow-cooked chicken shawarma bowl with garlic yogurt sauce", "Overnight oats with banana and peanut butter", "Lentil soup (shorbet adas)", "Tuna pasta salad", "Mujaddara with caramelised onions", "Protein pancakes"].map((name, i) =>
      db.recipe.create({
        data: {
          userId, name, servings: 4, prepTimeMinutes: 15 + i * 5, cookTimeMinutes: 30, caloriesPerServing: 420 + i * 30, proteinPerServing: 32, carbsPerServing: 45, fatPerServing: 12, isFavorite: i % 2 === 0,
          description: "A reliable weekday meal that keeps well in the fridge for three to four days.",
          ingredients: { create: [{ rawName: "Chicken breast, skinless", quantity: 600, unit: "g", grams: 600, calories: 990, foodId: foods[1].id }, { rawName: "Basmati rice", quantity: 2, unit: "cup", grams: 370, calories: 480 }, { rawName: "Garlic yogurt sauce with lemon and mint", quantity: 1, unit: "cup", grams: 240 }] },
          instructions: { create: [{ stepNumber: 1, instruction: "Marinate the chicken overnight with spices, lemon juice and olive oil." }, { stepNumber: 2, instruction: "Roast at 220°C for 25 minutes, rest, then slice thinly against the grain." }] },
        },
      })
    )
  );
  const meals = ["breakfast", "lunch", "dinner", "snack"] as const;
  await db.foodLogEntry.createMany({
    data: meals.flatMap((m, i) => [
      { userId, date: today, mealCategory: m, name: foods[i].name, servings: 1.5, servingUnit: "serving", calories: 250 + i * 60, protein: 22, carbs: 30, fat: 8, fiber: 4, foodId: foods[i].id },
      { userId, date: today, mealCategory: m, name: recipes[i].name, servings: 1, servingUnit: "bowl", calories: 520, protein: 38, carbs: 50, fat: 15, fiber: 6, recipeId: recipes[i].id },
    ]),
  });
  await db.waterLogEntry.create({ data: { userId, date: today, amountMl: 1250 } });
  await db.weightEntry.createMany({
    data: [
      ...Array.from({ length: 60 }, (_, i) => ({ userId, date: addDays(today, -i), time: "07:30", entryType: "daily", weightKg: Math.round((88 - i * 0.05 + Math.sin(i) * 0.4) * 10) / 10 })),
      ...[0, 30, 60].map((d) => ({ userId, date: addDays(today, -d), entryType: "inbody", weightKg: 88, bodyFatPct: 24.5, smmKg: 36.2, bmi: 26.1 })),
    ],
  });
  await db.mealPlan.create({
    data: {
      userId, weekStartDate: week,
      meals: { create: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].flatMap((day, d) => meals.map((m, i) => ({ dayOfWeek: day, mealCategory: m, recipeId: recipes[(d + i) % recipes.length].id, servings: 1, calories: 450, protein: 32, carbs: 45, fat: 12, sortOrder: i, status: d === 0 && i < 2 ? "logged" : "planned" }))) },
    },
  });
  await db.pantryItem.createMany({
    data: foods.map((f, i) => ({ userId, foodId: f.id, name: f.name, quantity: 250 + i * 100, unit: i % 2 ? "g" : "ml", storageLocation: ["Pantry", "Fridge", "Freezer"][i % 3], expiryDate: addDays(today, i * 3 - 2), lowStockThreshold: i === 2 ? 1000 : null })),
  });
  await db.shoppingListItem.createMany({
    data: ["Greek yogurt, 2% fat, plain, unsweetened, family size", "Chicken breast", "Basmati rice", "Lemons", "Garlic", "Fresh mint", "Olive oil", "Lentils", "Onions", "Tuna in water"].map((name, i) => ({ userId, name, quantity: i + 1, unit: i % 2 ? "kg" : "pcs", category: ["Dairy", "Meat", "Grains", "Produce"][i % 4], isChecked: i % 3 === 0, isCustom: i % 4 === 0, weekStart: week })),
  });
  await db.savedMeal.create({
    data: { userId, name: "Usual high-protein breakfast before training", mealCategory: "breakfast", isFavorite: true, items: { create: [{ foodId: foods[0].id, quantity: 1, calories: 150, protein: 15, carbs: 8, fat: 4 }, { recipeId: recipes[1].id, quantity: 1, calories: 420, protein: 25, carbs: 50, fat: 12 }] } },
  });
  await db.prepSession.create({ data: { userId, weekStart: week, tasks: { create: ["Marinate chicken for shawarma bowls", "Cook 1 kg basmati rice", "Portion overnight oats into 5 jars", "Make garlic yogurt sauce"].map((label, i) => ({ label, sortOrder: i, completed: i === 0 })) } } });
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  db = await testDb();
  user = await createThrowawayUser(db, "mobile");
  await seed(user.id);
});

test.afterAll(async () => {
  await db.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await db.$disconnect();
});

interface Finding { overflow: number; wide: string[]; smallTargets: string[]; smallInputs: string[] }

async function audit(page: Page): Promise<Finding> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const label = (el: Element) => {
      const h = el as HTMLElement;
      const name = (h.getAttribute("aria-label") || h.innerText || h.getAttribute("title") || (h as HTMLInputElement).name || "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `${el.tagName.toLowerCase()}${h.className && typeof h.className === "string" ? "." + h.className.split(" ").slice(0, 3).join(".") : ""} "${name}"`;
    };
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest("[data-allow-overflow]"))
      .filter((el) => !(el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 1)) // outermost only
      .slice(0, 8)
      .map((el) => `${label(el)} right=${Math.round(el.getBoundingClientRect().right)}`);
    const smallTargets = [...document.querySelectorAll("a[href], button, [role=button], [role=radio], [role=tab], input[type=checkbox], select, summary")]
      .filter(visible)
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height < 44 || r.width < 44;
      })
      .map((el) => `${label(el)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    const smallInputs = [...document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), select, textarea")]
      .filter(visible)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `${label(el)} ${getComputedStyle(el).fontSize}`);
    return { overflow: document.documentElement.scrollWidth - vw, wide, smallTargets: [...new Set(smallTargets)].slice(0, 30), smallInputs: [...new Set(smallInputs)].slice(0, 15) };
  });
}

test("every page fits every width", async ({ page, isMobile }, info) => {
  test.setTimeout(900_000);
  await signInAs(page, user.email);
  const report: Record<string, Record<number, Finding>> = {};
  const overflowing: string[] = [];
  for (const path of PAGES) {
    report[path] = {};
    // Desktop project: every width, overflow only. Phone project (touch): phone/tablet widths, plus targets and inputs.
    for (const width of isMobile ? WIDTHS.filter((w) => w <= 768) : WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await page.waitForTimeout(300);
      const f = await audit(page);
      if (isMobile && width === 375) {
        await page.screenshot({ path: `test-results/mobile-screens/${path === "/" ? "today" : path.slice(1).split("/").join("-")}.png` });
      }
      report[path][width] = isMobile ? f : { ...f, smallTargets: [], smallInputs: [] };
      if (f.overflow > 0) overflowing.push(`${path} @${width}: +${f.overflow}px ${f.wide.join(" | ")}`);
    }
  }
  fs.mkdirSync("test-results", { recursive: true });
  // The More sheet, on a phone.
  if (isMobile) {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByRole("button", { name: "More", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "More" })).toBeVisible();
    await page.screenshot({ path: "test-results/mobile-screens/more-sheet.png" });
  }
  fs.writeFileSync(`test-results/mobile-audit-${info.project.name}.json`, JSON.stringify(report, null, 1));
  expect(overflowing, overflowing.join("\n")).toEqual([]);
});
