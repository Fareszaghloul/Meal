import { describe, expect, it } from "vitest";
import { defaultServing, portionToEntry, servingOptions } from "@/lib/nutrition/servings";
import { nutrientsForGrams, roundNutrients } from "@/lib/nutrition/core";
import { servingRows } from "@/lib/services/servings";

const egg = {
  servings: [
    { id: "s1", label: "1 large egg (50 g)", grams: 50, isDefault: true, sortOrder: 0 },
    { id: "s2", label: "1 medium egg (44 g)", grams: 44, isDefault: false, sortOrder: 1 },
  ],
  servingSize: 1,
  servingUnit: "egg",
  servingWeightGrams: 50,
  defaultUnit: "g",
  caloriesPer100g: 143,
  proteinPer100g: 12.6,
  carbsPer100g: 0.7,
  fatPer100g: 9.5,
  fiberPer100g: 0,
};

describe("serving options", () => {
  it("lists named servings (default first) and always ends with grams", () => {
    const opts = servingOptions(egg);
    expect(opts.map((o) => o.id)).toEqual(["s1", "s2", "g"]);
    expect(opts[2].grams).toBe(1);
  });

  it("falls back to the legacy single serving when a food has no serving rows", () => {
    const opts = servingOptions({ servings: [], servingSize: 1, servingUnit: "bar", servingWeightGrams: 60, defaultUnit: "g" });
    expect(opts[0]).toMatchObject({ label: "1 bar", grams: 60 });
    const plain = servingOptions({ servings: [], servingSize: 100, servingUnit: "g", servingWeightGrams: 100, defaultUnit: "g" });
    expect(plain).toHaveLength(1);
    expect(defaultServing({ servings: [], servingSize: 100, servingUnit: "g", servingWeightGrams: 100, defaultUnit: "g" }).quantity).toBe(100);
  });

  it("2 large eggs → 100 g and the right macros; entry stores quantity + unit", () => {
    const { option } = defaultServing(egg);
    const p = portionToEntry(option, 2);
    expect(p).toEqual({ servings: 2, servingUnit: "large egg", grams: 100 });
    expect(roundNutrients(nutrientsForGrams(egg, p.grams))).toMatchObject({ calories: 143, protein: 12.6, fat: 9.5 });
  });

  it("grams option stores grams directly", () => {
    const g = servingOptions(egg).find((o) => o.id === "g")!;
    expect(portionToEntry(g, 75)).toEqual({ servings: 75, servingUnit: "g", grams: 75 });
  });
});

describe("servingRows (server)", () => {
  it("derives one label serving from legacy fields when none are sent", () => {
    expect(servingRows(null, { servingSize: 1, servingUnit: "scoop", servingWeightGrams: 30 })).toEqual([{ label: "1 scoop", grams: 30, isDefault: true, sortOrder: 0 }]);
    expect(servingRows(null, { servingSize: 100, servingUnit: "g", servingWeightGrams: 100 })).toEqual([]);
  });
  it("marks the first as default when none is flagged", () => {
    const rows = servingRows(
      [
        { label: "1 cup", grams: 240, isDefault: false },
        { label: "1 tbsp", grams: 15, isDefault: false },
      ],
      { servingSize: 1, servingUnit: "cup", servingWeightGrams: 240 }
    );
    expect(rows.map((r) => r.isDefault)).toEqual([true, false]);
  });
});
