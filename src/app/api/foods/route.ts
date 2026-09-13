import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim().toLowerCase() || "";
    const category = searchParams.get("category")?.trim() || "";

    const filterConditions: any[] = [
      {
        OR: [{ userId: null }, { userId: user.id }],
      },
    ];

    if (query) {
      filterConditions.push({ name: { contains: query } });
    }
    if (category && category !== "All") {
      filterConditions.push({ category });
    }

    const foods = await prisma.food.findMany({
      where: {
        AND: filterConditions,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(foods);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/foods error:", error);
    return NextResponse.json({ error: "Failed to fetch foods" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      name,
      category = "Pantry",
      rawOrCooked = "unspecified",
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      fiberPer100g = 0,
      defaultUnit = "g",
      servingWeightGrams = 100,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Food name is required" }, { status: 400 });
    }

    // Check if food with this name already exists for this user or globally
    const existing = await prisma.food.findFirst({
      where: {
        name: name.trim(),
        OR: [{ userId: null }, { userId: user.id }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A food with this name already exists in your database" },
        { status: 409 }
      );
    }

    const food = await prisma.food.create({
      data: {
        userId: user.id,
        name: name.trim(),
        category,
        rawOrCooked,
        caloriesPer100g: Number(caloriesPer100g) || 0,
        proteinPer100g: Number(proteinPer100g) || 0,
        carbsPer100g: Number(carbsPer100g) || 0,
        fatPer100g: Number(fatPer100g) || 0,
        fiberPer100g: Number(fiberPer100g) || 0,
        defaultUnit,
        servingWeightGrams: Number(servingWeightGrams) || 100,
      },
    });

    return NextResponse.json(food, { status: 201 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/foods error:", error);
    return NextResponse.json({ error: "Failed to create food" }, { status: 500 });
  }
}
