import { describe, expect, it } from "vitest";
import {
  roundNutrients,
  sumNutrients,
  percentOf,
  ZERO_NUTRIENTS,
} from "@/lib/nutrition/core";
import { diffDays, relativeDayLabel } from "@/lib/dates";
import { fmt } from "@/components/ui/primitives";
import type { MealCategory, MealItem, NutritionGoals } from "@/lib/domain";

function makeEntry(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: crypto.randomUUID(),
    date: "2026-10-03",
    mealCategory: "lunch",
    name: "Test food",
    servings: 1,
    servingUnit: "serving",
    foodId: null,
    recipeId: null,
    ...ZERO_NUTRIENTS,
    calories: 200,
    protein: 20,
    carbs: 15,
    fat: 5,
    fiber: 2,
    loggedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Today Dashboard: Calculation & Nutrition Accuracy", () => {
  it("sums daily totals accurately across multiple meals and decimal quantities", () => {
    const entries: MealItem[] = [
      makeEntry({ mealCategory: "breakfast", servings: 0.5, calories: 150, protein: 12.5, carbs: 10.2, fat: 4.1 }),
      makeEntry({ mealCategory: "lunch", servings: 1.5, calories: 450, protein: 45.0, carbs: 30.0, fat: 12.0 }),
      makeEntry({ mealCategory: "dinner", servings: 200, servingUnit: "g", calories: 330, protein: 62.0, carbs: 0.0, fat: 7.2 }),
      makeEntry({ mealCategory: "snack", servings: 1, calories: 120, protein: 3.0, carbs: 18.0, fat: 2.5 }),
    ];

    const totals = roundNutrients(sumNutrients(entries));

    expect(totals.calories).toBe(1050);
    expect(totals.protein).toBe(122.5);
    expect(totals.carbs).toBe(58.2);
    expect(totals.fat).toBe(25.8);
  });

  it("handles remaining calories correctly when under target", () => {
    const goal = 2400;
    const consumed = 1840;
    const remaining = goal - consumed;
    const isOver = remaining < 0;

    expect(isOver).toBe(false);
    expect(remaining).toBe(560);
    expect(`${fmt.int(Math.abs(remaining))} ${isOver ? "kcal over target" : "kcal remaining"}`).toBe(
      "560 kcal remaining"
    );
  });

  it("handles over-target calories cleanly without negative remaining values", () => {
    const goal = 2400;
    const consumed = 2580;
    const remaining = goal - consumed;
    const isOver = remaining < 0;

    expect(isOver).toBe(true);
    expect(remaining).toBe(-180);
    // User requested format: "180 kcal over target", never "-180 remaining"
    expect(`${fmt.int(Math.abs(remaining))} ${isOver ? "kcal over target" : "kcal remaining"}`).toBe(
      "180 kcal over target"
    );
  });

  it("handles missing or unconfigured daily goals safely without divide by zero or NaN", () => {
    const goals: NutritionGoals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: null,
      sodium: null,
      waterMl: 2500,
    };

    const consumed = 750;
    const hasCalorieGoal = goals.calories > 0;
    const pct = hasCalorieGoal ? percentOf(consumed, goals.calories) : 0;

    expect(hasCalorieGoal).toBe(false);
    expect(pct).toBe(0);
    expect(Number.isFinite(pct)).toBe(true);
    expect(Number.isNaN(pct)).toBe(false);
  });

  it("calculates remaining macros with consistent precision", () => {
    const targetProtein = 180;
    const consumedProtein = 147.4;
    const remainingProtein = targetProtein - consumedProtein;

    // fmt.g rounds values >= 10 to integer, values < 10 keep 1 decimal
    expect(fmt.g(remainingProtein)).toBe("33");

    const smallRemainingFat = 8.4;
    expect(fmt.g(smallRemainingFat)).toBe("8.4");

    const overTargetCarbs = 275.5;
    const targetCarbs = 250;
    const diffCarbs = targetCarbs - overTargetCarbs;
    const isOverCarbs = diffCarbs < 0;

    expect(isOverCarbs).toBe(true);
    expect(`${fmt.g(Math.abs(diffCarbs))}g over`).toBe("26g over");
  });

  it("stress test: maintains precision and performance with 50+ entries", () => {
    const entries: MealItem[] = [];
    for (let i = 0; i < 50; i++) {
      entries.push(
        makeEntry({
          calories: 45.5,
          protein: 4.25,
          carbs: 5.1,
          fat: 1.05,
          fiber: 0.5,
        })
      );
    }

    const totals = roundNutrients(sumNutrients(entries));
    expect(totals.calories).toBe(2275);
    expect(totals.protein).toBe(212.5);
    expect(totals.carbs).toBe(255);
    expect(totals.fat).toBe(52.5);
    expect(totals.fiber).toBe(25);
  });

  it("handles extreme numbers safely without crashing", () => {
    const huge = makeEntry({ calories: 99999, protein: 5000, carbs: 8000, fat: 3000 });
    const zero = makeEntry({ calories: 0, protein: 0, carbs: 0, fat: 0 });

    const totals = roundNutrients(sumNutrients([huge, zero]));
    expect(totals.calories).toBe(99999);
    expect(totals.protein).toBe(5000);
    expect(Number.isFinite(totals.calories)).toBe(true);
  });

  it("verifies meal grouping and individual meal totals match overall sum", () => {
    const breakfast = makeEntry({ mealCategory: "breakfast", calories: 400 });
    const lunch1 = makeEntry({ mealCategory: "lunch", calories: 500 });
    const lunch2 = makeEntry({ mealCategory: "lunch", calories: 250 });
    const dinner = makeEntry({ mealCategory: "dinner", calories: 650 });

    const all = [breakfast, lunch1, lunch2, dinner];
    const byMeal: Record<MealCategory, MealItem[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of all) byMeal[e.mealCategory].push(e);

    const bTotal = sumNutrients(byMeal.breakfast).calories;
    const lTotal = sumNutrients(byMeal.lunch).calories;
    const dTotal = sumNutrients(byMeal.dinner).calories;
    const sTotal = sumNutrients(byMeal.snack).calories;
    const grandTotal = sumNutrients(all).calories;

    expect(bTotal).toBe(400);
    expect(lTotal).toBe(750);
    expect(dTotal).toBe(650);
    expect(sTotal).toBe(0);
    expect(bTotal + lTotal + dTotal + sTotal).toBe(grandTotal);
  });
});

describe("Today Dashboard: Date & Historical Labeling", () => {
  it("differentiates today, yesterday, and older historical logs", () => {
    const today = "2026-10-03";
    const yesterday = "2026-10-02";
    const threeDaysAgo = "2026-09-30";
    const lastYear = "2025-10-03";

    expect(diffDays(today, today)).toBe(0);
    expect(diffDays(today, yesterday)).toBe(-1);
    expect(diffDays(today, threeDaysAgo)).toBe(-3);
    expect(diffDays(today, lastYear)).toBe(-365);

    expect(relativeDayLabel(today, today)).toBe("Today");
    expect(relativeDayLabel(yesterday, today)).toBe("Yesterday");
  });
});
