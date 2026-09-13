import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const entries = await prisma.foodLogEntry.findMany({
      where: {
        userId: user.id,
        date,
      },
      include: {
        recipe: {
          select: { id: true, name: true, imageUrl: true },
        },
        food: {
          select: { id: true, name: true, category: true },
        },
      },
      orderBy: { loggedAt: "asc" },
    });

    const totals = entries.reduce(
      (acc, e) => {
        acc.calories += e.calories || 0;
        acc.protein += e.protein || 0;
        acc.carbs += e.carbs || 0;
        acc.fat += e.fat || 0;
        acc.fiber += e.fiber || 0;
        acc.totalSugars += e.totalSugars || 0;
        acc.addedSugars += e.addedSugars || 0;
        acc.saturatedFat += e.saturatedFat || 0;
        acc.transFat += e.transFat || 0;
        acc.sodium += e.sodium || 0;
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        totalSugars: 0,
        addedSugars: 0,
        saturatedFat: 0,
        transFat: 0,
        sodium: 0,
      }
    );

    totals.calories = Math.round(totals.calories);
    totals.protein = Math.round(totals.protein * 10) / 10;
    totals.carbs = Math.round(totals.carbs * 10) / 10;
    totals.fat = Math.round(totals.fat * 10) / 10;
    totals.fiber = Math.round(totals.fiber * 10) / 10;
    totals.totalSugars = Math.round(totals.totalSugars * 10) / 10;
    totals.addedSugars = Math.round(totals.addedSugars * 10) / 10;
    totals.saturatedFat = Math.round(totals.saturatedFat * 10) / 10;
    totals.transFat = Math.round(totals.transFat * 10) / 10;
    totals.sodium = Math.round(totals.sodium);

    return NextResponse.json({
      date,
      entries,
      totals,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/food-log error:", error);
    return NextResponse.json({ error: "Failed to fetch food log" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      date = new Date().toISOString().split("T")[0],
      mealCategory = "snack",
      name,
      servings = 1.0,
      servingUnit = "serving",
      calories = 0,
      protein = 0,
      carbs = 0,
      fat = 0,
      fiber = 0,
      totalSugars,
      addedSugars,
      saturatedFat,
      transFat,
      sodium,
      recipeId,
      foodId,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const parseNullable = (val: any) => {
      if (val === undefined || val === null || val === "") return null;
      const n = Number(val);
      return isNaN(n) ? null : Math.round(n * 10) / 10;
    };

    const entry = await prisma.foodLogEntry.create({
      data: {
        userId: user.id,
        date,
        mealCategory: mealCategory.toLowerCase(),
        name: name.trim(),
        servings: Number(servings) || 1.0,
        servingUnit: servingUnit || "serving",
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        fiber: Number(fiber) || 0,
        totalSugars: parseNullable(totalSugars),
        addedSugars: parseNullable(addedSugars),
        saturatedFat: parseNullable(saturatedFat),
        transFat: parseNullable(transFat),
        sodium: parseNullable(sodium) !== null ? Math.round(Number(sodium)) : null,
        recipeId: recipeId || null,
        foodId: foodId || null,
      },
      include: {
        recipe: {
          select: { id: true, name: true, imageUrl: true },
        },
        food: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/food-log error:", error);
    return NextResponse.json({ error: "Failed to create food log entry" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Entry id is required" }, { status: 400 });
    }

    const existing = await prisma.foodLogEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await prisma.foodLogEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/food-log error:", error);
    return NextResponse.json({ error: "Failed to delete food log entry" }, { status: 500 });
  }
}
