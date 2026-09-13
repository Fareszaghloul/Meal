import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const items = Array.isArray(body) ? body : body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided for bulk import" }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Fetch user's existing foods to avoid duplicates
    const existingFoods = await prisma.food.findMany({
      where: {
        OR: [{ userId: null }, { userId: user.id }],
      },
      select: { name: true },
    });

    const existingNamesSet = new Set(
      existingFoods.map((f) => f.name.trim().toLowerCase())
    );

    for (const item of items) {
      const name = item.name?.trim();
      if (!name) {
        skippedCount++;
        continue;
      }

      const lowerName = name.toLowerCase();
      if (existingNamesSet.has(lowerName)) {
        // Already exists in user's DB
        skippedCount++;
        continue;
      }

      try {
        const servingWeight = Number(item.servingSize) || Number(item.servingWeightGrams) || 100;
        const totalCalories = Number(item.calories) || 0;
        const totalProtein = Number(item.protein) || 0;
        const totalCarbs = Number(item.carbs) || 0;
        const totalFat = Number(item.fat) || 0;
        const totalFiber = Number(item.fiber) || 0;

        // Normalize to per 100g if servingWeight is provided
        const factor = servingWeight > 0 ? 100 / servingWeight : 1;
        const caloriesPer100g = Math.round(totalCalories * factor);
        const proteinPer100g = Math.round(totalProtein * factor * 10) / 10;
        const carbsPer100g = Math.round(totalCarbs * factor * 10) / 10;
        const fatPer100g = Math.round(totalFat * factor * 10) / 10;
        const fiberPer100g = Math.round(totalFiber * factor * 10) / 10;

        await prisma.food.create({
          data: {
            userId: user.id,
            name,
            category: item.category || "Fast Food",
            rawOrCooked: item.rawOrCooked || "cooked",
            caloriesPer100g,
            proteinPer100g,
            carbsPer100g,
            fatPer100g,
            fiberPer100g,
            defaultUnit: item.servingUnit || "g",
            servingWeightGrams: servingWeight,
          },
        });

        existingNamesSet.add(lowerName);
        importedCount++;
      } catch (err: any) {
        console.error(`Failed to import item "${name}":`, err.message);
        errors.push(name);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      total: items.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/foods/bulk-import error:", error);
    return NextResponse.json({ error: "Failed to bulk import foods" }, { status: 500 });
  }
}
