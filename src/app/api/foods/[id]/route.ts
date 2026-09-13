import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

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
      category,
      rawOrCooked,
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      fiberPer100g,
      defaultUnit,
      servingWeightGrams,
    } = body;

    const existingFood = await prisma.food.findUnique({ where: { id } });
    if (!existingFood) {
      return NextResponse.json({ error: "Food item not found" }, { status: 404 });
    }

    // Creator of the food, admin, or user editing an imported/standard item (userId === null) can modify it
    const canModify = existingFood.userId === user.id || existingFood.userId === null || user.role === "admin";
    if (!canModify) {
      return NextResponse.json(
        { error: "You do not have permission to modify other users' food items" },
        { status: 403 }
      );
    }

    const updated = await prisma.food.update({
      where: { id },
      data: {
        userId: existingFood.userId === null && user.role !== "admin" ? user.id : undefined,
        name: name ? name.trim() : undefined,
        category,
        rawOrCooked,
        caloriesPer100g: caloriesPer100g !== undefined ? Number(caloriesPer100g) : undefined,
        proteinPer100g: proteinPer100g !== undefined ? Number(proteinPer100g) : undefined,
        carbsPer100g: carbsPer100g !== undefined ? Number(carbsPer100g) : undefined,
        fatPer100g: fatPer100g !== undefined ? Number(fatPer100g) : undefined,
        fiberPer100g: fiberPer100g !== undefined ? Number(fiberPer100g) : undefined,
        defaultUnit,
        servingWeightGrams: servingWeightGrams !== undefined ? Number(servingWeightGrams) : undefined,
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
