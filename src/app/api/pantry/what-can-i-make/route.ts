import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { rankRecipesByPantry } from "@/lib/pantry/matcher";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const [recipes, pantry] = await Promise.all([
      prisma.recipe.findMany({
        where: { userId: user.id },
        include: {
          ingredients: {
            include: { food: true },
          },
        },
      }),
      prisma.pantryItem.findMany({
        where: { userId: user.id },
      }),
    ]);

    const ranked = rankRecipesByPantry(
      recipes.map((r) => ({
        id: r.id,
        name: r.name,
        imageUrl: r.imageUrl,
        caloriesPerServing: r.caloriesPerServing,
        proteinPerServing: r.proteinPerServing,
        carbsPerServing: r.carbsPerServing,
        fatPerServing: r.fatPerServing,
        servings: r.servings,
        ingredients: r.ingredients.map((ing) => ({
          id: ing.id,
          rawName: ing.rawName,
          foodId: ing.foodId,
          food: ing.food ? { name: ing.food.name } : null,
        })),
      })),
      pantry.map((p) => ({
        id: p.id,
        name: p.name,
        foodId: p.foodId,
        quantity: p.quantity,
        unit: p.unit,
      }))
    );

    return NextResponse.json(ranked);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/pantry/what-can-i-make error:", error);
    return NextResponse.json(
      { error: "Failed to calculate recipe matches" },
      { status: 500 }
    );
  }
}
