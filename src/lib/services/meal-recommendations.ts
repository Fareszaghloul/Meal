import { prisma } from "@/lib/db";
import { goalsFor } from "@/lib/services/food-log";
import { todayLocal, type DateString } from "@/lib/dates";
import {
  calculateFitPercentage,
  getFitLabel,
  type MacroProfile,
} from "@/lib/nutrition/scoring";

export interface MealRecommendation {
  id: string;
  type: "recipe" | "saved_meal" | "food";
  targetId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  servings: number;
  servingUnit: string;
  macroFitPercent: number;
  pantryMatchPercent: number;
  fitLabel: string;
  isFavorite: boolean;
  recipeId: string | null;
  foodId: string | null;
  savedMealId: string | null;
}

export interface WhatShouldIEatResponse {
  date: string;
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  isOverCalories: boolean;
  message: string;
  recommendations: MealRecommendation[];
}

/**
 * Calculates remaining macros and ranks practical meals and snacks that fit
 */
export async function getWhatShouldIEat(
  userId: string,
  dateStr?: string
): Promise<WhatShouldIEatResponse> {
  const date = (dateStr || todayLocal()) as DateString;

  const [goalsFull, loggedEntries, recipes, savedMeals, pantryItems, favoriteFoods] =
    await Promise.all([
      goalsFor(userId, date),
      prisma.foodLogEntry.findMany({
        where: { userId, date },
      }),
      prisma.recipe.findMany({
        where: { userId },
        include: {
          ingredients: {
            include: { food: true },
          },
        },
      }),
      prisma.savedMeal.findMany({
        where: { userId },
        include: { items: true },
      }),
      prisma.pantryItem.findMany({
        where: { userId },
        select: { foodId: true, name: true, quantity: true, unit: true },
      }),
      prisma.food.findMany({
        where: {
          OR: [{ userId }, { userId: null }],
          isFavorite: true,
        },
        take: 20,
      }),
    ]);

  const goals = {
    calories: goalsFull.calories,
    protein: goalsFull.protein,
    carbs: goalsFull.carbs,
    fat: goalsFull.fat,
  };

  const consumed = {
    calories: Math.round(loggedEntries.reduce((s, e) => s + e.calories, 0)),
    protein: Math.round(loggedEntries.reduce((s, e) => s + e.protein, 0) * 10) / 10,
    carbs: Math.round(loggedEntries.reduce((s, e) => s + e.carbs, 0) * 10) / 10,
    fat: Math.round(loggedEntries.reduce((s, e) => s + e.fat, 0) * 10) / 10,
  };

  const remaining = {
    calories: Math.round(goals.calories - consumed.calories),
    protein: Math.round((goals.protein - consumed.protein) * 10) / 10,
    carbs: Math.round((goals.carbs - consumed.carbs) * 10) / 10,
    fat: Math.round((goals.fat - consumed.fat) * 10) / 10,
  };

  const isOverCalories = remaining.calories <= 0;
  let message = "";

  if (isOverCalories) {
    const overAmt = Math.abs(remaining.calories);
    message = `You are already ${overAmt} kcal above your daily target. Showing high-protein, light options to help satisfy hunger without excessive calories.`;
  } else if (remaining.calories < 300) {
    message = `You have ${remaining.calories} kcal remaining today. Showing light meals and snacks.`;
  } else {
    message = `You have ${remaining.calories} kcal and ${remaining.protein > 0 ? `${remaining.protein}g protein` : "0g protein"} remaining today. Here are meals that fit best.`;
  }

  // Target profile for ranking
  const targetProfile: MacroProfile = isOverCalories
    ? {
        calories: 250, // aim for light snacks
        protein: Math.max(15, remaining.protein),
        carbs: 10,
        fat: 5,
      }
    : {
        calories: remaining.calories,
        protein: Math.max(0, remaining.protein),
        carbs: Math.max(0, remaining.carbs),
        fat: Math.max(0, remaining.fat),
      };

  const candidates: MealRecommendation[] = [];

  // 1. Recipes
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

    // If over calories, skip heavy recipes (> 450 kcal)
    if (isOverCalories && candProfile.calories > 450) continue;

    const fitPct = calculateFitPercentage(candProfile, targetProfile);

    candidates.push({
      id: `recipe:${r.id}`,
      type: "recipe",
      targetId: r.id,
      name: r.name,
      calories: candProfile.calories,
      protein: candProfile.protein,
      carbs: candProfile.carbs,
      fat: candProfile.fat,
      fiber: candProfile.fiber ?? null,
      servings: 1,
      servingUnit: r.servingLabel || "serving",
      macroFitPercent: fitPct,
      pantryMatchPercent: pantryPct,
      fitLabel: getFitLabel(fitPct),
      isFavorite: r.isFavorite,
      recipeId: r.id,
      foodId: null,
      savedMealId: null,
    });
  }

  // 2. Saved Meals
  for (const sm of savedMeals) {
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

    if (isOverCalories && candProfile.calories > 450) continue;

    const fitPct = calculateFitPercentage(candProfile, targetProfile);

    candidates.push({
      id: `saved_meal:${sm.id}`,
      type: "saved_meal",
      targetId: sm.id,
      name: sm.name,
      calories: candProfile.calories,
      protein: candProfile.protein,
      carbs: candProfile.carbs,
      fat: candProfile.fat,
      fiber: candProfile.fiber ?? null,
      servings: 1,
      servingUnit: "meal",
      macroFitPercent: fitPct,
      pantryMatchPercent: 60,
      fitLabel: getFitLabel(fitPct),
      isFavorite: sm.isFavorite,
      recipeId: null,
      foodId: null,
      savedMealId: sm.id,
    });
  }

  // 3. Favorite Foods (as snacks or small single items)
  for (const f of favoriteFoods) {
    const cal = f.caloriesPerServing ?? f.caloriesPer100g;
    const pro = f.proteinPerServing ?? f.proteinPer100g;
    const carb = f.carbsPerServing ?? f.carbsPer100g;
    const fat = f.fatPerServing ?? f.fatPer100g;

    const candProfile: MacroProfile = {
      calories: Math.round(cal),
      protein: Math.round(pro * 10) / 10,
      carbs: Math.round(carb * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: f.fiberPerServing ?? f.fiberPer100g ?? null,
    };

    if (isOverCalories && candProfile.calories > 350) continue;

    const fitPct = calculateFitPercentage(candProfile, targetProfile);

    // Pantry check
    const pMatch = pantryItems.some(
      (p) => (p.foodId && p.foodId === f.id) || p.name.toLowerCase().includes(f.name.toLowerCase())
    );

    candidates.push({
      id: `food:${f.id}`,
      type: "food",
      targetId: f.id,
      name: f.name,
      calories: candProfile.calories,
      protein: candProfile.protein,
      carbs: candProfile.carbs,
      fat: candProfile.fat,
      fiber: candProfile.fiber ?? null,
      servings: 1,
      servingUnit: f.servingUnit || "serving",
      macroFitPercent: fitPct,
      pantryMatchPercent: pMatch ? 100 : 0,
      fitLabel: getFitLabel(fitPct),
      isFavorite: true,
      recipeId: null,
      foodId: f.id,
      savedMealId: null,
    });
  }

  // Ranking: Macro fit percentage + pantry bonus + favorite bonus
  // If not over calories, also penalize items that overshoot remaining calories
  candidates.sort((a, b) => {
    let scoreA = a.macroFitPercent + (a.isFavorite ? 5 : 0) + (a.pantryMatchPercent >= 70 ? 5 : 0);
    let scoreB = b.macroFitPercent + (b.isFavorite ? 5 : 0) + (b.pantryMatchPercent >= 70 ? 5 : 0);

    if (!isOverCalories) {
      if (a.calories > remaining.calories + 50) scoreA -= 25;
      if (b.calories > remaining.calories + 50) scoreB -= 25;
    }

    return scoreB - scoreA;
  });

  return {
    date,
    goals,
    consumed,
    remaining,
    isOverCalories,
    message,
    recommendations: candidates.slice(0, 8),
  };
}
