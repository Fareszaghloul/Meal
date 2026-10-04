import { addDays, diffDays, type DateString } from "@/lib/dates";
import { round } from "@/lib/nutrition/core";
import { MEAL_CATEGORIES, type MealCategory, type NutritionGoals } from "@/lib/domain";

export type PeriodId = "7d" | "30d" | "90d" | "6m" | "1y";

export const PERIOD_DAYS: Record<PeriodId, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "6m": 180,
  "1y": 365,
};

export const PERIOD_LABELS: Record<PeriodId, string> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  "6m": "6M",
  "1y": "1Y",
};

export interface PeriodDates {
  period: PeriodId;
  totalDays: number;
  current: {
    from: DateString;
    to: DateString;
  };
  previous: {
    from: DateString;
    to: DateString;
  };
}

export function computePeriodDates(to: DateString, period: PeriodId): PeriodDates {
  const totalDays = PERIOD_DAYS[period] ?? 30;
  const currentFrom = addDays(to, -(totalDays - 1));
  const prevTo = addDays(currentFrom, -1);
  const prevFrom = addDays(prevTo, -(totalDays - 1));

  return {
    period,
    totalDays,
    current: { from: currentFrom, to },
    previous: { from: prevFrom, to: prevTo },
  };
}

export interface RawFoodLogItem {
  id: string;
  date: DateString;
  mealCategory: string;
  name: string;
  brand?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  foodId?: string | null;
  recipeId?: string | null;
  servingUnit?: string | null;
}

export interface DayNutrientSummary {
  date: DateString;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  entriesCount: number;
}

export interface NutritionAverages {
  daysLogged: number;
  totalDays: number;
  coveragePct: number;
  avgCalories: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  avgFiber: number | null;
  totalCalories: number;
  daysInCalorieRange: number | null;
  daysMeetingProtein: number | null;
}

export interface MealDistributionItem {
  category: MealCategory;
  label: string;
  totalCalories: number;
  sharePct: number;
  daysLogged: number;
  avgCaloriesPerLoggedMeal: number | null;
}

export interface FrequentFoodItem {
  key: string;
  name: string;
  brand?: string | null;
  count: number;
  totalCalories: number;
  totalProtein: number;
  isRecipe: boolean;
}

/**
 * Normalizes text for identity comparison: lowercase, trim, collapse whitespace.
 */
export function normalizeIdentityText(text: string | null | undefined): string {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

export interface DailyIntakePoint {
  date: DateString;
  logged: boolean;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface AnalyticsDeltas {
  avgCalories: number | null;
  avgProtein: number | null;
  daysLogged: number;
  coveragePct: number;
}

/**
 * Group raw entries into daily summaries.
 */
export function groupEntriesByDay(entries: RawFoodLogItem[]): Map<DateString, DayNutrientSummary> {
  const byDay = new Map<DateString, DayNutrientSummary>();
  for (const e of entries) {
    const existing = byDay.get(e.date) ?? {
      date: e.date,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      entriesCount: 0,
    };
    existing.calories += e.calories;
    existing.protein += e.protein;
    existing.carbs += e.carbs;
    existing.fat += e.fat;
    existing.fiber += e.fiber ?? 0;
    existing.entriesCount += 1;
    byDay.set(e.date, existing);
  }
  return byDay;
}

/**
 * Compute descriptive nutrition statistics over a period.
 * Missing days are explicitly NOT treated as 0 kcal/protein.
 */
export function calculateNutritionStats(
  dailyMap: Map<DateString, DayNutrientSummary>,
  from: DateString,
  to: DateString,
  totalDays: number,
  goals?: Partial<NutritionGoals> | null
): NutritionAverages {
  const loggedDays = [...dailyMap.values()].filter((d) => d.date >= from && d.date <= to);
  const count = loggedDays.length;

  if (count === 0) {
    return {
      daysLogged: 0,
      totalDays,
      coveragePct: 0,
      avgCalories: null,
      avgProtein: null,
      avgCarbs: null,
      avgFat: null,
      avgFiber: null,
      totalCalories: 0,
      daysInCalorieRange: null,
      daysMeetingProtein: null,
    };
  }

  const sumCal = loggedDays.reduce((s, d) => s + d.calories, 0);
  const sumPro = loggedDays.reduce((s, d) => s + d.protein, 0);
  const sumCarb = loggedDays.reduce((s, d) => s + d.carbs, 0);
  const sumFat = loggedDays.reduce((s, d) => s + d.fat, 0);
  const sumFib = loggedDays.reduce((s, d) => s + d.fiber, 0);

  const calGoal = goals?.calories && goals.calories > 0 ? goals.calories : null;
  const proGoal = goals?.protein && goals.protein > 0 ? goals.protein : null;

  const daysInRange = calGoal !== null
    ? loggedDays.filter((d) => Math.abs(d.calories - calGoal) <= calGoal * 0.1).length
    : null;

  const daysMetProtein = proGoal !== null
    ? loggedDays.filter((d) => d.protein >= proGoal).length
    : null;

  return {
    daysLogged: count,
    totalDays,
    coveragePct: round((count / (totalDays || 1)) * 100, 0),
    avgCalories: round(sumCal / count, 0),
    avgProtein: round(sumPro / count, 1),
    avgCarbs: round(sumCarb / count, 1),
    avgFat: round(sumFat / count, 1),
    avgFiber: round(sumFib / count, 1),
    totalCalories: Math.round(sumCal),
    daysInCalorieRange: daysInRange,
    daysMeetingProtein: daysMetProtein,
  };
}

/**
 * Computes descriptive delta between current and previous period.
 */
export function calculateDeltas(
  curr: NutritionAverages,
  prev: NutritionAverages
): AnalyticsDeltas {
  const avgCalories = curr.avgCalories !== null && prev.avgCalories !== null
    ? curr.avgCalories - prev.avgCalories
    : null;

  const avgProtein = curr.avgProtein !== null && prev.avgProtein !== null
    ? round(curr.avgProtein - prev.avgProtein, 1)
    : null;

  const daysLogged = curr.daysLogged - prev.daysLogged;
  const coveragePct = curr.coveragePct - prev.coveragePct;

  return {
    avgCalories,
    avgProtein,
    daysLogged,
    coveragePct,
  };
}

/**
 * Breakdown of calorie contribution by meal category.
 */
export function calculateMealDistribution(
  entries: RawFoodLogItem[],
  from: DateString,
  to: DateString
): MealDistributionItem[] {
  const inRange = entries.filter((e) => e.date >= from && e.date <= to);
  const categoryCalories: Record<MealCategory, number> = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  };
  const categoryDates: Record<MealCategory, Set<string>> = {
    breakfast: new Set(),
    lunch: new Set(),
    dinner: new Set(),
    snack: new Set(),
  };

  let totalCalories = 0;
  for (const e of inRange) {
    const cat = e.mealCategory.toLowerCase() as MealCategory;
    if (MEAL_CATEGORIES.includes(cat)) {
      categoryCalories[cat] += e.calories;
      categoryDates[cat].add(e.date);
      totalCalories += e.calories;
    }
  }

  const categoryLabels: Record<MealCategory, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snacks",
  };

  return MEAL_CATEGORIES.map((cat) => {
    const cals = Math.round(categoryCalories[cat]);
    const share = totalCalories > 0 ? round((cals / totalCalories) * 100, 1) : 0;
    const days = categoryDates[cat].size;
    const avg = days > 0 ? Math.round(cals / days) : null;

    return {
      category: cat,
      label: categoryLabels[cat],
      totalCalories: cals,
      sharePct: share,
      daysLogged: days,
      avgCaloriesPerLoggedMeal: avg,
    };
  });
}

/**
 * Stable grouping of frequently logged foods/recipes.
 * Preserves snapshot identity and handles deleted master items cleanly.
 */
export function calculateFrequentFoods(
  entries: RawFoodLogItem[],
  from: DateString,
  to: DateString,
  limit = 8
): FrequentFoodItem[] {
  const inRange = entries.filter((e) => e.date >= from && e.date <= to);
  const map = new Map<
    string,
    { name: string; brand: string | null; count: number; calories: number; protein: number; isRecipe: boolean }
  >();

  for (const e of inRange) {
    let key: string;
    let isRecipe = false;

    if (e.foodId) {
      key = `food:${e.foodId}`;
    } else if (e.recipeId) {
      key = `recipe:${e.recipeId}`;
      isRecipe = true;
    } else {
      const normName = normalizeIdentityText(e.name);
      const normBrand = normalizeIdentityText(e.brand);
      const normUnit = normalizeIdentityText(e.servingUnit);
      key = `fallback:${normName}::${normBrand}::${normUnit}`;
    }

    const existing = map.get(key) ?? {
      name: e.name,
      brand: e.brand?.trim() || null,
      count: 0,
      calories: 0,
      protein: 0,
      isRecipe,
    };

    existing.count += 1;
    existing.calories += e.calories;
    existing.protein += e.protein;
    map.set(key, existing);
  }

  return [...map.entries()]
    .map(([key, data]) => ({
      key,
      name: data.name,
      brand: data.brand,
      count: data.count,
      totalCalories: Math.round(data.calories),
      totalProtein: round(data.protein, 1),
      isRecipe: data.isRecipe,
    }))
    .sort((a, b) => b.count - a.count || b.totalCalories - a.totalCalories)
    .slice(0, limit);
}

/**
 * Builds chronological daily points spanning the full date range [from, to].
 * Days without logs are returned with `logged: false` and null values.
 */
export function buildDailyIntakePoints(
  dailyMap: Map<DateString, DayNutrientSummary>,
  from: DateString,
  to: DateString
): DailyIntakePoint[] {
  const points: DailyIntakePoint[] = [];
  const daysCount = diffDays(from, to) + 1;

  for (let i = 0; i < daysCount; i++) {
    const d = addDays(from, i);
    const summary = dailyMap.get(d);

    if (summary && summary.entriesCount > 0) {
      points.push({
        date: d,
        logged: true,
        calories: Math.round(summary.calories),
        protein: round(summary.protein, 1),
        carbs: round(summary.carbs, 1),
        fat: round(summary.fat, 1),
      });
    } else {
      points.push({
        date: d,
        logged: false,
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
      });
    }
  }

  return points;
}
