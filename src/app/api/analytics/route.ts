import { prisma } from "@/lib/db";
import { json, parseQuery, withAuth } from "@/lib/api/route";
import { z } from "zod";
import { addDays } from "@/lib/dates";
import { dateString } from "@/lib/validation";
import { goalsFor } from "@/lib/services/food-log";
import { round } from "@/lib/nutrition/core";
import { summarize } from "@/lib/services/weight";

const query = z.object({ to: dateString, days: z.coerce.number().int().min(1).max(365).default(30) });

interface PeriodStats {
  days: number;
  daysLogged: number;
  avgCalories: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  avgFiber: number | null;
  /** % of logged days within ±10% of the calorie target. */
  calorieAdherence: number | null;
  /** % of logged days at or above the protein target. */
  proteinAdherence: number | null;
}

export const GET = withAuth(async (req, user) => {
  const { to, days } = parseQuery(req, query);
  const from = addDays(to, -(days - 1));
  const [entries, goals, weights] = await Promise.all([
    prisma.foodLogEntry.findMany({
      where: { userId: user.id, date: { gte: from, lte: to } },
      select: { date: true, name: true, foodId: true, calories: true, protein: true, carbs: true, fat: true, fiber: true },
    }),
    goalsFor(user.id),
    prisma.weightEntry.findMany({
      where: { userId: user.id, entryType: "daily", date: { gte: addDays(from, -7), lte: to } },
      select: { date: true, weightKg: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const byDay = new Map<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number }>();
  const foodCounts = new Map<string, { name: string; count: number; calories: number }>();
  for (const e of entries) {
    const d = byDay.get(e.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    d.calories += e.calories;
    d.protein += e.protein;
    d.carbs += e.carbs;
    d.fat += e.fat;
    d.fiber += e.fiber;
    byDay.set(e.date, d);
    const key = e.foodId ?? e.name.toLowerCase();
    const f = foodCounts.get(key) ?? { name: e.name, count: 0, calories: 0 };
    f.count += 1;
    f.calories += e.calories;
    foodCounts.set(key, f);
  }

  const period = (n: number): PeriodStats => {
    const start = addDays(to, -(n - 1));
    const logged = [...byDay.entries()].filter(([d]) => d >= start);
    const count = logged.length;
    const avg = (pick: (v: { calories: number; protein: number; carbs: number; fat: number; fiber: number }) => number) =>
      count ? round(logged.reduce((s, [, v]) => s + pick(v), 0) / count, 1) : null;
    const within = logged.filter(([, v]) => Math.abs(v.calories - goals.calories) <= goals.calories * 0.1).length;
    const protein = logged.filter(([, v]) => v.protein >= goals.protein).length;
    return {
      days: n,
      daysLogged: count,
      avgCalories: count ? round(logged.reduce((s, [, v]) => s + v.calories, 0) / count, 0) : null,
      avgProtein: avg((v) => v.protein),
      avgCarbs: avg((v) => v.carbs),
      avgFat: avg((v) => v.fat),
      avgFiber: avg((v) => v.fiber),
      calorieAdherence: count ? Math.round((within / count) * 100) : null,
      proteinAdherence: count ? Math.round((protein / count) * 100) : null,
    };
  };

  const daily = [...byDay.entries()]
    .map(([date, v]) => ({ date, calories: Math.round(v.calories), protein: round(v.protein, 0) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topFoods = [...foodCounts.values()]
    .sort((a, b) => b.count - a.count || b.calories - a.calories)
    .slice(0, 10)
    .map((f) => ({ ...f, calories: Math.round(f.calories) }));

  return json({
    from,
    to,
    goals,
    week: period(Math.min(7, days)),
    period: period(days),
    daily,
    topFoods,
    weight: { ...summarize(weights), points: weights },
  });
});
