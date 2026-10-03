import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { findDuplicateCandidates, normalizeFoodName } from "@/lib/nutrition/duplicate-detector";
import type { FoodSummary } from "@/lib/domain";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim();
    const brand = searchParams.get("brand")?.trim();
    const caloriesPer100g = searchParams.get("caloriesPer100g")
      ? parseFloat(searchParams.get("caloriesPer100g")!)
      : null;
    const servingWeightGrams = searchParams.get("servingWeightGrams")
      ? parseFloat(searchParams.get("servingWeightGrams")!)
      : null;
    const excludeId = searchParams.get("excludeId");

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ duplicate: null, found: false, candidates: [] });
    }

    const normName = normalizeFoodName(name);

    // Search existing foods for this user or standard library matching tokens
    const rawCandidates = await prisma.food.findMany({
      where: {
        OR: [{ userId: null }, { userId: user.id }],
        name: { contains: normName.split(" ")[0] || normName, mode: "insensitive" },
      },
      include: { servings: { orderBy: { sortOrder: "asc" } } },
      take: 20,
    });

    const candidates = findDuplicateCandidates(
      {
        name,
        brand,
        caloriesPer100g,
        servingWeightGrams,
      },
      rawCandidates as unknown as FoodSummary[],
      excludeId
    );

    const bestMatch = candidates[0]?.food ?? null;

    return NextResponse.json({
      duplicate: bestMatch,
      found: !!bestMatch,
      confidence: candidates[0]?.confidence ?? null,
      reason: candidates[0]?.reason ?? null,
      candidates: candidates.slice(0, 3).map((c) => ({
        food: c.food,
        confidence: c.confidence,
        reason: c.reason,
      })),
      exactMatch: candidates.find((c) => c.confidence === "high")?.food ?? null,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/foods/check-duplicate error:", error);
    return NextResponse.json({ duplicate: null, found: false, candidates: [] });
  }
}

