import type { Nutrients } from "@/lib/nutrition/core";
import type { DateString } from "@/lib/dates";

export const MEAL_CATEGORIES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealCategory = (typeof MEAL_CATEGORIES)[number];

export const MEAL_LABELS: Record<MealCategory, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export function isMealCategory(v: unknown): v is MealCategory {
  return typeof v === "string" && (MEAL_CATEGORIES as readonly string[]).includes(v);
}

/** A logged item. `servings` is the quantity in `servingUnit` (e.g. 150 "g", or 2 "serving"). */
export interface MealItem extends Nutrients {
  id: string;
  date: DateString;
  mealCategory: MealCategory;
  name: string;
  servings: number;
  servingUnit: string;
  foodId: string | null;
  recipeId: string | null;
  loggedAt: string;
  /** Present only on client while an optimistic write is pending / failed. */
  _pending?: "saving" | "failed";
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sodium: number | null;
  waterMl: number;
}

export interface WeightSummary {
  latestKg: number | null;
  latestDate: DateString | null;
  avg7Kg: number | null;
  change7Kg: number | null;
  change30Kg: number | null;
  startKg: number | null;
  goalKg: number | null;
  unit: "kg" | "lbs";
}

/** Everything the dashboard needs for one day, in one response. */
export interface DayData {
  date: DateString;
  entries: MealItem[];
  totals: Nutrients;
  water: { totalMl: number; goalMl: number };
  goals: NutritionGoals;
  weight: WeightSummary;
}

export interface DayStatus {
  date: DateString;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  entryCount?: number;
  mealsLogged: number; // distinct meal categories with at least one entry
  mealCalories?: Partial<Record<MealCategory, number>>;
  waterMl?: number;
  weightKg?: number;
}

export interface MonthHistoryDay {
  date: DateString;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entryCount: number;
  mealsLogged: number;
  mealCalories: Partial<Record<MealCategory, number>>;
  waterMl: number;
  weightKg: number | null;
}

export interface MonthHistoryResponse {
  month: string; // "YYYY-MM"
  weightUnit: "kg" | "lbs";
  days: Record<DateString, MonthHistoryDay>;
  goals: NutritionGoals;
  summary: {
    loggedDays: number;
    totalCalories: number;
    avgCalories: number;
    avgProtein: number;
  };
}

export interface FoodServing {
  id: string;
  label: string; // "1 egg", "1 cup", "1 slice"
  grams: number;
  isDefault: boolean;
  sortOrder: number;
}

/** A reusable food, as the client sees it. */
export interface FoodSummary {
  servings: FoodServing[];
  defaultUnit: string;
  source: string;
  id: string;
  name: string;
  brand: string | null;
  category: string;
  servingSize: number | null;
  servingUnit: string | null;
  servingWeightGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  totalSugarsPer100g: number | null;
  addedSugarsPer100g: number | null;
  saturatedFatPer100g: number | null;
  transFatPer100g: number | null;
  sodiumPer100g: number | null;
  barcode: string | null;
  isFavorite: boolean;
  lastUsedAt: string | null;
  useCount: number;
  userId: string | null;
}

export interface RecipeIngredientSummary extends Nutrients {
  id?: string;
  foodId: string | null;
  rawName: string;
  quantity: number;
  unit: string;
  notes?: string | null;
  sortOrder?: number;
  grams?: number | null;
}

export interface RecipeSummary {
  id: string;
  name: string;
  description?: string | null;
  servings: number;
  servingLabel?: string | null;
  yieldWeightGrams?: number | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  imageUrl?: string | null;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  fiberPerServing: number;
  totalSugarsPerServing: number | null;
  addedSugarsPerServing: number | null;
  saturatedFatPerServing: number | null;
  transFatPerServing: number | null;
  sodiumPerServing: number | null;
  isFavorite: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MealTemplateItem extends Nutrients {
  name: string;
  servings: number;
  servingUnit: string;
  foodId: string | null;
  recipeId: string | null;
}

export interface MealTemplate {
  id: string;
  name: string;
  items: MealTemplateItem[];
  useCount: number;
  createdAt: string;
}

export interface WeightEntry {
  id: string;
  date: DateString;
  time: string | null;
  entryType: "daily" | "inbody";
  weightKg: number;
  bodyFatPct: number | null;
  smmKg: number | null;
  bmi: number | null;
  notes: string | null;
  createdAt: string;
}

/** Everything the Weight page needs: bounded daily readings, all InBody scans, and the all-time summary. */
export interface WeightPageData {
  /** Daily readings from 6 days before `from` (for a correct trend at the left edge), ascending. */
  entries: WeightEntry[];
  inbody: WeightEntry[];
  summary: WeightSummary;
  measurementSystem: string;
  heightCm: number | null;
}
