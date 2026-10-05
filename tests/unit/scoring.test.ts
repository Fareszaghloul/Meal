import { describe, it, expect } from "vitest";
import {
  nutritionDistance,
  calculateFitPercentage,
  getFitLabel,
  calculateMacroDiff,
} from "@/lib/nutrition/scoring";

describe("nutrition scoring utilities", () => {
  it("computes 0 distance and 100% fit for identical macros", () => {
    const profile = { calories: 600, protein: 45, carbs: 60, fat: 15 };
    const dist = nutritionDistance(profile, profile);
    expect(dist).toBe(0);
    expect(calculateFitPercentage(profile, profile)).toBe(100);
    expect(getFitLabel(100)).toBe("Excellent fit");
  });

  it("handles zero targets without division by zero or NaN", () => {
    const candidate = { calories: 500, protein: 30, carbs: 50, fat: 15 };
    const zeroTarget = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const dist = nutritionDistance(candidate, zeroTarget);
    expect(Number.isFinite(dist)).toBe(true);
    expect(dist).toBeGreaterThan(0);

    const fit = calculateFitPercentage(candidate, zeroTarget);
    expect(Number.isFinite(fit)).toBe(true);
  });

  it("prioritizes protein when protein distance is large", () => {
    const target = { calories: 600, protein: 50, carbs: 50, fat: 15 };
    // Good protein, slightly off calories
    const candidateA = { calories: 650, protein: 50, carbs: 50, fat: 15 };
    // Exact calories, very poor protein
    const candidateB = { calories: 600, protein: 20, carbs: 50, fat: 15 };

    const distA = nutritionDistance(candidateA, target);
    const distB = nutritionDistance(candidateB, target);

    expect(distA).toBeLessThan(distB);
  });

  it("computes accurate macro differences", () => {
    const cand = { calories: 535, protein: 46, carbs: 58, fat: 15 };
    const curr = { calories: 520, protein: 48, carbs: 56, fat: 14 };
    const diff = calculateMacroDiff(cand, curr);

    expect(diff.caloriesDiff).toBe(15);
    expect(diff.proteinDiff).toBe(-2);
    expect(diff.carbsDiff).toBe(2);
    expect(diff.fatDiff).toBe(1);
  });

  it("returns appropriate qualitative labels", () => {
    expect(getFitLabel(95)).toBe("Excellent fit");
    expect(getFitLabel(75)).toBe("Good fit");
    expect(getFitLabel(55)).toBe("Okay fit");
    expect(getFitLabel(30)).toBe("Moderate fit");
  });
});
