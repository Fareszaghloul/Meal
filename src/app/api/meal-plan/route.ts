import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

// Helper to get current week's Monday in YYYY-MM-DD
export function getMonday(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart") || getMonday();

    let mealPlan = await prisma.mealPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId: user.id,
          weekStartDate: weekStart,
        },
      },
      include: {
        meals: {
          include: {
            recipe: {
              include: {
                tags: { include: { tag: true } },
                ingredients: { include: { food: true } },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!mealPlan) {
      mealPlan = await prisma.mealPlan.create({
        data: {
          userId: user.id,
          weekStartDate: weekStart,
        },
        include: {
          meals: {
            include: {
              recipe: {
                include: {
                  tags: { include: { tag: true } },
                  ingredients: { include: { food: true } },
                },
              },
            },
          },
        },
      });
    }

    return NextResponse.json(mealPlan);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/meal-plan error:", error);
    return NextResponse.json({ error: "Failed to fetch meal plan" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      weekStart,
      dayOfWeek,
      mealCategory,
      recipeId,
      servings = 1,
      customName,
      calories: customCalories,
      protein: customProtein,
      carbs: customCarbs,
      fat: customFat,
    } = body;

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

    let calories = Number(customCalories) || 0;
    let protein = Number(customProtein) || 0;
    let carbs = Number(customCarbs) || 0;
    let fat = Number(customFat) || 0;

    let validRecipeId: string | null = null;
    if (recipeId) {
      const recipe = await prisma.recipe.findFirst({
        where: { id: recipeId, userId: user.id },
      });
      if (recipe) {
        validRecipeId = recipe.id;
        const factor = Number(servings) || 1;
        calories = Math.round(recipe.caloriesPerServing * factor);
        protein = Math.round(recipe.proteinPerServing * factor * 10) / 10;
        carbs = Math.round(recipe.carbsPerServing * factor * 10) / 10;
        fat = Math.round(recipe.fatPerServing * factor * 10) / 10;
      }
    }

    const meal = await prisma.meal.create({
      data: {
        mealPlanId: mealPlan.id,
        dayOfWeek: String(dayOfWeek).toLowerCase(),
        mealCategory: String(mealCategory).toLowerCase(),
        recipeId: validRecipeId,
        customName: customName?.trim() || null,
        servings: Number(servings) || 1,
        calories,
        protein,
        carbs,
        fat,
      },
      include: {
        recipe: {
          include: {
            tags: { include: { tag: true } },
          },
        },
      },
    });

    return NextResponse.json(meal);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/meal-plan error:", error);
    return NextResponse.json({ error: "Failed to add meal" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      mealId,
      servings,
      isCompleted,
      dayOfWeek,
      mealCategory,
      customName,
      calories: inputCalories,
      protein: inputProtein,
      carbs: inputCarbs,
      fat: inputFat,
    } = body;

    if (!mealId) {
      return NextResponse.json({ error: "mealId required" }, { status: 400 });
    }

    const existingMeal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        mealPlan: { userId: user.id },
      },
      include: { recipe: true },
    });

    if (!existingMeal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    let calories = inputCalories !== undefined ? Number(inputCalories) : existingMeal.calories;
    let protein = inputProtein !== undefined ? Number(inputProtein) : existingMeal.protein;
    let carbs = inputCarbs !== undefined ? Number(inputCarbs) : existingMeal.carbs;
    let fat = inputFat !== undefined ? Number(inputFat) : existingMeal.fat;

    if (servings !== undefined && existingMeal.recipe) {
      const factor = Number(servings);
      calories = Math.round(existingMeal.recipe.caloriesPerServing * factor);
      protein = Math.round(existingMeal.recipe.proteinPerServing * factor * 10) / 10;
      carbs = Math.round(existingMeal.recipe.carbsPerServing * factor * 10) / 10;
      fat = Math.round(existingMeal.recipe.fatPerServing * factor * 10) / 10;
    }

    const updated = await prisma.meal.update({
      where: { id: mealId },
      data: {
        servings: servings !== undefined ? Number(servings) : undefined,
        isCompleted: isCompleted !== undefined ? Boolean(isCompleted) : undefined,
        dayOfWeek: dayOfWeek ? dayOfWeek.toLowerCase() : undefined,
        mealCategory: mealCategory ? mealCategory.toLowerCase() : undefined,
        customName: customName !== undefined ? customName : undefined,
        calories,
        protein,
        carbs,
        fat,
      },
      include: {
        recipe: {
          include: { tags: { include: { tag: true } } },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/meal-plan error:", error);
    return NextResponse.json({ error: "Failed to update meal" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const mealId = searchParams.get("mealId");

    if (!mealId) {
      return NextResponse.json({ error: "mealId required" }, { status: 400 });
    }

    const existingMeal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        mealPlan: { userId: user.id },
      },
    });

    if (!existingMeal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    await prisma.meal.delete({
      where: { id: mealId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/meal-plan error:", error);
    return NextResponse.json({ error: "Failed to delete meal" }, { status: 500 });
  }
}
