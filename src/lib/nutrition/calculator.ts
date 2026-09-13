import { convertToGrams } from "./units";

export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  totalSugars?: number | null;
  addedSugars?: number | null;
  saturatedFat?: number | null;
  transFat?: number | null;
  sodium?: number | null;
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
    totalSugarsPer100g?: number | null;
    addedSugarsPer100g?: number | null;
    saturatedFatPer100g?: number | null;
    transFatPer100g?: number | null;
    sodiumPer100g?: number | null;
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

  let totalSugarsSum = 0;
  let hasTotalSugars = false;

  let addedSugarsSum = 0;
  let hasAddedSugars = false;

  let saturatedFatSum = 0;
  let hasSaturatedFat = false;

  let transFatSum = 0;
  let hasTransFat = false;

  let sodiumSum = 0;
  let hasSodium = false;

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

      if (item.food.totalSugarsPer100g !== null && item.food.totalSugarsPer100g !== undefined) {
        totalSugarsSum += item.food.totalSugarsPer100g * multiplier;
        hasTotalSugars = true;
      }
      if (item.food.addedSugarsPer100g !== null && item.food.addedSugarsPer100g !== undefined) {
        addedSugarsSum += item.food.addedSugarsPer100g * multiplier;
        hasAddedSugars = true;
      }
      if (item.food.saturatedFatPer100g !== null && item.food.saturatedFatPer100g !== undefined) {
        saturatedFatSum += item.food.saturatedFatPer100g * multiplier;
        hasSaturatedFat = true;
      }
      if (item.food.transFatPer100g !== null && item.food.transFatPer100g !== undefined) {
        transFatSum += item.food.transFatPer100g * multiplier;
        hasTransFat = true;
      }
      if (item.food.sodiumPer100g !== null && item.food.sodiumPer100g !== undefined) {
        sodiumSum += item.food.sodiumPer100g * multiplier;
        hasSodium = true;
      }
    }
  }

  const round = (val: number) => Math.round(val * 10) / 10;

  const total: MacroNutrients = {
    calories: Math.round(totalCalories),
    protein: round(totalProtein),
    carbs: round(totalCarbs),
    fat: round(totalFat),
    fiber: round(totalFiber),
    totalSugars: hasTotalSugars ? round(totalSugarsSum) : null,
    addedSugars: hasAddedSugars ? round(addedSugarsSum) : null,
    saturatedFat: hasSaturatedFat ? round(saturatedFatSum) : null,
    transFat: hasTransFat ? round(transFatSum) : null,
    sodium: hasSodium ? Math.round(sodiumSum) : null,
  };

  const perServing: MacroNutrients = {
    calories: Math.round(totalCalories / safeServings),
    protein: round(totalProtein / safeServings),
    carbs: round(totalCarbs / safeServings),
    fat: round(totalFat / safeServings),
    fiber: round(totalFiber / safeServings),
    totalSugars: hasTotalSugars ? round(totalSugarsSum / safeServings) : null,
    addedSugars: hasAddedSugars ? round(addedSugarsSum / safeServings) : null,
    saturatedFat: hasSaturatedFat ? round(saturatedFatSum / safeServings) : null,
    transFat: hasTransFat ? round(transFatSum / safeServings) : null,
    sodium: hasSodium ? Math.round(sodiumSum / safeServings) : null,
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
