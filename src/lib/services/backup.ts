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
 * workout routines, meal templates, meal plans + meals, pantry, shopping list.
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
          .array(z.object({ foodId: ref.nullable(), name: str(200), quantity: n(-1_000_000, 1_000_000), unit: str(32), category: str(100) }).strict())
          .max(10_000),
        shoppingList: z
          .array(
            z
              .object({
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
        foodLog: foodLog.map(({ id, userId: _u, updatedAt, loggedAt, createdAt, mealCategory, ...e }) => {
          void id;
          void _u;
          void updatedAt;
          return { ...e, mealCategory: mealCategory as (typeof MEAL_CATEGORIES)[number], loggedAt: loggedAt.toISOString(), createdAt: createdAt.toISOString() };
        }),
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
          meals: p.meals.map(({ id, mealPlanId, ...m }) => {
            void id;
            void mealPlanId;
            return m;
          }),
        })),
        pantry: pantry.map((p) => ({ foodId: p.foodId, name: p.name, quantity: p.quantity, unit: p.unit, category: p.category })),
        shoppingList: shopping.map((i) => ({
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
    shoppingList: d.shoppingList.length,
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

  const foodMap = new Map(d.foods.map((f) => [f.id, newId()]));
  const recipeMap = new Map(d.recipes.map((r) => [r.id, newId()]));
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
    id: newId(),
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
    planMeals.forEach((m) => meals.push({ ...m, id: newId(), mealPlanId: pid, recipeId: recipe(m.recipeId, "meal plan") }));
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
    pantry: d.pantry.map((p) => ({ ...p, id: newId(), userId, foodId: food(p.foodId) })),
    shoppingList: d.shoppingList.map((s) => ({ ...s, id: newId(), userId, foodId: food(s.foodId), createdAt: date(s.createdAt) })),
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
      await insertMany(plan.foodLog, (c) => tx.foodLogEntry.createMany({ data: c }));
      await insertMany(plan.water, (c) => tx.waterLogEntry.createMany({ data: c }));
      await insertMany(plan.weight, (c) => tx.weightEntry.createMany({ data: c }));
      await insertMany(plan.workouts, (c) => tx.workoutRoutineEntry.createMany({ data: c }));
      await insertMany(plan.mealTemplates, (c) => tx.mealTemplate.createMany({ data: c }));
      await insertMany(plan.mealPlans, (c) => tx.mealPlan.createMany({ data: c }));
      await insertMany(plan.meals, (c) => tx.meal.createMany({ data: c }));
      await insertMany(plan.pantry, (c) => tx.pantryItem.createMany({ data: c }));
      await insertMany(plan.shoppingList, (c) => tx.shoppingListItem.createMany({ data: c }));
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
