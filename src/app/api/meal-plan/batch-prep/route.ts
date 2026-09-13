import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { getMonday } from "../route";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      weekStart,
      recipeId,
      servings = 1,
      days = [], // e.g. ["monday", "tuesday", "wednesday", "thursday", "friday"]
      mealCategory = "lunch",
    } = body;

    if (!recipeId || !Array.isArray(days) || days.length === 0) {
      return NextResponse.json(
        { error: "recipeId and days are required" },
        { status: 400 }
      );
    }

    const actualWeekStart = weekStart || getMonday();
    let mealPlan = await prisma.mealPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId: user.id,
          weekStartDate: actualWeekStart,
        },
      },
    });

    if (!mealPlan) {
      mealPlan = await prisma.mealPlan.create({
        data: {
          userId: user.id,
          weekStartDate: actualWeekStart,
        },
      });
    }

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, userId: user.id },
    });
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const factor = Number(servings) || 1;
    const calories = Math.round(recipe.caloriesPerServing * factor);
    const protein = Math.round(recipe.proteinPerServing * factor * 10) / 10;
    const carbs = Math.round(recipe.carbsPerServing * factor * 10) / 10;
    const fat = Math.round(recipe.fatPerServing * factor * 10) / 10;

    const createdMeals = [];
    for (const day of days) {
      const meal = await prisma.meal.create({
        data: {
          mealPlanId: mealPlan.id,
          dayOfWeek: String(day).toLowerCase(),
          mealCategory: String(mealCategory).toLowerCase(),
          recipeId: recipe.id,
          servings: factor,
          calories,
          protein,
          carbs,
          fat,
        },
      });
      createdMeals.push(meal);
    }

    return NextResponse.json({
      success: true,
      count: createdMeals.length,
      meals: createdMeals,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/meal-plan/batch-prep error:", error);
    return NextResponse.json(
      { error: "Failed to batch create meal prep" },
      { status: 500 }
    );
  }
}
