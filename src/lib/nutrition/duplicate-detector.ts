import type { FoodSummary } from "@/lib/domain";

/**
 * Normalizes a food name for robust duplicate comparison and partial matching.
 * Preserves user formatting for display, but strips extraneous punctuation,
 * collapses multiple spaces, and normalizes casing for comparison.
 */
export function normalizeFoodName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // replace punctuation/symbols with space
    .replace(/\s+/g, " ")      // collapse repeated whitespace
    .trim();
}

/**
 * Normalizes brand string for comparison.
 */
export function normalizeBrand(brand?: string | null): string {
  if (!brand) return "";
  return brand
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface DuplicateCandidate {
  food: FoodSummary;
  confidence: "high" | "medium";
  reason: string;
}

/**
 * Checks candidate foods against a target name, brand, and optional nutrition values.
 * Identifies likely duplicates before creation without blocking legitimate variations.
 */
export function findDuplicateCandidates(
  target: {
    name: string;
    brand?: string | null;
    caloriesPer100g?: number | null;
    servingWeightGrams?: number | null;
  },
  existingFoods: FoodSummary[],
  excludeId?: string | null
): DuplicateCandidate[] {
  const normTargetName = normalizeFoodName(target.name);
  if (!normTargetName || normTargetName.length < 2) return [];

  const normTargetBrand = normalizeBrand(target.brand);
  const targetTokens = new Set(normTargetName.split(" ").filter((t) => t.length > 1));

  const candidates: DuplicateCandidate[] = [];

  for (const food of existingFoods) {
    if (excludeId && food.id === excludeId) continue;

    const candName = normalizeFoodName(food.name);
    const candBrand = normalizeBrand(food.brand);

    // 1. Identical normalized name
    if (candName === normTargetName) {
      if (!normTargetBrand || !candBrand || normTargetBrand === candBrand) {
        candidates.push({
          food,
          confidence: "high",
          reason: candBrand && normTargetBrand ? "Exact name and brand match" : "Exact name match",
        });
        continue;
      } else {
        // Same name but different specified brand (e.g. Chicken Breast - Perdue vs Tyson)
        candidates.push({
          food,
          confidence: "medium",
          reason: `Same name from different brand (${food.brand || "generic"})`,
        });
        continue;
      }
    }

    // 2. Token overlap & substring check
    const candTokens = candName.split(" ").filter((t) => t.length > 1);
    const commonTokens = candTokens.filter((t) => targetTokens.has(t));
    const tokenOverlapRatio =
      commonTokens.length / Math.max(targetTokens.size, candTokens.length);

    const isSubstr = candName.includes(normTargetName) || normTargetName.includes(candName);
    const brandsMatch = normTargetBrand && candBrand && normTargetBrand === candBrand;

    if (isSubstr && (brandsMatch || (!normTargetBrand && !candBrand))) {
      candidates.push({
        food,
        confidence: "medium",
        reason: "Similar name and brand",
      });
      continue;
    }

    if (tokenOverlapRatio >= 0.75) {
      // Check if calories are also closely aligned (within 15%)
      const calTarget = target.caloriesPer100g;
      const calCand = food.caloriesPer100g;
      const calSimilar =
        calTarget !== null &&
        calTarget !== undefined &&
        calCand !== undefined &&
        Math.abs(calTarget - calCand) <= Math.max(15, calTarget * 0.15);

      candidates.push({
        food,
        confidence: calSimilar ? "high" : "medium",
        reason: calSimilar ? "Very similar name and calories" : "Very similar name",
      });
    }
  }

  // Sort candidates by confidence (high first), then closest name length
  return candidates.sort((a, b) => {
    if (a.confidence === "high" && b.confidence !== "high") return -1;
    if (b.confidence === "high" && a.confidence !== "high") return 1;
    return Math.abs(a.food.name.length - target.name.length) - Math.abs(b.food.name.length - target.name.length);
  });
}
