import { describe, expect, it } from "vitest";
import { exportFile, mealItemInput, mealItemPatch, waterInput, weightInput } from "@/lib/validation";
import { rankMatches } from "@/lib/client/catalog";

describe("meal item validation", () => {
  const base = { date: "2026-10-03", mealCategory: "lunch", name: "Chicken", servings: 150, servingUnit: "g", calories: 248 };

  it("accepts numeric strings from forms and defaults optional nutrients", () => {
    const r = mealItemInput.parse({ ...base, servings: "150", protein: "46.5", sodium: "" });
    expect(r.servings).toBe(150);
    expect(r.protein).toBe(46.5);
    expect(r.carbs).toBe(0);
    expect(r.sodium).toBeNull();
  });

  it("rejects invalid dates, categories, blank names, zero or negative quantities", () => {
    expect(() => mealItemInput.parse({ ...base, date: "2026-02-30" })).toThrow();
    expect(() => mealItemInput.parse({ ...base, mealCategory: "brunch" })).toThrow();
    expect(() => mealItemInput.parse({ ...base, name: "   " })).toThrow();
    expect(() => mealItemInput.parse({ ...base, servings: 0 })).toThrow();
    expect(() => mealItemInput.parse({ ...base, calories: -5 })).toThrow();
    expect(() => mealItemInput.parse({ ...base, calories: "abc" })).toThrow();
  });

  it("patch requires at least one field", () => {
    expect(() => mealItemPatch.parse({})).toThrow();
    expect(mealItemPatch.parse({ servings: "2" })).toEqual({ servings: 2 });
  });

  it("water and weight inputs", () => {
    expect(waterInput.parse({ date: "2026-10-03", amountMl: "250" }).amountMl).toBe(250);
    expect(() => waterInput.parse({ date: "2026-10-03", amountMl: 0 })).toThrow();
    expect(weightInput.parse({ date: "2026-10-03", weightKg: "79.4" }).entryType).toBe("daily");
    expect(() => weightInput.parse({ date: "2026-10-03", weightKg: 0 })).toThrow();
    expect(() => weightInput.parse({ date: "2026-10-03", weightKg: 80, time: "8:30" })).toThrow();
  });

  it("export file rejects foreign files and keeps known tables", () => {
    expect(() => exportFile.parse({ app: "other", version: 1 })).toThrow();
    const ok = exportFile.parse({ app: "mealprep", version: 1, exportedAt: "x", entries: [{ ...base }] });
    expect(ok.entries).toHaveLength(1);
    expect(ok.foods).toEqual([]);
  });
});

describe("food search ranking", () => {
  const foods = ["Brown rice", "Rice cakes", "Chicken and rice bowl", "Pricey cheese", "Oats"].map((name) => ({ name }));
  it("prefix beats word-start beats substring; non-matches are dropped", () => {
    expect(rankMatches(foods, "rice", (f) => f.name).map((f) => f.name)).toEqual(["Rice cakes", "Brown rice", "Chicken and rice bowl", "Pricey cheese"]);
    expect(rankMatches(foods, "RICE CAK", (f) => f.name).map((f) => f.name)).toEqual(["Rice cakes"]);
    expect(rankMatches(foods, "", (f) => f.name)).toHaveLength(5);
  });
  it("matches all words in any order", () => {
    expect(rankMatches(foods, "bowl chicken", (f) => f.name).map((f) => f.name)).toEqual(["Chicken and rice bowl"]);
  });
});
