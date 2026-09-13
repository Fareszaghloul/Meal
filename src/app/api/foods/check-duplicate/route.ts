import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim().toLowerCase();
    const brand = searchParams.get("brand")?.trim().toLowerCase();
    const servingSize = searchParams.get("servingSize")
      ? parseFloat(searchParams.get("servingSize")!)
      : null;

    if (!name) {
      return NextResponse.json({ duplicate: null });
    }

    // Find any existing food accessible to this user matching the name (case-insensitive)
    const candidates = await prisma.food.findMany({
      where: {
        OR: [{ userId: null }, { userId: user.id }],
        name: { contains: name, mode: "insensitive" },
      },
      take: 5,
    });

    if (candidates.length === 0) {
      return NextResponse.json({ duplicate: null, found: false, exactMatch: null });
    }

    // Rank matching candidates by brand and serving size similarity
    let bestMatch: (typeof candidates)[0] | null = null;
    let highestScore = 0;

    for (const cand of candidates) {
      let score = 1;
      const candName = cand.name.toLowerCase();
      if (candName === name) score += 3;
      if (brand && cand.brand && cand.brand.toLowerCase() === brand) score += 3;
      if (
        servingSize &&
        cand.servingSize &&
        Math.abs(cand.servingSize - servingSize) < 2
      ) {
        score += 2;
      }

      if (score > highestScore && score >= 2) {
        highestScore = score;
        bestMatch = cand;
      }
    }

    return NextResponse.json({
      duplicate: bestMatch,
      found: !!bestMatch,
      exactMatch: bestMatch,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/foods/check-duplicate error:", error);
    return NextResponse.json({ duplicate: null });
  }
}
