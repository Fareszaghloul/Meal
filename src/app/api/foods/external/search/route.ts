import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limiter";
import { searchExternalFoodSources } from "@/lib/nutrition/external-foods";

export async function GET(request: Request) {
  try {
    const rateLimitRes = enforceRateLimit(request, "EXPENSIVE");
    if (rateLimitRes) return rateLimitRes;

    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json([]);
    }

    // Retrieve user-configured USDA API key if present
    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    const usdaApiKey = settings?.usdaApiKey || process.env.USDA_API_KEY || null;

    const candidates = await searchExternalFoodSources(query, usdaApiKey);

    return NextResponse.json(candidates);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/foods/external/search error:", error);
    return NextResponse.json(
      { error: "Failed to search external food sources" },
      { status: 500 }
    );
  }
}
