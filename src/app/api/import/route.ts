import { prisma } from "@/lib/db";
import { HttpError, json, parseQuery, withAuth } from "@/lib/api/route";
import { z } from "zod";
import { exportFile, servingsInput } from "@/lib/validation";
import { servingRows } from "@/lib/services/servings";
import { syncCurrentWeight } from "@/lib/services/weight";
import { applySettingsPatch, latestAllowedDate } from "@/lib/services/settings";
import { roundNutrients, toNutrients } from "@/lib/nutrition/core";

const query = z.object({ dryRun: z.enum(["true", "false"]).default("true") });

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Legacy additive IMPORT of a v1 MealPrep export (not the full-backup restore, which is /api/backup/restore). Default is a dry run that only validates and
 * reports counts; `?dryRun=false` writes. Imports are additive and skip rows that
 * already exist (entries by id, foods by name, weight by date+time+type, water by date+amount).
 */
export const POST = withAuth(async (req, user) => {
  const { dryRun } = parseQuery(req, query);
  const text = await req.text();
  if (text.length > MAX_BYTES) throw new HttpError(413, "File is too large (25 MB max).", "too_large");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(400, "That file is not valid JSON.", "bad_json");
  }
  const file = exportFile.parse(parsed);
  const latest = await latestAllowedDate(user.id);
  if (file.weight.some((w) => w.date > latest)) throw new HttpError(400, "A weigh-in can't be dated in the future", "validation");

  const summary = { foods: 0, entries: 0, water: 0, weight: 0, templates: 0, goals: file.goals ? 1 : 0, skipped: 0 };

  // Foods: match by name within this user's foods; remember id mapping for entries.
  const existingFoods = await prisma.food.findMany({ where: { userId: user.id }, select: { id: true, name: true } });
  const byName = new Map(existingFoods.map((f) => [f.name.toLowerCase(), f.id]));
  const foodIdMap = new Map<string, string>();
  const newFoods: Array<Record<string, unknown> & { id?: string; name: string }> = [];
  for (const raw of file.foods) {
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) { summary.skipped++; continue; }
    const oldId = typeof raw.id === "string" ? raw.id : undefined;
    const existingId = byName.get(name.toLowerCase());
    if (existingId) {
      if (oldId) foodIdMap.set(oldId, existingId);
      summary.skipped++;
      continue;
    }
    newFoods.push({ ...raw, name, id: oldId });
    summary.foods++;
  }

  const existingEntryIds = new Set(
    (await prisma.foodLogEntry.findMany({ where: { userId: user.id }, select: { id: true } })).map((e) => e.id)
  );
  const newEntries = file.entries.filter((e) => !(e.id && existingEntryIds.has(e.id)));
  summary.skipped += file.entries.length - newEntries.length;
  summary.entries = newEntries.length;

  const existingWeight = new Set(
    (await prisma.weightEntry.findMany({ where: { userId: user.id }, select: { date: true, time: true, entryType: true } })).map(
      (w) => `${w.date}|${w.time ?? ""}|${w.entryType}`
    )
  );
  const newWeight = file.weight.filter((w) => !existingWeight.has(`${w.date}|${w.time ?? ""}|${w.entryType}`));
  summary.skipped += file.weight.length - newWeight.length;
  summary.weight = newWeight.length;

  const existingWater = new Set(
    (await prisma.waterLogEntry.findMany({ where: { userId: user.id }, select: { date: true, amountMl: true } })).map(
      (w) => `${w.date}|${w.amountMl}`
    )
  );
  const newWater = file.water.filter((w) => !existingWater.has(`${w.date}|${w.amountMl}`));
  summary.skipped += file.water.length - newWater.length;
  summary.water = newWater.length;
  summary.templates = file.templates.length;

  if (dryRun === "true") return json({ dryRun: true, summary });

  await prisma.$transaction(async (tx) => {
    for (const f of newFoods) {
      const { id: oldId, ...data } = f;
      const created = await tx.food.create({
        data: {
          userId: user.id,
          name: data.name as string,
          category: (data.category as string) ?? "Pantry",
          caloriesPer100g: Number(data.caloriesPer100g) || 0,
          proteinPer100g: Number(data.proteinPer100g) || 0,
          carbsPer100g: Number(data.carbsPer100g) || 0,
          fatPer100g: Number(data.fatPer100g) || 0,
          fiberPer100g: Number(data.fiberPer100g) || 0,
          ...pickNullableNumbers(data, [
            "totalSugarsPer100g", "addedSugarsPer100g", "saturatedFatPer100g", "transFatPer100g", "sodiumPer100g",
            "caloriesPerServing", "proteinPerServing", "carbsPerServing", "fatPerServing", "fiberPerServing",
            "totalSugarsPerServing", "addedSugarsPerServing", "saturatedFatPerServing", "transFatPerServing", "sodiumPerServing",
            "servingSize",
          ]),
          servingWeightGrams: Number(data.servingWeightGrams) > 0 ? Number(data.servingWeightGrams) : 100,
          ...pickStrings(data, ["brand", "rawOrCooked", "defaultUnit", "servingUnit", "nutritionBasis", "barcode", "source", "externalId"]),
          isFavorite: Boolean(data.isFavorite),
          servings: {
            create: servingRows(servingsInput.safeParse(data.servings).data ?? null, {
              servingSize: Number(data.servingSize) || null,
              servingUnit: typeof data.servingUnit === "string" ? data.servingUnit : null,
              servingWeightGrams: Number(data.servingWeightGrams) > 0 ? Number(data.servingWeightGrams) : 100,
            }),
          },
        },
      });
      if (oldId) foodIdMap.set(oldId, created.id);
    }
    for (const e of newEntries) {
      const foodId = e.foodId ? foodIdMap.get(e.foodId) ?? null : null;
      await tx.foodLogEntry.create({
        data: {
          ...(e.id ? { id: e.id } : {}),
          userId: user.id,
          date: e.date,
          mealCategory: e.mealCategory,
          name: e.name,
          servings: e.servings,
          servingUnit: e.servingUnit,
          foodId,
          recipeId: null, // recipes are not part of the export
          ...roundNutrients(toNutrients(e)),
        },
      });
    }
    // One statement: a per-row create over a remote database outgrows the transaction timeout on a long history.
    if (newWeight.length) {
      await tx.weightEntry.createMany({
        data: newWeight.map((w) => ({
          userId: user.id, date: w.date, time: w.time ?? null, entryType: w.entryType, weightKg: w.weightKg,
          bodyFatPct: w.bodyFatPct ?? null, smmKg: w.smmKg ?? null, bmi: w.bmi ?? null, notes: w.notes ?? null,
        })),
      });
      await syncCurrentWeight(user.id, tx);
    }
    if (newWater.length) await tx.waterLogEntry.createMany({ data: newWater.map((w) => ({ ...w, userId: user.id })) });
    for (const t of file.templates) {
      await tx.mealTemplate.create({ data: { userId: user.id, name: t.name, items: t.items } });
    }
    if (file.goals) {
      // Same path as Settings: records a goal revision when a target actually changes. Legacy 0 meant "no target".
      const { dailyFiber, dailySodium, ...rest } = file.goals;
      await applySettingsPatch(
        user.id,
        { ...rest, ...(dailyFiber !== undefined && { dailyFiber: dailyFiber || null }), ...(dailySodium !== undefined && { dailySodium: dailySodium || null }) },
        tx
      );
    }
  });

  return json({ dryRun: false, summary });
});

function pickNullableNumbers(src: Record<string, unknown>, keys: string[]) {
  const out: Record<string, number | null> = {};
  for (const k of keys) {
    const v = src[k];
    if (v === undefined) continue;
    out[k] = v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
  }
  return out;
}

function pickStrings(src: Record<string, unknown>, keys: string[]) {
  const out: Record<string, string | null> = {};
  for (const k of keys) {
    const v = src[k];
    if (v === undefined) continue;
    out[k] = v === null ? null : String(v);
  }
  return out;
}
