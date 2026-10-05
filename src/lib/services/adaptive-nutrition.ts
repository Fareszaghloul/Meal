import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/route";
import { addDays, todayLocal } from "@/lib/dates";
import { dailyMeans, type WeightPoint } from "@/lib/nutrition/weight-trend";

export interface AdaptiveNutritionAnalysis {
  status: "ready" | "insufficient_data";
  message?: string;
  confidence: "low" | "medium" | "high";
  dataStartDate: string;
  dataEndDate: string;
  daysAnalyzed: number;
  weightDaysCount: number;
  foodLogDaysCount: number;
  currentCalories: number;
  averageLoggedCalories: number;
  observedWeeklyRateKg: number;
  targetWeeklyRateKg: number;
  rateDifferenceKg: number;
  recommendedCalories: number;
  calorieChange: number;
  reason: string;
  existingRecommendationId?: string;
}

/**
 * Calculates linear regression slope (kg/day) over daily mean weight points
 */
function calculateWeightSlope(points: WeightPoint[], startDateStr: string): number {
  if (points.length < 2) return 0;

  const startMs = new Date(startDateStr).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  let n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const p of points) {
    const x = Math.round((new Date(p.date).getTime() - startMs) / DAY_MS);
    const y = p.weightKg;

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Analyzes weight trend and actual calorie intake to produce a conservative recommendation
 */
export async function analyzeAdaptiveNutrition(
  userId: string,
  windowDays = 21
): Promise<AdaptiveNutritionAnalysis> {
  const today = todayLocal();
  const startDate = addDays(today, -windowDays);

  const [settings, weightReadings, foodLogs, existingPending] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId },
    }),
    prisma.weightEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: today },
      },
      orderBy: { date: "asc" },
    }),
    prisma.foodLogEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: today },
      },
    }),
    prisma.nutritionRecommendation.findFirst({
      where: {
        userId,
        status: "pending",
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const currentCalories = settings?.dailyCalories || 2200;
  const goalType = settings?.goalType || "maintain";
  const goalRateKg = settings?.goalWeeklyRateKg || 0;

  const dayMeans = dailyMeans(weightReadings);
  const weightDaysCount = dayMeans.length;

  const foodDays = new Set(foodLogs.map((e) => e.date));
  const foodLogDaysCount = foodDays.size;

  // Data sufficiency checks
  if (weightDaysCount < 4 || foodLogDaysCount < Math.round(windowDays * 0.5)) {
    return {
      status: "insufficient_data",
      message: `At least 4 weight readings and regular food logging over ${windowDays} days are needed for adaptive recommendations (logged ${foodLogDaysCount}/${windowDays} days, ${weightDaysCount} weigh-ins).`,
      confidence: "low",
      dataStartDate: startDate,
      dataEndDate: today,
      daysAnalyzed: windowDays,
      weightDaysCount,
      foodLogDaysCount,
      currentCalories,
      averageLoggedCalories: 0,
      observedWeeklyRateKg: 0,
      targetWeeklyRateKg: 0,
      rateDifferenceKg: 0,
      recommendedCalories: currentCalories,
      calorieChange: 0,
      reason: "More weight and food logging data is needed to identify a reliable trend.",
    };
  }

  // Calculate actual average calories logged on logged days
  const totalLoggedCalories = foodLogs.reduce((s, e) => s + e.calories, 0);
  const averageLoggedCalories = Math.round(totalLoggedCalories / foodLogDaysCount);

  // Calculate observed weight trend slope (kg/week)
  const slopePerDay = calculateWeightSlope(dayMeans, startDate);
  const observedWeeklyRateKg = Math.round(slopePerDay * 7 * 100) / 100;

  // Calculate target weekly rate (kg/week)
  let targetWeeklyRateKg = 0;
  if (goalType === "lose") {
    targetWeeklyRateKg = -Math.abs(goalRateKg);
  } else if (goalType === "gain") {
    targetWeeklyRateKg = Math.abs(goalRateKg);
  } else {
    targetWeeklyRateKg = 0;
  }

  // Rate difference (positive means gaining faster or losing slower than target)
  const rateDifferenceKg = Math.round((observedWeeklyRateKg - targetWeeklyRateKg) * 100) / 100;

  // Confidence assessment
  let confidence: "low" | "medium" | "high" = "medium";
  if (weightDaysCount >= 8 && foodLogDaysCount >= Math.round(windowDays * 0.75)) {
    confidence = "high";
  }

  // Conservative adjustment calculation
  // Rate tolerance: ±0.12 kg/week is considered on track
  let calorieChange = 0;
  let reason = "";

  if (Math.abs(rateDifferenceKg) <= 0.12) {
    calorieChange = 0;
    reason = `Your observed weight trend (${observedWeeklyRateKg > 0 ? `+${observedWeeklyRateKg}` : observedWeeklyRateKg} kg/week) is closely tracking your target (${targetWeeklyRateKg > 0 ? `+${targetWeeklyRateKg}` : targetWeeklyRateKg} kg/week). Keeping your current target is recommended.`;
  } else if (rateDifferenceKg > 0.12) {
    // Weight loss is slower than target, or gain is faster than target
    if (goalType === "lose") {
      const deficitAdjustment = Math.min(250, Math.max(50, Math.round((rateDifferenceKg * 450) / 25) * 25));
      calorieChange = -deficitAdjustment;
      reason = `Your average intake was ${averageLoggedCalories} kcal/day over the last ${windowDays} days. Your smoothed weight trend changed ${observedWeeklyRateKg} kg/week while your target is ${targetWeeklyRateKg} kg/week. A conservative reduction of ${deficitAdjustment} kcal/day is suggested.`;
    } else if (goalType === "gain") {
      const surplusReduction = Math.min(200, Math.max(50, Math.round((rateDifferenceKg * 400) / 25) * 25));
      calorieChange = -surplusReduction;
      reason = `Weight gain (+${observedWeeklyRateKg} kg/week) is outpacing your planned target (+${targetWeeklyRateKg} kg/week). A slight reduction of ${surplusReduction} kcal/day is suggested to keep gains lean.`;
    } else {
      // Maintain but creeping up
      calorieChange = -100;
      reason = `Weight is trending upward (+${observedWeeklyRateKg} kg/week) relative to maintenance. A modest reduction of 100 kcal/day is suggested.`;
    }
  } else {
    // rateDifferenceKg < -0.12 (losing faster than target, or gaining slower than target)
    if (goalType === "lose") {
      const surplusAdd = Math.min(200, Math.max(50, Math.round((Math.abs(rateDifferenceKg) * 400) / 25) * 25));
      calorieChange = surplusAdd;
      reason = `Your weight loss (${observedWeeklyRateKg} kg/week) is faster than your target (${targetWeeklyRateKg} kg/week). Increasing intake by ${surplusAdd} kcal/day is recommended to protect lean mass and metabolic health.`;
    } else if (goalType === "gain") {
      const boostAdd = Math.min(250, Math.max(50, Math.round((Math.abs(rateDifferenceKg) * 450) / 25) * 25));
      calorieChange = boostAdd;
      reason = `Weight gain is slower than your goal (+${targetWeeklyRateKg} kg/week). An increase of ${boostAdd} kcal/day is suggested.`;
    } else {
      // Maintain but dropping
      calorieChange = 100;
      reason = `Weight is trending downward (${observedWeeklyRateKg} kg/week) relative to maintenance. A modest increase of 100 kcal/day is suggested.`;
    }
  }

  // Safety floor: 1,200 kcal minimum absolute bound
  const minFloor = 1200;
  const rawRecommended = currentCalories + calorieChange;
  const recommendedCalories = Math.max(minFloor, rawRecommended);
  if (recommendedCalories !== rawRecommended) {
    calorieChange = recommendedCalories - currentCalories;
  }

  return {
    status: "ready",
    confidence,
    dataStartDate: startDate,
    dataEndDate: today,
    daysAnalyzed: windowDays,
    weightDaysCount,
    foodLogDaysCount,
    currentCalories,
    averageLoggedCalories,
    observedWeeklyRateKg,
    targetWeeklyRateKg,
    rateDifferenceKg,
    recommendedCalories,
    calorieChange,
    reason,
    existingRecommendationId: existingPending?.id,
  };
}

/**
 * Creates and persists a recommendation record
 */
export async function createRecommendationRecord(
  userId: string,
  analysis: AdaptiveNutritionAnalysis
) {
  return prisma.nutritionRecommendation.create({
    data: {
      userId,
      dataStartDate: analysis.dataStartDate,
      dataEndDate: analysis.dataEndDate,
      previousCalories: analysis.currentCalories,
      recommendedCalories: analysis.recommendedCalories,
      calorieChange: analysis.calorieChange,
      observedWeeklyRate: analysis.observedWeeklyRateKg,
      targetWeeklyRate: analysis.targetWeeklyRateKg,
      confidence: analysis.confidence,
      reason: analysis.reason,
      status: "pending",
    },
  });
}

/**
 * Explicitly applies an adaptive recommendation:
 * Updates UserSettings.dailyCalories, creates a GoalRevision, and updates recommendation status.
 */
export async function applyAdaptiveRecommendation(
  userId: string,
  recommendedCalories: number,
  recommendationId?: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch current settings
    const settings = await tx.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      throw new HttpError(404, "User settings not found");
    }

    const today = todayLocal();

    // 2. Update user settings with new calorie target
    const updated = await tx.userSettings.update({
      where: { userId },
      data: {
        dailyCalories: recommendedCalories,
      },
    });

    // 3. Create GoalRevision to track the new target
    await tx.goalRevision.create({
      data: {
        userId,
        effectiveDate: today,
        dailyCalories: recommendedCalories,
        dailyProtein: settings.dailyProtein,
        dailyCarbs: settings.dailyCarbs,
        dailyFat: settings.dailyFat,
        dailyFiber: settings.dailyFiber,
        goalWeightKg: settings.goalWeightKg,
        goalType: settings.goalType,
        goalWeeklyRateKg: settings.goalWeeklyRateKg,
      },
    });

    // 4. Update recommendation record if id provided
    if (recommendationId) {
      await tx.nutritionRecommendation.update({
        where: { id: recommendationId },
        data: { status: "accepted" },
      });
    }

    return updated;
  });
}

/**
 * Dismisses a pending recommendation
 */
export async function dismissAdaptiveRecommendation(
  userId: string,
  recommendationId: string
) {
  return prisma.nutritionRecommendation.updateMany({
    where: {
      id: recommendationId,
      userId,
    },
    data: {
      status: "dismissed",
    },
  });
}
