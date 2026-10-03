import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateRecipeNutrition } from "@/lib/nutrition/calculator";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim().toLowerCase() || "";
    const tag = searchParams.get("tag")?.trim() || "";
    const favoritesOnly = searchParams.get("favorites") === "true";
    const sortBy = searchParams.get("sortBy") || "newest";

    const whereClause: Record<string, unknown> = {
      userId: user.id,
    };

    if (favoritesOnly) {
      whereClause.isFavorite = true;
    }

    if (tag && tag !== "All") {
      whereClause.tags = {
        some: {
          tag: {
            name: tag.toLowerCase(),
          },
        },
      };
    }

    if (query) {
      whereClause.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
        {
          ingredients: {
            some: {
              rawName: { contains: query },
            },
          },
        },
        {
          tags: {
            some: {
              tag: {
                name: { contains: query },
              },
            },
          },
        },
      ];
    }

    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sortBy === "oldest") orderBy = { createdAt: "asc" };
    if (sortBy === "name") orderBy = { name: "asc" };
    if (sortBy === "protein") orderBy = { proteinPerServing: "desc" };
    if (sortBy === "calories") orderBy = { caloriesPerServing: "desc" };

    const recipes = await prisma.recipe.findMany({
      where: whereClause,
      include: {
        tags: {
          include: { tag: true },
        },
        ingredients: {
          include: { food: true },
          orderBy: { sortOrder: "asc" },
        },
        instructions: {
          orderBy: { stepNumber: "asc" },
        },
      },
      orderBy,
    });

    const formatted = recipes.map((r) => ({
      ...r,
      tags: r.tags.map((t) => t.tag.name),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      name,
      description,
      servings = 4,
      prepTimeMinutes,
      cookTimeMinutes,
      imageUrl,
      sourceUrl,
      sourcePlatform,
      isFavorite = false,
      tags = [],
      ingredients = [],
      instructions = [],
      nutrition,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Recipe name is required" }, { status: 400 });
    }

    // Connect or create tags
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

    // Match ingredients with foods this user can see (own + global) if foodId is not provided
    const allFoods = await prisma.food.findMany({ where: { OR: [{ userId: null }, { userId: user.id }] } });
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
          // Fuzzy match by name
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

    // Calculate nutrition
    let calculated = calculateRecipeNutrition(ingredientsWithFood, servings);
    let caloriesPerServing = calculated.perServing.calories;
    let proteinPerServing = calculated.perServing.protein;
    let carbsPerServing = calculated.perServing.carbs;
    let fatPerServing = calculated.perServing.fat;
    let fiberPerServing = calculated.perServing.fiber;
    let isNutritionCalculated = true;

    // If explicit nutrition override is supplied (e.g. from nutrition label / AI)
    if (nutrition && (nutrition.calories || nutrition.protein)) {
      caloriesPerServing = Number(nutrition.calories) || caloriesPerServing;
      proteinPerServing = Number(nutrition.protein) || proteinPerServing;
      carbsPerServing = Number(nutrition.carbs) || carbsPerServing;
      fatPerServing = Number(nutrition.fat) || fatPerServing;
      fiberPerServing = Number(nutrition.fiber) || fiberPerServing;
      isNutritionCalculated = false;
    }

    const recipe = await prisma.recipe.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        servings: Number(servings) || 4,
        prepTimeMinutes: prepTimeMinutes ? Number(prepTimeMinutes) : null,
        cookTimeMinutes: cookTimeMinutes ? Number(cookTimeMinutes) : null,
        imageUrl: imageUrl || null,
        sourceUrl: sourceUrl || null,
        sourcePlatform: sourcePlatform || "Manual",
        isFavorite: Boolean(isFavorite),
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
      ...recipe,
      tags: recipe.tags.map((t) => t.tag.name),
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
