export interface RecipeWithIngredients {
  id: string;
  name: string;
  imageUrl?: string | null;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  servings: number;
  ingredients: Array<{
    id: string;
    rawName: string;
    foodId?: string | null;
    food?: { name: string } | null;
  }>;
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
 * Calculates match percentage and missing items for recipes based on current pantry
 */
export function rankRecipesByPantry(
  recipes: RecipeWithIngredients[],
  pantry: PantryItemSimple[]
): RecipeMatchResult[] {
  const pantryFoodIds = new Set(
    pantry.map((p) => p.foodId).filter(Boolean) as string[]
  );
  const pantryNames = pantry.map((p) => p.name.toLowerCase().trim());

  return recipes
    .map((recipe) => {
      const availableIngredients: string[] = [];
      const missingIngredients: string[] = [];

      for (const ing of recipe.ingredients) {
        const ingFoodId = ing.foodId;
        const ingName = (ing.food?.name || ing.rawName).toLowerCase().trim();

        const isMatchById = ingFoodId ? pantryFoodIds.has(ingFoodId) : false;
        const isMatchByName = pantryNames.some(
          (pName) => ingName.includes(pName) || pName.includes(ingName)
        );

        if (isMatchById || isMatchByName) {
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
        canMakeNow: matchPercentage === 100,
      };
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}
