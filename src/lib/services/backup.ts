import { randomUUID } from "crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/route";
import { MEAL_CATEGORIES } from "@/lib/domain";
import { dateString, templateItem, userSettingsShape, WEIGHT_KG_MAX, WEIGHT_KG_MIN } from "@/lib/validation";
import { ensureGoalAnchor, todayFor } from "@/lib/services/settings";
import { syncCurrentWeight } from "@/lib/services/weight";
import pkg from "../../../package.json";

/**
 * FULL BACKUP ("meal-backup", version 1): every user-owned domain record needed to rebuild the app,
 * as versioned JSON. Machine-restorable; the CSV exports are the human-readable counterpart.
 *
 * Included: settings (preferences + targets), goal revisions, custom foods + servings, recipes
 * (+ ingredients, steps, tag names), food log (historical nutrition snapshots), water, weight,
 * workout routines, meal templates, saved meals (+ items), day templates (+ items), meal plans + meals
 * (with their log links), pantry (+ stock transactions), shopping list, prep sessions (+ tasks),
 * adaptive nutrition recommendations.
 *
 * Version 1 grew additively after Phases 1–3: every field/table added since is optional with the app's own
 * default, so files written before then still restore. Every table is exported with an explicit field list
 * (never a column spread), so adding a database column can't silently make backups unrestorable.
 *
 * Excluded on purpose:
 * - User / Session rows, password hashes, session tokens: authentication, not domain data.
 * - UserSettings.cloudApiKey / usdaApiKey (secrets), ollamaUrl / ollamaModel / screenshotMethod (server configuration).
 * - UserSettings.currentWeightKg: derived from daily weigh-ins and recomputed after restore.
 * - System foods (userId = null): shared catalog. Records reference them by id; restore re-links when the id
 *   exists, otherwise the link is dropped and the stored nutrition snapshot keeps the history intact.
 * - Tag rows: global; recipes carry tag names and restore re-creates/links them.
 * - Volatile updatedAt columns.
 *
 * Ids: every record id in the file is a backup-local reference only. Restore generates fresh ids and remaps
 * every reference, so a file can be restored into the same account, a fresh account, or another account
 * without id collisions, and nothing in the file can address another user's rows.
 */

export const BACKUP_FORMAT = "meal-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

type Db = Prisma.TransactionClient;

/* ───────── schema (strict: unknown keys such as userId or passwordHash are rejected) ───────── */

const noNul = (s: string) => !s.includes("\u0000");
const str = (max: number) => z.string().max(max).refine(noNul, "Text contains a NUL character");
const optStr = (max: number) => str(max).nullable();
const ref = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Invalid record reference");
const ts = z.iso.datetime();
const optTs = ts.nullable();
const n = (min: number, max: number) => z.number().finite().min(min).max(max);
const nut = n(0, 100_000);
const optNut = nut.nullable();
const int = (min: number, max: number) => z.number().int().min(min).max(max);

const nutrients = {
  calories: nut,
  protein: nut,
  carbs: nut,
  fat: nut,
  fiber: nut,
  totalSugars: optNut,
  addedSugars: optNut,
  saturatedFat: optNut,
  transFat: optNut,
  sodium: optNut,
};
const optNutrients = Object.fromEntries(Object.keys(nutrients).map((k) => [k, optNut])) as Record<keyof typeof nutrients, typeof optNut>;
const per = (suffix: "Per100g" | "PerServing", required: boolean) =>
  Object.fromEntries(Object.keys(nutrients).map((k) => [`${k}${suffix}`, required && ["calories", "protein", "carbs", "fat", "fiber"].includes(k) ? nut : optNut]));

const settingsSchema = z
  .object({
    ...userSettingsShape,
    timezone: userSettingsShape.timezone.nullable(),
    // Older rows may hold 0 for "no target"; keep them as they are.
    dailyFiber: n(0, 300).nullable(),
    dailySodium: n(0, 20_000).nullable(),
  })
  .partial()
  .strict();

const goalRevisionSchema = z
  .object({
    effectiveDate: dateString,
    dailyCalories: n(0, 15_000),
    dailyProtein: n(0, 1_000),
    dailyCarbs: n(0, 2_000),
    dailyFat: n(0, 1_000),
    dailyFiber: n(0, 300).nullable(),
    goalWeightKg: n(WEIGHT_KG_MIN, WEIGHT_KG_MAX).nullable(),
    goalType: z.enum(["lose", "maintain", "gain"]).nullable(),
    goalWeeklyRateKg: n(0, 1.5).nullable(),
    createdAt: ts,
  })
  .strict();

const foodSchema = z
  .object({
    id: ref,
    name: str(200).min(1),
    brand: optStr(200),
    category: str(100),
    rawOrCooked: str(32),
    ...(per("Per100g", true) as Record<string, typeof nut>),
    ...(per("PerServing", false) as Record<string, typeof optNut>),
    defaultUnit: str(32),
    servingWeightGrams: n(0, 1_000_000),
    source: str(32),
    scannedAt: optTs,
    servingSize: n(0, 1_000_000).nullable(),
    servingUnit: optStr(64),
    nutritionBasis: str(32),
    barcode: optStr(64),
    externalId: optStr(200),
    sourceUrl: optStr(2_000),
    importedAt: optTs,
    lastSyncedAt: optTs,
    isFavorite: z.boolean(),
    lastUsedAt: optTs,
    useCount: int(0, 10_000_000),
    createdAt: ts,
    servings: z
      .array(z.object({ label: str(60).min(1), grams: n(0, 1_000_000), isDefault: z.boolean(), sortOrder: int(0, 10_000) }).strict())
      .max(50),
  })
  .strict();

const recipeSchema = z
  .object({
    id: ref,
    name: str(200).min(1),
    description: optStr(10_000),
    servings: n(0.01, 10_000),
    servingLabel: optStr(64),
    yieldWeightGrams: n(0, 1_000_000).nullable(),
    prepTimeMinutes: int(0, 100_000).nullable(),
    cookTimeMinutes: int(0, 100_000).nullable(),
    imageUrl: optStr(2_000),
    sourceUrl: optStr(2_000),
    sourcePlatform: optStr(64),
    isFavorite: z.boolean(),
    ...(per("PerServing", true) as Record<string, typeof nut>),
    isNutritionCalculated: z.boolean(),
    createdAt: ts,
    ingredients: z
      .array(
        z
          .object({
            foodId: ref.nullable(),
            rawName: str(200),
            quantity: n(0, 1_000_000),
            unit: str(32),
            notes: optStr(500),
            sortOrder: int(0, 10_000),
            grams: n(0, 1_000_000).nullable(),
            ...optNutrients,
          })
          .strict()
      )
      .max(300),
    steps: z.array(z.object({ stepNumber: int(0, 10_000), instruction: str(10_000) }).strict()).max(300),
    tags: z.array(str(100).min(1)).max(50),
  })
  .strict();

const foodLogSchema = z
  .object({
    /** Backup-local reference, so planned meals can point at the entry they were logged as. */
    id: ref.optional(),
    date: dateString,
    mealCategory: z.enum(MEAL_CATEGORIES),
    name: str(200).min(1),
    servings: n(0, 100_000),
    servingUnit: str(32),
    ...nutrients,
    foodId: ref.nullable(),
    recipeId: ref.nullable(),
    loggedAt: ts,
    createdAt: ts,
  })
  .strict();

const weightSchema = z
  .object({
    date: dateString,
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
    entryType: z.enum(["daily", "inbody"]),
    weightKg: n(WEIGHT_KG_MIN, WEIGHT_KG_MAX),
    bodyFatPct: n(0, 100).nullable(),
    smmKg: n(0, 300).nullable(),
    bmi: n(0, 200).nullable(),
    notes: optStr(2_000),
    createdAt: ts,
  })
  .strict();

const mealPlanSchema = z
  .object({
    weekStartDate: dateString,
    notes: optStr(5_000),
    createdAt: ts,
    meals: z
      .array(
        z
          .object({
            dayOfWeek: str(16),
            mealCategory: str(32),
            id: ref.optional(),
            status: z.enum(["planned", "logged", "completed", "skipped"]).default("planned"),
            /** The food log entry this planned meal was logged as (backup-local id). */
            foodLogEntryId: ref.nullable().default(null),
            loggedAt: optTs.default(null),
            recipeId: ref.nullable(),
            customName: optStr(200),
            servings: n(0, 10_000),
            calories: nut,
            protein: nut,
            carbs: nut,
            fat: nut,
            fiber: optNut,
            totalSugars: optNut,
            addedSugars: optNut,
            saturatedFat: optNut,
            transFat: optNut,
            sodium: optNut,
            isCompleted: z.boolean(),
            sortOrder: int(0, 10_000),
          })
          .strict()
      )
      .max(500),
  })
  .strict();

const savedMealSchema = z
  .object({
    id: ref,
    name: str(200).min(1),
    mealCategory: z.enum(MEAL_CATEGORIES).nullable(),
    isFavorite: z.boolean(),
    useCount: int(0, 10_000_000),
    createdAt: ts,
    items: z
      .array(
        z
          .object({
            foodId: ref.nullable(),
            recipeId: ref.nullable(),
            customName: optStr(200),
            quantity: n(0, 100_000),
            servingUnit: str(32),
            calories: nut,
            protein: nut,
            carbs: nut,
            fat: nut,
            fiber: optNut,
            totalSugars: optNut,
            addedSugars: optNut,
            saturatedFat: optNut,
            transFat: optNut,
            sodium: optNut,
            sortOrder: int(0, 10_000),
          })
          .strict()
      )
      .max(100),
  })
  .strict();

const dayTemplateSchema = z
  .object({
    name: str(200).min(1),
    description: optStr(2_000),
    isFavorite: z.boolean(),
    useCount: int(0, 10_000_000),
    createdAt: ts,
    items: z
      .array(
        z
          .object({
            mealCategory: z.enum(MEAL_CATEGORIES),
            foodId: ref.nullable(),
            recipeId: ref.nullable(),
            savedMealId: ref.nullable(),
            customName: optStr(200),
            servings: n(0, 100_000),
            servingUnit: str(32),
            calories: nut,
            protein: nut,
            carbs: nut,
            fat: nut,
            fiber: optNut,
            totalSugars: optNut,
            addedSugars: optNut,
            saturatedFat: optNut,
            transFat: optNut,
            sodium: optNut,
            sortOrder: int(0, 10_000),
          })
          .strict()
      )
      .max(200),
  })
  .strict();

export const backupFile = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    version: z.literal(BACKUP_VERSION),
    createdAt: ts,
    appVersion: str(32),
    /** The tracking timezone at backup time (informational; the settings carry the restorable value). */
    timezone: str(64).nullable(),
    data: z
      .object({
        settings: settingsSchema,
        goalRevisions: z.array(goalRevisionSchema).max(10_000),
        foods: z.array(foodSchema).max(20_000),
        recipes: z.array(recipeSchema).max(5_000),
        foodLog: z.array(foodLogSchema).max(200_000),
        water: z.array(z.object({ date: dateString, amountMl: int(-100_000, 100_000), loggedAt: ts }).strict()).max(100_000),
        weight: z.array(weightSchema).max(50_000),
        workouts: z
          .array(
            z
              .object({ workoutType: str(64), customLabel: optStr(100), durationMinutes: int(0, 1_440), sessionsPerWeek: n(0, 50), createdAt: ts })
              .strict()
          )
          .max(200),
        mealTemplates: z
          .array(z.object({ name: str(100).min(1), items: z.array(templateItem.strict()).max(100), useCount: int(0, 10_000_000), createdAt: ts }).strict())
          .max(2_000),
        mealPlans: z.array(mealPlanSchema).max(2_000),
        pantry: z
          .array(
            z
              .object({
                id: ref.optional(),
                foodId: ref.nullable(),
                name: str(200),
                quantity: n(-1_000_000, 1_000_000),
                unit: str(32),
                category: str(100),
                storageLocation: str(32).default("Pantry"),
                expiryDate: dateString.nullable().default(null),
                lowStockThreshold: n(0, 1_000_000).nullable().default(null),
                createdAt: ts.optional(),
              })
              .strict()
          )
          .max(10_000),
        pantryTransactions: z
          .array(
            z
              .object({
                pantryItemId: ref,
                type: str(32),
                quantity: n(-1_000_000, 1_000_000),
                unit: str(32),
                sourceType: optStr(32),
                /** A meal or shopping-list id from this backup (remapped on restore); anything else is dropped. */
                sourceId: ref.nullable(),
                createdAt: ts,
              })
              .strict()
          )
          .max(100_000)
          .default([]),
        shoppingList: z
          .array(
            z
              .object({
                id: ref.optional(),
                foodId: ref.nullable(),
                name: str(200),
                quantity: n(-1_000_000, 1_000_000),
                unit: str(32),
                category: str(100),
                isChecked: z.boolean(),
                isCustom: z.boolean(),
                notes: optStr(1_000),
                weekStart: optStr(10),
                createdAt: ts,
              })
              .strict()
          )
          .max(10_000),
        savedMeals: z.array(savedMealSchema).max(2_000).default([]),
        dayTemplates: z.array(dayTemplateSchema).max(500).default([]),
        prepSessions: z
          .array(
            z
              .object({
                weekStart: dateString,
                createdAt: ts,
                tasks: z.array(z.object({ label: str(500).min(1), completed: z.boolean(), sortOrder: int(0, 10_000), createdAt: ts }).strict()).max(500),
              })
              .strict()
          )
          .max(2_000)
          .default([]),
        nutritionRecommendations: z
          .array(
            z
              .object({
                dataStartDate: dateString,
                dataEndDate: dateString,
                previousCalories: n(0, 20_000),
                recommendedCalories: n(0, 20_000),
                calorieChange: n(-20_000, 20_000),
                observedWeeklyRate: n(-50, 50),
                targetWeeklyRate: n(-50, 50),
                confidence: z.enum(["low", "medium", "high"]),
                reason: str(2_000),
                status: z.enum(["pending", "accepted", "dismissed"]),
                createdAt: ts,
              })
              .strict()
          )
          .max(5_000)
          .default([]),
      })
      .strict(),
  })
  .strict();
export type BackupFile = z.infer<typeof backupFile>;
export type BackupData = BackupFile["data"];

/* ───────── export ───────── */

const FOOD_COLUMNS = Object.keys(foodSchema.shape).filter((k) => k !== "servings");
const select = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, true]));
const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** Every user-owned table, read in one REPEATABLE READ transaction so the file is a consistent snapshot. */
export async function createBackup(userId: string): Promise<{ file: BackupFile; filename: string }> {
  return prisma.$transaction(
    async (tx) => {
      const where = { userId };
      const settings = await tx.userSettings.findUnique({ where });
      const goalRevisions = await tx.goalRevision.findMany({ where, orderBy: { effectiveDate: "asc" } });
      const foods = await tx.food.findMany({
        where,
        select: { ...select(FOOD_COLUMNS), servings: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      const recipes = await tx.recipe.findMany({
        where,
        include: {
          ingredients: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
          instructions: { orderBy: [{ stepNumber: "asc" }, { id: "asc" }] },
          tags: { include: { tag: true } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      const foodLog = await tx.foodLogEntry.findMany({ where, orderBy: [{ date: "asc" }, { loggedAt: "asc" }, { id: "asc" }] });
      const water = await tx.waterLogEntry.findMany({ where, orderBy: [{ date: "asc" }, { loggedAt: "asc" }, { id: "asc" }] });
      const weight = await tx.weightEntry.findMany({ where, orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }] });
      const workouts = await tx.workoutRoutineEntry.findMany({ where, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const templates = await tx.mealTemplate.findMany({ where, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const mealPlans = await tx.mealPlan.findMany({
        where,
        include: { meals: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
        orderBy: { weekStartDate: "asc" },
      });
      const pantry = await tx.pantryItem.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }] });
      const shopping = await tx.shoppingListItem.findMany({ where, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const pantryTransactions = await tx.pantryTransaction.findMany({ where, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const savedMeals = await tx.savedMeal.findMany({
        where,
        include: { items: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      const dayTemplates = await tx.dayTemplate.findMany({
        where,
        include: { items: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      const prepSessions = await tx.prepSession.findMany({
        where,
        include: { tasks: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
        orderBy: { weekStart: "asc" },
      });
      const recommendations = await tx.nutritionRecommendation.findMany({ where, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });

      const s = settings;
      const data: BackupData = {
        settings: s
          ? {
              dailyCalories: s.dailyCalories,
              dailyProtein: s.dailyProtein,
              dailyCarbs: s.dailyCarbs,
              dailyFat: s.dailyFat,
              dailyFiber: s.dailyFiber,
              dailySodium: s.dailySodium,
              dailyWaterGoalMl: s.dailyWaterGoalMl,
              goalWeightKg: s.goalWeightKg,
              goalType: s.goalType as "lose" | "maintain" | "gain",
              goalWeeklyRateKg: s.goalWeeklyRateKg,
              measurementSystem: s.measurementSystem as "metric" | "imperial",
              timezone: s.timezone,
              theme: s.theme as "system" | "light" | "dark",
              defaultServings: s.defaultServings,
              sex: s.sex as "male" | "female",
              birthDate: s.birthDate,
              age: s.age,
              heightCm: s.heightCm,
              currentBodyFatPct: s.currentBodyFatPct,
              currentSmmKg: s.currentSmmKg,
              currentBmi: s.currentBmi,
              avgDailySteps: s.avgDailySteps,
              useSimpleActivityMode: s.useSimpleActivityMode,
              ...(s.simpleActivityLevel ? { simpleActivityLevel: s.simpleActivityLevel as "moderate" } : {}),
              useThermicEffectAdjustment: s.useThermicEffectAdjustment,
              pantryUsageBehavior: s.pantryUsageBehavior as "manual" | "ask" | "auto",
              defaultMealCategory: s.defaultMealCategory as (typeof MEAL_CATEGORIES)[number] | null,
              ...(s.defaultCopyMode ? { defaultCopyMode: s.defaultCopyMode as "append" | "replace" } : {}),
            }
          : {},
        goalRevisions: goalRevisions.map(({ id, userId: _u, createdAt, ...r }) => {
          void id;
          void _u;
          return { ...r, goalType: r.goalType as "lose" | null, createdAt: createdAt.toISOString() };
        }),
        foods: foods.map((row) => {
          // Dynamic select (FOOD_COLUMNS) loses Prisma's static row type.
          const f = row as unknown as Record<string, unknown> & { servings: typeof row.servings };
          return {
          ...(f as unknown as BackupData["foods"][number]),
          scannedAt: iso(f.scannedAt as Date | null),
          importedAt: iso(f.importedAt as Date | null),
          lastSyncedAt: iso(f.lastSyncedAt as Date | null),
          lastUsedAt: iso(f.lastUsedAt as Date | null),
          createdAt: (f.createdAt as Date).toISOString(),
          servings: f.servings.map((sv) => ({ label: sv.label, grams: sv.grams, isDefault: sv.isDefault, sortOrder: sv.sortOrder })),
          };
        }),
        recipes: recipes.map(({ userId: _u, updatedAt, ingredients, instructions, tags, createdAt, ...r }) => {
          void _u;
          void updatedAt;
          return {
            ...r,
            createdAt: createdAt.toISOString(),
            ingredients: ingredients.map(({ id, recipeId, ...i }) => {
              void id;
              void recipeId;
              return i;
            }),
            steps: instructions.map((st) => ({ stepNumber: st.stepNumber, instruction: st.instruction })),
            tags: tags.map((t) => t.tag.name).sort(),
          };
        }),
        foodLog: foodLog.map((e) => ({
          id: e.id,
          date: e.date,
          mealCategory: e.mealCategory as (typeof MEAL_CATEGORIES)[number],
          name: e.name,
          servings: e.servings,
          servingUnit: e.servingUnit,
          calories: e.calories,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
          fiber: e.fiber,
          totalSugars: e.totalSugars,
          addedSugars: e.addedSugars,
          saturatedFat: e.saturatedFat,
          transFat: e.transFat,
          sodium: e.sodium,
          foodId: e.foodId,
          recipeId: e.recipeId,
          loggedAt: e.loggedAt.toISOString(),
          createdAt: e.createdAt.toISOString(),
        })),
        water: water.map((w) => ({ date: w.date, amountMl: w.amountMl, loggedAt: w.loggedAt.toISOString() })),
        weight: weight.map((w) => ({
          date: w.date,
          time: w.time,
          entryType: w.entryType as "daily" | "inbody",
          weightKg: w.weightKg,
          bodyFatPct: w.bodyFatPct,
          smmKg: w.smmKg,
          bmi: w.bmi,
          notes: w.notes,
          createdAt: w.createdAt.toISOString(),
        })),
        workouts: workouts.map((w) => ({
          workoutType: w.workoutType,
          customLabel: w.customLabel,
          durationMinutes: w.durationMinutes,
          sessionsPerWeek: w.sessionsPerWeek,
          createdAt: w.createdAt.toISOString(),
        })),
        mealTemplates: templates.map((t) => ({
          name: t.name,
          items: t.items as BackupData["mealTemplates"][number]["items"],
          useCount: t.useCount,
          createdAt: t.createdAt.toISOString(),
        })),
        mealPlans: mealPlans.map((p) => ({
          weekStartDate: p.weekStartDate,
          notes: p.notes,
          createdAt: p.createdAt.toISOString(),
          meals: p.meals.map((m) => ({
            id: m.id,
            dayOfWeek: m.dayOfWeek,
            mealCategory: m.mealCategory,
            status: m.status as "planned" | "logged" | "completed" | "skipped",
            foodLogEntryId: m.foodLogEntryId,
            loggedAt: iso(m.loggedAt),
            recipeId: m.recipeId,
            customName: m.customName,
            servings: m.servings,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            fiber: m.fiber,
            totalSugars: m.totalSugars,
            addedSugars: m.addedSugars,
            saturatedFat: m.saturatedFat,
            transFat: m.transFat,
            sodium: m.sodium,
            isCompleted: m.isCompleted,
            sortOrder: m.sortOrder,
          })),
        })),
        pantry: pantry.map((p) => ({
          id: p.id,
          foodId: p.foodId,
          name: p.name,
          quantity: p.quantity,
          unit: p.unit,
          category: p.category,
          storageLocation: p.storageLocation,
          expiryDate: p.expiryDate,
          lowStockThreshold: p.lowStockThreshold,
          createdAt: p.createdAt.toISOString(),
        })),
        pantryTransactions: pantryTransactions.map((t) => ({
          pantryItemId: t.pantryItemId,
          type: t.type,
          quantity: t.quantity,
          unit: t.unit,
          sourceType: t.sourceType,
          sourceId: t.sourceId,
          createdAt: t.createdAt.toISOString(),
        })),
        savedMeals: savedMeals.map((m) => ({
          id: m.id,
          name: m.name,
          mealCategory: m.mealCategory as (typeof MEAL_CATEGORIES)[number] | null,
          isFavorite: m.isFavorite,
          useCount: m.useCount,
          createdAt: m.createdAt.toISOString(),
          items: m.items.map((i) => ({
            foodId: i.foodId,
            recipeId: i.recipeId,
            customName: i.customName,
            quantity: i.quantity,
            servingUnit: i.servingUnit,
            calories: i.calories,
            protein: i.protein,
            carbs: i.carbs,
            fat: i.fat,
            fiber: i.fiber,
            totalSugars: i.totalSugars,
            addedSugars: i.addedSugars,
            saturatedFat: i.saturatedFat,
            transFat: i.transFat,
            sodium: i.sodium,
            sortOrder: i.sortOrder,
          })),
        })),
        dayTemplates: dayTemplates.map((d) => ({
          name: d.name,
          description: d.description,
          isFavorite: d.isFavorite,
          useCount: d.useCount,
          createdAt: d.createdAt.toISOString(),
          items: d.items.map((i) => ({
            mealCategory: i.mealCategory as (typeof MEAL_CATEGORIES)[number],
            foodId: i.foodId,
            recipeId: i.recipeId,
            savedMealId: i.savedMealId,
            customName: i.customName,
            servings: i.servings,
            servingUnit: i.servingUnit,
            calories: i.calories,
            protein: i.protein,
            carbs: i.carbs,
            fat: i.fat,
            fiber: i.fiber,
            totalSugars: i.totalSugars,
            addedSugars: i.addedSugars,
            saturatedFat: i.saturatedFat,
            transFat: i.transFat,
            sodium: i.sodium,
            sortOrder: i.sortOrder,
          })),
        })),
        prepSessions: prepSessions.map((p) => ({
          weekStart: p.weekStart,
          createdAt: p.createdAt.toISOString(),
          tasks: p.tasks.map((t) => ({ label: t.label, completed: t.completed, sortOrder: t.sortOrder, createdAt: t.createdAt.toISOString() })),
        })),
        nutritionRecommendations: recommendations.map((r) => ({
          dataStartDate: r.dataStartDate,
          dataEndDate: r.dataEndDate,
          previousCalories: r.previousCalories,
          recommendedCalories: r.recommendedCalories,
          calorieChange: r.calorieChange,
          observedWeeklyRate: r.observedWeeklyRate,
          targetWeeklyRate: r.targetWeeklyRate,
          confidence: r.confidence as "low" | "medium" | "high",
          reason: r.reason,
          status: r.status as "pending" | "accepted" | "dismissed",
          createdAt: r.createdAt.toISOString(),
        })),
        shoppingList: shopping.map((i) => ({
          id: i.id,
          foodId: i.foodId,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          category: i.category,
          isChecked: i.isChecked,
          isCustom: i.isCustom,
          notes: i.notes,
          weekStart: i.weekStart,
          createdAt: i.createdAt.toISOString(),
        })),
      };
      const file: BackupFile = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: pkg.version,
        timezone: settings?.timezone ?? null,
        data,
      };
      return { file, filename: `meal-backup-${todayFor(settings)}.json` };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 60_000, maxWait: 10_000 }
  );
}

/* ───────── parse + preview ───────── */

export function backupCounts(d: BackupData) {
  return {
    foods: d.foods.length,
    foodServings: d.foods.reduce((s, f) => s + f.servings.length, 0),
    recipes: d.recipes.length,
    recipeIngredients: d.recipes.reduce((s, r) => s + r.ingredients.length, 0),
    foodLog: d.foodLog.length,
    water: d.water.length,
    weight: d.weight.length,
    goalRevisions: d.goalRevisions.length,
    workouts: d.workouts.length,
    mealTemplates: d.mealTemplates.length,
    mealPlans: d.mealPlans.length,
    meals: d.mealPlans.reduce((s, p) => s + p.meals.length, 0),
    pantry: d.pantry.length,
    pantryTransactions: d.pantryTransactions.length,
    shoppingList: d.shoppingList.length,
    savedMeals: d.savedMeals.length,
    dayTemplates: d.dayTemplates.length,
    prepSessions: d.prepSessions.length,
    nutritionRecommendations: d.nutritionRecommendations.length,
  };
}

/**
 * Parses an uploaded file: size, JSON, format, version, then the strict schema.
 * Any failure is a clean 4xx; nothing is written.
 */
export function parseBackup(text: string): BackupFile {
  if (Buffer.byteLength(text, "utf8") > MAX_BACKUP_BYTES) throw new HttpError(413, "Backup file is too large (25 MB max).", "too_large");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HttpError(400, "This file isn't valid JSON. It may be damaged or incomplete.", "bad_json");
  }
  const head = raw as { format?: unknown; version?: unknown } | null;
  if (!head || typeof head !== "object" || head.format !== BACKUP_FORMAT) {
    throw new HttpError(400, "This isn't a Meal backup file.", "not_a_backup");
  }
  if (head.version !== BACKUP_VERSION) {
    throw new HttpError(400, `Backup version ${String(head.version)} isn't supported by this app (supports version ${BACKUP_VERSION}).`, "unsupported_version");
  }
  const parsed = backupFile.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new HttpError(422, `Backup failed validation at ${first.path.join(".") || "(root)"}: ${first.message}`, "invalid_backup");
  }
  return parsed.data;
}

/* ───────── restore plan (pure: tested without a database) ───────── */

export interface PlanOptions {
  /** Food ids that are system foods on this server; references to them are kept. */
  systemFoodIds: Set<string>;
  newId?: () => string;
}

function uniqueOrThrow<T>(items: T[], key: (t: T) => string, what: string) {
  const seen = new Set<string>();
  for (const it of items) {
    const k = key(it);
    if (seen.has(k)) throw new HttpError(422, `Backup has a duplicate ${what}: ${k}`, "invalid_backup");
    seen.add(k);
  }
}

/** Food references every backup record makes, for the system-food lookup. */
export function referencedFoodIds(d: BackupData): string[] {
  const ids = new Set<string>();
  const add = (id: string | null | undefined) => id && ids.add(id);
  d.recipes.forEach((r) => r.ingredients.forEach((i) => add(i.foodId)));
  d.foodLog.forEach((e) => add(e.foodId));
  d.mealTemplates.forEach((t) => t.items.forEach((i) => add(i.foodId)));
  d.pantry.forEach((p) => add(p.foodId));
  d.shoppingList.forEach((s) => add(s.foodId));
  d.savedMeals.forEach((m) => m.items.forEach((i) => add(i.foodId)));
  d.dayTemplates.forEach((t) => t.items.forEach((i) => add(i.foodId)));
  const own = new Set(d.foods.map((f) => f.id));
  return [...ids].filter((id) => !own.has(id));
}

/**
 * Turns backup data into rows for this user with fresh ids and remapped references.
 * Recipe references must resolve inside the backup (recipes are always fully included), else the
 * backup is rejected. Food references resolve to a restored custom food, else to an existing system food,
 * else they're unlinked (null); historical nutrition lives in each record's own snapshot, so nothing is lost.
 */
export function planRestore(userId: string, d: BackupData, opts: PlanOptions) {
  const newId = opts.newId ?? randomUUID;
  uniqueOrThrow(d.foods, (f) => f.id, "food id");
  uniqueOrThrow(d.foods, (f) => f.name, "food name");
  uniqueOrThrow(d.recipes, (r) => r.id, "recipe id");
  uniqueOrThrow(d.mealPlans, (p) => p.weekStartDate, "meal plan week");
  uniqueOrThrow(d.goalRevisions, (r) => r.effectiveDate, "goal revision date");
  uniqueOrThrow(d.savedMeals, (m) => m.id, "saved meal id");
  uniqueOrThrow(d.prepSessions, (p) => p.weekStart, "prep session week");
  const withId = <T extends { id?: string }>(rows: T[]) => rows.filter((r): r is T & { id: string } => Boolean(r.id));
  uniqueOrThrow(withId(d.foodLog), (e) => e.id, "food log entry id");
  uniqueOrThrow(withId(d.pantry), (p) => p.id, "pantry item id");
  uniqueOrThrow(withId(d.shoppingList), (i) => i.id, "shopping list item id");
  uniqueOrThrow(withId(d.mealPlans.flatMap((p) => p.meals)), (m) => m.id, "planned meal id");
  // One food log entry can back at most one planned meal (unique in the database).
  uniqueOrThrow(
    d.mealPlans.flatMap((p) => p.meals).filter((m) => m.foodLogEntryId),
    (m) => m.foodLogEntryId!,
    "planned-meal log link"
  );

  const foodMap = new Map(d.foods.map((f) => [f.id, newId()]));
  const recipeMap = new Map(d.recipes.map((r) => [r.id, newId()]));
  const savedMealMap = new Map(d.savedMeals.map((m) => [m.id, newId()]));
  const foodLogMap = new Map(withId(d.foodLog).map((e) => [e.id, newId()]));
  const mealMap = new Map(withId(d.mealPlans.flatMap((p) => p.meals)).map((m) => [m.id, newId()]));
  const pantryMap = new Map(withId(d.pantry).map((p) => [p.id, newId()]));
  const shoppingMap = new Map(withId(d.shoppingList).map((i) => [i.id, newId()]));
  const savedMeal = (id: string | null, where: string): string | null => {
    if (!id) return null;
    const mapped = savedMealMap.get(id);
    if (!mapped) throw new HttpError(422, `Backup ${where} refers to a saved meal that isn't in the backup (${id}).`, "invalid_reference");
    return mapped;
  };
  let unlinkedFoodRefs = 0;
  const food = (id: string | null | undefined): string | null => {
    if (!id) return null;
    const mapped = foodMap.get(id) ?? (opts.systemFoodIds.has(id) ? id : null);
    if (!mapped) unlinkedFoodRefs++;
    return mapped;
  };
  const recipe = (id: string | null | undefined, where: string): string | null => {
    if (!id) return null;
    const mapped = recipeMap.get(id);
    if (!mapped) throw new HttpError(422, `Backup ${where} refers to a recipe that isn't in the backup (${id}).`, "invalid_reference");
    return mapped;
  };
  const date = (s: string) => new Date(s);
  const nullDate = (s: string | null) => (s ? new Date(s) : null);

  const foods: Prisma.FoodCreateManyInput[] = [];
  const foodServings: Prisma.FoodServingCreateManyInput[] = [];
  for (const { id, servings, createdAt, scannedAt, importedAt, lastSyncedAt, lastUsedAt, ...f } of d.foods) {
    const fid = foodMap.get(id)!;
    foods.push({
      ...(f as unknown as Prisma.FoodCreateManyInput),
      id: fid,
      userId,
      createdAt: date(createdAt),
      scannedAt: nullDate(scannedAt),
      importedAt: nullDate(importedAt),
      lastSyncedAt: nullDate(lastSyncedAt),
      lastUsedAt: nullDate(lastUsedAt),
    });
    servings.forEach((sv) => foodServings.push({ ...sv, id: newId(), foodId: fid }));
  }

  const recipes: Prisma.RecipeCreateManyInput[] = [];
  const recipeIngredients: Prisma.RecipeIngredientCreateManyInput[] = [];
  const recipeSteps: Prisma.RecipeStepCreateManyInput[] = [];
  const recipeTagNames: Array<{ recipeId: string; name: string }> = [];
  for (const { id, ingredients, steps, tags, createdAt, ...r } of d.recipes) {
    const rid = recipeMap.get(id)!;
    recipes.push({ ...(r as unknown as Prisma.RecipeCreateManyInput), id: rid, userId, createdAt: date(createdAt) });
    ingredients.forEach((i) => recipeIngredients.push({ ...i, id: newId(), recipeId: rid, foodId: food(i.foodId) }));
    steps.forEach((st) => recipeSteps.push({ ...st, id: newId(), recipeId: rid }));
    [...new Set(tags)].forEach((name) => recipeTagNames.push({ recipeId: rid, name }));
  }

  const foodLog: Prisma.FoodLogEntryCreateManyInput[] = d.foodLog.map((e) => ({
    ...e,
    id: (e.id && foodLogMap.get(e.id)) || newId(),
    userId,
    foodId: food(e.foodId),
    recipeId: recipe(e.recipeId, "food log entry"),
    loggedAt: date(e.loggedAt),
    createdAt: date(e.createdAt),
  }));

  const mealPlans: Prisma.MealPlanCreateManyInput[] = [];
  const meals: Prisma.MealCreateManyInput[] = [];
  for (const { meals: planMeals, createdAt, ...p } of d.mealPlans) {
    const pid = newId();
    mealPlans.push({ ...p, id: pid, userId, createdAt: date(createdAt) });
    planMeals.forEach((m) =>
      meals.push({
        ...m,
        id: (m.id && mealMap.get(m.id)) || newId(),
        mealPlanId: pid,
        recipeId: recipe(m.recipeId, "meal plan"),
        // The log link is historical bookkeeping: if the entry isn't in the file, the meal keeps its status without the link.
        foodLogEntryId: m.foodLogEntryId ? (foodLogMap.get(m.foodLogEntryId) ?? null) : null,
        loggedAt: nullDate(m.loggedAt),
      })
    );
  }

  const savedMeals: Prisma.SavedMealCreateManyInput[] = [];
  const savedMealItems: Prisma.SavedMealItemCreateManyInput[] = [];
  for (const { id, items, createdAt, ...m } of d.savedMeals) {
    const sid = savedMealMap.get(id)!;
    savedMeals.push({ ...m, id: sid, userId, createdAt: date(createdAt) });
    items.forEach((i) => savedMealItems.push({ ...i, id: newId(), savedMealId: sid, foodId: food(i.foodId), recipeId: recipe(i.recipeId, "saved meal") }));
  }

  const dayTemplates: Prisma.DayTemplateCreateManyInput[] = [];
  const dayTemplateItems: Prisma.DayTemplateItemCreateManyInput[] = [];
  for (const { items, createdAt, ...t } of d.dayTemplates) {
    const tid = newId();
    dayTemplates.push({ ...t, id: tid, userId, createdAt: date(createdAt) });
    items.forEach((i) =>
      dayTemplateItems.push({
        ...i,
        id: newId(),
        dayTemplateId: tid,
        foodId: food(i.foodId),
        recipeId: recipe(i.recipeId, "day template"),
        savedMealId: savedMeal(i.savedMealId, "day template"),
      })
    );
  }

  const pantryTransactions: Prisma.PantryTransactionCreateManyInput[] = d.pantryTransactions.map((t) => {
    const pantryItemId = pantryMap.get(t.pantryItemId);
    if (!pantryItemId) throw new HttpError(422, `Backup pantry history refers to a pantry item that isn't in the backup (${t.pantryItemId}).`, "invalid_reference");
    const sourceId = t.sourceId ? (t.sourceType === "meal" ? mealMap.get(t.sourceId) : t.sourceType === "shopping" ? shoppingMap.get(t.sourceId) : undefined) : undefined;
    return { ...t, id: newId(), userId, pantryItemId, sourceId: sourceId ?? null, createdAt: date(t.createdAt) };
  });

  const prepSessions: Prisma.PrepSessionCreateManyInput[] = [];
  const prepTasks: Prisma.PrepTaskCreateManyInput[] = [];
  for (const { tasks, createdAt, ...p } of d.prepSessions) {
    const pid = newId();
    prepSessions.push({ ...p, id: pid, userId, createdAt: date(createdAt) });
    tasks.forEach((t) => prepTasks.push({ ...t, id: newId(), prepSessionId: pid, createdAt: date(t.createdAt) }));
  }

  return {
    foods,
    foodServings,
    recipes,
    recipeIngredients,
    recipeSteps,
    recipeTagNames,
    foodLog,
    mealPlans,
    meals,
    water: d.water.map((w) => ({ ...w, id: newId(), userId, loggedAt: date(w.loggedAt) })),
    weight: d.weight.map((w) => ({ ...w, id: newId(), userId, createdAt: date(w.createdAt) })),
    workouts: d.workouts.map((w) => ({ ...w, id: newId(), userId, createdAt: date(w.createdAt) })),
    mealTemplates: d.mealTemplates.map((t) => ({
      id: newId(),
      userId,
      name: t.name,
      useCount: t.useCount,
      createdAt: date(t.createdAt),
      items: t.items.map((i) => ({ ...i, foodId: food(i.foodId), recipeId: recipe(i.recipeId, "meal template") })) as Prisma.InputJsonValue,
    })),
    pantry: d.pantry.map(({ createdAt, ...p }) => ({
      ...p,
      id: (p.id && pantryMap.get(p.id)) || newId(),
      userId,
      foodId: food(p.foodId),
      ...(createdAt ? { createdAt: date(createdAt) } : {}),
    })),
    pantryTransactions,
    shoppingList: d.shoppingList.map((s) => ({ ...s, id: (s.id && shoppingMap.get(s.id)) || newId(), userId, foodId: food(s.foodId), createdAt: date(s.createdAt) })),
    savedMeals,
    savedMealItems,
    dayTemplates,
    dayTemplateItems,
    prepSessions,
    prepTasks,
    nutritionRecommendations: d.nutritionRecommendations.map((r) => ({ ...r, id: newId(), userId, createdAt: date(r.createdAt) })),
    goalRevisions: d.goalRevisions.map((r) => ({ ...r, id: newId(), userId, createdAt: date(r.createdAt) })),
    unlinkedFoodRefs,
  };
}

/** Read-only validation summary shown before the user confirms a restore. */
export async function previewBackup(file: BackupFile) {
  const refs = referencedFoodIds(file.data);
  const system = await prisma.food.findMany({ where: { id: { in: refs }, userId: null }, select: { id: true } });
  let problem: string | null = null;
  let unlinkedFoodRefs = 0;
  try {
    unlinkedFoodRefs = planRestore("preview", file.data, { systemFoodIds: new Set(system.map((f) => f.id)), newId: () => "x" }).unlinkedFoodRefs;
  } catch (e) {
    problem = e instanceof HttpError ? e.message : "The backup's records don't fit together.";
  }
  return {
    format: file.format,
    version: file.version,
    supported: problem === null,
    problem,
    createdAt: file.createdAt,
    appVersion: file.appVersion,
    timezone: file.timezone,
    counts: backupCounts(file.data),
    unlinkedFoodRefs,
  };
}

/* ───────── restore ───────── */

const CHUNK = 1_000;
async function insertMany<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

/**
 * Deletes the user's domain data, children before parents (cascades exist, but the order is explicit
 * so nothing depends on them). Never touches the User row, sessions, other users, system foods or global tags.
 */
async function deleteDomainData(userId: string, tx: Db) {
  const ownRecipe = { recipe: { userId } };
  await tx.recipeTag.deleteMany({ where: ownRecipe });
  await tx.recipeStep.deleteMany({ where: ownRecipe });
  await tx.recipeIngredient.deleteMany({ where: ownRecipe });
  await tx.dayTemplateItem.deleteMany({ where: { dayTemplate: { userId } } });
  await tx.dayTemplate.deleteMany({ where: { userId } });
  await tx.savedMealItem.deleteMany({ where: { savedMeal: { userId } } });
  await tx.savedMeal.deleteMany({ where: { userId } });
  await tx.prepTask.deleteMany({ where: { prepSession: { userId } } });
  await tx.prepSession.deleteMany({ where: { userId } });
  await tx.nutritionRecommendation.deleteMany({ where: { userId } });
  await tx.pantryTransaction.deleteMany({ where: { userId } });
  await tx.meal.deleteMany({ where: { mealPlan: { userId } } });
  await tx.mealPlan.deleteMany({ where: { userId } });
  await tx.foodLogEntry.deleteMany({ where: { userId } });
  await tx.pantryItem.deleteMany({ where: { userId } });
  await tx.shoppingListItem.deleteMany({ where: { userId } });
  await tx.mealTemplate.deleteMany({ where: { userId } });
  await tx.foodServing.deleteMany({ where: { food: { userId } } });
  await tx.recipe.deleteMany({ where: { userId } });
  await tx.food.deleteMany({ where: { userId } });
  await tx.weightEntry.deleteMany({ where: { userId } });
  await tx.waterLogEntry.deleteMany({ where: { userId } });
  await tx.workoutRoutineEntry.deleteMany({ where: { userId } });
  await tx.goalRevision.deleteMany({ where: { userId } });
}

/**
 * REPLACES the user's domain data with the backup, atomically: one transaction, so any failure
 * (including a reference that doesn't resolve) rolls back to the untouched original data.
 * Writes are scoped to `userId` (the session user); nothing in the file chooses the owner.
 */
export async function restoreBackup(userId: string, file: BackupFile) {
  const started = Date.now();
  const result = await prisma.$transaction(
    async (tx) => {
      await deleteDomainData(userId, tx);

      const refs = referencedFoodIds(file.data);
      const system = await tx.food.findMany({ where: { id: { in: refs }, userId: null }, select: { id: true } });
      const plan = planRestore(userId, file.data, { systemFoodIds: new Set(system.map((f) => f.id)) });

      // Settings: backup preferences over the existing row. currentWeightKg is derived (re-synced below).
      const settings = { ...file.data.settings, currentWeightKg: null };
      await tx.userSettings.upsert({ where: { userId }, update: settings, create: { userId, ...settings } });

      await insertMany(plan.foods, (c) => tx.food.createMany({ data: c }));
      await insertMany(plan.foodServings, (c) => tx.foodServing.createMany({ data: c }));
      await insertMany(plan.recipes, (c) => tx.recipe.createMany({ data: c }));
      await insertMany(plan.recipeIngredients, (c) => tx.recipeIngredient.createMany({ data: c }));
      await insertMany(plan.recipeSteps, (c) => tx.recipeStep.createMany({ data: c }));
      const tagNames = [...new Set(plan.recipeTagNames.map((t) => t.name))];
      if (tagNames.length) {
        await tx.tag.createMany({ data: tagNames.map((name) => ({ name })), skipDuplicates: true });
        const tags = new Map((await tx.tag.findMany({ where: { name: { in: tagNames } } })).map((t) => [t.name, t.id]));
        await insertMany(plan.recipeTagNames, (c) => tx.recipeTag.createMany({ data: c.map((t) => ({ recipeId: t.recipeId, tagId: tags.get(t.name)! })) }));
      }
      await insertMany(plan.savedMeals, (c) => tx.savedMeal.createMany({ data: c }));
      await insertMany(plan.savedMealItems, (c) => tx.savedMealItem.createMany({ data: c }));
      await insertMany(plan.dayTemplates, (c) => tx.dayTemplate.createMany({ data: c }));
      await insertMany(plan.dayTemplateItems, (c) => tx.dayTemplateItem.createMany({ data: c }));
      await insertMany(plan.foodLog, (c) => tx.foodLogEntry.createMany({ data: c }));
      await insertMany(plan.water, (c) => tx.waterLogEntry.createMany({ data: c }));
      await insertMany(plan.weight, (c) => tx.weightEntry.createMany({ data: c }));
      await insertMany(plan.workouts, (c) => tx.workoutRoutineEntry.createMany({ data: c }));
      await insertMany(plan.mealTemplates, (c) => tx.mealTemplate.createMany({ data: c }));
      await insertMany(plan.mealPlans, (c) => tx.mealPlan.createMany({ data: c }));
      await insertMany(plan.meals, (c) => tx.meal.createMany({ data: c }));
      await insertMany(plan.pantry, (c) => tx.pantryItem.createMany({ data: c }));
      await insertMany(plan.shoppingList, (c) => tx.shoppingListItem.createMany({ data: c }));
      await insertMany(plan.pantryTransactions, (c) => tx.pantryTransaction.createMany({ data: c }));
      await insertMany(plan.prepSessions, (c) => tx.prepSession.createMany({ data: c }));
      await insertMany(plan.prepTasks, (c) => tx.prepTask.createMany({ data: c }));
      await insertMany(plan.nutritionRecommendations, (c) => tx.nutritionRecommendation.createMany({ data: c }));
      await insertMany(plan.goalRevisions, (c) => tx.goalRevision.createMany({ data: c }));

      // Derived state comes from the restored records, never from the file.
      await syncCurrentWeight(userId, tx);
      const restored = await tx.userSettings.findUniqueOrThrow({ where: { userId } });
      await ensureGoalAnchor(restored, tx);
      return { counts: backupCounts(file.data), unlinkedFoodRefs: plan.unlinkedFoodRefs };
    },
    { timeout: 180_000, maxWait: 10_000 }
  );
  return { ...result, durationMs: Date.now() - started };
}
