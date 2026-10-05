import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/route";
import type { MealCategory, DayTemplate, DayTemplateItem } from "@/lib/domain";
import type { DayTemplateInput, UpdateDayTemplateInput, ApplyDayTemplateInput } from "@/lib/validation";
import { parseDate, startOfWeek } from "@/lib/dates";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

type DayTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    dayTemplateId: string;
    mealCategory: string;
    foodId: string | null;
    recipeId: string | null;
    savedMealId: string | null;
    customName: string | null;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    sortOrder: number;
    food?: { name: string } | null;
    recipe?: { name: string; servingLabel?: string | null } | null;
    savedMeal?: { name: string } | null;
  }>;
};

export function toDayTemplate(row: DayTemplateRow): DayTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isFavorite: row.isFavorite ?? false,
    useCount: row.useCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((i): DayTemplateItem => {
      const displayName =
        i.customName ||
        i.food?.name ||
        i.recipe?.name ||
        i.savedMeal?.name ||
        "Item";
      return {
        id: i.id,
        dayTemplateId: i.dayTemplateId,
        mealCategory: (i.mealCategory as MealCategory) || "lunch",
        foodId: i.foodId,
        recipeId: i.recipeId,
        savedMealId: i.savedMealId,
        customName: i.customName,
        name: displayName,
        servings: i.servings,
        servingUnit: "serving",
        calories: Math.round(i.calories),
        protein: Math.round(i.protein * 10) / 10,
        carbs: Math.round(i.carbs * 10) / 10,
        fat: Math.round(i.fat * 10) / 10,
        fiber: i.fiber !== null && i.fiber !== undefined ? Math.round(i.fiber * 10) / 10 : 0,
        totalSugars: null,
        addedSugars: null,
        saturatedFat: null,
        transFat: null,
        sodium: null,
        sortOrder: i.sortOrder,
      };
    }),
  };
}

export async function listDayTemplates(userId: string): Promise<DayTemplate[]> {
  const rows = await prisma.dayTemplate.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          food: { select: { name: true } },
          recipe: { select: { name: true, servingLabel: true } },
          savedMeal: { select: { name: true } },
        },
        orderBy: [{ mealCategory: "asc" }, { sortOrder: "asc" }],
      },
    },
    orderBy: [{ isFavorite: "desc" }, { useCount: "desc" }, { updatedAt: "desc" }],
  });

  return rows.map(toDayTemplate);
}

export async function getDayTemplate(userId: string, id: string): Promise<DayTemplate> {
  const row = await prisma.dayTemplate.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: {
          food: { select: { name: true } },
          recipe: { select: { name: true, servingLabel: true } },
          savedMeal: { select: { name: true } },
        },
        orderBy: [{ mealCategory: "asc" }, { sortOrder: "asc" }],
      },
    },
  });

  if (!row) throw new HttpError(404, "Day template not found.", "not_found");
  return toDayTemplate(row);
}

export async function createDayTemplate(
  userId: string,
  input: DayTemplateInput
): Promise<DayTemplate> {
  const row = await prisma.$transaction(async (tx) => {
    return tx.dayTemplate.create({
      data: {
        userId,
        name: input.name,
        description: input.description ?? null,
        isFavorite: input.isFavorite ?? false,
        items: {
          create: input.items.map((item, index) => ({
            mealCategory: item.mealCategory,
            foodId: item.foodId ?? null,
            recipeId: item.recipeId ?? null,
            savedMealId: item.savedMealId ?? null,
            customName: item.customName ?? item.name ?? null,
            servings: item.servings,
            calories: item.calories ?? 0,
            protein: item.protein ?? 0,
            carbs: item.carbs ?? 0,
            fat: item.fat ?? 0,
            fiber: item.fiber ?? null,
            sortOrder: item.sortOrder ?? index,
          })),
        },
      },
      include: {
        items: {
          include: {
            food: { select: { name: true } },
            recipe: { select: { name: true, servingLabel: true } },
            savedMeal: { select: { name: true } },
          },
          orderBy: [{ mealCategory: "asc" }, { sortOrder: "asc" }],
        },
      },
    });
  });

  return toDayTemplate(row);
}

export async function updateDayTemplate(
  userId: string,
  id: string,
  input: UpdateDayTemplateInput
): Promise<DayTemplate> {
  const existing = await prisma.dayTemplate.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "Day template not found.", "not_found");

  const row = await prisma.$transaction(async (tx) => {
    if (input.items !== undefined) {
      await tx.dayTemplateItem.deleteMany({ where: { dayTemplateId: id } });
      await tx.dayTemplateItem.createMany({
        data: input.items.map((item, index) => ({
          dayTemplateId: id,
          mealCategory: item.mealCategory,
          foodId: item.foodId ?? null,
          recipeId: item.recipeId ?? null,
          savedMealId: item.savedMealId ?? null,
          customName: item.customName ?? item.name ?? null,
          servings: item.servings,
          calories: item.calories ?? 0,
          protein: item.protein ?? 0,
          carbs: item.carbs ?? 0,
          fat: item.fat ?? 0,
          fiber: item.fiber ?? null,
          sortOrder: item.sortOrder ?? index,
        })),
      });
    }

    return tx.dayTemplate.update({
      where: { id },
      data: {
        name: input.name !== undefined ? input.name : undefined,
        description: input.description !== undefined ? input.description : undefined,
        isFavorite: input.isFavorite !== undefined ? input.isFavorite : undefined,
      },
      include: {
        items: {
          include: {
            food: { select: { name: true } },
            recipe: { select: { name: true, servingLabel: true } },
            savedMeal: { select: { name: true } },
          },
          orderBy: [{ mealCategory: "asc" }, { sortOrder: "asc" }],
        },
      },
    });
  });

  return toDayTemplate(row);
}

export async function deleteDayTemplate(userId: string, id: string): Promise<void> {
  const existing = await prisma.dayTemplate.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "Day template not found.", "not_found");

  await prisma.dayTemplate.delete({ where: { id } });
}

export async function duplicateDayTemplate(userId: string, id: string): Promise<DayTemplate> {
  const existing = await prisma.dayTemplate.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) throw new HttpError(404, "Day template not found.", "not_found");

  const row = await prisma.dayTemplate.create({
    data: {
      userId,
      name: `${existing.name} (Copy)`,
      description: existing.description,
      isFavorite: existing.isFavorite,
      items: {
        create: existing.items.map((item, index) => ({
          mealCategory: item.mealCategory,
          foodId: item.foodId,
          recipeId: item.recipeId,
          savedMealId: item.savedMealId,
          customName: item.customName,
          servings: item.servings,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
          sortOrder: item.sortOrder ?? index,
        })),
      },
    },
    include: {
      items: {
        include: {
          food: { select: { name: true } },
          recipe: { select: { name: true, servingLabel: true } },
          savedMeal: { select: { name: true } },
        },
        orderBy: [{ mealCategory: "asc" }, { sortOrder: "asc" }],
      },
    },
  });

  return toDayTemplate(row);
}

export async function applyDayTemplate(
  userId: string,
  id: string,
  opts: ApplyDayTemplateInput
): Promise<{ count: number }> {
  const template = await prisma.dayTemplate.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: {
          food: true,
          recipe: true,
          savedMeal: {
            include: {
              items: {
                include: { food: true, recipe: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
        orderBy: [{ mealCategory: "asc" }, { sortOrder: "asc" }],
      },
    },
  });

  if (!template) throw new HttpError(404, "Day template not found.", "not_found");
  if (template.items.length === 0) return { count: 0 };

  const { date, targetType, mode } = opts;
  const now = Date.now();

  const count = await prisma.$transaction(async (tx) => {
    let createdCount = 0;

    if (targetType === "food-log") {
      if (mode === "replace") {
        await tx.foodLogEntry.deleteMany({
          where: { userId, date },
        });
      }

      let seq = 0;
      for (const item of template.items) {
        if (item.savedMeal && item.savedMeal.items.length > 0) {
          // Expand saved meal items proportionally
          for (const smItem of item.savedMeal.items) {
            const name = smItem.customName || smItem.food?.name || smItem.recipe?.name || "Item";
            const scale = item.servings;
            await tx.foodLogEntry.create({
              data: {
                userId,
                date,
                mealCategory: item.mealCategory,
                name,
                servings: smItem.quantity * scale,
                servingUnit: smItem.servingUnit,
                foodId: smItem.foodId,
                recipeId: smItem.recipeId,
                calories: Math.round(smItem.calories * scale),
                protein: Math.round(smItem.protein * scale * 10) / 10,
                carbs: Math.round(smItem.carbs * scale * 10) / 10,
                fat: Math.round(smItem.fat * scale * 10) / 10,
                fiber: smItem.fiber !== null ? Math.round(smItem.fiber * scale * 10) / 10 : 0,
                totalSugars: smItem.totalSugars !== null ? Math.round(smItem.totalSugars * scale * 10) / 10 : null,
                addedSugars: smItem.addedSugars !== null ? Math.round(smItem.addedSugars * scale * 10) / 10 : null,
                saturatedFat: smItem.saturatedFat !== null ? Math.round(smItem.saturatedFat * scale * 10) / 10 : null,
                transFat: smItem.transFat !== null ? Math.round(smItem.transFat * scale * 10) / 10 : null,
                sodium: smItem.sodium !== null ? Math.round(smItem.sodium * scale) : null,
                loggedAt: new Date(now + seq++),
              },
            });
            createdCount++;
          }
        } else {
          const name = item.customName || item.food?.name || item.recipe?.name || "Item";
          const servingUnit = item.recipe?.servingLabel || "serving";
          await tx.foodLogEntry.create({
            data: {
              userId,
              date,
              mealCategory: item.mealCategory,
              name,
              servings: item.servings,
              servingUnit,
              foodId: item.foodId,
              recipeId: item.recipeId,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              fiber: item.fiber ?? 0,
              loggedAt: new Date(now + seq++),
            },
          });
          createdCount++;
        }
      }
    } else {
      // targetType === "meal-plan"
      const weekStart = startOfWeek(date);
      const parsed = parseDate(date);
      const dayOfWeek = DAY_NAMES[parsed.getDay()];

      let mealPlan = await tx.mealPlan.findUnique({
        where: {
          userId_weekStartDate: {
            userId,
            weekStartDate: weekStart,
          },
        },
      });

      if (!mealPlan) {
        mealPlan = await tx.mealPlan.create({
          data: {
            userId,
            weekStartDate: weekStart,
          },
        });
      }

      if (mode === "replace") {
        await tx.meal.deleteMany({
          where: {
            mealPlanId: mealPlan.id,
            dayOfWeek,
          },
        });
      }

      for (const item of template.items) {
        const name = item.customName || item.food?.name || item.recipe?.name || item.savedMeal?.name || "Item";
        await tx.meal.create({
          data: {
            mealPlanId: mealPlan.id,
            dayOfWeek,
            mealCategory: item.mealCategory,
            recipeId: item.recipeId,
            customName: item.recipeId ? null : name,
            servings: item.servings,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            fiber: item.fiber,
            status: "planned",
          },
        });
        createdCount++;
      }
    }

    await tx.dayTemplate.update({
      where: { id },
      data: { useCount: { increment: 1 } },
    });

    return createdCount;
  });

  return { count };
}
