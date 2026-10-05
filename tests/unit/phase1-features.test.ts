import { describe, expect, it } from "vitest";
import {
  accountPatch,
  mealItemPatch,
  mealItemPatchWithId,
  addMealInput,
  updateMealInput,
  copyEntriesInput,
  savedMealInput,
  savedMealItemInput,
  logSavedMealInput,
} from "@/lib/validation";
import { scaleNutrients, roundNutrients } from "@/lib/nutrition/core";
import { toSavedMeal } from "@/lib/services/saved-meals";

describe("Phase 1: Profile Name Editing Validation", () => {
  it("accepts valid display name and trims whitespace", () => {
    const parsed = accountPatch.parse({ displayName: "  Jane Doe  " });
    expect(parsed.displayName).toBe("Jane Doe");
  });

  it("rejects empty or excessively long names", () => {
    expect(() => accountPatch.parse({ displayName: "" })).toThrow();
    expect(() => accountPatch.parse({ displayName: "   " })).toThrow();
    expect(() => accountPatch.parse({ displayName: "a".repeat(101) })).toThrow();
  });
});

describe("Phase 1: Food Log Entry Editing & Calculation", () => {
  it("validates food log patch input and non-negative nutrients", () => {
    const valid = mealItemPatch.parse({
      servings: 2,
      servingUnit: "cups",
      calories: 300,
      protein: 25,
      carbs: 30,
      fat: 10,
      sodium: null,
    });
    expect(valid.servings).toBe(2);
    expect(valid.sodium).toBeNull();

    // Rejects negative calories or macros
    expect(() => mealItemPatch.parse({ calories: -10 })).toThrow();
    expect(() => mealItemPatch.parse({ protein: -1 })).toThrow();
    expect(() => mealItemPatch.parse({ servings: 0 })).toThrow();
  });

  it("validates mealItemPatchWithId requires id", () => {
    expect(() => mealItemPatchWithId.parse({ servings: 1.5 })).toThrow();
    const ok = mealItemPatchWithId.parse({ id: "entry-123", servings: 1.5 });
    expect(ok.id).toBe("entry-123");
    expect(ok.servings).toBe(1.5);
  });

  it("correctly scales nutrition when portion changes without negative or NaN", () => {
    const initialNutrients = {
      calories: 200,
      protein: 20,
      carbs: 10,
      fat: 5,
      fiber: 2,
      totalSugars: 4,
      addedSugars: null,
      saturatedFat: 1,
      transFat: null,
      sodium: 150,
    };

    // Changing 200g to 150g (factor 0.75)
    const factor = 150 / 200;
    const scaled = roundNutrients(scaleNutrients(initialNutrients, factor));

    expect(scaled.calories).toBe(150);
    expect(scaled.protein).toBe(15);
    expect(scaled.carbs).toBe(7.5);
    expect(scaled.fat).toBe(3.8);
    expect(scaled.fiber).toBe(1.5);
    expect(scaled.totalSugars).toBe(3);
    expect(scaled.addedSugars).toBeNull();
    expect(scaled.saturatedFat).toBe(0.8);
    expect(scaled.transFat).toBeNull();
    expect(scaled.sodium).toBe(113);
  });

  it("handles zero nutrient values properly during scaling", () => {
    const zeroFatNutrients = {
      calories: 100,
      protein: 25,
      carbs: 0,
      fat: 0,
      fiber: 0,
      totalSugars: null,
      addedSugars: null,
      saturatedFat: null,
      transFat: null,
      sodium: 50,
    };

    const scaled = roundNutrients(scaleNutrients(zeroFatNutrients, 2));
    expect(scaled.calories).toBe(200);
    expect(scaled.protein).toBe(50);
    expect(scaled.carbs).toBe(0);
    expect(scaled.fat).toBe(0);
    expect(scaled.fiber).toBe(0);
    expect(scaled.sodium).toBe(100);
  });
});

describe("Phase 1: Meal Planner Custom Meals & Editing", () => {
  it("validates addMealInput for custom meal with name and macros", () => {
    const custom = addMealInput.parse({
      dayOfWeek: "monday",
      mealCategory: "lunch",
      customName: "Greek yogurt bowl",
      servings: 1,
      calories: 420,
      protein: 38,
      carbs: 45,
      fat: 10,
      fiber: 5,
    });
    expect(custom.customName).toBe("Greek yogurt bowl");
    expect(custom.calories).toBe(420);
    expect(custom.protein).toBe(38);
    expect(custom.fiber).toBe(5);
  });

  it("defaults custom meal nutrition to 0 when omitted", () => {
    const custom = addMealInput.parse({
      dayOfWeek: "tuesday",
      mealCategory: "dinner",
      customName: "Dinner outside",
    });
    expect(custom.calories).toBe(0);
    expect(custom.protein).toBe(0);
    expect(custom.carbs).toBe(0);
    expect(custom.fat).toBe(0);
    expect(custom.fiber).toBeNull();
  });

  it("rejects meal with neither recipeId nor customName", () => {
    expect(() =>
      addMealInput.parse({
        dayOfWeek: "wednesday",
        mealCategory: "dinner",
      })
    ).toThrow();
  });

  it("validates updateMealInput status transitions", () => {
    const planned = updateMealInput.parse({ mealId: "meal-1", status: "planned" });
    expect(planned.status).toBe("planned");

    const logged = updateMealInput.parse({ mealId: "meal-1", status: "logged" });
    expect(logged.status).toBe("logged");

    const skipped = updateMealInput.parse({ mealId: "meal-1", status: "skipped" });
    expect(skipped.status).toBe("skipped");

    const completed = updateMealInput.parse({ mealId: "meal-1", status: "completed" });
    expect(completed.status).toBe("completed");

    expect(() => updateMealInput.parse({ mealId: "meal-1", status: "unknown" as any })).toThrow();
  });

  it("scales custom meal macros proportionally when servings change", () => {
    const initialMeal = {
      servings: 1,
      calories: 500,
      protein: 40,
      carbs: 60,
      fat: 10,
      fiber: 6,
    };

    const newServings = 1.5;
    const factor = newServings / initialMeal.servings;
    const scaledCalories = Math.round(initialMeal.calories * factor);
    const scaledProtein = Math.round(initialMeal.protein * factor * 10) / 10;
    const scaledCarbs = Math.round(initialMeal.carbs * factor * 10) / 10;
    const scaledFat = Math.round(initialMeal.fat * factor * 10) / 10;
    const scaledFiber = Math.round(initialMeal.fiber * factor * 10) / 10;

    expect(scaledCalories).toBe(750);
    expect(scaledProtein).toBe(60);
    expect(scaledCarbs).toBe(90);
    expect(scaledFat).toBe(15);
    expect(scaledFiber).toBe(9);
  });
});

describe("Phase 1: Repeat / Copy Food Logging", () => {
  it("validates copyEntriesInput", () => {
    const ok = copyEntriesInput.parse({
      fromDate: "2026-10-01",
      toDate: "2026-10-02",
      fromMealCategory: "breakfast",
      toMealCategory: "breakfast",
    });
    expect(ok.fromDate).toBe("2026-10-01");
    expect(ok.toDate).toBe("2026-10-02");

    // Invalid dates
    expect(() =>
      copyEntriesInput.parse({
        fromDate: "invalid",
        toDate: "2026-10-02",
      })
    ).toThrow();
  });

  it("validates copyEntriesInput allows entryIds array", () => {
    const withIds = copyEntriesInput.parse({
      fromDate: "2026-10-01",
      toDate: "2026-10-02",
      entryIds: ["entry-1", "entry-2"],
    });
    expect(withIds.entryIds).toEqual(["entry-1", "entry-2"]);
  });
});

describe("Phase 1: Saved Meals", () => {
  it("validates individual savedMealItemInput defaults and constraints", () => {
    const item = savedMealItemInput.parse({
      name: "Oatmeal",
      quantity: 1,
      calories: 150,
      protein: 5,
      carbs: 27,
      fat: 3,
    });
    expect(item.name).toBe("Oatmeal");
    expect(item.servingUnit).toBe("serving");
    expect(item.sortOrder).toBe(0);
    expect(() => savedMealItemInput.parse({ quantity: -1 })).toThrow();
  });

  it("validates savedMealInput with items and macros", () => {
    const valid = savedMealInput.parse({
      name: "Usual Breakfast",
      mealCategory: "breakfast",
      items: [
        {
          name: "3 Whole Eggs",
          quantity: 3,
          servingUnit: "large",
          calories: 215,
          protein: 18.9,
          carbs: 1.2,
          fat: 15,
          sortOrder: 0,
        },
        {
          name: "Whole Wheat Toast",
          quantity: 2,
          servingUnit: "slice",
          calories: 160,
          protein: 8,
          carbs: 26,
          fat: 2,
          fiber: 4,
          sortOrder: 1,
        },
        {
          name: "Whole Milk",
          quantity: 250,
          servingUnit: "ml",
          calories: 150,
          protein: 8,
          carbs: 12,
          fat: 8,
          sortOrder: 2,
        },
      ],
    });

    expect(valid.name).toBe("Usual Breakfast");
    expect(valid.items).toHaveLength(3);
    expect(valid.items[0].calories).toBe(215);
    expect(valid.items[1].fiber).toBe(4);
  });

  it("rejects savedMealInput without name or without items", () => {
    expect(() =>
      savedMealInput.parse({
        name: "",
        items: [{ quantity: 1, calories: 100, protein: 10, carbs: 10, fat: 2 }],
      })
    ).toThrow();

    expect(() =>
      savedMealInput.parse({
        name: "Empty meal",
        items: [],
      })
    ).toThrow();
  });

  it("validates logSavedMealInput requires date and meal category", () => {
    const valid = logSavedMealInput.parse({
      date: "2026-10-04",
      mealCategory: "breakfast",
    });
    expect(valid.date).toBe("2026-10-04");
    expect(valid.mealCategory).toBe("breakfast");

    expect(() => logSavedMealInput.parse({ date: "2026-10-04" })).toThrow();
  });

  it("toSavedMeal maps database rows and computes display names and roundings", () => {
    const row = {
      id: "saved-1",
      name: "Post Workout",
      mealCategory: "snack",
      useCount: 5,
      createdAt: new Date("2026-10-01T10:00:00Z"),
      updatedAt: new Date("2026-10-02T10:00:00Z"),
      items: [
        {
          id: "item-1",
          savedMealId: "saved-1",
          foodId: null,
          recipeId: null,
          customName: "Whey Protein Shake",
          quantity: 1,
          servingUnit: "scoop",
          calories: 120.4,
          protein: 24.2,
          carbs: 3.1,
          fat: 1.5,
          fiber: null,
          totalSugars: 1.1,
          addedSugars: null,
          saturatedFat: 0.5,
          transFat: null,
          sodium: 140.2,
          sortOrder: 0,
        },
        {
          id: "item-2",
          savedMealId: "saved-1",
          foodId: "food-banana",
          recipeId: null,
          customName: null,
          quantity: 1,
          servingUnit: "medium",
          calories: 105,
          protein: 1.3,
          carbs: 27,
          fat: 0.3,
          fiber: 3.1,
          totalSugars: 14.4,
          addedSugars: 0,
          saturatedFat: 0.1,
          transFat: null,
          sodium: 1.2,
          sortOrder: 1,
          food: { name: "Banana" },
        },
      ],
    };

    const saved = toSavedMeal(row);
    expect(saved.id).toBe("saved-1");
    expect(saved.name).toBe("Post Workout");
    expect(saved.items[0].name).toBe("Whey Protein Shake");
    expect(saved.items[0].calories).toBe(120);
    expect(saved.items[0].protein).toBe(24.2);
    expect(saved.items[1].name).toBe("Banana");
    expect(saved.items[1].fiber).toBe(3.1);
  });
});
