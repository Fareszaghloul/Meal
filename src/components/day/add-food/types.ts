import type { FoodSummary, MealTemplate, RecipeSummary } from "@/lib/domain";
import type { Nutrients } from "@/lib/nutrition/core";
import type { NormalizedFood } from "@/lib/nutrition/providers/types";

export type FoodFilterType = "all" | "recent" | "frequent" | "favorites" | "saved" | "mine" | "recipes" | "restaurants" | "online";

export type UnifiedItem =
  | { kind: "food"; food: FoodSummary }
  | { kind: "recipe"; recipe: RecipeSummary }
  | { kind: "template"; template: MealTemplate }
  | { kind: "online"; food: NormalizedFood };

export type EntryDraft = Nutrients & {
  name: string;
  servings: number;
  servingUnit: string;
  foodId: string | null;
  recipeId: string | null;
  brand?: string | null;
};
