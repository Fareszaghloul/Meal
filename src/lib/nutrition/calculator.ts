import { convertToGrams } from "./units";

export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface IngredientForCalculation {
  rawName: string;
  quantity: number;
  unit: string;
  food?: {
    id: string;
    name: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
    fiberPer100g: number;
    defaultUnit?: string | null;
    servingWeightGrams?: number | null;
  } | null;
}

/**
 * Calculates total and per-serving nutrition for a recipe
 */
export function calculateRecipeNutrition(
  ingredients: IngredientForCalculation[],
  servings: number = 4
): {
  total: MacroNutrients;
  perServing: MacroNutrients;
  matchedCount: number;
  totalIngredients: number;
} {
  const safeServings = Math.max(1, servings);
  
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let matchedCount = 0;

  for (const item of ingredients) {
    if (item.food) {
      matchedCount++;
      const grams = convertToGrams(
        item.quantity,
        item.unit,
        item.food.servingWeightGrams,
        item.food.defaultUnit
      );
      
      const multiplier = grams / 100;
      totalCalories += (item.food.caloriesPer100g || 0) * multiplier;
      totalProtein += (item.food.proteinPer100g || 0) * multiplier;
      totalCarbs += (item.food.carbsPer100g || 0) * multiplier;
      totalFat += (item.food.fatPer100g || 0) * multiplier;
      totalFiber += (item.food.fiberPer100g || 0) * multiplier;
    }
  }

  const round = (val: number) => Math.round(val * 10) / 10;

  const total: MacroNutrients = {
    calories: Math.round(totalCalories),
    protein: round(totalProtein),
    carbs: round(totalCarbs),
    fat: round(totalFat),
    fiber: round(totalFiber),
  };

  const perServing: MacroNutrients = {
    calories: Math.round(totalCalories / safeServings),
    protein: round(totalProtein / safeServings),
    carbs: round(totalCarbs / safeServings),
    fat: round(totalFat / safeServings),
    fiber: round(totalFiber / safeServings),
  };

  return {
    total,
    perServing,
    matchedCount,
    totalIngredients: ingredients.length,
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
  const factor = targetServings / Math.max(1, baseServings);
  return ingredients.map((ing) => {
    const scaledQty = Math.round(ing.quantity * factor * 10) / 10;
    return {
      ...ing,
      quantity: scaledQty,
    };
  });
}
