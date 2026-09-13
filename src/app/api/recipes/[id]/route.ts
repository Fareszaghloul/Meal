import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateRecipeNutrition } from "@/lib/nutrition/calculator";
import { requireAuth } from "@/lib/auth/session";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;
    const recipe = await prisma.recipe.findFirst({
      where: { id, userId: user.id },
      include: {
        tags: { include: { tag: true } },
        ingredients: {
          include: { food: true },
          orderBy: { sortOrder: "asc" },
        },
        instructions: {
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...recipe,
      tags: recipe.tags.map((t) => t.tag.name),
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/recipes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;

    const existingRecipe = await prisma.recipe.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    const body = await request.json();
    const {
      name,
      description,
      servings,
      prepTimeMinutes,
      cookTimeMinutes,
      imageUrl,
      sourceUrl,
      sourcePlatform,
      isFavorite,
      tags = [],
      ingredients = [],
      instructions = [],
      nutrition,
    } = body;

    // Remove old tags, ingredients, instructions
    await prisma.recipeTag.deleteMany({ where: { recipeId: id } });
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await prisma.recipeStep.deleteMany({ where: { recipeId: id } });

    // Connect/create tags
    const tagConnects: Array<{ tag: { connect: { id: string } } }> = [];
    if (Array.isArray(tags)) {
      for (const tagName of tags) {
        const cleanName = tagName.trim().toLowerCase();
        if (!cleanName) continue;
        const tagRecord = await prisma.tag.upsert({
          where: { name: cleanName },
          update: {},
          create: { name: cleanName },
        });
        tagConnects.push({ tag: { connect: { id: tagRecord.id } } });
      }
    }

    const allFoods = await prisma.food.findMany();
    const ingredientsWithFood = ingredients.map(
      (
        ing: { rawName: string; quantity: number; unit: string; notes?: string; foodId?: string },
        idx: number
      ) => {
        let matchedFoodId = ing.foodId || null;
        let matchedFood = null;
        if (matchedFoodId) {
          matchedFood = allFoods.find((f) => f.id === matchedFoodId) || null;
        } else {
          const lower = ing.rawName.toLowerCase();
          const match = allFoods.find(
            (f) =>
              lower.includes(f.name.toLowerCase()) ||
              f.name.toLowerCase().includes(lower)
          );
          if (match) {
            matchedFoodId = match.id;
            matchedFood = match;
          }
        }
        return {
          rawName: ing.rawName,
          quantity: Number(ing.quantity) || 1,
          unit: ing.unit || "g",
          notes: ing.notes || null,
          sortOrder: idx + 1,
          foodId: matchedFoodId,
          food: matchedFood,
        };
      }
    );

    const safeServings = Number(servings) || 4;
    let calculated = calculateRecipeNutrition(ingredientsWithFood, safeServings);
    let caloriesPerServing = calculated.perServing.calories;
    let proteinPerServing = calculated.perServing.protein;
    let carbsPerServing = calculated.perServing.carbs;
    let fatPerServing = calculated.perServing.fat;
    let fiberPerServing = calculated.perServing.fiber;
    let isNutritionCalculated = true;

    if (nutrition && (nutrition.calories || nutrition.protein)) {
      caloriesPerServing = Number(nutrition.calories) || caloriesPerServing;
      proteinPerServing = Number(nutrition.protein) || proteinPerServing;
      carbsPerServing = Number(nutrition.carbs) || carbsPerServing;
      fatPerServing = Number(nutrition.fat) || fatPerServing;
      fiberPerServing = Number(nutrition.fiber) || fiberPerServing;
      isNutritionCalculated = false;
    }

    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        servings: safeServings,
        prepTimeMinutes: prepTimeMinutes ? Number(prepTimeMinutes) : null,
        cookTimeMinutes: cookTimeMinutes ? Number(cookTimeMinutes) : null,
        imageUrl: imageUrl || null,
        sourceUrl: sourceUrl || null,
        sourcePlatform: sourcePlatform || "Manual",
        isFavorite: isFavorite !== undefined ? Boolean(isFavorite) : undefined,
        caloriesPerServing,
        proteinPerServing,
        carbsPerServing,
        fatPerServing,
        fiberPerServing,
        totalSugarsPerServing: calculated.perServing.totalSugars,
        addedSugarsPerServing: calculated.perServing.addedSugars,
        saturatedFatPerServing: calculated.perServing.saturatedFat,
        transFatPerServing: calculated.perServing.transFat,
        sodiumPerServing: calculated.perServing.sodium,
        isNutritionCalculated,
        tags: {
          create: tagConnects,
        },
        ingredients: {
          create: ingredientsWithFood.map((ing: { rawName: string; quantity: number; unit: string; notes: string | null; sortOrder: number; foodId: string | null }) => ({
            rawName: ing.rawName,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            sortOrder: ing.sortOrder,
            foodId: ing.foodId,
          })),
        },
        instructions: {
          create: instructions.map((inst: string, idx: number) => ({
            stepNumber: idx + 1,
            instruction: typeof inst === "string" ? inst : (inst as { instruction: string }).instruction,
          })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        ingredients: { include: { food: true } },
        instructions: true,
      },
    });

    return NextResponse.json({
      ...updated,
      tags: updated.tags.map((t) => t.tag.name),
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/recipes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;

    const existing = await prisma.recipe.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    await prisma.recipe.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/recipes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
