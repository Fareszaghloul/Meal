import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

const unlogMealSchema = z.object({
  mealId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const parseResult = unlogMealSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { mealId } = parseResult.data;

    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        mealPlan: { userId: user.id },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: "Planned meal not found" }, { status: 404 });
    }

    // Atomic transaction: delete linked FoodLogEntry if exists and reset Meal
    const result = await prisma.$transaction(async (tx) => {
      if (meal.foodLogEntryId) {
        await tx.foodLogEntry.deleteMany({
          where: { id: meal.foodLogEntryId, userId: user.id },
        });
      }

      const updatedMeal = await tx.meal.update({
        where: { id: meal.id },
        data: {
          foodLogEntryId: null,
          status: "planned",
          isCompleted: false,
          loggedAt: null,
        },
        include: {
          recipe: {
            include: { tags: { include: { tag: true } } },
          },
          foodLogEntry: true,
        },
      });

      const { restorePantryForMeal } = await import("@/lib/services/pantry");
      await restorePantryForMeal(tx, user.id, meal.id);

      return { success: true, meal: updatedMeal };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/meal-plan/unlog error:", error);
    return NextResponse.json({ error: "Failed to unlog planned meal" }, { status: 500 });
  }
}
