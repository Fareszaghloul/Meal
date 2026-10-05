import { COMMON_UNITS, normalizeUnit } from "../nutrition/units";

export interface RecipeIngredientMatch {
  id: string;
  rawName: string;
  foodId?: string | null;
  food?: { name: string } | null;
  quantity?: number;
  unit?: string;
}

export interface RecipeWithIngredients {
  id: string;
  name: string;
  imageUrl?: string | null;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  servings: number;
  ingredients: RecipeIngredientMatch[];
}

export interface PantryItemSimple {
  id: string;
  name: string;
  foodId?: string | null;
  quantity: number;
  unit: string;
}

export interface RecipeMatchResult {
  recipe: RecipeWithIngredients;
  matchPercentage: number;
  totalIngredients: number;
  availableIngredients: string[];
  missingIngredients: string[];
  canMakeNow: boolean;
}

/**
 * Checks whether a pantry item provides sufficient quantity for a recipe ingredient
 */
function hasSufficientStock(
  ing: RecipeIngredientMatch,
  pantryItem: PantryItemSimple
): boolean {
  if (typeof ing.quantity !== "number" || ing.quantity <= 0) {
    return true; // No quantity specified, presence is sufficient
  }

  const ingUnit = normalizeUnit(ing.unit || "g");
  const pUnit = normalizeUnit(pantryItem.unit || "g");

  const ingUnitInfo = COMMON_UNITS[ingUnit];
  const pUnitInfo = COMMON_UNITS[pUnit];

  // If unit dimensions match, convert to comparable grams/base
  if (ingUnitInfo && pUnitInfo && ingUnitInfo.type === pUnitInfo.type) {
    const requiredBase = ing.quantity * ingUnitInfo.baseGrams;
    const availableBase = pantryItem.quantity * pUnitInfo.baseGrams;
    return availableBase >= requiredBase;
  }

  // Same unit directly
  if (ingUnit === pUnit) {
    return pantryItem.quantity >= ing.quantity;
  }

  // Fallback: if positive stock is available
  return pantryItem.quantity > 0;
}

/**
 * Calculates match percentage and missing items for recipes based on current pantry,
 * considering required vs available quantities.
 */
export function rankRecipesByPantry(
  recipes: RecipeWithIngredients[],
  pantry: PantryItemSimple[]
): RecipeMatchResult[] {
  return recipes
    .map((recipe) => {
      const availableIngredients: string[] = [];
      const missingIngredients: string[] = [];

      for (const ing of recipe.ingredients) {
        const ingFoodId = ing.foodId;
        const ingName = (ing.food?.name || ing.rawName).toLowerCase().trim();

        // Find candidate pantry item
        const matchingPantry = pantry.find((p) => {
          if (ingFoodId && p.foodId && ingFoodId === p.foodId) return true;
          const pName = p.name.toLowerCase().trim();
          return pName.includes(ingName) || ingName.includes(pName);
        });

        if (matchingPantry && hasSufficientStock(ing, matchingPantry)) {
          availableIngredients.push(ing.food?.name || ing.rawName);
        } else {
          missingIngredients.push(ing.food?.name || ing.rawName);
        }
      }

      const totalIngredients = recipe.ingredients.length;
      const matchPercentage =
        totalIngredients > 0
          ? Math.round((availableIngredients.length / totalIngredients) * 100)
          : 0;

      return {
        recipe,
        matchPercentage,
        totalIngredients,
        availableIngredients,
        missingIngredients,
        canMakeNow: matchPercentage === 100 && totalIngredients > 0,
      };
    })
    .sort((a, b) => {
      if (b.canMakeNow !== a.canMakeNow) {
        return b.canMakeNow ? 1 : -1;
      }
      return b.matchPercentage - a.matchPercentage;
    });
}
