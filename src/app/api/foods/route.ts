import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { json, parseQuery, withAuth } from "@/lib/api/route";
import { foodsQuery, servingsInput } from "@/lib/validation";
import { servingRows } from "@/lib/services/servings";

/**
 * Personal food database. `view` picks the ranking:
 *  recent    – most recently logged first
 *  frequent  – most often logged first
 *  favorites – starred foods
 *  mine      – foods this user created (excludes global/system foods)
 *  all       – alphabetical
 * `q` matches name or brand, case-insensitively, on any word prefix or substring.
 */
export const GET = withAuth(async (req, user) => {
  const { q, view, category, limit } = parseQuery(req, foodsQuery);
  const where: Prisma.FoodWhereInput = {
    OR: [{ userId: null }, { userId: user.id }],
  };
  const and: Prisma.FoodWhereInput[] = [];
  if (q) {
    and.push({
      OR: [{ name: { contains: q, mode: "insensitive" } }, { brand: { contains: q, mode: "insensitive" } }],
    });
  }
  if (category && category !== "All") and.push({ category });
  if (view === "favorites") and.push({ isFavorite: true });
  if (view === "recent" || view === "frequent") and.push({ lastUsedAt: { not: null } });
  if (view === "mine") where.OR = [{ userId: user.id }];
  if (view === "library") where.OR = [{ userId: null }];
  if (and.length) where.AND = and;

  const orderBy: Prisma.FoodOrderByWithRelationInput[] =
    view === "recent"
      ? [{ lastUsedAt: "desc" }]
      : view === "frequent"
        ? [{ useCount: "desc" }, { lastUsedAt: "desc" }]
        : view === "favorites"
          ? [{ useCount: "desc" }, { name: "asc" }]
          : [{ name: "asc" }];

  const foods = await prisma.food.findMany({ where, orderBy, take: limit, include: { servings: { orderBy: { sortOrder: "asc" } } } });
  return json(foods);
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      name,
      brand,
      source = "MANUAL",
      category = "Pantry",
      rawOrCooked = "unspecified",
      defaultUnit = "g",
      servingSize,
      servingUnit = "g",
      servingWeightGrams,
      nutritionBasis = "PER_SERVING",
      caloriesPer100g: rawCal100,
      proteinPer100g: rawPro100,
      carbsPer100g: rawCarbs100,
      fatPer100g: rawFat100,
      fiberPer100g: rawFiber100,
      totalSugarsPer100g: rawSugars100,
      addedSugarsPer100g: rawAddedSugars100,
      saturatedFatPer100g: rawSatFat100,
      transFatPer100g: rawTransFat100,
      sodiumPer100g: rawSodium100,
      caloriesPerServing: rawCalServing,
      proteinPerServing: rawProServing,
      carbsPerServing: rawCarbsServing,
      fatPerServing: rawFatServing,
      fiberPerServing: rawFiberServing,
      totalSugarsPerServing: rawSugarsServing,
      addedSugarsPerServing: rawAddedSugarsServing,
      saturatedFatPerServing: rawSatFatServing,
      transFatPerServing: rawTransFatServing,
      sodiumPerServing: rawSodiumServing,
      forceCreate = false,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Food name is required" }, { status: 400 });
    }

    // Named servings ("1 egg" = 50 g). Falls back to the legacy single serving when none are sent.
    const parsedServings = body.servings !== undefined ? servingsInput.safeParse(body.servings) : null;
    if (parsedServings && !parsedServings.success) {
      return NextResponse.json({ error: parsedServings.error.issues[0]?.message ?? "Invalid servings" }, { status: 400 });
    }

    const cleanName = name.trim();
    const safeServingWeight = Number(servingWeightGrams) > 0 ? Number(servingWeightGrams) : 100;
    const safeServingSize = servingSize !== undefined && servingSize !== null ? Number(servingSize) : 1;

    // Check if food with this name already exists for this user
    const existing = await prisma.food.findFirst({
      where: {
        name: cleanName,
        OR: [{ userId: null }, { userId: user.id }],
      },
    });

    let finalName = cleanName;
    if (existing) {
      if (!forceCreate) {
        return NextResponse.json(
          {
            error: "A food with this name already exists in your database",
            existingFood: existing,
          },
          { status: 409 }
        );
      } else {
        finalName = `${cleanName} (${new Date().toLocaleDateString()})`;
      }
    }

    const isPerServingBasis = nutritionBasis === "PER_SERVING";

    // Resolve nutrient inputs allowing flat aliases (calories, protein, carbs, etc.)
    const resolvedCalServing = rawCalServing ?? (isPerServingBasis ? body.calories : undefined);
    const resolvedProServing = rawProServing ?? (isPerServingBasis ? body.protein : undefined);
    const resolvedCarbsServing = rawCarbsServing ?? (isPerServingBasis ? (body.carbohydrates ?? body.carbs) : undefined);
    const resolvedFatServing = rawFatServing ?? (isPerServingBasis ? body.fat : undefined);
    const resolvedFiberServing = rawFiberServing ?? (isPerServingBasis ? body.fiber : undefined);
    const resolvedSugarsServing = rawSugarsServing ?? (isPerServingBasis ? (body.totalSugars ?? body.sugars) : undefined);
    const resolvedAddedSugarsServing = rawAddedSugarsServing ?? (isPerServingBasis ? body.addedSugars : undefined);
    const resolvedSatFatServing = rawSatFatServing ?? (isPerServingBasis ? body.saturatedFat : undefined);
    const resolvedTransFatServing = rawTransFatServing ?? (isPerServingBasis ? body.transFat : undefined);
    const resolvedSodiumServing = rawSodiumServing ?? (isPerServingBasis ? body.sodium : undefined);

    const resolvedCal100 = rawCal100 ?? (!isPerServingBasis ? body.calories : undefined);
    const resolvedPro100 = rawPro100 ?? (!isPerServingBasis ? body.protein : undefined);
    const resolvedCarbs100 = rawCarbs100 ?? (!isPerServingBasis ? (body.carbohydrates ?? body.carbs) : undefined);
    const resolvedFat100 = rawFat100 ?? (!isPerServingBasis ? body.fat : undefined);
    const resolvedFiber100 = rawFiber100 ?? (!isPerServingBasis ? body.fiber : undefined);
    const resolvedSugars100 = rawSugars100 ?? (!isPerServingBasis ? (body.totalSugars ?? body.sugars) : undefined);
    const resolvedAddedSugars100 = rawAddedSugars100 ?? (!isPerServingBasis ? body.addedSugars : undefined);
    const resolvedSatFat100 = rawSatFat100 ?? (!isPerServingBasis ? body.saturatedFat : undefined);
    const resolvedTransFat100 = rawTransFat100 ?? (!isPerServingBasis ? body.transFat : undefined);
    const resolvedSodium100 = rawSodium100 ?? (!isPerServingBasis ? body.sodium : undefined);

    // Helper: Parse nullable nutrient preserving 0 vs null
    const parseNullable = (val: any): number | null => {
      if (val === undefined || val === null || val === "") return null;
      const num = Number(val);
      if (isNaN(num) || num < 0) return null;
      return Math.round(num * 10) / 10;
    };

    // Calculate canonical per-100g and per-serving values
    const factorTo100g = safeServingWeight > 0 ? 100 / safeServingWeight : 1;
    const factorToServing = safeServingWeight > 0 ? safeServingWeight / 100 : 1;

    let cal100 = 0;
    let calServ: number | null = null;
    if (isPerServingBasis && resolvedCalServing !== undefined && resolvedCalServing !== null) {
      calServ = Math.max(0, Math.round(Number(resolvedCalServing)));
      cal100 = Math.round(calServ * factorTo100g);
    } else {
      cal100 = Math.max(0, Math.round(Number(resolvedCal100) || 0));
      calServ = resolvedCalServing !== undefined ? Math.round(Number(resolvedCalServing)) : Math.round(cal100 * factorToServing);
    }

    const deriveNutrientPair = (per100Input: any, perServInput: any) => {
      const parsed100 = parseNullable(per100Input);
      const parsedServ = parseNullable(perServInput);

      if (isPerServingBasis && parsedServ !== null) {
        const val100 = Math.round(parsedServ * factorTo100g * 10) / 10;
        return { per100: val100, perServing: parsedServ };
      }
      if (parsed100 !== null) {
        const valServ = parsedServ !== null ? parsedServ : Math.round(parsed100 * factorToServing * 10) / 10;
        return { per100: parsed100, perServing: valServ };
      }
      if (parsedServ !== null) {
        const val100 = Math.round(parsedServ * factorTo100g * 10) / 10;
        return { per100: val100, perServing: parsedServ };
      }
      return { per100: null, perServing: null };
    };

    const proteinPair = deriveNutrientPair(resolvedPro100, resolvedProServing);
    const carbsPair = deriveNutrientPair(resolvedCarbs100, resolvedCarbsServing);
    const fatPair = deriveNutrientPair(resolvedFat100, resolvedFatServing);
    const fiberPair = deriveNutrientPair(resolvedFiber100, resolvedFiberServing);
    const sugarsPair = deriveNutrientPair(resolvedSugars100, resolvedSugarsServing);
    const addedSugarsPair = deriveNutrientPair(resolvedAddedSugars100, resolvedAddedSugarsServing);
    const satFatPair = deriveNutrientPair(resolvedSatFat100, resolvedSatFatServing);
    const transFatPair = deriveNutrientPair(resolvedTransFat100, resolvedTransFatServing);
    const sodiumPair = deriveNutrientPair(resolvedSodium100, resolvedSodiumServing);

    const food = await prisma.food.create({
      data: {
        ...(user.id ? { user: { connect: { id: user.id } } } : {}),
        name: finalName,
        brand: brand ? String(brand).trim() : null,
        source: source || "MANUAL",
        scannedAt: source === "SCANNED" ? new Date() : null,
        category,
        rawOrCooked,
        servingSize: safeServingSize,
        servingUnit: servingUnit || "g",
        servingWeightGrams: safeServingWeight,
        nutritionBasis,
        defaultUnit: defaultUnit || "g",

        // Canonical per 100g
        caloriesPer100g: cal100,
        proteinPer100g: proteinPair.per100 ?? 0,
        carbsPer100g: carbsPair.per100 ?? 0,
        fatPer100g: fatPair.per100 ?? 0,
        fiberPer100g: fiberPair.per100 ?? 0,
        totalSugarsPer100g: sugarsPair.per100,
        addedSugarsPer100g: addedSugarsPair.per100,
        saturatedFatPer100g: satFatPair.per100,
        transFatPer100g: transFatPair.per100,
        sodiumPer100g: sodiumPair.per100,

        // Exact per-serving label values
        caloriesPerServing: calServ,
        proteinPerServing: proteinPair.perServing,
        carbsPerServing: carbsPair.perServing,
        fatPerServing: fatPair.perServing,
        fiberPerServing: fiberPair.perServing,
        totalSugarsPerServing: sugarsPair.perServing,
        addedSugarsPerServing: addedSugarsPair.perServing,
        saturatedFatPerServing: satFatPair.perServing,
        transFatPerServing: transFatPair.perServing,
        sodiumPerServing: sodiumPair.perServing,
        servings: { create: servingRows(parsedServings?.success ? parsedServings.data : null, { servingSize: safeServingSize, servingUnit: servingUnit || "g", servingWeightGrams: safeServingWeight }) },
      },
      include: { servings: { orderBy: { sortOrder: "asc" } } },
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
