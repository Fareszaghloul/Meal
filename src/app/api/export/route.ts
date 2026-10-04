import { prisma } from "@/lib/db";
import { parseQuery, withAuth } from "@/lib/api/route";
import { z } from "zod";
import { toMealItem } from "@/lib/services/food-log";
import { todayFor } from "@/lib/services/settings";
import { kgToLb } from "@/lib/weight-units";
import { toCsv } from "@/lib/csv";
import type { ExportFile } from "@/lib/validation";

/**
 * Human-readable exports of the signed-in user's own data (never another user's: every query is scoped to the session).
 * - `?format=csv&table=food-log` (alias `entries`): one row per logged item, from its stored nutrition snapshot.
 * - `?format=csv&table=weight`: every weigh-in and InBody scan, canonical kg (+ lb when the user displays pounds).
 * - `?format=csv&table=foods|water`: custom foods, water log.
 * - default (JSON, legacy v1): the additive /api/import format. The full restorable backup is /api/backup.
 */
const query = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  table: z.enum(["food-log", "entries", "weight", "foods", "water"]).optional(),
});

const r1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

const FOOD_FIELDS = {
  name: true, brand: true, category: true, rawOrCooked: true, defaultUnit: true, servingSize: true, servingUnit: true,
  servingWeightGrams: true, nutritionBasis: true, barcode: true, source: true, externalId: true, isFavorite: true,
  caloriesPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true, fiberPer100g: true,
  totalSugarsPer100g: true, addedSugarsPer100g: true, saturatedFatPer100g: true, transFatPer100g: true, sodiumPer100g: true,
  caloriesPerServing: true, proteinPerServing: true, carbsPerServing: true, fatPerServing: true, fiberPerServing: true,
  totalSugarsPerServing: true, addedSugarsPerServing: true, saturatedFatPerServing: true, transFatPerServing: true, sodiumPerServing: true,
} as const;

async function csvTable(userId: string, table: "food-log" | "weight" | "foods" | "water", imperial: boolean) {
  const where = { userId };
  if (table === "food-log") {
    // Nutrition comes from each entry's own snapshot, never from the current food or recipe.
    const rows = await prisma.foodLogEntry.findMany({
      where,
      orderBy: [{ date: "asc" }, { loggedAt: "asc" }, { id: "asc" }],
      select: {
        date: true, mealCategory: true, name: true, servings: true, servingUnit: true, calories: true, protein: true, carbs: true,
        fat: true, fiber: true, totalSugars: true, sodium: true, food: { select: { brand: true } }, recipeId: true,
      },
    });
    return toCsv(
      ["date", "meal", "food", "brand", "source", "servings", "serving_unit", "calories_kcal", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugars_g", "sodium_mg"],
      rows.map((e) => [
        e.date, e.mealCategory, e.name, e.food?.brand ?? null, e.recipeId ? "recipe" : "food", e.servings, e.servingUnit,
        e.calories, e.protein, e.carbs, e.fat, e.fiber, e.totalSugars, e.sodium,
      ])
    );
  }
  if (table === "weight") {
    const rows = await prisma.weightEntry.findMany({ where, orderBy: [{ date: "asc" }, { time: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }] });
    return toCsv(
      ["date", "time", "entry_type", "weight_kg", ...(imperial ? ["weight_lb"] : []), "body_fat_pct", "smm_kg", "bmi", "notes"],
      rows.map((w) => [w.date, w.time, w.entryType, w.weightKg, ...(imperial ? [r1(kgToLb(w.weightKg))] : []), w.bodyFatPct, w.smmKg, w.bmi, w.notes])
    );
  }
  if (table === "water") {
    const rows = await prisma.waterLogEntry.findMany({ where, orderBy: [{ date: "asc" }, { loggedAt: "asc" }] });
    return toCsv(["date", "amount_ml", "logged_at"], rows.map((w) => [w.date, w.amountMl, w.loggedAt]));
  }
  const foods = await prisma.food.findMany({ where, select: { ...FOOD_FIELDS, servings: { select: { label: true, grams: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } });
  const cols = Object.keys(FOOD_FIELDS);
  return toCsv([...cols, "servings"], foods.map((f) => [...cols.map((c) => f[c as keyof typeof FOOD_FIELDS]), f.servings.map((s) => `${s.label}=${s.grams}g`).join("; ")]));
}

export const GET = withAuth(async (req, user) => {
  const { format, table } = parseQuery(req, query);
  const where = { userId: user.id };
  const settings = await prisma.userSettings.findUnique({ where });
  const stamp = todayFor(settings);

  if (format === "csv") {
    const name = !table || table === "entries" ? "food-log" : table;
    return new Response(await csvTable(user.id, name, settings?.measurementSystem === "imperial"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="meal-${name}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const [foods, entries, water, weight, templates] = await Promise.all([
    prisma.food.findMany({ where, select: { id: true, ...FOOD_FIELDS, servings: { select: { label: true, grams: true, isDefault: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.foodLogEntry.findMany({ where, orderBy: [{ date: "asc" }, { loggedAt: "asc" }] }),
    prisma.waterLogEntry.findMany({ where, orderBy: { loggedAt: "asc" }, select: { date: true, amountMl: true } }),
    prisma.weightEntry.findMany({ where, orderBy: [{ date: "asc" }, { time: "asc" }], select: { date: true, time: true, entryType: true, weightKg: true, bodyFatPct: true, smmKg: true, bmi: true, notes: true } }),
    prisma.mealTemplate.findMany({ where, select: { name: true, items: true } }),
  ]);
  const file: ExportFile = {
    app: "mealprep",
    version: 1,
    exportedAt: new Date().toISOString(),
    goals: settings
      ? {
          dailyCalories: settings.dailyCalories, dailyProtein: settings.dailyProtein, dailyCarbs: settings.dailyCarbs, dailyFat: settings.dailyFat,
          dailyFiber: settings.dailyFiber, dailySodium: settings.dailySodium, dailyWaterGoalMl: settings.dailyWaterGoalMl,
        }
      : undefined,
    foods,
    entries: entries.map((e) => {
      const { loggedAt, ...rest } = toMealItem(e);
      void loggedAt;
      return rest;
    }),
    water,
    weight: weight.map((w) => ({ ...w, entryType: w.entryType as "daily" | "inbody" })),
    templates: templates.map((t) => ({ name: t.name, items: t.items as ExportFile["templates"][number]["items"] })),
  };
  return new Response(JSON.stringify(file, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meal-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
