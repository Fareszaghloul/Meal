import { z } from "zod";
import { isDateString, latestPossibleLocalDate } from "@/lib/dates";
import { MEAL_CATEGORIES } from "@/lib/domain";

export const dateString = z
  .string()
  .refine(isDateString, "Expected a calendar date like 2026-10-03");

export const mealCategory = z.enum(MEAL_CATEGORIES);

/** Accepts numbers or numeric strings (form inputs), rejects NaN/negative. */
const nonNegative = z.coerce.number().finite().min(0);
const optionalNonNegative = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  nonNegative.nullable()
);

export const nutrientsSchema = z.object({
  calories: nonNegative.max(100_000).default(0),
  protein: nonNegative.max(10_000).default(0),
  carbs: nonNegative.max(10_000).default(0),
  fat: nonNegative.max(10_000).default(0),
  fiber: nonNegative.max(10_000).default(0),
  totalSugars: optionalNonNegative.default(null),
  addedSugars: optionalNonNegative.default(null),
  saturatedFat: optionalNonNegative.default(null),
  transFat: optionalNonNegative.default(null),
  sodium: optionalNonNegative.default(null),
});

const idString = z.string().min(1).max(64);

export const mealItemInput = nutrientsSchema.extend({
  id: z.string().uuid().optional(), // client-generated for idempotent retries
  date: dateString,
  mealCategory,
  name: z.string().trim().min(1, "Name is required").max(200),
  servings: z.coerce.number().finite().positive("Quantity must be greater than 0").max(100_000),
  servingUnit: z.string().trim().min(1).max(32).default("serving"),
  foodId: idString.nullable().optional(),
  recipeId: idString.nullable().optional(),
});
export type MealItemInput = z.infer<typeof mealItemInput>;

// Built explicitly (not `.partial()`) so defaults don't sneak in and make every PUT look like a macro override.
export const mealItemPatch = z
  .object({
    date: dateString.optional(),
    mealCategory: mealCategory.optional(),
    name: z.string().trim().min(1, "Name is required").max(200).optional(),
    servings: z.coerce.number().finite().positive("Quantity must be greater than 0").max(100_000).optional(),
    servingUnit: z.string().trim().min(1).max(32).optional(),
    foodId: idString.nullable().optional(),
    recipeId: idString.nullable().optional(),
    calories: nonNegative.max(100_000).optional(),
    protein: nonNegative.max(10_000).optional(),
    carbs: nonNegative.max(10_000).optional(),
    fat: nonNegative.max(10_000).optional(),
    fiber: nonNegative.max(10_000).optional(),
    totalSugars: optionalNonNegative.optional(),
    addedSugars: optionalNonNegative.optional(),
    saturatedFat: optionalNonNegative.optional(),
    transFat: optionalNonNegative.optional(),
    sodium: optionalNonNegative.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
export type MealItemPatch = z.infer<typeof mealItemPatch>;

export const copyEntriesInput = z.object({
  fromDate: dateString,
  toDate: dateString,
  fromMealCategory: mealCategory.optional(),
  toMealCategory: mealCategory.optional(),
  entryIds: z.array(idString).max(200).optional(),
});

export const dayQuery = z.object({ date: dateString });
export const rangeQuery = z.object({ from: dateString, to: dateString });

export const waterInput = z.object({
  date: dateString,
  amountMl: z.coerce.number().int().positive().max(10_000),
});

export const foodsQuery = z.object({
  q: z.string().trim().max(100).optional().default(""),
  view: z.enum(["all", "recent", "favorites", "frequent", "mine", "library"]).optional().default("all"),
  category: z.string().trim().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(2000).optional().default(100),
});

/** Named servings on a food: "1 egg" = 50 g. */
export const servingInput = z.object({
  label: z.string().trim().min(1, "Serving needs a name").max(60),
  grams: z.coerce.number().finite().positive("Serving weight must be more than 0").max(100_000),
  isDefault: z.boolean().optional().default(false),
});
export const servingsInput = z.array(servingInput).max(20);

export const foodPatch = z.object({
  isFavorite: z.boolean().optional(),
});

export const templateItem = nutrientsSchema.extend({
  name: z.string().trim().min(1).max(200),
  servings: z.coerce.number().finite().positive().max(100_000),
  servingUnit: z.string().trim().min(1).max(32).default("serving"),
  foodId: idString.nullable().default(null),
  recipeId: idString.nullable().default(null),
});

export const templateInput = z.object({
  name: z.string().trim().min(1, "Give the meal a name").max(100),
  items: z.array(templateItem).min(1, "A meal needs at least one item").max(100),
});

export const templateLogInput = z.object({ date: dateString, mealCategory });

export const goalsPatch = z.object({
  dailyCalories: z.coerce.number().min(500).max(20_000).optional(),
  dailyProtein: z.coerce.number().min(0).max(1_000).optional(),
  dailyCarbs: z.coerce.number().min(0).max(2_000).optional(),
  dailyFat: z.coerce.number().min(0).max(1_000).optional(),
  dailyFiber: optionalNonNegative.optional(),
  dailySodium: optionalNonNegative.optional(),
  dailyWaterGoalMl: z.coerce.number().int().min(0).max(20_000).optional(),
});

/* ───────── weight ───────── */

export const WEIGHT_KG_MIN = 20;
export const WEIGHT_KG_MAX = 500;
export const WEIGHT_NOTES_MAX = 500;

// "" means "cleared"; a missing key (undefined) must stay missing so patches never wipe fields.
const blankToNull = (v: unknown) => (v === "" ? null : v);

/** A measurement date: a real calendar date that is not in the future anywhere on Earth. */
const weightDate = dateString.refine((d) => d <= latestPossibleLocalDate(), "A weigh-in can't be dated in the future");
/** "HH:mm", 24-hour; blank means no time. */
const weightTime = z.preprocess(blankToNull, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm").nullable().optional());
const weightKg = z.coerce
  .number()
  .finite()
  .min(WEIGHT_KG_MIN, `Weight must be at least ${WEIGHT_KG_MIN} kg`)
  .max(WEIGHT_KG_MAX, `Weight must be at most ${WEIGHT_KG_MAX} kg`);
const metric = (min: number, max: number) => z.preprocess(blankToNull, z.coerce.number().finite().min(min).max(max).nullable().optional());
const weightNotes = z.preprocess(blankToNull, z.string().trim().max(WEIGHT_NOTES_MAX, `Notes must be ${WEIGHT_NOTES_MAX} characters or fewer`).nullable().optional());
const weightEntryType = z.enum(["daily", "inbody"]);

/** New measurement. InBody-only metrics are dropped for daily weigh-ins by the service. */
export const weightInput = z.object({
  date: weightDate,
  time: weightTime.optional(),
  entryType: weightEntryType.default("daily"),
  weightKg,
  bodyFatPct: metric(3, 60).optional(),
  smmKg: metric(5, 200).optional(),
  bmi: metric(10, 60).optional(),
  notes: weightNotes.optional(),
});
export type WeightInput = z.infer<typeof weightInput>;

// Built explicitly (not `.partial()`) so the entryType default can't sneak into a patch.
export const weightPatch = z.object({
  date: weightDate.optional(),
  time: weightTime.optional(),
  entryType: weightEntryType.optional(),
  weightKg: weightKg.optional(),
  bodyFatPct: metric(3, 60).optional(),
  smmKg: metric(5, 200).optional(),
  bmi: metric(10, 60).optional(),
  notes: weightNotes.optional(),
});
export type WeightPatch = z.infer<typeof weightPatch>;

export const weightListQuery = z.object({ from: dateString.optional() });
export const weightIdQuery = z.object({ id: idString });

/** Export file shape (also what import accepts). */
export const exportFile = z.object({
  app: z.literal("mealprep"),
  version: z.literal(1),
  exportedAt: z.string(),
  goals: goalsPatch.optional(),
  foods: z.array(z.record(z.string(), z.unknown())).default([]),
  entries: z.array(mealItemInput.omit({ id: true }).extend({ id: z.string().optional() })).default([]),
  water: z.array(waterInput).default([]),
  weight: z.array(weightInput).default([]),
  templates: z.array(templateInput).default([]),
});
export type ExportFile = z.infer<typeof exportFile>;
