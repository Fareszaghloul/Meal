import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { HttpError, json, parseBody, withAuth } from "@/lib/api/route";
import { foodPatch, servingsInput } from "@/lib/validation";
import { servingRows } from "@/lib/services/servings";

/** Small flag updates (favorite). Works on the user's own foods and on global foods. */
export const PATCH = withAuth<{ id: string }>(async (req, user, { id }) => {
  const patch = await parseBody(req, foodPatch);
  const food = await prisma.food.findFirst({ where: { id, OR: [{ userId: user.id }, { userId: null }] } });
  if (!food) throw new HttpError(404, "Food not found.", "not_found");
  const updated = await prisma.food.update({ where: { id }, data: patch });
  return json(updated);
});

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;
    const body = await request.json();
    const {
      name,
      brand,
      category,
      rawOrCooked,
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      fiberPer100g,
      totalSugarsPer100g,
      addedSugarsPer100g,
      saturatedFatPer100g,
      transFatPer100g,
      sodiumPer100g,
      caloriesPerServing,
      proteinPerServing,
      carbsPerServing,
      fatPerServing,
      fiberPerServing,
      totalSugarsPerServing,
      addedSugarsPerServing,
      saturatedFatPerServing,
      transFatPerServing,
      sodiumPerServing,
      defaultUnit,
      servingSize,
      servingUnit,
      servingWeightGrams,
      nutritionBasis,
    } = body;

    const existingFood = await prisma.food.findUnique({ where: { id } });
    if (!existingFood) {
      return NextResponse.json({ error: "Food item not found" }, { status: 404 });
    }

    // Only the creator (or an admin, for shared/global foods) may modify a food.
    const canModify = existingFood.userId === user.id || user.role === "admin";
    if (!canModify) {
      return NextResponse.json(
        { error: "You do not have permission to modify this food item" },
        { status: 403 }
      );
    }

    const parseNullable = (val: any) => {
      if (val === undefined) return undefined;
      if (val === null || val === "") return null;
      const n = Number(val);
      return isNaN(n) ? null : Math.round(n * 10) / 10;
    };

    const parsedServings = body.servings !== undefined ? servingsInput.safeParse(body.servings) : null;
    if (parsedServings && !parsedServings.success) {
      return NextResponse.json({ error: parsedServings.error.issues[0]?.message ?? "Invalid servings" }, { status: 400 });
    }

    const updated = await prisma.food.update({
      where: { id },
      include: { servings: { orderBy: { sortOrder: "asc" } } },
      data: {
        ...(parsedServings?.success
          ? {
              servings: {
                deleteMany: {},
                create: servingRows(parsedServings.data, {
                  servingSize: servingSize !== undefined ? Number(servingSize) : existingFood.servingSize,
                  servingUnit: servingUnit !== undefined ? servingUnit : existingFood.servingUnit,
                  servingWeightGrams: servingWeightGrams !== undefined ? Number(servingWeightGrams) : existingFood.servingWeightGrams,
                }),
              },
            }
          : {}),
        name: name ? name.trim() : undefined,
        brand: brand !== undefined ? (brand ? String(brand).trim() : null) : undefined,
        category,
        rawOrCooked,
        servingSize: servingSize !== undefined ? (servingSize !== null ? Number(servingSize) : null) : undefined,
        servingUnit: servingUnit !== undefined ? (servingUnit || "g") : undefined,
        servingWeightGrams: servingWeightGrams !== undefined ? Number(servingWeightGrams) : undefined,
        nutritionBasis: nutritionBasis !== undefined ? nutritionBasis : undefined,
        defaultUnit,

        // Core per 100g
        caloriesPer100g: caloriesPer100g !== undefined ? Number(caloriesPer100g) : undefined,
        proteinPer100g: proteinPer100g !== undefined ? Number(proteinPer100g) : undefined,
        carbsPer100g: carbsPer100g !== undefined ? Number(carbsPer100g) : undefined,
        fatPer100g: fatPer100g !== undefined ? Number(fatPer100g) : undefined,
        fiberPer100g: fiberPer100g !== undefined ? Number(fiberPer100g) : undefined,

        // Expanded per 100g
        totalSugarsPer100g: parseNullable(totalSugarsPer100g),
        addedSugarsPer100g: parseNullable(addedSugarsPer100g),
        saturatedFatPer100g: parseNullable(saturatedFatPer100g),
        transFatPer100g: parseNullable(transFatPer100g),
        sodiumPer100g: parseNullable(sodiumPer100g),

        // Exact per-serving
        caloriesPerServing: parseNullable(caloriesPerServing),
        proteinPerServing: parseNullable(proteinPerServing),
        carbsPerServing: parseNullable(carbsPerServing),
        fatPerServing: parseNullable(fatPerServing),
        fiberPerServing: parseNullable(fiberPerServing),
        totalSugarsPerServing: parseNullable(totalSugarsPerServing),
        addedSugarsPerServing: parseNullable(addedSugarsPerServing),
        saturatedFatPerServing: parseNullable(saturatedFatPerServing),
        transFatPerServing: parseNullable(transFatPerServing),
        sodiumPerServing: parseNullable(sodiumPerServing),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/foods/[id] error:", error);
    return NextResponse.json({ error: "Failed to update food" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;

    const existingFood = await prisma.food.findUnique({ where: { id } });
    if (!existingFood) {
      return NextResponse.json({ error: "Food item not found" }, { status: 404 });
    }

    // Only creator of the custom food (or an admin) can delete it
    if (existingFood.userId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "You do not have permission to delete standard or other users' food items" },
        { status: 403 }
      );
    }

    await prisma.food.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/foods/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete food" }, { status: 500 });
  }
}
