import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/route";
import { addDays } from "@/lib/dates";
import { nutritionDistance, type MacroProfile } from "@/lib/nutrition/scoring";

export type PlannerSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface PlannerConfig {
  weekStartDate: string; // ISO date for Monday e.g. "2026-10-05"
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number | null;
  };
  slots?: PlannerSlot[];
  variety?: "low" | "medium" | "high";
  pantryPreference?: "ignore" | "prefer" | "strongly_prefer";
  useSavedMeals?: boolean;
  useRecipes?: boolean;
  prioritizeFavorites?: boolean;
  prioritizeFrequent?: boolean;
}

export interface PlannedCandidate {
  id: string;
  type: "recipe" | "saved_meal";
  name: string;
  mealCategory: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  servings: number;
  servingUnit: string;
  isFavorite: boolean;
  useCount: number;
  pantryMatchPercent: number;
  recipeId: string | null;
  savedMealId: string | null;
}

export interface GeneratedMeal {
  dayOfWeek: string;
  mealCategory: PlannerSlot;
  candidate: PlannedCandidate;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface GeneratedDay {
  dayOfWeek: string;
  date: string;
  meals: GeneratedMeal[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targetDiff: {
    caloriesDiff: number;
    proteinDiff: number;
    carbsDiff: number;
    fatDiff: number;
  };
}

export interface GeneratedWeekPlan {
  weekStartDate: string;
  days: GeneratedDay[];
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  uniqueMealsCount: number;
  pantryFriendlyCount: number;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/**
 * Calculates percentage of recipe ingredients in pantry with sufficient quantity
 */
function calculateRecipePantryMatch(
  ingredients: Array<{
    foodId?: string | null;
    rawName: string;
    quantity: number;
    unit: string;
    food?: { name: string } | null;
  }>,
  pantryItems: Array<{
    foodId?: string | null;
    name: string;
    quantity: number;
    unit: string;
  }>
): number {
  if (ingredients.length === 0) return 100;
  let matches = 0;

  for (const ing of ingredients) {
    const ingFoodId = ing.foodId;
    const ingName = (ing.food?.name || ing.rawName).toLowerCase().trim();

    const pMatch = pantryItems.find((p) => {
      if (ingFoodId && p.foodId && ingFoodId === p.foodId) return true;
      const pName = p.name.toLowerCase().trim();
      return pName.includes(ingName) || ingName.includes(pName);
    });

    if (pMatch && pMatch.quantity > 0) {
      matches++;
    }
  }

  return Math.round((matches / ingredients.length) * 100);
}

/**
 * Fetches and normalizes all candidate meals (Recipes & Saved Meals) for a user
 */
export async function loadPlannerCandidates(userId: string): Promise<{
  candidates: PlannedCandidate[];
  pantryItemsCount: number;
}> {
  const [recipes, savedMeals, pantryItems] = await Promise.all([
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

  const candidates: PlannedCandidate[] = [];

  // 1. Recipes
  for (const r of recipes) {
    const matchPct = calculateRecipePantryMatch(r.ingredients, pantryItems);
    candidates.push({
      id: `recipe:${r.id}`,
      type: "recipe",
      name: r.name,
      mealCategory: null, // recipes are versatile unless tagged
      calories: Math.round(r.caloriesPerServing),
      protein: Math.round(r.proteinPerServing * 10) / 10,
      carbs: Math.round(r.carbsPerServing * 10) / 10,
      fat: Math.round(r.fatPerServing * 10) / 10,
      fiber: r.fiberPerServing ? Math.round(r.fiberPerServing * 10) / 10 : null,
      servings: 1,
      servingUnit: r.servingLabel || "serving",
      isFavorite: r.isFavorite,
      useCount: 0,
      pantryMatchPercent: matchPct,
      recipeId: r.id,
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

    candidates.push({
      id: `saved_meal:${sm.id}`,
      type: "saved_meal",
      name: sm.name,
      mealCategory: sm.mealCategory,
      calories: Math.round(totCal),
      protein: Math.round(totPro * 10) / 10,
      carbs: Math.round(totCarb * 10) / 10,
      fat: Math.round(totFat * 10) / 10,
      fiber: totFib > 0 ? Math.round(totFib * 10) / 10 : null,
      servings: 1,
      servingUnit: "meal",
      isFavorite: sm.isFavorite,
      useCount: sm.useCount,
      pantryMatchPercent: 50, // default neutral for saved meals
      recipeId: null,
      savedMealId: sm.id,
    });
  }

  return {
    candidates,
    pantryItemsCount: pantryItems.length,
  };
}

/**
 * Slot proportions based on active meal slots
 */
function getSlotDistribution(slots: PlannerSlot[]): Record<PlannerSlot, number> {
  const hasBreakfast = slots.includes("breakfast");
  const hasLunch = slots.includes("lunch");
  const hasDinner = slots.includes("dinner");
  const hasSnack = slots.includes("snack");

  if (hasBreakfast && hasLunch && hasDinner && hasSnack) {
    return { breakfast: 0.25, lunch: 0.30, dinner: 0.35, snack: 0.10 };
  }
  if (hasBreakfast && hasLunch && hasDinner) {
    return { breakfast: 0.30, lunch: 0.35, dinner: 0.35, snack: 0.0 };
  }
  if (hasLunch && hasDinner) {
    return { breakfast: 0.0, lunch: 0.45, dinner: 0.55, snack: 0.0 };
  }

  // Equal distribution fallback
  const share = 1 / Math.max(1, slots.length);
  return {
    breakfast: hasBreakfast ? share : 0,
    lunch: hasLunch ? share : 0,
    dinner: hasDinner ? share : 0,
    snack: hasSnack ? share : 0,
  };
}

/**
 * Evaluates penalty for repeating a candidate across the week
 */
function calculateRepetitionPenalty(
  candidateId: string,
  slot: PlannerSlot,
  selectionCounts: Map<string, number>,
  variety: "low" | "medium" | "high"
): number {
  const count = selectionCounts.get(candidateId) || 0;
  if (count === 0) return 0;

  if (variety === "low") {
    return count * 0.15;
  }

  if (variety === "medium") {
    if (slot === "breakfast" || slot === "snack") {
      // Breakfast & snack can repeat up to 3 times with low penalty
      return count >= 3 ? (count - 2) * 0.9 : count * 0.1;
    }
    // Lunch and dinner should repeat at most 2 times
    return count >= 2 ? (count - 1) * 1.2 : count * 0.25;
  }

  // High variety: strong penalty for any repetition
  return count * 1.8;
}

/**
 * Category affinity penalty: checks if candidate fits the slot
 */
function getCategoryAffinityPenalty(candidate: PlannedCandidate, slot: PlannerSlot): number {
  const name = candidate.name.toLowerCase();

  // If candidate has a specific category configured
  if (candidate.mealCategory) {
    if (candidate.mealCategory === slot) return -0.15; // bonus for explicit match
    return 0.5; // penalty for slot mismatch
  }

  // Name keyword heuristics
  const breakfastKeywords = ["oat", "egg", "pancake", "waffle", "toast", "cereal", "yogurt", "smoothie", "breakfast"];
  const snackKeywords = ["shake", "bar", "snack", "nuts", "protein powder", "whey", "apple", "banana", "cookie"];

  const isBreakfastName = breakfastKeywords.some((k) => name.includes(k));
  const isSnackName = snackKeywords.some((k) => name.includes(k));

  if (slot === "breakfast") {
    if (isBreakfastName) return -0.2;
    if (isSnackName) return 0.0;
    return 0.3; // dinner dishes for breakfast penalised slightly
  }

  if (slot === "snack") {
    if (isSnackName) return -0.2;
    if (candidate.calories > 450) return 0.6; // heavy meal in snack slot
    return 0.1;
  }

  // Lunch & Dinner
  if (isBreakfastName) return 0.4;
  return 0.0;
}

/**
 * Scores a candidate for a specific slot target
 */
function scoreCandidate(
  candidate: PlannedCandidate,
  slot: PlannerSlot,
  slotTarget: MacroProfile,
  config: PlannerConfig,
  selectionCounts: Map<string, number>
): number {
  const variety = config.variety || "medium";
  const pantryPref = config.pantryPreference || "prefer";

  // Base nutrition distance (protein and calories prioritized)
  const dist = nutritionDistance(candidate, slotTarget, {
    calories: 2.0,
    protein: 2.5,
    carbs: 1.0,
    fat: 1.0,
  });

  // Repetition penalty
  const repPenalty = calculateRepetitionPenalty(candidate.id, slot, selectionCounts, variety);

  // Category penalty / bonus
  const catPenalty = getCategoryAffinityPenalty(candidate, slot);

  // Favorite bonus
  const favBonus = config.prioritizeFavorites && candidate.isFavorite ? 0.2 : 0;

  // Frequent bonus
  const freqBonus = config.prioritizeFrequent && candidate.useCount > 2 ? 0.15 : 0;

  // Pantry bonus
  let pantryBonus = 0;
  if (pantryPref === "prefer") {
    pantryBonus = (candidate.pantryMatchPercent / 100) * 0.25;
  } else if (pantryPref === "strongly_prefer") {
    pantryBonus = (candidate.pantryMatchPercent / 100) * 0.55;
  }

  return dist + repPenalty + catPenalty - favBonus - freqBonus - pantryBonus;
}

/**
 * Deterministically generates a full week meal plan
 */
export async function generateWeeklyPlan(
  userId: string,
  config: PlannerConfig
): Promise<GeneratedWeekPlan> {
  const { candidates } = await loadPlannerCandidates(userId);

  // Filter candidate types
  const useSaved = config.useSavedMeals !== false;
  const useRec = config.useRecipes !== false;

  const pool = candidates.filter((c) => {
    if (c.type === "saved_meal" && !useSaved) return false;
    if (c.type === "recipe" && !useRec) return false;
    return true;
  });

  if (pool.length === 0) {
    throw new HttpError(
      400,
      "Please add some recipes or saved meals before generating an automatic meal plan."
    );
  }

  const activeSlots = config.slots && config.slots.length > 0
    ? config.slots
    : (["breakfast", "lunch", "dinner", "snack"] as PlannerSlot[]);

  const distribution = getSlotDistribution(activeSlots);
  const selectionCounts = new Map<string, number>();
  const generatedDays: GeneratedDay[] = [];

  // Generate 7 days (Monday to Sunday)
  for (let d = 0; d < 7; d++) {
    const dayName = DAYS_OF_WEEK[d];
    const dayDate = addDays(config.weekStartDate, d);
    const dayMeals: GeneratedMeal[] = [];

    // Pass 1: Select best candidate for each active slot
    for (const slot of activeSlots) {
      const slotPct = distribution[slot];
      const slotTarget: MacroProfile = {
        calories: Math.round(config.targets.calories * slotPct),
        protein: Math.round(config.targets.protein * slotPct),
        carbs: Math.round(config.targets.carbs * slotPct),
        fat: Math.round(config.targets.fat * slotPct),
      };

      // Rank all candidates for this slot
      const ranked = pool
        .map((c) => ({
          candidate: c,
          score: scoreCandidate(c, slot, slotTarget, config, selectionCounts),
        }))
        .sort((a, b) => a.score - b.score);

      const chosen = ranked[0].candidate;
      dayMeals.push({
        dayOfWeek: dayName,
        mealCategory: slot,
        candidate: chosen,
        calories: chosen.calories,
        protein: chosen.protein,
        carbs: chosen.carbs,
        fat: chosen.fat,
      });

      // Record selection for variety penalty tracking
      selectionCounts.set(chosen.id, (selectionCounts.get(chosen.id) || 0) + 1);
    }

    // Pass 2: Day-level refinement pass
    // If the day's total nutrition can be improved by swapping a flexible slot (e.g. snack or dinner),
    // test alternatives from top-3 for that slot
    if (dayMeals.length >= 2) {
      const dayTotals = {
        calories: dayMeals.reduce((s, m) => s + m.calories, 0),
        protein: dayMeals.reduce((s, m) => s + m.protein, 0),
        carbs: dayMeals.reduce((s, m) => s + m.carbs, 0),
        fat: dayMeals.reduce((s, m) => s + m.fat, 0),
      };

      let bestDayDist = nutritionDistance(dayTotals, config.targets);

      // Check swapping the last slot (snack or dinner) if it brings totals closer
      const flexibleIndex = dayMeals.length - 1;
      const flexSlot = dayMeals[flexibleIndex].mealCategory;

      const flexRanked = pool
        .filter((c) => c.id !== dayMeals[flexibleIndex].candidate.id)
        .map((c) => {
          const testDayTotals = {
            calories: dayTotals.calories - dayMeals[flexibleIndex].calories + c.calories,
            protein: dayTotals.protein - dayMeals[flexibleIndex].protein + c.protein,
            carbs: dayTotals.carbs - dayMeals[flexibleIndex].carbs + c.carbs,
            fat: dayTotals.fat - dayMeals[flexibleIndex].fat + c.fat,
          };
          return {
            candidate: c,
            dayDist: nutritionDistance(testDayTotals, config.targets),
          };
        })
        .sort((a, b) => a.dayDist - b.dayDist);

      if (flexRanked.length > 0 && flexRanked[0].dayDist < bestDayDist - 0.05) {
        const oldId = dayMeals[flexibleIndex].candidate.id;
        const newCand = flexRanked[0].candidate;

        selectionCounts.set(oldId, Math.max(0, (selectionCounts.get(oldId) || 1) - 1));
        selectionCounts.set(newCand.id, (selectionCounts.get(newCand.id) || 0) + 1);

        dayMeals[flexibleIndex] = {
          dayOfWeek: dayName,
          mealCategory: flexSlot,
          candidate: newCand,
          calories: newCand.calories,
          protein: newCand.protein,
          carbs: newCand.carbs,
          fat: newCand.fat,
        };
      }
    }

    const finalDayTotals = {
      calories: Math.round(dayMeals.reduce((s, m) => s + m.calories, 0)),
      protein: Math.round(dayMeals.reduce((s, m) => s + m.protein, 0) * 10) / 10,
      carbs: Math.round(dayMeals.reduce((s, m) => s + m.carbs, 0) * 10) / 10,
      fat: Math.round(dayMeals.reduce((s, m) => s + m.fat, 0) * 10) / 10,
    };

    generatedDays.push({
      dayOfWeek: dayName,
      date: dayDate,
      meals: dayMeals,
      totals: finalDayTotals,
      targetDiff: {
        caloriesDiff: finalDayTotals.calories - config.targets.calories,
        proteinDiff: Math.round((finalDayTotals.protein - config.targets.protein) * 10) / 10,
        carbsDiff: Math.round((finalDayTotals.carbs - config.targets.carbs) * 10) / 10,
        fatDiff: Math.round((finalDayTotals.fat - config.targets.fat) * 10) / 10,
      },
    });
  }

  // Calculate week averages
  const avgCal = Math.round(generatedDays.reduce((s, d) => s + d.totals.calories, 0) / 7);
  const avgPro = Math.round((generatedDays.reduce((s, d) => s + d.totals.protein, 0) / 7) * 10) / 10;
  const avgCarb = Math.round((generatedDays.reduce((s, d) => s + d.totals.carbs, 0) / 7) * 10) / 10;
  const avgFat = Math.round((generatedDays.reduce((s, d) => s + d.totals.fat, 0) / 7) * 10) / 10;

  const uniqueCandidates = new Set<string>();
  let pantryFriendlyCount = 0;

  for (const day of generatedDays) {
    for (const m of day.meals) {
      uniqueCandidates.add(m.candidate.id);
      if (m.candidate.pantryMatchPercent >= 70) {
        pantryFriendlyCount++;
      }
    }
  }

  return {
    weekStartDate: config.weekStartDate,
    days: generatedDays,
    averages: {
      calories: avgCal,
      protein: avgPro,
      carbs: avgCarb,
      fat: avgFat,
    },
    uniqueMealsCount: uniqueCandidates.size,
    pantryFriendlyCount,
    targets: {
      calories: config.targets.calories,
      protein: config.targets.protein,
      carbs: config.targets.carbs,
      fat: config.targets.fat,
    },
  };
}

/**
 * Regenerates meals for a single day within an existing generated week plan
 */
export async function regenerateDayInPlan(
  userId: string,
  config: PlannerConfig,
  currentPlan: GeneratedWeekPlan,
  dayIndex: number
): Promise<GeneratedWeekPlan> {
  const { candidates } = await loadPlannerCandidates(userId);
  const activeSlots = config.slots && config.slots.length > 0
    ? config.slots
    : (["breakfast", "lunch", "dinner", "snack"] as PlannerSlot[]);

  const distribution = getSlotDistribution(activeSlots);

  // Collect selections from all OTHER days to preserve weekly variety
  const selectionCounts = new Map<string, number>();
  for (let i = 0; i < currentPlan.days.length; i++) {
    if (i === dayIndex) continue;
    for (const m of currentPlan.days[i].meals) {
      selectionCounts.set(m.candidate.id, (selectionCounts.get(m.candidate.id) || 0) + 1);
    }
  }

  const dayName = DAYS_OF_WEEK[dayIndex];
  const dayDate = currentPlan.days[dayIndex].date;
  const newDayMeals: GeneratedMeal[] = [];

  for (const slot of activeSlots) {
    const slotPct = distribution[slot];
    const slotTarget: MacroProfile = {
      calories: Math.round(config.targets.calories * slotPct),
      protein: Math.round(config.targets.protein * slotPct),
      carbs: Math.round(config.targets.carbs * slotPct),
      fat: Math.round(config.targets.fat * slotPct),
    };

    const ranked = candidates
      .map((c) => ({
        candidate: c,
        score: scoreCandidate(c, slot, slotTarget, config, selectionCounts),
      }))
      .sort((a, b) => a.score - b.score);

    // Pick a candidate (avoiding picking the exact same candidate as previously on this day if possible)
    const prevCandId = currentPlan.days[dayIndex].meals.find((m) => m.mealCategory === slot)?.candidate.id;
    const chosen = ranked.find((r) => r.candidate.id !== prevCandId)?.candidate || ranked[0].candidate;

    newDayMeals.push({
      dayOfWeek: dayName,
      mealCategory: slot,
      candidate: chosen,
      calories: chosen.calories,
      protein: chosen.protein,
      carbs: chosen.carbs,
      fat: chosen.fat,
    });

    selectionCounts.set(chosen.id, (selectionCounts.get(chosen.id) || 0) + 1);
  }

  const finalTotals = {
    calories: Math.round(newDayMeals.reduce((s, m) => s + m.calories, 0)),
    protein: Math.round(newDayMeals.reduce((s, m) => s + m.protein, 0) * 10) / 10,
    carbs: Math.round(newDayMeals.reduce((s, m) => s + m.carbs, 0) * 10) / 10,
    fat: Math.round(newDayMeals.reduce((s, m) => s + m.fat, 0) * 10) / 10,
  };

  const updatedDays = [...currentPlan.days];
  updatedDays[dayIndex] = {
    dayOfWeek: dayName,
    date: dayDate,
    meals: newDayMeals,
    totals: finalTotals,
    targetDiff: {
      caloriesDiff: finalTotals.calories - config.targets.calories,
      proteinDiff: Math.round((finalTotals.protein - config.targets.protein) * 10) / 10,
      carbsDiff: Math.round((finalTotals.carbs - config.targets.carbs) * 10) / 10,
      fatDiff: Math.round((finalTotals.fat - config.targets.fat) * 10) / 10,
    },
  };

  const avgCal = Math.round(updatedDays.reduce((s, d) => s + d.totals.calories, 0) / 7);
  const avgPro = Math.round((updatedDays.reduce((s, d) => s + d.totals.protein, 0) / 7) * 10) / 10;
  const avgCarb = Math.round((updatedDays.reduce((s, d) => s + d.totals.carbs, 0) / 7) * 10) / 10;
  const avgFat = Math.round((updatedDays.reduce((s, d) => s + d.totals.fat, 0) / 7) * 10) / 10;

  const uniqueCandidates = new Set<string>();
  let pantryFriendlyCount = 0;

  for (const day of updatedDays) {
    for (const m of day.meals) {
      uniqueCandidates.add(m.candidate.id);
      if (m.candidate.pantryMatchPercent >= 70) pantryFriendlyCount++;
    }
  }

  return {
    ...currentPlan,
    days: updatedDays,
    averages: {
      calories: avgCal,
      protein: avgPro,
      carbs: avgCarb,
      fat: avgFat,
    },
    uniqueMealsCount: uniqueCandidates.size,
    pantryFriendlyCount,
  };
}

/**
 * Commits a generated plan to the database inside a transaction
 */
export async function applyGeneratedPlan(
  userId: string,
  weekStartDate: string,
  plan: GeneratedWeekPlan,
  mode: "replace" | "fill_empty"
): Promise<{ addedCount: number; replacedCount: number }> {
  return prisma.$transaction(async (tx) => {
    // 1. Find or create meal plan
    let mealPlan = await tx.mealPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate,
        },
      },
      include: {
        meals: true,
      },
    });

    if (!mealPlan) {
      mealPlan = await tx.mealPlan.create({
        data: {
          userId,
          weekStartDate,
        },
        include: {
          meals: true,
        },
      });
    }

    const existingMeals = mealPlan.meals;
    let addedCount = 0;
    let replacedCount = 0;

    if (mode === "replace") {
      // Only delete unlogged meals so we don't destroy historical food log links
      const unloggedIds = existingMeals
        .filter((m) => m.status !== "logged")
        .map((m) => m.id);

      if (unloggedIds.length > 0) {
        await tx.meal.deleteMany({
          where: { id: { in: unloggedIds } },
        });
        replacedCount = unloggedIds.length;
      }
    }

    // Refresh map of existing meals
    const currentMeals = await tx.meal.findMany({
      where: { mealPlanId: mealPlan.id },
    });
    const slotMap = new Set(
      currentMeals.map((m) => `${m.dayOfWeek.toLowerCase()}:::${m.mealCategory.toLowerCase()}`)
    );

    // Insert generated meals
    for (const day of plan.days) {
      for (const m of day.meals) {
        const slotKey = `${m.dayOfWeek.toLowerCase()}:::${m.mealCategory.toLowerCase()}`;

        if (mode === "fill_empty" && slotMap.has(slotKey)) {
          // Skip slot that already has a meal
          continue;
        }

        await tx.meal.create({
          data: {
            mealPlanId: mealPlan.id,
            dayOfWeek: m.dayOfWeek.toLowerCase(),
            mealCategory: m.mealCategory.toLowerCase(),
            recipeId: m.candidate.recipeId,
            customName: m.candidate.recipeId ? null : m.candidate.name,
            servings: m.candidate.servings || 1,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            fiber: m.candidate.fiber,
            status: "planned",
          },
        });

        slotMap.add(slotKey);
        addedCount++;
      }
    }

    return { addedCount, replacedCount };
  });
}
