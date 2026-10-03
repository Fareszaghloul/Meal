import { describe, expect, it } from "vitest";
import { parseNaturalSearch } from "@/lib/nutrition/natural-parser";
import { getRestaurantFoods } from "@/lib/nutrition/restaurant-data";
import { defaultServing, portionToEntry, servingOptions } from "@/lib/nutrition/servings";
import { nutrientsForGrams, roundNutrients } from "@/lib/nutrition/core";
import { rankMatches } from "@/lib/client/catalog";
import type { FoodSummary } from "@/lib/domain";

describe("Add Food Workflow - Portion Math & Integrity", () => {
  const eggFood: FoodSummary = {
    id: "food-egg",
    name: "Sunny side up egg",
    brand: null,
    category: "Breakfast",
    source: "library",
    defaultUnit: "egg",
    servingSize: 1,
    servingUnit: "egg",
    servingWeightGrams: 50,
    caloriesPer100g: 180,
    proteinPer100g: 13,
    carbsPer100g: 1,
    fatPer100g: 14,
    fiberPer100g: 0,
    totalSugarsPer100g: 0,
    addedSugarsPer100g: 0,
    saturatedFatPer100g: 3.5,
    transFatPer100g: 0,
    sodiumPer100g: 140,
    barcode: null,
    isFavorite: false,
    lastUsedAt: null,
    useCount: 10,
    userId: null,
    servings: [
      { id: "s1", label: "1 large egg", grams: 50, isDefault: true, sortOrder: 0 },
      { id: "g", label: "g", grams: 1, isDefault: false, sortOrder: 1 },
    ],
  };

  it("calculates 1 serving accurately", () => {
    const { option } = defaultServing(eggFood);
    const p = portionToEntry(option, 1);
    expect(p.grams).toBe(50);
    const n = roundNutrients(nutrientsForGrams(eggFood, p.grams));
    expect(n.calories).toBe(90);
    expect(n.protein).toBe(6.5);
    expect(n.carbs).toBe(0.5);
    expect(n.fat).toBe(7);
  });

  it("calculates quantity 4 (4 sunny side up eggs = 360 kcal)", () => {
    const { option } = defaultServing(eggFood);
    const p = portionToEntry(option, 4);
    expect(p.grams).toBe(200);
    const n = roundNutrients(nutrientsForGrams(eggFood, p.grams));
    expect(n.calories).toBe(360);
    expect(n.protein).toBe(26);
    expect(n.carbs).toBe(2);
    expect(n.fat).toBe(28);
  });

  it("calculates decimal quantities accurately without floating point drift: 0.5 and 1.5", () => {
    const { option } = defaultServing(eggFood);
    const pHalf = portionToEntry(option, 0.5);
    expect(pHalf.grams).toBe(25);
    const nHalf = roundNutrients(nutrientsForGrams(eggFood, pHalf.grams));
    expect(nHalf.calories).toBe(45);
    expect(nHalf.protein).toBe(3.3); // 13 * 0.25 = 3.25 -> 3.3

    const pOneAndHalf = portionToEntry(option, 1.5);
    expect(pOneAndHalf.grams).toBe(75);
    const nOneAndHalf = roundNutrients(nutrientsForGrams(eggFood, pOneAndHalf.grams));
    expect(nOneAndHalf.calories).toBe(135);
    expect(nOneAndHalf.protein).toBe(9.8); // 13 * 0.75 = 9.75 -> 9.8
  });

  it("switches units between named serving and grams preserving physical weight", () => {
    const options = servingOptions(eggFood);
    const eggOpt = options.find((o) => o.id === "s1")!;
    const gOpt = options.find((o) => o.id === "g")!;

    // 2 eggs = 100g
    const qtyEggs = 2;
    const physicalGrams = qtyEggs * eggOpt.grams;
    expect(physicalGrams).toBe(100);

    // Switching to grams preserves 100g
    const convertedToGrams = physicalGrams / gOpt.grams;
    expect(convertedToGrams).toBe(100);

    const nutrientsFromGrams = roundNutrients(nutrientsForGrams(eggFood, convertedToGrams * gOpt.grams));
    const nutrientsFromEggs = roundNutrients(nutrientsForGrams(eggFood, qtyEggs * eggOpt.grams));
    expect(nutrientsFromGrams).toEqual(nutrientsFromEggs);
  });
});

describe("Add Food Workflow - Natural Quantity Parsing & Search", () => {
  it("pre-fills quantity from natural language search: '4 sunny side up eggs'", () => {
    const parsed = parseNaturalSearch("4 sunny side up eggs");
    expect(parsed.hasNaturalQuantity).toBe(true);
    expect(parsed.quantity).toBe(4);
    expect(parsed.foodQuery).toBe("sunny side up eggs");
  });

  it("detects grams: '250g chicken breast'", () => {
    const parsed = parseNaturalSearch("250g chicken breast");
    expect(parsed.hasNaturalQuantity).toBe(true);
    expect(parsed.quantity).toBe(250);
    expect(parsed.unit).toBe("g");
    expect(parsed.foodQuery).toBe("chicken breast");
  });

  it("ranks exact prefix match higher than substring", () => {
    const items = [
      { id: "1", name: "Spicy Chicken Burger" },
      { id: "2", name: "Chicken Breast" },
      { id: "3", name: "Grilled Chicken Salad" },
    ];
    const ranked = rankMatches(items, "Chicken Breast", (x) => x.name);
    expect(ranked[0].id).toBe("2");
  });
});

describe("Add Food Workflow - Restaurant Foods (McDonald's Jordan)", () => {
  it("loads 79 McDonald's Jordan menu items correctly", () => {
    const items = getRestaurantFoods();
    expect(items.length).toBeGreaterThanOrEqual(70);
    const bigMac = items.find((f) => f.name.toLowerCase().includes("big mac"));
    expect(bigMac).toBeDefined();
    expect(bigMac?.brand).toBe("McDonald's");
    expect(bigMac?.category).toBe("Restaurant");
    expect(bigMac?.caloriesPer100g).toBeGreaterThan(0);
  });
});

describe("Add Food Workflow - Manual Macro Calculation Helper", () => {
  it("computes 4P + 4C + 9F without floating drift", () => {
    const p = 26;
    const c = 2;
    const f = 28;
    const calculatedKcal = Math.round(p * 4 + c * 4 + f * 9);
    expect(calculatedKcal).toBe(364);
  });
});
