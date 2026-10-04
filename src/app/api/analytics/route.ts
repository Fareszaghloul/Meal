import { prisma } from "@/lib/db";
import { json, parseQuery, withAuth } from "@/lib/api/route";
import { z } from "zod";
import { addDays, isDateString, type DateString } from "@/lib/dates";
import { goalsFor } from "@/lib/services/food-log";
import { ensureGoalAnchor, ensureSettings, goalOn, listGoalRevisions, todayFor } from "@/lib/services/settings";
import { round } from "@/lib/nutrition/core";
import { summarize, withTrend } from "@/lib/nutrition/weight-trend";
import {
  computePeriodDates,
  groupEntriesByDay,
  calculateNutritionStats,
  calculateDeltas,
  calculateMealDistribution,
  calculateFrequentFoods,
  buildDailyIntakePoints,
  PERIOD_DAYS,
  type PeriodId,
  type RawFoodLogItem,
} from "@/lib/nutrition/analytics";

const querySchema = z.object({
  to: z
    .string()
    .optional()
    .refine((v) => !v || isDateString(v), "Expected a calendar date like 2026-10-03"),
  period: z.enum(["7d", "30d", "90d", "6m", "1y"]).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

function resolvePeriod(period?: string, days?: number): PeriodId {
  if (period && period in PERIOD_DAYS) {
    return period as PeriodId;
  }
  if (days) {
    if (days <= 7) return "7d";
    if (days <= 30) return "30d";
    if (days <= 90) return "90d";
    if (days <= 180) return "6m";
    return "1y";
  }
  return "30d";
}

export const GET = withAuth(async (req, user) => {
  const q = parseQuery(req, querySchema);
  const settings = await ensureSettings(user.id);
  const to: DateString = q.to ?? todayFor(settings);
  const periodId = resolvePeriod(q.period, q.days);
  const periodDates = computePeriodDates(to, periodId);

  const [entries, goals, storedRevisions, weights] = await Promise.all([
    prisma.foodLogEntry.findMany({
      where: {
        userId: user.id,
        date: { gte: periodDates.previous.from, lte: to },
      },
      select: {
        id: true,
        date: true,
        mealCategory: true,
        name: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        fiber: true,
        foodId: true,
        recipeId: true,
        servingUnit: true,
        food: {
          select: {
            brand: true,
          },
        },
      },
      orderBy: { date: "asc" },
    }),
    goalsFor(user.id),
    listGoalRevisions(user.id),
    prisma.weightEntry.findMany({
      where: {
        userId: user.id,
        entryType: "daily",
        date: { gte: addDays(periodDates.previous.from, -7), lte: to },
      },
      select: { date: true, weightKg: true, time: true, createdAt: true },
      orderBy: { date: "asc" },
    }),
  ]);

  // Accounts created before goal history get their anchor (current targets, effective today) on first use.
  let revisions = storedRevisions;
  if (revisions.length === 0) {
    await ensureGoalAnchor(settings);
    revisions = await listGoalRevisions(user.id);
  }

  const rawEntries: RawFoodLogItem[] = entries.map((e) => ({
    id: e.id,
    date: e.date,
    mealCategory: e.mealCategory,
    name: e.name,
    brand: e.food?.brand ?? null,
    calories: e.calories,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
    fiber: e.fiber ?? 0,
    foodId: e.foodId,
    recipeId: e.recipeId,
    servingUnit: e.servingUnit,
  }));

  const dailyMap = groupEntriesByDay(rawEntries);

  // Each date is compared with the goal revision in effect on it. Dates before the first revision have
  // no known target: they're excluded from adherence instead of being judged against today's goal.
  const goalForDate = (date: DateString) => {
    const r = goalOn(revisions, date);
    return r && { calories: r.dailyCalories, protein: r.dailyProtein, carbs: r.dailyCarbs, fat: r.dailyFat, fiber: r.dailyFiber };
  };

  const currentStats = calculateNutritionStats(dailyMap, periodDates.current.from, periodDates.current.to, periodDates.totalDays, goalForDate);
  const prevStats = calculateNutritionStats(dailyMap, periodDates.previous.from, periodDates.previous.to, periodDates.totalDays, goalForDate);

  const deltas = calculateDeltas(currentStats, prevStats);


  const dailyIntake = buildDailyIntakePoints(
    dailyMap,
    periodDates.current.from,
    periodDates.current.to
  );

  const mealDistribution = calculateMealDistribution(
    rawEntries,
    periodDates.current.from,
    periodDates.current.to
  );

  const frequentFoods = calculateFrequentFoods(
    rawEntries,
    periodDates.current.from,
    periodDates.current.to,
    8
  );

  // Weight Analytics using canonical engine
  const allTrend = withTrend(weights);
  const periodTrend = allTrend.filter(
    (d) => d.date >= periodDates.current.from && d.date <= periodDates.current.to
  );

  // Calculate weight trend change over the selected period
  let changePeriodKg: number | null = null;
  if (periodTrend.length >= 2) {
    const startTrend = periodTrend[0].trendKg;
    const endTrend = periodTrend[periodTrend.length - 1].trendKg;
    changePeriodKg = round(endTrend - startTrend, 2);
  } else if (periodTrend.length === 1) {
    // If only one reading in period, check if there was a previous reading before period
    const prior = allTrend.filter((d) => d.date < periodDates.current.from).pop();
    if (prior) {
      changePeriodKg = round(periodTrend[0].trendKg - prior.trendKg, 2);
    }
  }

  const weightSummary = summarize(weights, to);

  return json({
    period: periodId,
    totalDays: periodDates.totalDays,
    current: periodDates.current,
    previous: periodDates.previous,
    stats: currentStats,
    previousStats: prevStats,
    deltas,
    dailyIntake,
    mealDistribution,
    frequentFoods,
    weight: {
      latestKg: weightSummary.latestKg,
      avg7Kg: weightSummary.avg7Kg !== null ? round(weightSummary.avg7Kg, 2) : null,
      changePeriodKg,
      change7Kg: weightSummary.change7Kg !== null ? round(weightSummary.change7Kg, 2) : null,
      change30Kg: weightSummary.change30Kg !== null ? round(weightSummary.change30Kg, 2) : null,
      points: periodTrend.map((p) => ({
        date: p.date,
        meanKg: round(p.meanKg, 2),
        trendKg: round(p.trendKg, 2),
      })),
    },
    goals,
    /** First date with a known target; null if none. */
    goalHistoryFrom: revisions[0]?.effectiveDate ?? null,
    // Backwards-compatibility fields for any existing components/callers
    from: periodDates.current.from,
    to: periodDates.current.to,
    week: calculateNutritionStats(dailyMap, addDays(to, -6), to, 7, goalForDate),
    daily: dailyIntake
      .filter((d) => d.logged)
      .map((d) => ({
        date: d.date,
        calories: d.calories ?? 0,
        protein: d.protein ?? 0,
      })),
    topFoods: frequentFoods.map((f) => ({
      name: f.name,
      count: f.count,
      calories: f.totalCalories,
    })),
  });
});
