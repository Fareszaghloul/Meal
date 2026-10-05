import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/route";
import type { MealCategory, MealItem, SavedMeal, SavedMealItem } from "@/lib/domain";
import type { savedMealInput, updateSavedMealInput } from "@/lib/validation";
import type { z } from "zod";
import { toMealItem } from "./food-log";

type SavedMealRow = {
  id: string;
  name: string;
  mealCategory: string | null;
  isFavorite?: boolean;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    savedMealId: string;
    foodId: string | null;
    recipeId: string | null;
    customName: string | null;
    quantity: number;
    servingUnit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    totalSugars: number | null;
    addedSugars: number | null;
    saturatedFat: number | null;
    transFat: number | null;
    sodium: number | null;
    sortOrder: number;
    food?: { name: string } | null;
    recipe?: { name: string } | null;
  }>;
};

export function toSavedMeal(row: SavedMealRow): SavedMeal {
  return {
    id: row.id,
    name: row.name,
    mealCategory: (row.mealCategory as MealCategory | null) ?? null,
    isFavorite: row.isFavorite ?? false,
    useCount: row.useCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((i): SavedMealItem => {
      const displayName = i.customName || i.food?.name || i.recipe?.name || "Item";
      return {
        id: i.id,
        savedMealId: i.savedMealId,
        foodId: i.foodId,
        recipeId: i.recipeId,
        customName: i.customName,
        name: displayName,
        quantity: i.quantity,
        servingUnit: i.servingUnit,
        calories: Math.round(i.calories),
        protein: Math.round(i.protein * 10) / 10,
        carbs: Math.round(i.carbs * 10) / 10,
        fat: Math.round(i.fat * 10) / 10,
        fiber: i.fiber !== null ? Math.round(i.fiber * 10) / 10 : 0,
        totalSugars: i.totalSugars !== null ? Math.round(i.totalSugars * 10) / 10 : null,
        addedSugars: i.addedSugars !== null ? Math.round(i.addedSugars * 10) / 10 : null,
        saturatedFat: i.saturatedFat !== null ? Math.round(i.saturatedFat * 10) / 10 : null,
        transFat: i.transFat !== null ? Math.round(i.transFat * 10) / 10 : null,
        sodium: i.sodium !== null ? Math.round(i.sodium) : null,
        sortOrder: i.sortOrder,
      };
    }),
  };
}

export async function listSavedMeals(userId: string): Promise<SavedMeal[]> {
  const rows = await prisma.savedMeal.findMany({
    where: { userId },
    include: {
      items: {
        include: { food: { select: { name: true } }, recipe: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ useCount: "desc" }, { updatedAt: "desc" }],
  });

  return rows.map(toSavedMeal);
}

export async function getSavedMeal(userId: string, id: string): Promise<SavedMeal> {
  const row = await prisma.savedMeal.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: { food: { select: { name: true } }, recipe: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!row) throw new HttpError(404, "Saved meal not found.", "not_found");
  return toSavedMeal(row);
}

export async function createSavedMeal(
  userId: string,
  input: z.infer<typeof savedMealInput>
): Promise<SavedMeal> {
  const row = await prisma.$transaction(async (tx) => {
    return tx.savedMeal.create({
      data: {
        userId,
        name: input.name,
        mealCategory: input.mealCategory ?? null,
        isFavorite: input.isFavorite ?? false,
        items: {
          create: input.items.map((item, index) => ({
            foodId: item.foodId ?? null,
            recipeId: item.recipeId ?? null,
            customName: item.customName ?? item.name ?? null,
            quantity: item.quantity,
            servingUnit: item.servingUnit || "serving",
            calories: item.calories ?? 0,
            protein: item.protein ?? 0,
            carbs: item.carbs ?? 0,
            fat: item.fat ?? 0,
            fiber: item.fiber ?? null,
            totalSugars: item.totalSugars ?? null,
            addedSugars: item.addedSugars ?? null,
            saturatedFat: item.saturatedFat ?? null,
            transFat: item.transFat ?? null,
            sodium: item.sodium ?? null,
            sortOrder: item.sortOrder ?? index,
          })),
        },
      },
      include: {
        items: {
          include: { food: { select: { name: true } }, recipe: { select: { name: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });

  return toSavedMeal(row);
}

export async function updateSavedMeal(
  userId: string,
  id: string,
  input: z.infer<typeof updateSavedMealInput>
): Promise<SavedMeal> {
  const existing = await prisma.savedMeal.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "Saved meal not found.", "not_found");

  const row = await prisma.$transaction(async (tx) => {
    if (input.items !== undefined) {
      // Replace all items atomically
      await tx.savedMealItem.deleteMany({ where: { savedMealId: id } });
      await tx.savedMealItem.createMany({
        data: input.items.map((item, index) => ({
          savedMealId: id,
          foodId: item.foodId ?? null,
          recipeId: item.recipeId ?? null,
          customName: item.customName ?? item.name ?? null,
          quantity: item.quantity,
          servingUnit: item.servingUnit || "serving",
          calories: item.calories ?? 0,
          protein: item.protein ?? 0,
          carbs: item.carbs ?? 0,
          fat: item.fat ?? 0,
          fiber: item.fiber ?? null,
          totalSugars: item.totalSugars ?? null,
          addedSugars: item.addedSugars ?? null,
          saturatedFat: item.saturatedFat ?? null,
          transFat: item.transFat ?? null,
          sodium: item.sodium ?? null,
          sortOrder: item.sortOrder ?? index,
        })),
      });
    }

    return tx.savedMeal.update({
      where: { id },
      data: {
        name: input.name !== undefined ? input.name : undefined,
        mealCategory: input.mealCategory !== undefined ? (input.mealCategory ?? null) : undefined,
        isFavorite: input.isFavorite !== undefined ? input.isFavorite : undefined,
      },
      include: {
        items: {
          include: { food: { select: { name: true } }, recipe: { select: { name: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });

  return toSavedMeal(row);
}

export async function duplicateSavedMeal(userId: string, id: string): Promise<SavedMeal> {
  const existing = await prisma.savedMeal.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) throw new HttpError(404, "Saved meal not found.", "not_found");

  const row = await prisma.savedMeal.create({
    data: {
      userId,
      name: `${existing.name} (Copy)`,
      mealCategory: existing.mealCategory,
      isFavorite: existing.isFavorite,
      items: {
        create: existing.items.map((item, index) => ({
          foodId: item.foodId,
          recipeId: item.recipeId,
          customName: item.customName,
          quantity: item.quantity,
          servingUnit: item.servingUnit,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
          totalSugars: item.totalSugars,
          addedSugars: item.addedSugars,
          saturatedFat: item.saturatedFat,
          transFat: item.transFat,
          sodium: item.sodium,
          sortOrder: item.sortOrder ?? index,
        })),
      },
    },
    include: {
      items: {
        include: { food: { select: { name: true } }, recipe: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return toSavedMeal(row);
}

export async function deleteSavedMeal(userId: string, id: string): Promise<void> {
  const existing = await prisma.savedMeal.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "Saved meal not found.", "not_found");

  await prisma.savedMeal.delete({ where: { id } });
}

export async function logSavedMeal(
  userId: string,
  id: string,
  opts: { date: string; mealCategory: MealCategory; multiplier?: number }
): Promise<MealItem[]> {
  const saved = await prisma.savedMeal.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: { food: { select: { name: true } }, recipe: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!saved) throw new HttpError(404, "Saved meal not found.", "not_found");
  if (saved.items.length === 0) return [];

  const multiplier = opts.multiplier && opts.multiplier > 0 ? opts.multiplier : 1;
  const now = Date.now();
  const created = await prisma.$transaction(async (tx) => {
    const entries = [];
    for (let i = 0; i < saved.items.length; i++) {
      const item = saved.items[i];
      const name = item.customName || item.food?.name || item.recipe?.name || "Item";
      const servings = Math.round(item.quantity * multiplier * 100) / 100;
      const calories = Math.round(item.calories * multiplier);
      const protein = Math.round(item.protein * multiplier * 10) / 10;
      const carbs = Math.round(item.carbs * multiplier * 10) / 10;
      const fat = Math.round(item.fat * multiplier * 10) / 10;
      const fiber = item.fiber !== null ? Math.round(item.fiber * multiplier * 10) / 10 : 0;
      const totalSugars = item.totalSugars !== null ? Math.round(item.totalSugars * multiplier * 10) / 10 : null;
      const addedSugars = item.addedSugars !== null ? Math.round(item.addedSugars * multiplier * 10) / 10 : null;
      const saturatedFat = item.saturatedFat !== null ? Math.round(item.saturatedFat * multiplier * 10) / 10 : null;
      const transFat = item.transFat !== null ? Math.round(item.transFat * multiplier * 10) / 10 : null;
      const sodium = item.sodium !== null ? Math.round(item.sodium * multiplier) : null;

      const entry = await tx.foodLogEntry.create({
        data: {
          userId,
          date: opts.date,
          mealCategory: opts.mealCategory,
          name,
          servings,
          servingUnit: item.servingUnit,
          foodId: item.foodId,
          recipeId: item.recipeId,
          calories,
          protein,
          carbs,
          fat,
          fiber,
          totalSugars,
          addedSugars,
          saturatedFat,
          transFat,
          sodium,
          loggedAt: new Date(now + i),
        },
      });
      entries.push(entry);
    }

    await tx.savedMeal.update({
      where: { id },
      data: { useCount: { increment: 1 } },
    });

    return entries;
  });

  return created.map(toMealItem);
}
