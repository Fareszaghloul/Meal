import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/route";
import {
  nutritionDistance,
  calculateMacroDiff,
  calculateFitPercentage,
  getFitLabel,
  type MacroProfile,
} from "@/lib/nutrition/scoring";

export interface MealAlternative {
  id: string;
  type: "recipe" | "saved_meal";
  recipeId: string | null;
  savedMealId: string | null;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  servings: number;
  servingUnit: string;
  isFavorite: boolean;
  pantryMatchPercent: number;
  fitPercentage: number;
  fitLabel: string;
  diff: {
    caloriesDiff: number;
    proteinDiff: number;
    carbsDiff: number;
    fatDiff: number;
  };
}

export interface MealReplacementResponse {
  currentMeal: {
    id: string;
    name: string;
    dayOfWeek: string;
    mealCategory: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    isLogged: boolean;
  };
  alternatives: MealAlternative[];
}

/**
 * Finds top 5-10 alternative meals close in nutrition to a planned meal
 */
export async function getMealAlternatives(
  userId: string,
  mealId: string
): Promise<MealReplacementResponse> {
  const meal = await prisma.meal.findFirst({
    where: {
      id: mealId,
      mealPlan: { userId },
    },
    include: {
      recipe: true,
    },
  });

  if (!meal) {
    throw new HttpError(404, "Planned meal not found");
  }

  const currentMealName = meal.recipe?.name || meal.customName || "Meal";
  const isLogged = meal.status === "logged" || Boolean(meal.foodLogEntryId);

  const targetProfile: MacroProfile = {
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
  };

  // Fetch candidates: recipes and saved meals (excluding the current one)
  const [recipes, savedMeals, pantryItems] = await Promise.all([
    prisma.recipe.findMany({
      where: {
        userId,
        ...(meal.recipeId ? { id: { not: meal.recipeId } } : {}),
      },
      include: {
        ingredients: {
          include: { food: true },
        },
      },
    }),
    prisma.savedMeal.findMany({
      where: {
        userId,
      },
      include: {
        items: true,
      },
    }),
    prisma.pantryItem.findMany({
      where: { userId },
      select: {
        foodId: true,
        name: true,
        quantity: true,
        unit: true,
      },
    }),
  ]);

  const candidates: MealAlternative[] = [];

  // 1. Process recipes
  for (const r of recipes) {
    let matches = 0;
    if (r.ingredients.length > 0) {
      for (const ing of r.ingredients) {
        const ingFoodId = ing.foodId;
        const ingName = (ing.food?.name || ing.rawName).toLowerCase().trim();
        const pMatch = pantryItems.find((p) => {
          if (ingFoodId && p.foodId && ingFoodId === p.foodId) return true;
          const pName = p.name.toLowerCase().trim();
          return pName.includes(ingName) || ingName.includes(pName);
        });
        if (pMatch && pMatch.quantity > 0) matches++;
      }
    }
    const pantryPct = r.ingredients.length > 0 ? Math.round((matches / r.ingredients.length) * 100) : 100;

    const candProfile: MacroProfile = {
      calories: Math.round(r.caloriesPerServing),
      protein: Math.round(r.proteinPerServing * 10) / 10,
      carbs: Math.round(r.carbsPerServing * 10) / 10,
      fat: Math.round(r.fatPerServing * 10) / 10,
      fiber: r.fiberPerServing ? Math.round(r.fiberPerServing * 10) / 10 : null,
    };


    const fitPct = calculateFitPercentage(candProfile, targetProfile);
    const diff = calculateMacroDiff(candProfile, targetProfile);

    candidates.push({
      id: r.id,
      type: "recipe",
      recipeId: r.id,
      savedMealId: null,
      name: r.name,
      calories: candProfile.calories,
      protein: candProfile.protein,
      carbs: candProfile.carbs,
      fat: candProfile.fat,
      fiber: candProfile.fiber ?? null,
      servings: 1,
      servingUnit: r.servingLabel || "serving",
      isFavorite: r.isFavorite,
      pantryMatchPercent: pantryPct,
      fitPercentage: fitPct,
      fitLabel: getFitLabel(fitPct),
      diff,
    });
  }

  // 2. Process saved meals
  for (const sm of savedMeals) {
    if (sm.name.toLowerCase() === currentMealName.toLowerCase()) continue;

    let totCal = 0;
    let totPro = 0;
    let totCarb = 0;
    let totFat = 0;
    let totFib = 0;

    for (const item of sm.items) {
      totCal += item.calories;
      totPro += item.protein;
      totCarb += item.carbs;
      totFat += item.fat;
      totFib += item.fiber ?? 0;
    }

    const candProfile: MacroProfile = {
      calories: Math.round(totCal),
      protein: Math.round(totPro * 10) / 10,
      carbs: Math.round(totCarb * 10) / 10,
      fat: Math.round(totFat * 10) / 10,
      fiber: totFib > 0 ? Math.round(totFib * 10) / 10 : null,
    };

    const fitPct = calculateFitPercentage(candProfile, targetProfile);
    const diff = calculateMacroDiff(candProfile, targetProfile);

    candidates.push({
      id: sm.id,
      type: "saved_meal",
      recipeId: null,
      savedMealId: sm.id,
      name: sm.name,
      calories: candProfile.calories,
      protein: candProfile.protein,
      carbs: candProfile.carbs,
      fat: candProfile.fat,
      fiber: candProfile.fiber ?? null,
      servings: 1,
      servingUnit: "meal",
      isFavorite: sm.isFavorite,
      pantryMatchPercent: 50,
      fitPercentage: fitPct,
      fitLabel: getFitLabel(fitPct),
      diff,
    });
  }

  // Rank by fit percentage descending (and pantry/favorite bonus)
  candidates.sort((a, b) => {
    const scoreA = a.fitPercentage + (a.isFavorite ? 5 : 0) + (a.pantryMatchPercent >= 70 ? 5 : 0);
    const scoreB = b.fitPercentage + (b.isFavorite ? 5 : 0) + (b.pantryMatchPercent >= 70 ? 5 : 0);
    return scoreB - scoreA;
  });

  return {
    currentMeal: {
      id: meal.id,
      name: currentMealName,
      dayOfWeek: meal.dayOfWeek,
      mealCategory: meal.mealCategory,
      servings: meal.servings,
      calories: Math.round(meal.calories),
      protein: Math.round(meal.protein * 10) / 10,
      carbs: Math.round(meal.carbs * 10) / 10,
      fat: Math.round(meal.fat * 10) / 10,
      isLogged,
    },
    alternatives: candidates.slice(0, 10),
  };
}

/**
 * Replaces an existing planned meal in-place
 */
export async function replacePlannedMeal(
  userId: string,
  mealId: string,
  replacement: {
    type: "recipe" | "saved_meal";
    id: string;
    servings?: number;
  }
) {
  const meal = await prisma.meal.findFirst({
    where: {
      id: mealId,
      mealPlan: { userId },
    },
  });

  if (!meal) {
    throw new HttpError(404, "Planned meal not found");
  }

  if (meal.status === "logged" || meal.foodLogEntryId) {
    throw new HttpError(
      400,
      "This meal has already been logged. Please unlog it first to replace it."
    );
  }

  const servings = replacement.servings && replacement.servings > 0 ? replacement.servings : 1;

  if (replacement.type === "recipe") {
    const recipe = await prisma.recipe.findFirst({
      where: { id: replacement.id, userId },
    });

    if (!recipe) {
      throw new HttpError(404, "Replacement recipe not found");
    }

    return prisma.meal.update({
      where: { id: meal.id },
      data: {
        recipeId: recipe.id,
        customName: null,
        servings,
        calories: Math.round(recipe.caloriesPerServing * servings),
        protein: Math.round(recipe.proteinPerServing * servings * 10) / 10,
        carbs: Math.round(recipe.carbsPerServing * servings * 10) / 10,
        fat: Math.round(recipe.fatPerServing * servings * 10) / 10,
        fiber: recipe.fiberPerServing ? Math.round(recipe.fiberPerServing * servings * 10) / 10 : null,
      },
    });
  } else {
    // Saved meal
    const savedMeal = await prisma.savedMeal.findFirst({
      where: { id: replacement.id, userId },
      include: { items: true },
    });

    if (!savedMeal) {
      throw new HttpError(404, "Replacement saved meal not found");
    }

    let totCal = 0;
    let totPro = 0;
    let totCarb = 0;
    let totFat = 0;
    let totFib = 0;

    for (const item of savedMeal.items) {
      totCal += item.calories;
      totPro += item.protein;
      totCarb += item.carbs;
      totFat += item.fat;
      totFib += item.fiber ?? 0;
    }

    return prisma.meal.update({
      where: { id: meal.id },
      data: {
        recipeId: null,
        customName: savedMeal.name,
        servings,
        calories: Math.round(totCal * servings),
        protein: Math.round(totPro * servings * 10) / 10,
        carbs: Math.round(totCarb * servings * 10) / 10,
        fat: Math.round(totFat * servings * 10) / 10,
        fiber: totFib > 0 ? Math.round(totFib * servings * 10) / 10 : null,
      },
    });
  }
}
