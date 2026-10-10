import type { MealCategory } from "@/lib/domain";

/** The meal a person is most likely logging right now, from the local hour. */
export function suggestMeal(hour: number = new Date().getHours()): MealCategory {
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}
