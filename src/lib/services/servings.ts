import type { z } from "zod";
import type { servingsInput } from "@/lib/validation";

type ServingIn = z.infer<typeof servingsInput>[number];

/**
 * Rows to create for a food's servings. When the client sent none, derive one
 * from the legacy single-serving fields so every food has at least a label serving
 * (unless its serving is already plain grams/ml).
 */
export function servingRows(
  sent: ServingIn[] | null,
  legacy: { servingSize: number | null; servingUnit: string | null; servingWeightGrams: number }
): Array<{ label: string; grams: number; isDefault: boolean; sortOrder: number }> {
  if (sent && sent.length > 0) {
    const hasDefault = sent.some((s) => s.isDefault);
    return sent.map((s, i) => ({ label: s.label, grams: s.grams, isDefault: hasDefault ? !!s.isDefault : i === 0, sortOrder: i }));
  }
  const unit = legacy.servingUnit ?? "g";
  if (!legacy.servingSize || unit === "g" || unit === "ml" || !(legacy.servingWeightGrams > 0)) return [];
  const size = legacy.servingSize % 1 ? legacy.servingSize : Math.round(legacy.servingSize);
  return [{ label: `${size} ${unit}`, grams: legacy.servingWeightGrams, isDefault: true, sortOrder: 0 }];
}
