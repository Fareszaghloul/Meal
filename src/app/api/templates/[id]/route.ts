import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, withAuth } from "@/lib/api/route";
import { templateInput, templateLogInput } from "@/lib/validation";
import { toTemplate } from "@/lib/services/templates";
import { logSavedMeal, updateSavedMeal, deleteSavedMeal } from "@/lib/services/saved-meals";
import { toMealItem } from "@/lib/services/food-log";

async function findMeal(userId: string, id: string) {
  const saved = await prisma.savedMeal.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: { food: { select: { name: true } }, recipe: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (saved) return { type: "saved" as const, saved };

  const legacy = await prisma.mealTemplate.findFirst({ where: { id, userId } });
  if (legacy) return { type: "legacy" as const, legacy };

  throw new HttpError(404, "Saved meal not found.", "not_found");
}

export const PUT = withAuth<{ id: string }>(async (req, user, { id }) => {
  const target = await findMeal(user.id, id);
  const input = await parseBody(req, templateInput);

  if (target.type === "saved") {
    const updated = await updateSavedMeal(user.id, id, {
      name: input.name,
      items: input.items.map((i, idx) => ({
        name: i.name,
        customName: i.name,
        foodId: i.foodId,
        recipeId: i.recipeId,
        quantity: i.servings,
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
        sortOrder: idx,
      })),
    });
    return json({
      id: updated.id,
      name: updated.name,
      items: updated.items.map((i) => ({
        name: i.name,
        servings: i.quantity,
        servingUnit: i.servingUnit,
        foodId: i.foodId,
        recipeId: i.recipeId,
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
      })),
      useCount: updated.useCount,
      createdAt: updated.createdAt,
    });
  }

  const row = await prisma.mealTemplate.update({ where: { id }, data: { name: input.name, items: input.items } });
  return json(toTemplate(row));
});

export const DELETE = withAuth<{ id: string }>(async (_req, user, { id }) => {
  const target = await findMeal(user.id, id);
  if (target.type === "saved") {
    await deleteSavedMeal(user.id, id);
  } else {
    await prisma.mealTemplate.delete({ where: { id } });
  }
  return json({ success: true });
});

/** Log every item of the saved meal atomically into a date + meal. */
export const POST = withAuth<{ id: string }>(async (req, user, { id }) => {
  const target = await findMeal(user.id, id);
  const { date, mealCategory } = await parseBody(req, templateLogInput);

  if (target.type === "saved") {
    const created = await logSavedMeal(user.id, id, { date, mealCategory });
    return json(created, { status: 201 });
  }

  // Legacy template atomic transaction
  const items = toTemplate(target.legacy).items;
  const now = Date.now();
  const created = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const entry = await tx.foodLogEntry.create({
        data: {
          userId: user.id,
          date,
          mealCategory,
          name: it.name,
          servings: it.servings,
          servingUnit: it.servingUnit,
          foodId: it.foodId,
          recipeId: it.recipeId,
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
          fiber: it.fiber,
          totalSugars: it.totalSugars,
          addedSugars: it.addedSugars,
          saturatedFat: it.saturatedFat,
          transFat: it.transFat,
          sodium: it.sodium,
          loggedAt: new Date(now + i),
        },
      });
      rows.push(entry);
    }
    await tx.mealTemplate.update({ where: { id }, data: { useCount: { increment: 1 } } });
    return rows;
  });

  return json(created.map(toMealItem), { status: 201 });
});
