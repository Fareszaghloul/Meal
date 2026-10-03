/**
 * The one place nutrition arithmetic lives. UI and API code call these; nobody
 * multiplies macros inline. Values are kept at full precision internally and
 * rounded only at the edges (persisting / displaying) by `roundNutrients`.
 */

export const NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "totalSugars",
  "addedSugars",
  "saturatedFat",
  "transFat",
  "sodium",
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

/** Core macros are always numbers; the rest are null when the source had no value. */
export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  totalSugars: number | null;
  addedSugars: number | null;
  saturatedFat: number | null;
  transFat: number | null;
  sodium: number | null; // mg
}

export const ZERO_NUTRIENTS: Nutrients = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  totalSugars: null,
  addedSugars: null,
  saturatedFat: null,
  transFat: null,
  sodium: null,
};

/** Round to `decimals` places without the 1.005 → 1.00 float trap. */
export function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

function num(value: unknown): number {
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function optNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Coerce any loosely-typed object (DB row, request body) into Nutrients. Missing core macros become 0. */
export function toNutrients(source: Partial<Record<NutrientKey, unknown>>): Nutrients {
  return {
    calories: num(source.calories),
    protein: num(source.protein),
    carbs: num(source.carbs),
    fat: num(source.fat),
    fiber: num(source.fiber),
    totalSugars: optNum(source.totalSugars),
    addedSugars: optNum(source.addedSugars),
    saturatedFat: optNum(source.saturatedFat),
    transFat: optNum(source.transFat),
    sodium: optNum(source.sodium),
  };
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const f = Number.isFinite(factor) && factor >= 0 ? factor : 0;
  const opt = (v: number | null) => (v === null ? null : v * f);
  return {
    calories: n.calories * f,
    protein: n.protein * f,
    carbs: n.carbs * f,
    fat: n.fat * f,
    fiber: n.fiber * f,
    totalSugars: opt(n.totalSugars),
    addedSugars: opt(n.addedSugars),
    saturatedFat: opt(n.saturatedFat),
    transFat: opt(n.transFat),
    sodium: opt(n.sodium),
  };
}

/** Sum a list. Optional nutrients stay null only if no item supplied them. */
export function sumNutrients(items: Nutrients[]): Nutrients {
  const total: Nutrients = { ...ZERO_NUTRIENTS };
  for (const n of items) {
    total.calories += n.calories;
    total.protein += n.protein;
    total.carbs += n.carbs;
    total.fat += n.fat;
    total.fiber += n.fiber;
    for (const k of ["totalSugars", "addedSugars", "saturatedFat", "transFat", "sodium"] as const) {
      if (n[k] !== null) total[k] = (total[k] ?? 0) + (n[k] as number);
    }
  }
  return total;
}

/** Calories whole, sodium whole mg, everything else 1 decimal. */
export function roundNutrients(n: Nutrients): Nutrients {
  const r1 = (v: number | null) => (v === null ? null : round(v, 1));
  return {
    calories: round(n.calories, 0),
    protein: round(n.protein, 1),
    carbs: round(n.carbs, 1),
    fat: round(n.fat, 1),
    fiber: round(n.fiber, 1),
    totalSugars: r1(n.totalSugars),
    addedSugars: r1(n.addedSugars),
    saturatedFat: r1(n.saturatedFat),
    transFat: r1(n.transFat),
    sodium: n.sodium === null ? null : round(n.sodium, 0),
  };
}

/** Shape of the per-100g columns on the Food model. */
export interface FoodPer100g {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  totalSugarsPer100g?: number | null;
  addedSugarsPer100g?: number | null;
  saturatedFatPer100g?: number | null;
  transFatPer100g?: number | null;
  sodiumPer100g?: number | null;
}

export function nutrientsPer100g(food: FoodPer100g): Nutrients {
  return toNutrients({
    calories: food.caloriesPer100g,
    protein: food.proteinPer100g,
    carbs: food.carbsPer100g,
    fat: food.fatPer100g,
    fiber: food.fiberPer100g,
    totalSugars: food.totalSugarsPer100g,
    addedSugars: food.addedSugarsPer100g,
    saturatedFat: food.saturatedFatPer100g,
    transFat: food.transFatPer100g,
    sodium: food.sodiumPer100g,
  });
}

/** Nutrients in `grams` of a food, from its per-100g values. */
export function nutrientsForGrams(food: FoodPer100g, grams: number): Nutrients {
  return scaleNutrients(nutrientsPer100g(food), grams / 100);
}

/** Convert a "per serving" set of label values to per-100g given the serving weight. */
export function perServingToPer100g(perServing: Nutrients, servingWeightGrams: number): Nutrients {
  if (!(servingWeightGrams > 0)) return perServing;
  return scaleNutrients(perServing, 100 / servingWeightGrams);
}

/** Atwater estimate; used only to flag suspicious entries, never to overwrite a label. */
export function caloriesFromMacros(n: Pick<Nutrients, "protein" | "carbs" | "fat">): number {
  return n.protein * 4 + n.carbs * 4 + n.fat * 9;
}

export function percentOf(value: number, target: number | null | undefined): number {
  if (!target || target <= 0) return 0;
  return Math.max(0, (value / target) * 100);
}
