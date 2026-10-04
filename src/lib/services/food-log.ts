import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/route";
import { roundNutrients, sumNutrients, toNutrients, type Nutrients } from "@/lib/nutrition/core";
import type { DayData, DayStatus, MealCategory, MealItem, MonthHistoryDay, MonthHistoryResponse, NutritionGoals } from "@/lib/domain";
import type { MealItemInput, MealItemPatch } from "@/lib/validation";
import { addDays, monthRange, type DateString } from "@/lib/dates";
import { weightSummary } from "@/lib/services/weight";
import { compareReadings } from "@/lib/nutrition/weight-trend";
import { weightUnitFor } from "@/lib/weight-units";

type Row = Prisma.FoodLogEntryGetPayload<Record<string, never>>;

export function toMealItem(row: Row): MealItem {
  return {
    id: row.id,
    date: row.date,
    mealCategory: row.mealCategory as MealItem["mealCategory"],
    name: row.name,
    servings: row.servings,
    servingUnit: row.servingUnit,
    foodId: row.foodId,
    recipeId: row.recipeId,
    loggedAt: row.loggedAt.toISOString(),
    ...toNutrients(row),
  };
}

export function totalsOf(items: Nutrients[]): Nutrients {
  return roundNutrients(sumNutrients(items));
}

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2300,
  protein: 180,
  carbs: 220,
  fat: 70,
  fiber: null,
  sodium: null,
  waterMl: 2500,
};

export async function goalsFor(userId: string, date?: DateString): Promise<NutritionGoals & { measurementSystem: string; goalWeightKg: number | null }> {
  // A viewed day shows the nutrition targets that applied on it (read in parallel with settings).
  // Days before goal history began show the current targets.
  const [s, rev] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId },
      select: {
        dailyCalories: true,
        dailyProtein: true,
        dailyCarbs: true,
        dailyFat: true,
        dailyFiber: true,
        dailySodium: true,
        dailyWaterGoalMl: true,
        measurementSystem: true,
        goalWeightKg: true,
      },
    }),
    date ? prisma.goalRevision.findFirst({ where: { userId, effectiveDate: { lte: date } }, orderBy: { effectiveDate: "desc" } }) : null,
  ]);
  if (!s) return { ...DEFAULT_GOALS, measurementSystem: "metric", goalWeightKg: null };

  if (rev) {
    return {
      calories: rev.dailyCalories,
      protein: rev.dailyProtein,
      carbs: rev.dailyCarbs,
      fat: rev.dailyFat,
      fiber: rev.dailyFiber,
      sodium: s.dailySodium,
      waterMl: s.dailyWaterGoalMl,
      measurementSystem: s.measurementSystem,
      goalWeightKg: s.goalWeightKg, // the weight goal shown is always the current one
    };
  }

  return {
    calories: s.dailyCalories,
    protein: s.dailyProtein,
    carbs: s.dailyCarbs,
    fat: s.dailyFat,
    fiber: s.dailyFiber,
    sodium: s.dailySodium,
    waterMl: s.dailyWaterGoalMl,
    measurementSystem: s.measurementSystem,
    goalWeightKg: s.goalWeightKg,
  };
}

export async function getDay(userId: string, date: DateString): Promise<DayData> {
  const [rows, water, goals, weight] = await Promise.all([
    prisma.foodLogEntry.findMany({ where: { userId, date }, orderBy: { loggedAt: "asc" } }),
    prisma.waterLogEntry.aggregate({ where: { userId, date }, _sum: { amountMl: true } }),
    goalsFor(userId, date),
    weightSummary(userId, date),
  ]);

  const entries = rows.map(toMealItem);
  const { measurementSystem, goalWeightKg, ...nutritionGoals } = goals;
  return {
    date,
    entries,
    totals: totalsOf(entries),
    water: { totalMl: water._sum.amountMl ?? 0, goalMl: goals.waterMl },
    goals: nutritionGoals,
    weight: { ...weight, goalKg: goalWeightKg, unit: measurementSystem === "imperial" ? "lbs" : "kg" },
  };
}

/** One row per date that has entries, for the calendar and analytics. */
export async function getDayStatuses(userId: string, from: DateString, to: DateString): Promise<DayStatus[]> {
  const [rows, waterRows, weightRows] = await Promise.all([
    prisma.foodLogEntry.groupBy({
      by: ["date", "mealCategory"],
      where: { userId, date: { gte: from, lte: to } },
      _sum: { calories: true, protein: true, carbs: true, fat: true },
      _count: { id: true },
    }),
    prisma.waterLogEntry.groupBy({
      by: ["date"],
      where: { userId, date: { gte: from, lte: to } },
      _sum: { amountMl: true },
    }),
    prisma.weightEntry.findMany({
      where: { userId, entryType: "daily", date: { gte: from, lte: to } },
      select: { date: true, weightKg: true, time: true, createdAt: true },
    }),
  ]);

  const byDate = new Map<string, DayStatus>();
  for (const r of rows) {
    const s = byDate.get(r.date) ?? {
      date: r.date,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      entryCount: 0,
      mealsLogged: 0,
      mealCalories: {},
    };
    const cals = Math.round(r._sum.calories ?? 0);
    s.calories += cals;
    s.protein = (s.protein ?? 0) + (r._sum.protein ?? 0);
    s.carbs = (s.carbs ?? 0) + (r._sum.carbs ?? 0);
    s.fat = (s.fat ?? 0) + (r._sum.fat ?? 0);
    s.entryCount = (s.entryCount ?? 0) + (r._count.id ?? 0);
    s.mealsLogged += 1;
    if (!s.mealCalories) s.mealCalories = {};
    s.mealCalories[r.mealCategory as MealCategory] = cals;
    byDate.set(r.date, s);
  }

  for (const w of waterRows) {
    const s = byDate.get(w.date);
    if (s) {
      s.waterMl = w._sum.amountMl ?? 0;
    } else {
      byDate.set(w.date, {
        date: w.date,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        entryCount: 0,
        mealsLogged: 0,
        mealCalories: {},
        waterMl: w._sum.amountMl ?? 0,
      });
    }
  }

  // The day's weight is its latest actual daily reading (never an InBody scan, never an arbitrary same-day row).
  const latestByDate = new Map<string, (typeof weightRows)[number]>();
  for (const wt of weightRows) {
    const best = latestByDate.get(wt.date);
    if (!best || compareReadings(wt, best) > 0) latestByDate.set(wt.date, wt);
  }
  for (const wt of latestByDate.values()) {
    const s = byDate.get(wt.date);
    if (s) {
      s.weightKg = wt.weightKg;
    } else {
      byDate.set(wt.date, {
        date: wt.date,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        entryCount: 0,
        mealsLogged: 0,
        mealCalories: {},
        weightKg: wt.weightKg,
      });
    }
  }

  return [...byDate.values()]
    .map((s) => ({
      ...s,
      calories: Math.round(s.calories),
      protein: Math.round(s.protein ?? 0),
      carbs: Math.round(s.carbs ?? 0),
      fat: Math.round(s.fat ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Efficient monthly summary payload for calendar navigation and day preview. */
export async function getMonthHistory(userId: string, month: string): Promise<MonthHistoryResponse> {
  const m = month.slice(0, 7);
  const { from, to } = monthRange(m);

  const [statuses, goalsFull] = await Promise.all([
    getDayStatuses(userId, from, to),
    goalsFor(userId),
  ]);

  const { measurementSystem: _m, goalWeightKg: _g, ...goals } = goalsFull;

  const days: Record<DateString, MonthHistoryDay> = {};
  let totalCalories = 0;
  let totalProtein = 0;
  let loggedDaysCount = 0;

  for (const s of statuses) {
    days[s.date] = {
      date: s.date,
      calories: s.calories,
      protein: s.protein ?? 0,
      carbs: s.carbs ?? 0,
      fat: s.fat ?? 0,
      entryCount: s.entryCount ?? 0,
      mealsLogged: s.mealsLogged,
      mealCalories: s.mealCalories ?? {},
      waterMl: s.waterMl ?? 0,
      weightKg: s.weightKg ?? null,
    };
    if (s.entryCount && s.entryCount > 0) {
      loggedDaysCount += 1;
      totalCalories += s.calories;
      totalProtein += (s.protein ?? 0);
    }
  }

  const avgCalories = loggedDaysCount > 0 ? Math.round(totalCalories / loggedDaysCount) : 0;
  const avgProtein = loggedDaysCount > 0 ? Math.round(totalProtein / loggedDaysCount) : 0;

  return {
    month: m,
    weightUnit: weightUnitFor(goalsFull.measurementSystem),
    days,
    goals,
    summary: {
      loggedDays: loggedDaysCount,
      totalCalories,
      avgCalories,
      avgProtein,
    },
  };
}

/** Throws 404 if the referenced food/recipe is not readable by this user. */
async function assertReferencesOwned(userId: string, foodId?: string | null, recipeId?: string | null) {
  if (foodId) {
    const food = await prisma.food.findFirst({
      where: { id: foodId, OR: [{ userId }, { userId: null }] },
      select: { id: true },
    });
    if (!food) throw new HttpError(404, "Food not found.", "not_found");
  }
  if (recipeId) {
    const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, userId }, select: { id: true } });
    if (!recipe) throw new HttpError(404, "Recipe not found.", "not_found");
  }
}

function rowData(input: MealItemInput) {
  const n = roundNutrients(toNutrients(input));
  // Persist with 2-decimal precision so repeated quantity edits don't drift.
  return {
    date: input.date,
    mealCategory: input.mealCategory,
    name: input.name,
    servings: input.servings,
    servingUnit: input.servingUnit,
    foodId: input.foodId ?? null,
    recipeId: input.recipeId ?? null,
    ...n,
  };
}

/**
 * Create an entry. If the client supplied an id and it already exists for this user,
 * the existing row is returned unchanged (idempotent retry after a lost response).
 */
export async function createEntry(userId: string, input: MealItemInput): Promise<{ item: MealItem; created: boolean }> {
  if (input.id) {
    const existing = await prisma.foodLogEntry.findUnique({ where: { id: input.id } });
    if (existing) {
      if (existing.userId !== userId) throw new HttpError(409, "Conflicting id.", "duplicate");
      return { item: toMealItem(existing), created: false };
    }
  }
  await assertReferencesOwned(userId, input.foodId, input.recipeId);
  const row = await prisma.foodLogEntry.create({
    data: { ...(input.id ? { id: input.id } : {}), userId, ...rowData(input) },
  });
  if (input.foodId) {
    await prisma.food
      .update({ where: { id: input.foodId }, data: { lastUsedAt: new Date(), useCount: { increment: 1 } } })
      .catch(() => undefined); // usage stats are best-effort
  }
  return { item: toMealItem(row), created: true };
}

export async function updateEntry(userId: string, id: string, patch: MealItemPatch): Promise<MealItem> {
  const existing = await prisma.foodLogEntry.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "Entry not found.", "not_found");
  await assertReferencesOwned(userId, patch.foodId, patch.recipeId);

  // Changing only the quantity rescales the stored nutrients proportionally.
  const nutrientKeysTouched = ["calories", "protein", "carbs", "fat", "fiber"].some((k) => k in patch);
  let nutrients: Partial<Nutrients> = {};
  if (patch.servings !== undefined && !nutrientKeysTouched && existing.servings > 0) {
    const factor = patch.servings / existing.servings;
    const scaled = roundNutrients(
      toNutrients({
        calories: existing.calories * factor,
        protein: existing.protein * factor,
        carbs: existing.carbs * factor,
        fat: existing.fat * factor,
        fiber: existing.fiber * factor,
        totalSugars: existing.totalSugars === null ? null : existing.totalSugars * factor,
        addedSugars: existing.addedSugars === null ? null : existing.addedSugars * factor,
        saturatedFat: existing.saturatedFat === null ? null : existing.saturatedFat * factor,
        transFat: existing.transFat === null ? null : existing.transFat * factor,
        sodium: existing.sodium === null ? null : existing.sodium * factor,
      })
    );
    nutrients = scaled;
  } else if (nutrientKeysTouched) {
    nutrients = roundNutrients(toNutrients({ ...toNutrients(existing), ...patch }));
  }

  const { foodId, recipeId, ...rest } = patch;
  const row = await prisma.foodLogEntry.update({
    where: { id },
    data: {
      ...rest,
      ...nutrients,
      ...(foodId !== undefined ? { foodId } : {}),
      ...(recipeId !== undefined ? { recipeId } : {}),
    },
  });
  return toMealItem(row);
}

export async function deleteEntry(userId: string, id: string): Promise<void> {
  const { count } = await prisma.foodLogEntry.deleteMany({ where: { id, userId } });
  if (count === 0) throw new HttpError(404, "Entry not found.", "not_found");
}

/** Copy entries (a whole day, one meal, or selected ids) to another date/meal. */
export async function copyEntries(
  userId: string,
  opts: { fromDate: DateString; toDate: DateString; fromMealCategory?: string; toMealCategory?: string; entryIds?: string[] }
): Promise<MealItem[]> {
  const source = await prisma.foodLogEntry.findMany({
    where: {
      userId,
      date: opts.fromDate,
      ...(opts.fromMealCategory ? { mealCategory: opts.fromMealCategory } : {}),
      ...(opts.entryIds?.length ? { id: { in: opts.entryIds } } : {}),
    },
    orderBy: { loggedAt: "asc" },
  });
  if (source.length === 0) return [];
  const now = Date.now();
  const rows = await prisma.$transaction(
    source.map((s, i) =>
      prisma.foodLogEntry.create({
        data: {
          userId,
          date: opts.toDate,
          mealCategory: opts.toMealCategory ?? s.mealCategory,
          name: s.name,
          servings: s.servings,
          servingUnit: s.servingUnit,
          foodId: s.foodId,
          recipeId: s.recipeId,
          loggedAt: new Date(now + i), // keep original order
          ...toNutrients(s),
        },
      })
    )
  );
  return rows.map(toMealItem);
}

/** Yesterday's entries for a meal, used by "copy from yesterday". */
export function previousDay(date: DateString): DateString {
  return addDays(date, -1);
}

export interface RecentFoodsData {
  recent: MealItem[];
  frequentByMeal: Record<string, MealItem[]>;
  yesterdayByMeal: Record<string, MealItem[]>;
}

export async function getRecentAndFrequentFoods(userId: string, currentDate: DateString): Promise<RecentFoodsData> {
  const yDate = addDays(currentDate, -1);
  const [recentRows, yesterdayRows] = await Promise.all([
    prisma.foodLogEntry.findMany({
      where: { userId },
      orderBy: { loggedAt: "desc" },
      take: 200,
    }),
    prisma.foodLogEntry.findMany({
      where: { userId, date: yDate },
      orderBy: { loggedAt: "asc" },
    }),
  ]);

  // Distinct recent items by name
  const seenRecent = new Set<string>();
  const recent: MealItem[] = [];
  for (const r of recentRows) {
    const key = r.name.toLowerCase().trim();
    if (!seenRecent.has(key)) {
      seenRecent.add(key);
      recent.push(toMealItem(r));
      if (recent.length >= 25) break;
    }
  }

  // Frequent items grouped by mealCategory
  const mealCountMap: Record<string, Map<string, { count: number; item: MealItem }>> = {
    breakfast: new Map(),
    lunch: new Map(),
    dinner: new Map(),
    snack: new Map(),
  };

  for (const r of recentRows) {
    const cat = (r.mealCategory || "snack").toLowerCase();
    const map = mealCountMap[cat] || (mealCountMap[cat] = new Map());
    const key = r.name.toLowerCase().trim();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { count: 1, item: toMealItem(r) });
    }
  }

  const frequentByMeal: Record<string, MealItem[]> = {};
  for (const [cat, map] of Object.entries(mealCountMap)) {
    frequentByMeal[cat] = Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((x) => x.item);
  }

  // Yesterday items grouped by mealCategory
  const yesterdayByMeal: Record<string, MealItem[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  for (const r of yesterdayRows) {
    const cat = (r.mealCategory || "snack").toLowerCase();
    if (!yesterdayByMeal[cat]) yesterdayByMeal[cat] = [];
    yesterdayByMeal[cat].push(toMealItem(r));
  }

  return { recent, frequentByMeal, yesterdayByMeal };
}
