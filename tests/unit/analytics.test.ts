import { describe, expect, it } from "vitest";
import {
  computePeriodDates,
  groupEntriesByDay,
  calculateNutritionStats,
  calculateDeltas,
  calculateMealDistribution,
  calculateFrequentFoods,
  buildDailyIntakePoints,
  type RawFoodLogItem,
} from "@/lib/nutrition/analytics";

describe("Analytics Core Math & Utilities", () => {
  it("computes exact period dates and immediate comparison periods", () => {
    const p30 = computePeriodDates("2026-10-30", "30d");
    expect(p30.totalDays).toBe(30);
    expect(p30.current.to).toBe("2026-10-30");
    expect(p30.current.from).toBe("2026-10-01"); // 30 days inclusive
    expect(p30.previous.to).toBe("2026-09-30");
    expect(p30.previous.from).toBe("2026-09-01"); // 30 days inclusive

    const p7 = computePeriodDates("2026-10-07", "7d");
    expect(p7.totalDays).toBe(7);
    expect(p7.current.to).toBe("2026-10-07");
    expect(p7.current.from).toBe("2026-10-01"); // 7 days inclusive
    expect(p7.previous.to).toBe("2026-09-30");
    expect(p7.previous.from).toBe("2026-09-24"); // 7 days inclusive

    // Leap year handling: 2024 is a leap year
    const pLeap = computePeriodDates("2024-03-05", "7d");
    expect(pLeap.current.from).toBe("2024-02-28"); // Feb 28, Feb 29, Mar 1, 2, 3, 4, 5 = 7 days
  });

  it("defines logged days strictly by existence of entries (missing days are not zero-calorie days)", () => {
    const raw: RawFoodLogItem[] = [
      { id: "1", date: "2026-10-01", mealCategory: "lunch", name: "Chicken", calories: 600, protein: 50, carbs: 10, fat: 15 },
      { id: "2", date: "2026-10-01", mealCategory: "dinner", name: "Rice", calories: 400, protein: 10, carbs: 80, fat: 2 },
      { id: "3", date: "2026-10-03", mealCategory: "breakfast", name: "Oats", calories: 500, protein: 20, carbs: 60, fat: 10 },
    ];

    const daily = groupEntriesByDay(raw);
    expect(daily.size).toBe(2); // 2 distinct dates: 2026-10-01 and 2026-10-03

    // Over a 5-day period (2026-10-01 to 2026-10-05)
    const stats = calculateNutritionStats(daily, "2026-10-01", "2026-10-05", 5);

    expect(stats.daysLogged).toBe(2);
    expect(stats.totalDays).toBe(5);
    expect(stats.coveragePct).toBe(40); // 2 / 5 = 40%

    // Total calories = 1000 on Oct 1 + 500 on Oct 3 = 1500 kcal
    // Average on logged days must be 1500 / 2 = 750 kcal, NOT 1500 / 5 = 300 kcal!
    expect(stats.avgCalories).toBe(750);
    expect(stats.avgProtein).toBe(40); // (60 + 20) / 2 = 40g
  });

  it("handles empty periods with null averages instead of zero", () => {
    const daily = groupEntriesByDay([]);
    const stats = calculateNutritionStats(daily, "2026-10-01", "2026-10-30", 30);

    expect(stats.daysLogged).toBe(0);
    expect(stats.coveragePct).toBe(0);
    expect(stats.avgCalories).toBeNull();
    expect(stats.avgProtein).toBeNull();
    expect(stats.avgCarbs).toBeNull();
    expect(stats.avgFat).toBeNull();
    expect(stats.daysInCalorieRange).toBeNull();
    expect(stats.daysMeetingProtein).toBeNull();
  });

  it("distinguishes legitimate 0 kcal logged from unlogged days", () => {
    const raw: RawFoodLogItem[] = [
      { id: "1", date: "2026-10-01", mealCategory: "snack", name: "Water fasting log", calories: 0, protein: 0, carbs: 0, fat: 0 },
    ];
    const daily = groupEntriesByDay(raw);
    const stats = calculateNutritionStats(daily, "2026-10-01", "2026-10-02", 2);

    expect(stats.daysLogged).toBe(1);
    expect(stats.avgCalories).toBe(0); // Legitimate 0 kcal logged day

    const points = buildDailyIntakePoints(daily, "2026-10-01", "2026-10-02");
    expect(points[0]).toEqual({
      date: "2026-10-01",
      logged: true,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    expect(points[1]).toEqual({
      date: "2026-10-02",
      logged: false,
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
    });
  });

  it("evaluates calorie target range (±10%) and protein target hit correctly", () => {
    const raw: RawFoodLogItem[] = [
      // Day 1: 2200 kcal (within 2000 ± 200), 160g protein (hits 150g)
      { id: "1", date: "2026-10-01", mealCategory: "lunch", name: "Meal 1", calories: 2200, protein: 160, carbs: 200, fat: 60 },
      // Day 2: 1700 kcal (outside 2000 ± 200), 140g protein (misses 150g)
      { id: "2", date: "2026-10-02", mealCategory: "lunch", name: "Meal 2", calories: 1700, protein: 140, carbs: 150, fat: 50 },
      // Day 3: 2050 kcal (within 2000 ± 200), 150g protein (hits 150g)
      { id: "3", date: "2026-10-03", mealCategory: "lunch", name: "Meal 3", calories: 2050, protein: 150, carbs: 180, fat: 55 },
    ];
    const daily = groupEntriesByDay(raw);
    const goals = { calories: 2000, protein: 150, carbs: 200, fat: 60, waterMl: 2500, fiber: null, sodium: null };

    const stats = calculateNutritionStats(daily, "2026-10-01", "2026-10-03", 3, goals);

    expect(stats.daysInCalorieRange).toBe(2); // Day 1 and Day 3
    expect(stats.daysMeetingProtein).toBe(2); // Day 1 and Day 3
  });

  it("handles missing goals safely without NaN or divide-by-zero", () => {
    const raw: RawFoodLogItem[] = [
      { id: "1", date: "2026-10-01", mealCategory: "lunch", name: "Meal", calories: 2000, protein: 150, carbs: 200, fat: 60 },
    ];
    const daily = groupEntriesByDay(raw);
    const stats = calculateNutritionStats(daily, "2026-10-01", "2026-10-01", 1, null);

    expect(stats.daysInCalorieRange).toBeNull();
    expect(stats.daysMeetingProtein).toBeNull();
    expect(stats.avgCalories).toBe(2000);
  });

  it("calculates descriptive deltas between current and previous periods", () => {
    const currStats = {
      daysLogged: 24,
      totalDays: 30,
      coveragePct: 80,
      avgCalories: 2180,
      avgProtein: 164.2,
      avgCarbs: 220,
      avgFat: 70,
      avgFiber: 30,
      totalCalories: 52320,
      daysInCalorieRange: 18,
      daysMeetingProtein: 15,
    };
    const prevStats = {
      daysLogged: 20,
      totalDays: 30,
      coveragePct: 67,
      avgCalories: 2106,
      avgProtein: 170.2,
      avgCarbs: 210,
      avgFat: 68,
      avgFiber: 28,
      totalCalories: 42120,
      daysInCalorieRange: 14,
      daysMeetingProtein: 16,
    };

    const deltas = calculateDeltas(currStats, prevStats);
    expect(deltas.avgCalories).toBe(74); // +74 kcal vs previous period
    expect(deltas.avgProtein).toBe(-6.0); // -6.0 g vs previous period
    expect(deltas.daysLogged).toBe(4);
    expect(deltas.coveragePct).toBe(13);
  });

  it("calculates meal distribution and frequency across meal categories", () => {
    const raw: RawFoodLogItem[] = [
      { id: "1", date: "2026-10-01", mealCategory: "breakfast", name: "Eggs", calories: 400, protein: 30, carbs: 5, fat: 25 },
      { id: "2", date: "2026-10-01", mealCategory: "lunch", name: "Chicken Bowl", calories: 800, protein: 60, carbs: 90, fat: 20 },
      { id: "3", date: "2026-10-01", mealCategory: "dinner", name: "Salmon", calories: 600, protein: 45, carbs: 10, fat: 35 },
      { id: "4", date: "2026-10-01", mealCategory: "snack", name: "Yogurt", calories: 200, protein: 20, carbs: 15, fat: 5 },
      { id: "5", date: "2026-10-02", mealCategory: "lunch", name: "Salad", calories: 400, protein: 20, carbs: 30, fat: 15 },
    ];
    // Total = 400 + 800 + 600 + 200 + 400 = 2400 kcal
    // Breakfast: 400 (16.7%), 1 day
    // Lunch: 1200 (50.0%), 2 days
    // Dinner: 600 (25.0%), 1 day
    // Snacks: 200 (8.3%), 1 day

    const dist = calculateMealDistribution(raw, "2026-10-01", "2026-10-02");
    expect(dist).toHaveLength(4);

    const lunch = dist.find((d) => d.category === "lunch")!;
    expect(lunch.totalCalories).toBe(1200);
    expect(lunch.sharePct).toBe(50.0);
    expect(lunch.daysLogged).toBe(2);
    expect(lunch.avgCaloriesPerLoggedMeal).toBe(600); // 1200 / 2

    const breakfast = dist.find((d) => d.category === "breakfast")!;
    expect(breakfast.totalCalories).toBe(400);
    expect(breakfast.sharePct).toBe(16.7);
    expect(breakfast.daysLogged).toBe(1);
  });

  it("groups frequently logged foods using stable foodId, recipeId, and snapshot name fallback", () => {
    const raw: RawFoodLogItem[] = [
      // 3 logs with foodId "f1"
      { id: "1", date: "2026-10-01", mealCategory: "lunch", name: "Greek Yogurt", calories: 150, protein: 18, carbs: 8, fat: 2, foodId: "f1" },
      { id: "2", date: "2026-10-02", mealCategory: "lunch", name: "Greek Yogurt (0%)", calories: 150, protein: 18, carbs: 8, fat: 2, foodId: "f1" },
      { id: "3", date: "2026-10-03", mealCategory: "lunch", name: "Greek Yogurt Plain", calories: 150, protein: 18, carbs: 8, fat: 2, foodId: "f1" },

      // 2 logs with recipeId "r1"
      { id: "4", date: "2026-10-01", mealCategory: "breakfast", name: "Protein Pancakes", calories: 450, protein: 40, carbs: 50, fat: 8, recipeId: "r1" },
      { id: "5", date: "2026-10-02", mealCategory: "breakfast", name: "Protein Pancakes", calories: 450, protein: 40, carbs: 50, fat: 8, recipeId: "r1" },

      // 1 log with deleted foodId (null), fallback to name
      { id: "6", date: "2026-10-01", mealCategory: "dinner", name: "Steak", calories: 500, protein: 50, carbs: 0, fat: 30, foodId: null, servingUnit: "g" },
    ];

    const freq = calculateFrequentFoods(raw, "2026-10-01", "2026-10-03");

    expect(freq).toHaveLength(3);
    // Highest count is Greek Yogurt (3 logs)
    expect(freq[0].name).toBe("Greek Yogurt");
    expect(freq[0].count).toBe(3);
    expect(freq[0].totalCalories).toBe(450);
    expect(freq[0].isRecipe).toBe(false);

    // Second is Protein Pancakes (2 logs, recipe)
    expect(freq[1].name).toBe("Protein Pancakes");
    expect(freq[1].count).toBe(2);
    expect(freq[1].totalCalories).toBe(900);
    expect(freq[1].isRecipe).toBe(true);

    // Third is Steak (1 log)
    expect(freq[2].name).toBe("Steak");
    expect(freq[2].count).toBe(1);
    expect(freq[2].isRecipe).toBe(false);
  });

  it("keeps different brands distinct in fallback identity when foodId and recipeId are null (e.g. Fage vs Chobani)", () => {
    const raw: RawFoodLogItem[] = [
      // Greek Yogurt from Fage (2 logs)
      { id: "1", date: "2026-10-01", mealCategory: "snack", name: "Greek Yogurt", brand: "Fage", servingUnit: "g", calories: 150, protein: 18, carbs: 8, fat: 0, foodId: null },
      { id: "2", date: "2026-10-02", mealCategory: "snack", name: "Greek Yogurt", brand: "  fage  ", servingUnit: "g", calories: 150, protein: 18, carbs: 8, fat: 0, foodId: null },

      // Greek Yogurt from Chobani (1 log)
      { id: "3", date: "2026-10-03", mealCategory: "snack", name: "Greek Yogurt", brand: "Chobani", servingUnit: "g", calories: 140, protein: 16, carbs: 10, fat: 0, foodId: null },

      // Greek Yogurt generic / unbranded (null / empty brand) (1 log)
      { id: "4", date: "2026-10-04", mealCategory: "snack", name: "Greek Yogurt", brand: null, servingUnit: "g", calories: 130, protein: 15, carbs: 9, fat: 0, foodId: null },
    ];

    const freq = calculateFrequentFoods(raw, "2026-10-01", "2026-10-04");

    // Must be 3 distinct items: Fage, Chobani, and Unbranded/Generic
    expect(freq).toHaveLength(3);

    const fage = freq.find((f) => f.brand?.toLowerCase() === "fage");
    expect(fage).toBeDefined();
    expect(fage?.count).toBe(2);
    expect(fage?.totalCalories).toBe(300);

    const chobani = freq.find((f) => f.brand?.toLowerCase() === "chobani");
    expect(chobani).toBeDefined();
    expect(chobani?.count).toBe(1);
    expect(chobani?.totalCalories).toBe(140);

    const unbranded = freq.find((f) => !f.brand);
    expect(unbranded).toBeDefined();
    expect(unbranded?.count).toBe(1);
    expect(unbranded?.totalCalories).toBe(130);
  });

  it("normalizes brand and serving unit accurately (whitespace, casing) without merging distinct foods", () => {
    const raw: RawFoodLogItem[] = [
      { id: "1", date: "2026-10-01", mealCategory: "lunch", name: "Almond Milk", brand: "Silk", servingUnit: "cup", calories: 60, protein: 1, carbs: 3, fat: 5, foodId: null },
      { id: "2", date: "2026-10-02", mealCategory: "lunch", name: "Almond   Milk", brand: " silk ", servingUnit: " cup ", calories: 60, protein: 1, carbs: 3, fat: 5, foodId: null },
      // Different serving unit
      { id: "3", date: "2026-10-03", mealCategory: "lunch", name: "Almond Milk", brand: "Silk", servingUnit: "ml", calories: 25, protein: 0.5, carbs: 1.5, fat: 2, foodId: null },
    ];

    const freq = calculateFrequentFoods(raw, "2026-10-01", "2026-10-03");
    expect(freq).toHaveLength(2);

    const cupGroup = freq.find((f) => f.count === 2);
    expect(cupGroup).toBeDefined();
    expect(cupGroup?.totalCalories).toBe(120);

    const mlGroup = freq.find((f) => f.count === 1);
    expect(mlGroup).toBeDefined();
    expect(mlGroup?.totalCalories).toBe(25);
  });
});
