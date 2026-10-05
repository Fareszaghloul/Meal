import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { addDays } from "@/lib/dates";

const logMealSchema = z.object({
  mealId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  deductPantry: z.boolean().optional(),
});

const DAY_OFFSETS: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const parseResult = logMealSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { mealId, date: requestedDate } = parseResult.data;

    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        mealPlan: { userId: user.id },
      },
      include: {
        recipe: true,
        mealPlan: true,
        foodLogEntry: true,
      },
    });

    if (!meal) {
      return NextResponse.json({ error: "Planned meal not found" }, { status: 404 });
    }

    // Check for duplicate logging
    if (meal.foodLogEntryId && meal.foodLogEntry) {
      return NextResponse.json(
        {
          error: "Meal has already been logged",
          meal,
          foodLogEntry: meal.foodLogEntry,
        },
        { status: 409 }
      );
    }

    // Compute target date if not provided
    const dayKey = meal.dayOfWeek.toLowerCase();
    const offset = DAY_OFFSETS[dayKey] ?? 0;
    const targetDate = requestedDate || addDays(meal.mealPlan.weekStartDate, offset);

    const mealName = meal.recipe?.name || meal.customName || "Meal";
    const servingUnit = meal.recipe?.servingLabel || "serving";

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      select: { pantryUsageBehavior: true },
    });
    const shouldDeduct =
      parseResult.data.deductPantry !== undefined
        ? parseResult.data.deductPantry
        : userSettings?.pantryUsageBehavior === "auto";

    // Atomic transaction: create FoodLogEntry, link Meal, and deduct pantry if configured
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.foodLogEntry.create({
        data: {
          userId: user.id,
          date: targetDate,
          mealCategory: meal.mealCategory,
          name: mealName,
          servings: meal.servings,
          servingUnit,
          recipeId: meal.recipeId,
          foodId: null,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          fiber: meal.fiber ?? (meal.recipe?.fiberPerServing ? meal.recipe.fiberPerServing * meal.servings : 0),
          totalSugars: meal.totalSugars ?? (meal.recipe?.totalSugarsPerServing ? meal.recipe.totalSugarsPerServing * meal.servings : null),
          addedSugars: meal.addedSugars ?? (meal.recipe?.addedSugarsPerServing ? meal.recipe.addedSugarsPerServing * meal.servings : null),
          saturatedFat: meal.saturatedFat ?? (meal.recipe?.saturatedFatPerServing ? meal.recipe.saturatedFatPerServing * meal.servings : null),
          transFat: meal.transFat ?? (meal.recipe?.transFatPerServing ? meal.recipe.transFatPerServing * meal.servings : null),
          sodium: meal.sodium ?? (meal.recipe?.sodiumPerServing ? meal.recipe.sodiumPerServing * meal.servings : null),
          loggedAt: new Date(),
        },
      });

      const updatedMeal = await tx.meal.update({
        where: { id: meal.id },
        data: {
          foodLogEntryId: entry.id,
          status: "logged",
          isCompleted: true,
          loggedAt: new Date(),
        },
        include: {
          recipe: {
            include: { tags: { include: { tag: true } } },
          },
          foodLogEntry: true,
        },
      });

      if (shouldDeduct && meal.recipeId) {
        const { deductPantryForMeal } = await import("@/lib/services/pantry");
        await deductPantryForMeal(tx, user.id, meal.id, meal.recipeId, meal.servings);
      }

      return { meal: updatedMeal, foodLogEntry: entry };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/meal-plan/log error:", error);
    return NextResponse.json({ error: "Failed to log planned meal" }, { status: 500 });
  }
}
