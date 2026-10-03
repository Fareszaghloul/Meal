import type { FoodServing, FoodSummary } from "@/lib/domain";

export interface ServingOption {
  id: string; // "g" for raw grams, otherwise the FoodServing id
  label: string;
  grams: number; // grams per 1 unit of this option
}

/** Options to offer in a portion picker: each named serving, then plain grams (or ml). */
export function servingOptions(food: Pick<FoodSummary, "servings" | "servingSize" | "servingUnit" | "servingWeightGrams" | "defaultUnit">): ServingOption[] {
  const named: ServingOption[] = (food.servings ?? [])
    .slice()
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.sortOrder - b.sortOrder)
    .map((s) => ({ id: s.id, label: s.label, grams: s.grams }));
  // Legacy single-serving foods (no FoodServing rows) still get their label serving.
  if (named.length === 0 && food.servingSize && food.servingUnit && food.servingUnit !== "g" && food.servingUnit !== "ml" && food.servingWeightGrams > 0) {
    named.push({ id: "legacy", label: `${food.servingSize % 1 ? food.servingSize : Math.round(food.servingSize)} ${food.servingUnit}`, grams: food.servingWeightGrams });
  }
  const unit = food.defaultUnit === "ml" ? "ml" : "g";
  return [...named, { id: "g", label: unit, grams: 1 }];
}

/** The serving a one-tap add should use. */
export function defaultServing(food: Parameters<typeof servingOptions>[0]): { option: ServingOption; quantity: number } {
  const opts = servingOptions(food);
  if (opts[0].id !== "g") return { option: opts[0], quantity: 1 };
  return { option: opts[0], quantity: food.servingWeightGrams > 0 ? food.servingWeightGrams : 100 };
}

/** How a logged entry should describe this portion: "2 slice" → servings 2 unit "slice"; grams → servings N unit "g". */
export function portionToEntry(option: ServingOption, quantity: number): { servings: number; servingUnit: string; grams: number } {
  if (option.id === "g") return { servings: quantity, servingUnit: option.label, grams: quantity };
  // "1 egg (50 g)" → unit "egg"; "1/2 cup (120 g)" keeps "1/2 cup" as the unit so "2 × 1/2 cup" reads right.
  const unit = option.label.replace(/\s*\(.*\)\s*$/, "").replace(/^1\s+/, "");
  return { servings: quantity, servingUnit: unit || "serving", grams: quantity * option.grams };
}

export type { FoodServing };
