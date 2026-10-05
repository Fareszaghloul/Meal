
export interface MacroProfile {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
}

export interface MacroWeights {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const DEFAULT_MACRO_WEIGHTS: MacroWeights = {
  calories: 2.0,
  protein: 2.5,
  carbs: 1.0,
  fat: 1.0,
};

/**
 * Calculates a normalized, weighted distance between candidate macros and target macros.
 * Lower distance means a closer match (0 is exact match).
 * Handles zero targets safely without division by zero, NaN, or Infinity.
 */
export function nutritionDistance(
  candidate: MacroProfile,
  target: MacroProfile,
  weights: MacroWeights = DEFAULT_MACRO_WEIGHTS
): number {
  const safeDivide = (candVal: number, targVal: number, fallbackScale: number): number => {
    const denom = targVal > 0 ? targVal : fallbackScale;
    if (denom <= 0) return 0;
    return Math.abs(candVal - targVal) / denom;
  };

  // Fallbacks if target is 0: calories ~500, protein ~30, carbs ~50, fat ~15
  const calDist = safeDivide(candidate.calories, target.calories, 500);
  const proDist = safeDivide(candidate.protein, target.protein, 30);
  const carbDist = safeDivide(candidate.carbs, target.carbs, 50);
  const fatDist = safeDivide(candidate.fat, target.fat, 15);

  const totalWeight = weights.calories + weights.protein + weights.carbs + weights.fat;
  if (totalWeight <= 0) return 0;

  const weightedSum =
    calDist * weights.calories +
    proDist * weights.protein +
    carbDist * weights.carbs +
    fatDist * weights.fat;

  const score = weightedSum / totalWeight;
  return Number.isFinite(score) ? score : 0;
}

/**
 * Calculates a 0-100% macro fit score.
 * 100% is exact match, decreasing as distance grows.
 */
export function calculateFitPercentage(
  candidate: MacroProfile,
  target: MacroProfile,
  weights: MacroWeights = DEFAULT_MACRO_WEIGHTS
): number {
  const dist = nutritionDistance(candidate, target, weights);
  // An average relative distance of 0 -> 100%, 0.25 (25% off) -> 75%, >=1.0 -> 0%
  const fit = Math.max(0, Math.min(100, Math.round((1 - dist) * 100)));
  return Number.isFinite(fit) ? fit : 0;
}

/**
 * Returns an explainable descriptive fit label based on the fit percentage.
 */
export function getFitLabel(fitPercentage: number): "Excellent fit" | "Good fit" | "Okay fit" | "Moderate fit" {
  if (fitPercentage >= 85) return "Excellent fit";
  if (fitPercentage >= 70) return "Good fit";
  if (fitPercentage >= 50) return "Okay fit";
  return "Moderate fit";
}

/**
 * Calculates macro differences between candidate and current meal.
 */
export function calculateMacroDiff(
  candidate: MacroProfile,
  reference: MacroProfile
): {
  caloriesDiff: number;
  proteinDiff: number;
  carbsDiff: number;
  fatDiff: number;
} {
  return {
    caloriesDiff: Math.round(candidate.calories - reference.calories),
    proteinDiff: Math.round((candidate.protein - reference.protein) * 10) / 10,
    carbsDiff: Math.round((candidate.carbs - reference.carbs) * 10) / 10,
    fatDiff: Math.round((candidate.fat - reference.fat) * 10) / 10,
  };
}
