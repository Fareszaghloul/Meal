import { prisma } from "@/lib/db";
import { parseQuery, withAuth } from "@/lib/api/route";
import { z } from "zod";
import { toMealItem } from "@/lib/services/food-log";
import type { ExportFile } from "@/lib/validation";

const query = z.object({ format: z.enum(["json", "csv"]).default("json"), table: z.enum(["entries", "foods", "weight", "water"]).optional() });

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

const FOOD_FIELDS = {
  name: true, brand: true, category: true, rawOrCooked: true, defaultUnit: true, servingSize: true, servingUnit: true,
  servingWeightGrams: true, nutritionBasis: true, barcode: true, source: true, externalId: true, isFavorite: true,
  caloriesPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true, fiberPer100g: true,
  totalSugarsPer100g: true, addedSugarsPer100g: true, saturatedFatPer100g: true, transFatPer100g: true, sodiumPer100g: true,
  caloriesPerServing: true, proteinPerServing: true, carbsPerServing: true, fatPerServing: true, fiberPerServing: true,
  totalSugarsPerServing: true, addedSugarsPerServing: true, saturatedFatPerServing: true, transFatPerServing: true, sodiumPerServing: true,
} as const;

/** Full personal data export. `?format=csv&table=entries|foods|weight|water` for one CSV table. */
export const GET = withAuth(async (req, user) => {
  const { format, table } = parseQuery(req, query);
  const where = { userId: user.id };
  const [settings, foods, entries, water, weight, templates] = await Promise.all([
    prisma.userSettings.findUnique({ where, select: { dailyCalories: true, dailyProtein: true, dailyCarbs: true, dailyFat: true, dailyFiber: true, dailySodium: true, dailyWaterGoalMl: true } }),
    prisma.food.findMany({ where, select: { id: true, ...FOOD_FIELDS, servings: { select: { label: true, grams: true, isDefault: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.foodLogEntry.findMany({ where, orderBy: [{ date: "asc" }, { loggedAt: "asc" }] }),
    prisma.waterLogEntry.findMany({ where, orderBy: { loggedAt: "asc" }, select: { date: true, amountMl: true } }),
    prisma.weightEntry.findMany({ where, orderBy: [{ date: "asc" }, { time: "asc" }], select: { date: true, time: true, entryType: true, weightKg: true, bodyFatPct: true, smmKg: true, bmi: true, notes: true } }),
    prisma.mealTemplate.findMany({ where, select: { name: true, items: true } }),
  ]);

  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    const tables: Record<string, Record<string, unknown>[]> = {
      entries: entries.map((e) => ({ ...toMealItem(e) })),
      foods: foods.map(({ servings, ...f }) => ({ ...f, servings: servings.map((s) => `${s.label}=${s.grams}g`).join("; ") })),
      weight,
      water,
    };
    const name = table ?? "entries";
    return new Response(csv(tables[name]), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mealprep-${name}-${stamp}.csv"`,
      },
    });
  }

  const file: ExportFile = {
    app: "mealprep",
    version: 1,
    exportedAt: new Date().toISOString(),
    goals: settings ?? undefined,
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
      "Content-Disposition": `attachment; filename="mealprep-export-${stamp}.json"`,
    },
  });
});
