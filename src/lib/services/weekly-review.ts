import { prisma } from "@/lib/db";
import { goalsFor } from "@/lib/services/food-log";
import { addDays, type DateString } from "@/lib/dates";
import { dailyMeans } from "@/lib/nutrition/weight-trend";

export interface WeeklyReviewMetrics {
  weekStartDate: string; // ISO Monday
  weekEndDate: string; // ISO Sunday
  daysLoggedCount: number; // 0 to 7
  totalDays: 7;

  // Nutrition
  nutrition: {
    averageDailyCalories: number;
    targetCalories: number;
    calorieAdherencePercent: number;
    averageDailyProtein: number;
    targetProtein: number;
    proteinAdherencePercent: number;
    averageDailyCarbs: number;
    averageDailyFat: number;
    averageDailyFiber: number | null;
    daysWithinCalorieTarget: number;
    daysProteinTargetHit: number;
  };

  // Hydration
  hydration: {
    averageDailyWaterMl: number;
    targetWaterMl: number;
    daysWaterGoalAchieved: number;
  };

  // Meal Planning
  mealPlanning: {
    totalPlannedMeals: number;
    loggedPlannedMeals: number;
    skippedMeals: number;
    planAdherencePercent: number | null;
  };

  // Weight
  weight: {
    status: "sufficient_data" | "limited_data" | "no_data";
    entriesCount: number;
    startWeightKg: number | null;
    endWeightKg: number | null;
    changeKg: number | null;
    averageWeightKg: number | null;
  };

  // Rule-based insights
  insights: string[];

  // Week-over-week comparison (optional)
  previousWeekComparison: {
    hasPreviousWeek: boolean;
    calorieAdherenceDelta?: number; // e.g. +5%
    proteinAverageDelta?: number; // e.g. +9g
    mealAdherenceDelta?: number | null; // e.g. +10%
    weightChangeDelta?: number | null;
    previousWeekSummary?: {
      calorieAdherencePercent: number;
      averageProtein: number;
      mealAdherencePercent: number | null;
      weightChangeKg: number | null;
    };
  } | null;
}

/**
 * Calculates raw metrics for a 7-day week starting at weekStart
 */
async function calculateSingleWeekData(userId: string, weekStart: DateString) {
  const weekEnd = addDays(weekStart, 6);

  const [goalsFull, foodLogs, waterLogs, mealPlan, weightReadings] = await Promise.all([
    goalsFor(userId, weekStart),
    prisma.foodLogEntry.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.waterLogEntry.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.mealPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate: weekStart,
        },
      },
      include: {
        meals: true,
      },
    }),
    prisma.weightEntry.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  // Group food logs by date
  const foodByDate = new Map<string, typeof foodLogs>();
  for (const entry of foodLogs) {
    const list = foodByDate.get(entry.date) || [];
    list.push(entry);
    foodByDate.set(entry.date, list);
  }

  const daysLoggedCount = foodByDate.size;
  let totalCal = 0;
  let totalPro = 0;
  let totalCarb = 0;
  let totalFat = 0;
  let totalFib = 0;
  let daysWithinCalorie = 0;
  let daysProteinHit = 0;

  for (const [, entries] of foodByDate.entries()) {
    const dayCal = entries.reduce((s, e) => s + e.calories, 0);
    const dayPro = entries.reduce((s, e) => s + e.protein, 0);
    const dayCarb = entries.reduce((s, e) => s + e.carbs, 0);
    const dayFat = entries.reduce((s, e) => s + e.fat, 0);
    const dayFib = entries.reduce((s, e) => s + (e.fiber || 0), 0);

    totalCal += dayCal;
    totalPro += dayPro;
    totalCarb += dayCarb;
    totalFat += dayFat;
    totalFib += dayFib;

    if (dayCal >= goalsFull.calories * 0.9 && dayCal <= goalsFull.calories * 1.1) {
      daysWithinCalorie++;
    }
    if (dayPro >= goalsFull.protein * 0.9) {
      daysProteinHit++;
    }
  }

  const divisor = Math.max(1, daysLoggedCount);
  const avgCal = daysLoggedCount > 0 ? Math.round(totalCal / divisor) : 0;
  const avgPro = daysLoggedCount > 0 ? Math.round((totalPro / divisor) * 10) / 10 : 0;
  const avgCarb = daysLoggedCount > 0 ? Math.round((totalCarb / divisor) * 10) / 10 : 0;
  const avgFat = daysLoggedCount > 0 ? Math.round((totalFat / divisor) * 10) / 10 : 0;
  const avgFib = daysLoggedCount > 0 && totalFib > 0 ? Math.round((totalFib / divisor) * 10) / 10 : null;

  const calAdherence = goalsFull.calories > 0 ? Math.round((avgCal / goalsFull.calories) * 1000) / 10 : 0;
  const proAdherence = goalsFull.protein > 0 ? Math.round((avgPro / goalsFull.protein) * 1000) / 10 : 0;

  // Hydration
  const waterByDate = new Map<string, number>();
  for (const w of waterLogs) {
    waterByDate.set(w.date, (waterByDate.get(w.date) || 0) + w.amountMl);
  }
  const totalWater = Array.from(waterByDate.values()).reduce((s, a) => s + a, 0);
  const avgWater = Math.round(totalWater / 7);
  let daysWaterAchieved = 0;
  for (const amt of waterByDate.values()) {
    if (amt >= goalsFull.waterMl) daysWaterAchieved++;
  }

  // Meal Plan
  const plannedMeals = mealPlan?.meals || [];
  const totalPlanned = plannedMeals.length;
  const loggedPlanned = plannedMeals.filter((m) => m.status === "logged" || m.foodLogEntryId).length;
  const skippedPlanned = plannedMeals.filter((m) => m.status === "skipped").length;
  const planAdherence = totalPlanned > 0 ? Math.round((loggedPlanned / totalPlanned) * 100) : null;

  // Weight
  const dayMeans = dailyMeans(weightReadings);
  let weightStatus: "sufficient_data" | "limited_data" | "no_data" = "no_data";
  let startWeight: number | null = null;
  let endWeight: number | null = null;
  let changeKg: number | null = null;
  let avgWeight: number | null = null;

  if (dayMeans.length >= 3) {
    weightStatus = "sufficient_data";
    startWeight = Math.round(dayMeans[0].weightKg * 10) / 10;
    endWeight = Math.round(dayMeans[dayMeans.length - 1].weightKg * 10) / 10;
    changeKg = Math.round((endWeight - startWeight) * 10) / 10;
    avgWeight = Math.round((dayMeans.reduce((s, d) => s + d.weightKg, 0) / dayMeans.length) * 10) / 10;
  } else if (dayMeans.length >= 1) {
    weightStatus = "limited_data";
    startWeight = Math.round(dayMeans[0].weightKg * 10) / 10;
    endWeight = Math.round(dayMeans[dayMeans.length - 1].weightKg * 10) / 10;
    changeKg = dayMeans.length > 1 ? Math.round((endWeight - startWeight) * 10) / 10 : 0;
    avgWeight = Math.round(dayMeans[0].weightKg * 10) / 10;
  }

  return {
    weekStart,
    weekEnd,
    daysLoggedCount,
    goals: goalsFull,
    nutrition: {
      avgCal,
      targetCal: goalsFull.calories,
      calAdherence,
      avgPro,
      targetPro: goalsFull.protein,
      proAdherence,
      avgCarb,
      avgFat,
      avgFib,
      daysWithinCalorie,
      daysProteinHit,
    },
    hydration: {
      avgWater,
      targetWater: goalsFull.waterMl,
      daysWaterAchieved,
    },
    mealPlanning: {
      totalPlanned,
      loggedPlanned,
      skippedPlanned,
      planAdherence,
    },
    weight: {
      status: weightStatus,
      entriesCount: dayMeans.length,
      startWeightKg: startWeight,
      endWeightKg: endWeight,
      changeKg,
      averageWeightKg: avgWeight,
    },
  };
}

/**
 * Produces deterministic, explainable rule-based insights
 */
function generateWeeklyInsights(
  current: Awaited<ReturnType<typeof calculateSingleWeekData>>,
  prev?: Awaited<ReturnType<typeof calculateSingleWeekData>>
): string[] {
  const insights: string[] = [];

  // 1. Calorie intake insight
  if (current.daysLoggedCount === 0) {
    insights.push("No food was logged this week. Daily totals cannot be calculated.");
  } else {
    const calDiff = current.nutrition.avgCal - current.nutrition.targetCal;
    if (Math.abs(calDiff) <= 100) {
      insights.push(
        `Average calorie intake (${current.nutrition.avgCal} kcal) was very close to your daily target (${current.nutrition.targetCal} kcal).`
      );
    } else if (calDiff > 100) {
      insights.push(
        `Average calorie intake exceeded target by ${calDiff} kcal/day across ${current.daysLoggedCount} logged days.`
      );
    } else {
      insights.push(
        `Average calorie intake was ${Math.abs(calDiff)} kcal/day below target across ${current.daysLoggedCount} logged days.`
      );
    }
  }

  // 2. Protein insight
  if (current.daysLoggedCount > 0) {
    if (current.nutrition.daysProteinHit >= 5) {
      insights.push(`Strong protein consistency: hit or exceeded target on ${current.nutrition.daysProteinHit} of 7 days.`);
    } else {
      insights.push(
        `Protein intake reached target on ${current.nutrition.daysProteinHit} days (averaged ${current.nutrition.avgPro}g vs ${current.nutrition.targetPro}g goal).`
      );
    }
  }

  // 3. Meal plan adherence insight
  if (current.mealPlanning.totalPlanned > 0) {
    if (current.mealPlanning.planAdherence !== null && current.mealPlanning.planAdherence >= 80) {
      insights.push(
        `Great meal plan adherence: logged ${current.mealPlanning.loggedPlanned} of ${current.mealPlanning.totalPlanned} planned meals (${current.mealPlanning.planAdherence}%).`
      );
    } else {
      insights.push(
        `Completed ${current.mealPlanning.loggedPlanned} of ${current.mealPlanning.totalPlanned} planned meals.`
      );
    }
  }

  // 4. Weight insight
  if (current.weight.status === "sufficient_data" && current.weight.changeKg !== null) {
    const chg = current.weight.changeKg;
    if (chg < -0.1) {
      insights.push(`Weight trend decreased by ${Math.abs(chg)} kg over the week.`);
    } else if (chg > 0.1) {
      insights.push(`Weight trend increased by ${chg} kg over the week.`);
    } else {
      insights.push("Weight remained stable over the week.");
    }
  } else if (current.weight.status === "limited_data") {
    insights.push("Limited weight entries logged this week. Log 3+ weigh-ins for a representative trend.");
  }

  // 5. Hydration insight
  if (current.hydration.daysWaterAchieved >= 5) {
    insights.push(`Hydration goal met on ${current.hydration.daysWaterAchieved} of 7 days.`);
  }

  // 6. Week-over-week adherence comparison
  if (
    prev &&
    current.mealPlanning.planAdherence !== null &&
    prev.mealPlanning.planAdherence !== null &&
    current.mealPlanning.planAdherence > prev.mealPlanning.planAdherence
  ) {
    insights.push(
      `Meal-plan adherence improved from ${prev.mealPlanning.planAdherence}% to ${current.mealPlanning.planAdherence}% compared with last week.`
    );
  } else if (prev && prev.daysLoggedCount > 0 && current.daysLoggedCount > prev.daysLoggedCount) {
    insights.push(
      `Food logging consistency improved (${current.daysLoggedCount} days vs ${prev.daysLoggedCount} days last week).`
    );
  }

  return insights.slice(0, 5);
}

/**
 * Fetches full weekly review with week-over-week comparison
 */
export async function getWeeklyReview(
  userId: string,
  weekStart: DateString
): Promise<WeeklyReviewMetrics> {
  const current = await calculateSingleWeekData(userId, weekStart);

  // Previous week
  const prevWeekStart = addDays(weekStart, -7);
  const prev = await calculateSingleWeekData(userId, prevWeekStart);

  const hasPrevious = prev.daysLoggedCount > 0 || prev.weight.entriesCount > 0;
  const insights = generateWeeklyInsights(current, hasPrevious ? prev : undefined);

  let prevComp: WeeklyReviewMetrics["previousWeekComparison"] = null;

  if (hasPrevious) {
    const calDelta = Math.round((current.nutrition.calAdherence - prev.nutrition.calAdherence) * 10) / 10;
    const proDelta = Math.round((current.nutrition.avgPro - prev.nutrition.avgPro) * 10) / 10;

    let planDelta: number | null = null;
    if (current.mealPlanning.planAdherence !== null && prev.mealPlanning.planAdherence !== null) {
      planDelta = current.mealPlanning.planAdherence - prev.mealPlanning.planAdherence;
    }

    let weightDelta: number | null = null;
    if (current.weight.changeKg !== null && prev.weight.changeKg !== null) {
      weightDelta = Math.round((current.weight.changeKg - prev.weight.changeKg) * 10) / 10;
    }

    prevComp = {
      hasPreviousWeek: true,
      calorieAdherenceDelta: calDelta,
      proteinAverageDelta: proDelta,
      mealAdherenceDelta: planDelta,
      weightChangeDelta: weightDelta,
      previousWeekSummary: {
        calorieAdherencePercent: prev.nutrition.calAdherence,
        averageProtein: prev.nutrition.avgPro,
        mealAdherencePercent: prev.mealPlanning.planAdherence,
        weightChangeKg: prev.weight.changeKg,
      },
    };
  } else {
    prevComp = { hasPreviousWeek: false };
  }

  return {
    weekStartDate: current.weekStart,
    weekEndDate: current.weekEnd,
    daysLoggedCount: current.daysLoggedCount,
    totalDays: 7,
    nutrition: {
      averageDailyCalories: current.nutrition.avgCal,
      targetCalories: current.nutrition.targetCal,
      calorieAdherencePercent: current.nutrition.calAdherence,
      averageDailyProtein: current.nutrition.avgPro,
      targetProtein: current.nutrition.targetPro,
      proteinAdherencePercent: current.nutrition.proAdherence,
      averageDailyCarbs: current.nutrition.avgCarb,
      averageDailyFat: current.nutrition.avgFat,
      averageDailyFiber: current.nutrition.avgFib,
      daysWithinCalorieTarget: current.nutrition.daysWithinCalorie,
      daysProteinTargetHit: current.nutrition.daysProteinHit,
    },
    hydration: {
      averageDailyWaterMl: current.hydration.avgWater,
      targetWaterMl: current.hydration.targetWater,
      daysWaterGoalAchieved: current.hydration.daysWaterAchieved,
    },
    mealPlanning: {
      totalPlannedMeals: current.mealPlanning.totalPlanned,
      loggedPlannedMeals: current.mealPlanning.loggedPlanned,
      skippedMeals: current.mealPlanning.skippedPlanned,
      planAdherencePercent: current.mealPlanning.planAdherence,
    },
    weight: current.weight,
    insights,
    previousWeekComparison: prevComp,
  };
}
