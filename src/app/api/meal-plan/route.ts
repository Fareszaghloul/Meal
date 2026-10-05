import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { addMealInput, updateMealInput } from "@/lib/validation";

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
            foodLogEntry: true,
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
              foodLogEntry: true,
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
    const body = await request.json().catch(() => ({}));
    const parseResult = addMealInput.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const {
      weekStart,
      dayOfWeek,
      mealCategory,
      recipeId,
      servings = 1,
      customName,
      calories: inputCalories,
      protein: inputProtein,
      carbs: inputCarbs,
      fat: inputFat,
      fiber: inputFiber,
    } = parseResult.data;

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

    let calories = inputCalories ?? 0;
    let protein = inputProtein ?? 0;
    let carbs = inputCarbs ?? 0;
    let fat = inputFat ?? 0;
    let fiber = inputFiber ?? null;
    let totalSugars: number | null = null;
    let addedSugars: number | null = null;
    let saturatedFat: number | null = null;
    let transFat: number | null = null;
    let sodium: number | null = null;

    let validRecipeId: string | null = null;
    if (recipeId) {
      const recipe = await prisma.recipe.findFirst({
        where: { id: recipeId, userId: user.id },
      });
      if (recipe) {
        validRecipeId = recipe.id;
        const factor = servings;
        calories = Math.round(recipe.caloriesPerServing * factor);
        protein = Math.round(recipe.proteinPerServing * factor * 10) / 10;
        carbs = Math.round(recipe.carbsPerServing * factor * 10) / 10;
        fat = Math.round(recipe.fatPerServing * factor * 10) / 10;
        fiber = recipe.fiberPerServing !== null ? Math.round(recipe.fiberPerServing * factor * 10) / 10 : null;
        totalSugars = recipe.totalSugarsPerServing !== null ? Math.round(recipe.totalSugarsPerServing * factor * 10) / 10 : null;
        addedSugars = recipe.addedSugarsPerServing !== null ? Math.round(recipe.addedSugarsPerServing * factor * 10) / 10 : null;
        saturatedFat = recipe.saturatedFatPerServing !== null ? Math.round(recipe.saturatedFatPerServing * factor * 10) / 10 : null;
        transFat = recipe.transFatPerServing !== null ? Math.round(recipe.transFatPerServing * factor * 10) / 10 : null;
        sodium = recipe.sodiumPerServing !== null ? Math.round(recipe.sodiumPerServing * factor) : null;
      }
    }

    const meal = await prisma.meal.create({
      data: {
        mealPlanId: mealPlan.id,
        dayOfWeek: dayOfWeek.toLowerCase(),
        mealCategory: mealCategory.toLowerCase(),
        recipeId: validRecipeId,
        customName: validRecipeId ? null : (customName?.trim() || null),
        servings,
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
        status: "planned",
        isCompleted: false,
      },
      include: {
        recipe: {
          include: {
            tags: { include: { tag: true } },
          },
        },
        foodLogEntry: true,
      },
    });

    return NextResponse.json(meal, { status: 201 });
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
    const body = await request.json().catch(() => ({}));
    const parseResult = updateMealInput.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const {
      mealId,
      recipeId,
      customName,
      servings,
      dayOfWeek,
      mealCategory,
      calories: inputCalories,
      protein: inputProtein,
      carbs: inputCarbs,
      fat: inputFat,
      fiber: inputFiber,
      status: inputStatus,
      isCompleted: inputIsCompleted,
    } = parseResult.data;

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

    // Determine target recipe
    const newRecipeId = recipeId !== undefined ? recipeId : existingMeal.recipeId;
    let recipeObj = existingMeal.recipe;
    if (recipeId !== undefined && recipeId !== existingMeal.recipeId) {
      if (recipeId) {
        recipeObj = await prisma.recipe.findFirst({
          where: { id: recipeId, userId: user.id },
        });
      } else {
        recipeObj = null;
      }
    }

    const finalServings = servings !== undefined ? servings : existingMeal.servings;

    let calories = inputCalories !== undefined ? inputCalories : existingMeal.calories;
    let protein = inputProtein !== undefined ? inputProtein : existingMeal.protein;
    let carbs = inputCarbs !== undefined ? inputCarbs : existingMeal.carbs;
    let fat = inputFat !== undefined ? inputFat : existingMeal.fat;
    let fiber = inputFiber !== undefined ? inputFiber : existingMeal.fiber;
    let totalSugars = existingMeal.totalSugars;
    let addedSugars = existingMeal.addedSugars;
    let saturatedFat = existingMeal.saturatedFat;
    let transFat = existingMeal.transFat;
    let sodium = existingMeal.sodium;

    if (recipeObj) {
      // Recipe meal: auto-recalculate from recipe if recipe changed or servings changed, unless explicit macros provided
      const recipeOrServingsChanged = (recipeId !== undefined && recipeId !== existingMeal.recipeId) || (servings !== undefined && servings !== existingMeal.servings);
      const explicitMacrosProvided = inputCalories !== undefined || inputProtein !== undefined || inputCarbs !== undefined || inputFat !== undefined;

      if (recipeOrServingsChanged && !explicitMacrosProvided) {
        calories = Math.round(recipeObj.caloriesPerServing * finalServings);
        protein = Math.round(recipeObj.proteinPerServing * finalServings * 10) / 10;
        carbs = Math.round(recipeObj.carbsPerServing * finalServings * 10) / 10;
        fat = Math.round(recipeObj.fatPerServing * finalServings * 10) / 10;
        fiber = recipeObj.fiberPerServing !== null ? Math.round(recipeObj.fiberPerServing * finalServings * 10) / 10 : null;
        totalSugars = recipeObj.totalSugarsPerServing !== null ? Math.round(recipeObj.totalSugarsPerServing * finalServings * 10) / 10 : null;
        addedSugars = recipeObj.addedSugarsPerServing !== null ? Math.round(recipeObj.addedSugarsPerServing * finalServings * 10) / 10 : null;
        saturatedFat = recipeObj.saturatedFatPerServing !== null ? Math.round(recipeObj.saturatedFatPerServing * finalServings * 10) / 10 : null;
        transFat = recipeObj.transFatPerServing !== null ? Math.round(recipeObj.transFatPerServing * finalServings * 10) / 10 : null;
        sodium = recipeObj.sodiumPerServing !== null ? Math.round(recipeObj.sodiumPerServing * finalServings) : null;
      }
    } else {
      // Custom meal: if servings changed and macros weren't explicitly provided, scale proportionally
      const servingsChanged = servings !== undefined && servings !== existingMeal.servings;
      const explicitMacrosProvided = inputCalories !== undefined || inputProtein !== undefined || inputCarbs !== undefined || inputFat !== undefined;

      if (servingsChanged && !explicitMacrosProvided && existingMeal.servings > 0) {
        const factor = finalServings / existingMeal.servings;
        calories = Math.round(existingMeal.calories * factor);
        protein = Math.round(existingMeal.protein * factor * 10) / 10;
        carbs = Math.round(existingMeal.carbs * factor * 10) / 10;
        fat = Math.round(existingMeal.fat * factor * 10) / 10;
        if (existingMeal.fiber !== null) {
          fiber = Math.round(existingMeal.fiber * factor * 10) / 10;
        }
      }
    }

    // Determine status & isCompleted
    let finalStatus = existingMeal.status;
    let finalIsCompleted = existingMeal.isCompleted;

    if (inputStatus !== undefined) {
      finalStatus = inputStatus;
      finalIsCompleted = inputStatus === "logged" || inputStatus === "completed";
    } else if (inputIsCompleted !== undefined) {
      finalIsCompleted = inputIsCompleted;
      if (inputIsCompleted && finalStatus === "planned") {
        finalStatus = "completed";
      } else if (!inputIsCompleted && (finalStatus === "completed" || finalStatus === "skipped")) {
        finalStatus = "planned";
      }
    }

    const updated = await prisma.meal.update({
      where: { id: mealId },
      data: {
        recipeId: newRecipeId,
        customName: newRecipeId ? null : (customName !== undefined ? (customName?.trim() || null) : existingMeal.customName),
        servings: finalServings,
        dayOfWeek: dayOfWeek ? dayOfWeek.toLowerCase() : undefined,
        mealCategory: mealCategory ? mealCategory.toLowerCase() : undefined,
        calories: calories ?? 0,
        protein: protein ?? 0,
        carbs: carbs ?? 0,
        fat: fat ?? 0,
        fiber,
        totalSugars,
        addedSugars,
        saturatedFat,
        transFat,
        sodium,
        status: finalStatus,
        isCompleted: finalIsCompleted,
      },
      include: {
        recipe: {
          include: { tags: { include: { tag: true } } },
        },
        foodLogEntry: true,
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

