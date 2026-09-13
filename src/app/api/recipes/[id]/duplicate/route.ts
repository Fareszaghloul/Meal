import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;
    const original = await prisma.recipe.findFirst({
      where: { id, userId: user.id },
      include: {
        tags: true,
        ingredients: true,
        instructions: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const duplicated = await prisma.recipe.create({
      data: {
        userId: user.id,
        name: `${original.name} (Copy)`,
        description: original.description,
        servings: original.servings,
        prepTimeMinutes: original.prepTimeMinutes,
        cookTimeMinutes: original.cookTimeMinutes,
        imageUrl: original.imageUrl,
        sourceUrl: original.sourceUrl,
        sourcePlatform: original.sourcePlatform,
        isFavorite: false,
        caloriesPerServing: original.caloriesPerServing,
        proteinPerServing: original.proteinPerServing,
        carbsPerServing: original.carbsPerServing,
        fatPerServing: original.fatPerServing,
        fiberPerServing: original.fiberPerServing,
        isNutritionCalculated: original.isNutritionCalculated,
        tags: {
          create: original.tags.map((t) => ({
            tag: { connect: { id: t.tagId } },
          })),
        },
        ingredients: {
          create: original.ingredients.map((ing) => ({
            rawName: ing.rawName,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            sortOrder: ing.sortOrder,
            foodId: ing.foodId,
          })),
        },
        instructions: {
          create: original.instructions.map((inst) => ({
            stepNumber: inst.stepNumber,
            instruction: inst.instruction,
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
      ...duplicated,
      tags: duplicated.tags.map((t) => t.tag.name),
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/recipes/[id]/duplicate error:", error);
    return NextResponse.json(
      { error: "Failed to duplicate recipe" },
      { status: 500 }
    );
  }
}
