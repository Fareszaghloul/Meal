import { describe, expect, it } from "vitest";
import {
  normalizeFoodName,
  normalizeBrand,
  findDuplicateCandidates,
} from "@/lib/nutrition/duplicate-detector";
import {
  caloriesFromMacros,
  nutrientsForGrams,
  roundNutrients,
  toNutrients,
} from "@/lib/nutrition/core";
import type { FoodSummary } from "@/lib/domain";

describe("Food Library Normalization & Duplicate Detection", () => {
  it("normalizes food names without stripping semantic tokens", () => {
    expect(normalizeFoodName("Chicken Breast")).toBe("chicken breast");
    expect(normalizeFoodName("  Chicken    Breast   ")).toBe("chicken breast");
    expect(normalizeFoodName("Chicken-Breast (Raw)")).toBe("chicken breast raw");
    expect(normalizeFoodName("Coca-Cola Zero Sugar")).toBe("coca cola zero sugar");
    expect(normalizeFoodName("")).toBe("");
  });

  it("normalizes brand strings consistently", () => {
    expect(normalizeBrand("Fage")).toBe("fage");
    expect(normalizeBrand("  Chobani  LLC  ")).toBe("chobani llc");
    expect(normalizeBrand(null)).toBe("");
    expect(normalizeBrand(undefined)).toBe("");
  });

  const mockFoods: FoodSummary[] = [
    {
      id: "food-1",
      name: "Chicken Breast",
      brand: null,
      category: "Meat",
      defaultUnit: "g",
      servingSize: 100,
      servingUnit: "g",
      servingWeightGrams: 100,
      caloriesPer100g: 165,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
      fiberPer100g: 0,
      totalSugarsPer100g: 0,
      addedSugarsPer100g: null,
      saturatedFatPer100g: 1,
      transFatPer100g: null,
      sodiumPer100g: 74,
      barcode: null,
      source: "MANUAL",
      isFavorite: true,
      lastUsedAt: "2026-10-01",
      useCount: 15,
      userId: "user-1",
      servings: [],
    },
    {
      id: "food-2",
      name: "Greek Yogurt 0%",
      brand: "Fage",
      category: "Dairy",
      defaultUnit: "g",
      servingSize: 170,
      servingUnit: "container",
      servingWeightGrams: 170,
      caloriesPer100g: 54,
      proteinPer100g: 10.3,
      carbsPer100g: 3,
      fatPer100g: 0,
      fiberPer100g: 0,
      totalSugarsPer100g: 3,
      addedSugarsPer100g: 0,
      saturatedFatPer100g: 0,
      transFatPer100g: 0,
      sodiumPer100g: 38,
      barcode: "0123456789",
      source: "MANUAL",
      isFavorite: false,
      lastUsedAt: null,
      useCount: 2,
      userId: null, // library
      servings: [{ id: "serv-1", label: "1 container", grams: 170, isDefault: true, sortOrder: 0 }],
    },
  ];

  it("detects exact duplicate name matches with high confidence", () => {
    const candidates = findDuplicateCandidates(
      { name: "chicken breast" },
      mockFoods
    );
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].food.id).toBe("food-1");
    expect(candidates[0].confidence).toBe("high");
  });

  it("detects exact duplicate with matching brand", () => {
    const candidates = findDuplicateCandidates(
      { name: "Greek Yogurt 0%", brand: "Fage" },
      mockFoods
    );
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].food.id).toBe("food-2");
    expect(candidates[0].confidence).toBe("high");
  });

  it("distinguishes same name from different brand with medium confidence", () => {
    const candidates = findDuplicateCandidates(
      { name: "Greek Yogurt 0%", brand: "Chobani" },
      mockFoods
    );
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].food.id).toBe("food-2");
    expect(candidates[0].confidence).toBe("medium");
  });

  it("ignores excluded ID during editing", () => {
    const candidates = findDuplicateCandidates(
      { name: "Chicken Breast" },
      mockFoods,
      "food-1"
    );
    expect(candidates.length).toBe(0);
  });
});

describe("Calorie Authority & Zero-Value Nutrients", () => {
  it("preserves label calories without overriding by 4P + 4C + 9F", () => {
    // 31P * 4 + 0C * 4 + 3.6F * 9 = 124 + 32.4 = 156.4 kcal, but label says 165
    const labelCalories = 165;
    const computedAtwater = caloriesFromMacros({ protein: 31, carbs: 0, fat: 3.6 });
    expect(computedAtwater).not.toBe(labelCalories);

    const nutrients = toNutrients({
      calories: labelCalories,
      protein: 31,
      carbs: 0,
      fat: 3.6,
    });
    expect(nutrients.calories).toBe(165);
  });

  it("correctly preserves explicit 0 values without converting to null", () => {
    const nutrients = toNutrients({
      calories: 100,
      protein: 20,
      carbs: 0,
      fat: 0,
      fiber: 0,
      totalSugars: 0,
      sodium: 0,
    });
    expect(nutrients.carbs).toBe(0);
    expect(nutrients.fat).toBe(0);
    expect(nutrients.fiber).toBe(0);
    expect(nutrients.totalSugars).toBe(0);
    expect(nutrients.sodium).toBe(0);
  });

  it("preserves null for omitted micronutrients", () => {
    const nutrients = toNutrients({
      calories: 100,
      protein: 20,
      carbs: 5,
      fat: 2,
      totalSugars: null,
      addedSugars: undefined,
    });
    expect(nutrients.totalSugars).toBeNull();
    expect(nutrients.addedSugars).toBeNull();
  });

  it("scales servings deterministically without precision drift", () => {
    const food: FoodSummary = {
      id: "food-chicken",
      name: "Chicken Breast",
      brand: null,
      category: "Meat",
      defaultUnit: "g",
      servingSize: 100,
      servingUnit: "g",
      servingWeightGrams: 100,
      caloriesPer100g: 165,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
      fiberPer100g: 0,
      totalSugarsPer100g: null,
      addedSugarsPer100g: null,
      saturatedFatPer100g: null,
      transFatPer100g: null,
      sodiumPer100g: 74,
      barcode: null,
      source: "MANUAL",
      isFavorite: false,
      lastUsedAt: null,
      useCount: 0,
      userId: "user-1",
      servings: [],
    };

    // 150g should be exactly 1.5x
    const n150 = roundNutrients(nutrientsForGrams(food, 150));
    expect(n150.calories).toBe(248);
    expect(n150.protein).toBe(46.5);
    expect(n150.carbs).toBe(0);
    expect(n150.fat).toBe(5.4);
    expect(n150.sodium).toBe(111);
  });
});
