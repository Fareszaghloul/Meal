import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limiter";
import { unifiedFoodSearch, UnifiedSearchOptions } from "@/lib/nutrition/providers/unified-search";
import { FoodProviderName } from "@/lib/nutrition/providers/types";

export async function GET(request: Request) {
  try {
    const rateLimitRes = enforceRateLimit(request, "API");
    if (rateLimitRes) return rateLimitRes;

    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const sourceParam = (searchParams.get("source")?.trim().toLowerCase() || "all") as "all" | FoodProviderName;
    const limitParam = parseInt(searchParams.get("limit") || "30", 10);
    const safeLimit = Math.min(100, Math.max(1, isNaN(limitParam) ? 30 : limitParam));

    if (!query) {
      return NextResponse.json([]);
    }

    // Retrieve user-configured USDA API key if present
    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    const usdaApiKey = settings?.usdaApiKey || process.env.USDA_API_KEY || null;

    const options: UnifiedSearchOptions = {
      source: sourceParam,
      limit: safeLimit,
      userId: user.id,
      usdaApiKey,
    };

    const results = await unifiedFoodSearch.search(query, options);

    return NextResponse.json(results);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/foods/search error:", error);
    return NextResponse.json(
      { error: "Failed to perform unified food search" },
      { status: 500 }
    );
  }
}
