import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limiter";
import { unifiedFoodSearch } from "@/lib/nutrition/providers/unified-search";
import { FoodProviderName } from "@/lib/nutrition/providers/types";

export async function GET(
  request: Request,
  props: { params: Promise<{ provider: string; id: string }> }
) {
  try {
    const rateLimitRes = enforceRateLimit(request, "API");
    if (rateLimitRes) return rateLimitRes;

    const user = await requireAuth(request);
    const { provider, id } = await props.params;

    const validProviders: FoodProviderName[] = ["local", "openfoodfacts", "usda", "fatsecret"];
    const normalizedProvider = provider.toLowerCase() as FoodProviderName;

    if (!validProviders.includes(normalizedProvider)) {
      return NextResponse.json(
        { error: `Invalid provider '${provider}'. Valid providers: ${validProviders.join(", ")}` },
        { status: 400 }
      );
    }

    const food = await unifiedFoodSearch.getById(normalizedProvider, id, {
      userId: user.id,
    });

    if (!food) {
      return NextResponse.json({ error: "Food item not found" }, { status: 404 });
    }

    return NextResponse.json(food);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/foods/external/[provider]/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve external food details" },
      { status: 500 }
    );
  }
}
