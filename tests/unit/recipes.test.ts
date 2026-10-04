import { describe, it, expect } from "vitest";
import {
  calculateRecipeNutrition,
  type IngredientForCalculation,
} from "@/lib/nutrition/calculator";

describe("Recipe Calculation Engine (Unit Tests)", () => {
  const chickenBreast = {
    id: "food-chicken",
    name: "Chicken Breast",
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    fiberPer100g: 0,
    sodiumPer100g: 74,
  };

  const whiteRice = {
    id: "food-rice",
    name: "Jasmine Rice (Dry)",
    caloriesPer100g: 365,
    proteinPer100g: 7.1,
    carbsPer100g: 80,
    fatPer100g: 0.7,
    fiberPer100g: 1.3,
    sodiumPer100g: 5,
  };

  const oliveOil = {
    id: "food-oil",
    name: "Olive Oil",
    caloriesPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
    fiberPer100g: 0,
    sodiumPer100g: 2,
    servingWeightGrams: 14,
    defaultUnit: "tbsp",
  };

  it("calculates accurate total nutrition from multiple ingredients", () => {
    const ingredients: IngredientForCalculation[] = [
      {
        rawName: "Chicken Breast",
        quantity: 500,
        unit: "g",
        food: chickenBreast,
      },
      {
        rawName: "Jasmine Rice",
        quantity: 200,
        unit: "g",
        food: whiteRice,
      },
      {
        rawName: "Olive Oil",
        quantity: 1,
        unit: "tbsp",
        food: oliveOil,
      },
    ];

    const result = calculateRecipeNutrition(ingredients, 4);

    // Expected:
    // Chicken 500g: 165*5 = 825 kcal, 155P, 0C, 18F, 370 sodium
    // Rice 200g: 365*2 = 730 kcal, 14.2P, 160C, 1.4F, 10 sodium
    // Oil 1 tbsp (14g): 884*0.14 = 123.76 kcal, 0P, 0C, 14F, 0.28 sodium
    // Total kcal: 825 + 730 + 123.76 = 1678.76 -> round 1679 kcal
    // Total Protein: 155 + 14.2 = 169.2 -> round 169.2g
    // Total Carbs: 160g
    // Total Fat: 18 + 1.4 + 14 = 33.4g

    expect(result.total.calories).toBe(1679);
    expect(result.total.protein).toBe(169.2);
    expect(result.total.carbs).toBe(160);
    expect(result.total.fat).toBe(33.4);
    expect(result.totalIngredients).toBe(3);
    expect(result.matchedCount).toBe(3);
  });

  it("calculates per-serving nutrition cleanly", () => {
    const ingredients: IngredientForCalculation[] = [
      {
        rawName: "Chicken Breast",
        quantity: 600,
        unit: "g",
        food: chickenBreast,
      },
    ];

    // 600g chicken = 990 kcal, 186P, 0C, 21.6F
    // 6 servings -> 165 kcal, 31P, 0C, 3.6F per serving
    const result = calculateRecipeNutrition(ingredients, 6);

    expect(result.total.calories).toBe(990);
    expect(result.total.protein).toBe(186);

    expect(result.perServing.calories).toBe(165);
    expect(result.perServing.protein).toBe(31);
    expect(result.perServing.carbs).toBe(0);
    expect(result.perServing.fat).toBe(3.6);
  });

  it("changing servings does NOT change total recipe nutrition", () => {
    const ingredients: IngredientForCalculation[] = [
      {
        rawName: "Chicken Breast",
        quantity: 600,
        unit: "g",
        food: chickenBreast,
      },
    ];

    const result4 = calculateRecipeNutrition(ingredients, 4);
    const result6 = calculateRecipeNutrition(ingredients, 6);
    const result8 = calculateRecipeNutrition(ingredients, 8);

    // Total must remain invariant
    expect(result4.total.calories).toBe(result6.total.calories);
    expect(result6.total.calories).toBe(result8.total.calories);
    expect(result4.total.protein).toBe(result8.total.protein);

    // Only per serving changes
    expect(result4.perServing.calories).toBe(248);
    expect(result6.perServing.calories).toBe(165);
    expect(result8.perServing.calories).toBe(124);
  });

  it("calculates per-100g when cooked yield weight is defined", () => {
    const ingredients: IngredientForCalculation[] = [
      {
        rawName: "Chicken Breast",
        quantity: 1000,
        unit: "g",
        food: chickenBreast,
      },
    ];

    // 1000g chicken raw = 1650 kcal, 310P, 0C, 36F
    // Suppose cooked yield after water loss is 800g
    const result = calculateRecipeNutrition(ingredients, 4, 800);

    expect(result.per100g).not.toBeNull();
    // 1650 / 8 = 206.25 kcal / 100g -> 206 kcal
    // 310 / 8 = 38.75P / 100g -> 38.8P
    expect(result.per100g!.calories).toBe(206);
    expect(result.per100g!.protein).toBe(38.8);
  });

  it("changing cooked yield weight does NOT change total recipe nutrition", () => {
    const ingredients: IngredientForCalculation[] = [
      {
        rawName: "Chicken Breast",
        quantity: 1000,
        unit: "g",
        food: chickenBreast,
      },
    ];

    const yieldA = calculateRecipeNutrition(ingredients, 4, 2400);
    const yieldB = calculateRecipeNutrition(ingredients, 4, 2000);

    expect(yieldA.total.calories).toBe(yieldB.total.calories);
    expect(yieldA.perServing.calories).toBe(yieldB.perServing.calories);

    // Only per100g density changes
    expect(yieldA.per100g!.calories).toBe(69);
    expect(yieldB.per100g!.calories).toBe(83);
  });

  it("returns per100g as null when yield weight is omitted or zero", () => {
    const ingredients: IngredientForCalculation[] = [
      {
        rawName: "Chicken Breast",
        quantity: 500,
        unit: "g",
        food: chickenBreast,
      },
    ];

    const noYield = calculateRecipeNutrition(ingredients, 4, null);
    const zeroYield = calculateRecipeNutrition(ingredients, 4, 0);

    expect(noYield.per100g).toBeNull();
    expect(zeroYield.per100g).toBeNull();
  });

  it("supports decimal servings (e.g. 2.5 servings)", () => {
    const ingredients: IngredientForCalculation[] = [
      {
        rawName: "Chicken Breast",
        quantity: 500,
        unit: "g",
        food: chickenBreast,
      },
    ];

    // 500g chicken = 825 kcal, 155P
    // 2.5 servings -> 330 kcal, 62P per serving
    const result = calculateRecipeNutrition(ingredients, 2.5);

    expect(result.total.calories).toBe(825);
    expect(result.perServing.calories).toBe(330);
    expect(result.perServing.protein).toBe(62);
  });

  it("uses frozen ingredient snapshots when source food is unlinked or deleted", () => {
    const ingredients: IngredientForCalculation[] = [
      {
        rawName: "Custom Protein Powder",
        quantity: 1,
        unit: "scoop",
        foodId: null,
        food: null,
        calories: 120,
        protein: 25,
        carbs: 2,
        fat: 1.5,
        fiber: 1,
        sodium: 140,
      },
    ];

    const result = calculateRecipeNutrition(ingredients, 1);

    expect(result.total.calories).toBe(120);
    expect(result.total.protein).toBe(25);
    expect(result.total.carbs).toBe(2);
    expect(result.total.fat).toBe(1.5);
    expect(result.matchedCount).toBe(1);
  });

  it("preserves authoritative calories rather than recalculating with Atwater", () => {
    // Some protein bars have 200 kcal labeled with 20P, 20C, 5F (Atwater 20*4 + 20*4 + 5*9 = 205 kcal)
    // The recipe engine must preserve authoritative label calories.
    const customFood = {
      id: "food-bar",
      name: "Protein Bar",
      caloriesPer100g: 350,
      proteinPer100g: 30,
      carbsPer100g: 40,
      fatPer100g: 10,
      fiberPer100g: 5,
    };

    const ingredients: IngredientForCalculation[] = [
      {
        rawName: "Protein Bar",
        quantity: 100,
        unit: "g",
        food: customFood,
      },
    ];

    const result = calculateRecipeNutrition(ingredients, 1);
    expect(result.total.calories).toBe(350);
  });

  it("safely handles 0, negative, or invalid serving numbers without NaN", () => {
    const ingredients: IngredientForCalculation[] = [
      {
        rawName: "Chicken Breast",
        quantity: 500,
        unit: "g",
        food: chickenBreast,
      },
    ];

    const resultZero = calculateRecipeNutrition(ingredients, 0);
    const resultNeg = calculateRecipeNutrition(ingredients, -5);
    const resultNaN = calculateRecipeNutrition(ingredients, NaN);

    expect(Number.isFinite(resultZero.perServing.calories)).toBe(true);
    expect(Number.isFinite(resultNeg.perServing.calories)).toBe(true);
    expect(Number.isFinite(resultNaN.perServing.calories)).toBe(true);
    expect(resultZero.perServing.calories).toBeGreaterThan(0);
  });
});
