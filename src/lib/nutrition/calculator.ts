import { convertToGrams } from "./units";
import {
  toNutrients,
  scaleNutrients,
  sumNutrients,
  roundNutrients,
  nutrientsForGrams,
  ZERO_NUTRIENTS,
  type Nutrients,
} from "./core";

export type MacroNutrients = Nutrients;

export interface IngredientForCalculation {
  id?: string;
  rawName: string;
  quantity: number;
  unit: string;
  notes?: string | null;
  foodId?: string | null;
  sortOrder?: number;
  grams?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  totalSugars?: number | null;
  addedSugars?: number | null;
  saturatedFat?: number | null;
  transFat?: number | null;
  sodium?: number | null;
  food?: {
    id: string;
    name: string;
    brand?: string | null;
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
    defaultUnit?: string | null;
    servingWeightGrams?: number | null;
  } | null;
}

export interface CalculatedRecipeNutrition {
  total: Nutrients;
  perServing: Nutrients;
  per100g: Nutrients | null;
  totalWeightGrams: number;
  matchedCount: number;
  totalIngredients: number;
  resolvedIngredients: Array<IngredientForCalculation & Nutrients & { computedGrams: number }>;
}

/**
 * Calculates total, per-serving, and optional per-100g nutrition for a recipe.
 * Uses the authoritative core nutrition utilities without inline Atwater re-estimations.
 */
export function calculateRecipeNutrition(
  ingredients: IngredientForCalculation[],
  servings: number = 4,
  yieldWeightGrams?: number | null
): CalculatedRecipeNutrition {
  const safeServings = typeof servings === "number" && Number.isFinite(servings) && servings > 0 ? servings : 1;
  const safeYieldGrams =
    typeof yieldWeightGrams === "number" && Number.isFinite(yieldWeightGrams) && yieldWeightGrams > 0
      ? yieldWeightGrams
      : null;

  let totalWeightGrams = 0;
  let matchedCount = 0;
  const resolvedList: Array<IngredientForCalculation & Nutrients & { computedGrams: number }> = [];
  const nutrientsList: Nutrients[] = [];

  for (const item of ingredients) {
    const qty = typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0;
    const unit = item.unit || "g";
    
    // Determine ingredient grams
    const computedGrams = convertToGrams(
      qty,
      unit,
      item.food?.servingWeightGrams ?? (item.grams && qty > 0 ? item.grams / qty : null),
      item.food?.defaultUnit
    );
    totalWeightGrams += computedGrams;

    let itemNutrients: Nutrients;
    if (item.food) {
      matchedCount++;
      itemNutrients = nutrientsForGrams(item.food, computedGrams);
    } else if (item.calories !== null && item.calories !== undefined) {
      // Use existing snapshot if source food is unlinked or deleted
      matchedCount++;
      itemNutrients = toNutrients(item);
    } else {
      itemNutrients = { ...ZERO_NUTRIENTS };
    }

    const roundedItem = roundNutrients(itemNutrients);
    nutrientsList.push(itemNutrients);

    resolvedList.push({
      ...item,
      quantity: qty,
      unit,
      computedGrams: Math.round(computedGrams * 10) / 10,
      grams: Math.round(computedGrams * 10) / 10,
      ...roundedItem,
    });
  }

  const rawTotal = sumNutrients(nutrientsList);
  const total = roundNutrients(rawTotal);
  const perServing = roundNutrients(scaleNutrients(rawTotal, 1 / safeServings));
  const per100g = safeYieldGrams ? roundNutrients(scaleNutrients(rawTotal, 100 / safeYieldGrams)) : null;

  return {
    total,
    perServing,
    per100g,
    totalWeightGrams: Math.round(totalWeightGrams * 10) / 10,
    matchedCount,
    totalIngredients: ingredients.length,
    resolvedIngredients: resolvedList,
  };
}

/**
 * Scales ingredient quantities from base servings to target servings
 */
export function scaleIngredients(
  ingredients: Array<{
    id?: string;
    rawName: string;
    quantity: number;
    unit: string;
    notes?: string | null;
    foodId?: string | null;
  }>,
  baseServings: number,
  targetServings: number
) {
  const factor = targetServings / (baseServings > 0 ? baseServings : 1);
  return ingredients.map((ing) => {
    const scaledQty = Math.round(ing.quantity * factor * 100) / 100;
    return {
      ...ing,
      quantity: scaledQty,
    };
  });
}
