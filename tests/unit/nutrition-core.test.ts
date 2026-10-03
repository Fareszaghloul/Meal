import { describe, expect, it } from "vitest";
import {
  caloriesFromMacros,
  nutrientsForGrams,
  perServingToPer100g,
  round,
  roundNutrients,
  scaleNutrients,
  sumNutrients,
  toNutrients,
  ZERO_NUTRIENTS,
} from "@/lib/nutrition/core";

const chicken = { caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0, sodiumPer100g: 74 };

describe("round", () => {
  it("rounds half up without float traps", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(2.675, 2)).toBe(2.68);
    expect(round(0.1 + 0.2, 1)).toBe(0.3);
    expect(round(164.99999999, 0)).toBe(165);
  });
});

describe("serving multiplication", () => {
  it("scales per-100g values to grams exactly", () => {
    const n = roundNutrients(nutrientsForGrams(chicken, 200));
    expect(n).toMatchObject({ calories: 330, protein: 62, carbs: 0, fat: 7.2, sodium: 148 });
  });

  it("handles fractional quantities", () => {
    const n = roundNutrients(nutrientsForGrams(chicken, 33));
    expect(n.calories).toBe(54); // 54.45
    expect(n.protein).toBe(10.2); // 10.23
    expect(n.fat).toBe(1.2); // 1.188
  });

  it("keeps optional nutrients null when the source had none", () => {
    const n = scaleNutrients(toNutrients({ calories: 100, protein: 10 }), 2);
    expect(n.calories).toBe(200);
    expect(n.totalSugars).toBeNull();
    expect(n.sodium).toBeNull();
  });

  it("changing quantity is a pure ratio (200g → 150g)", () => {
    const at200 = nutrientsForGrams(chicken, 200);
    const at150 = roundNutrients(scaleNutrients(at200, 150 / 200));
    expect(at150).toEqual(roundNutrients(nutrientsForGrams(chicken, 150)));
  });

  it("treats negative or NaN factors as zero", () => {
    expect(scaleNutrients(toNutrients(chicken as never), NaN).calories).toBe(0);
    expect(scaleNutrients(toNutrients({ calories: 10 }), -1).calories).toBe(0);
  });
});

describe("totals", () => {
  it("sums meals into a day and rounds once at the end", () => {
    const items = [
      toNutrients({ calories: 100.3, protein: 10.04, carbs: 5.55, fat: 1.11, fiber: 0.5, sodium: 10 }),
      toNutrients({ calories: 200.3, protein: 20.04, carbs: 5.55, fat: 1.11, fiber: 0.5 }),
      toNutrients({ calories: 50.5, protein: 0, carbs: 12, fat: 0, fiber: 0 }),
    ];
    const t = roundNutrients(sumNutrients(items));
    expect(t.calories).toBe(351); // 351.1
    expect(t.protein).toBe(30.1); // 30.08
    expect(t.carbs).toBe(23.1);
    expect(t.fat).toBe(2.2);
    expect(t.fiber).toBe(1);
    expect(t.sodium).toBe(10); // only one item supplied sodium -> not null
    expect(t.totalSugars).toBeNull();
  });

  it("an empty day is all zeros", () => {
    expect(roundNutrients(sumNutrients([]))).toEqual(ZERO_NUTRIENTS);
  });
});

describe("label conversions", () => {
  it("converts per-serving label values to per-100g", () => {
    const bar = toNutrients({ calories: 210, protein: 20, carbs: 22, fat: 7, fiber: 3 });
    const per100 = roundNutrients(perServingToPer100g(bar, 60));
    expect(per100.calories).toBe(350);
    expect(per100.protein).toBe(33.3);
  });

  it("does not overwrite label calories with the Atwater estimate", () => {
    // 4/4/9 gives 172.4 for chicken; the label says 165 and must be kept.
    const n = nutrientsForGrams(chicken, 100);
    expect(n.calories).toBe(165);
    expect(round(caloriesFromMacros(n), 1)).toBe(156.4);
  });

  it("coerces strings and ignores garbage", () => {
    const n = toNutrients({ calories: "165", protein: "31.0", carbs: "", fat: "abc", sodium: "" });
    expect(n).toMatchObject({ calories: 165, protein: 31, carbs: 0, fat: 0, sodium: null });
  });
});
