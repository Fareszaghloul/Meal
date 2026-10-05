import { prisma } from "@/lib/db";
import { json, parseBody, withAuth } from "@/lib/api/route";
import { templateInput } from "@/lib/validation";
import { toTemplate } from "@/lib/services/templates";
import type { MealTemplate } from "@/lib/domain";
import { createSavedMeal } from "@/lib/services/saved-meals";

export const GET = withAuth(async (_req, user) => {
  const [savedMeals, legacyRows] = await Promise.all([
    prisma.savedMeal.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: { food: { select: { name: true } }, recipe: { select: { name: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ useCount: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.mealTemplate.findMany({
      where: { userId: user.id },
      orderBy: [{ useCount: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  const convertedSaved: MealTemplate[] = savedMeals.map((sm) => ({
    id: sm.id,
    name: sm.name,
    items: sm.items.map((i) => ({
      name: i.customName || i.food?.name || i.recipe?.name || "Item",
      servings: i.quantity,
      servingUnit: i.servingUnit,
      foodId: i.foodId,
      recipeId: i.recipeId,
      calories: i.calories,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      fiber: i.fiber ?? 0,
      totalSugars: i.totalSugars,
      addedSugars: i.addedSugars,
      saturatedFat: i.saturatedFat,
      transFat: i.transFat,
      sodium: i.sodium,
    })),
    useCount: sm.useCount,
    createdAt: sm.createdAt.toISOString(),
  }));

  return json([...convertedSaved, ...legacyRows.map(toTemplate)]);
});

export const POST = withAuth(async (req, user) => {
  const input = await parseBody(req, templateInput);
  // Create in normalized SavedMeal table
  const created = await createSavedMeal(user.id, {
    name: input.name,
    isFavorite: false,
    items: input.items.map((item, index) => ({
      name: item.name,
      customName: item.name,
      foodId: item.foodId,
      recipeId: item.recipeId,
      quantity: item.servings,
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
      sortOrder: index,
    })),
  });

  const asTemplate: MealTemplate = {
    id: created.id,
    name: created.name,
    items: created.items.map((i) => ({
      name: i.name,
      servings: i.quantity,
      servingUnit: i.servingUnit,
      foodId: i.foodId,
      recipeId: i.recipeId,
      calories: i.calories,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      fiber: i.fiber ?? 0,
      totalSugars: i.totalSugars,
      addedSugars: i.addedSugars,
      saturatedFat: i.saturatedFat,
      transFat: i.transFat,
      sodium: i.sodium,
    })),
    useCount: created.useCount,
    createdAt: created.createdAt,
  };

  return json(asTemplate, { status: 201 });
});
