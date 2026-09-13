import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limiter";
import { importExternalFood, ExternalFoodCandidate } from "@/lib/nutrition/external-foods";

export async function POST(request: Request) {
  try {
    const rateLimitRes = enforceRateLimit(request, "EXPENSIVE");
    if (rateLimitRes) return rateLimitRes;

    const user = await requireAuth(request);
    const body = await request.json();
    const candidate = body as ExternalFoodCandidate;

    if (!candidate || !candidate.name) {
      return NextResponse.json(
        { error: "Candidate food object with a valid name is required" },
        { status: 400 }
      );
    }

    const createdFood = await importExternalFood(candidate, user.id);

    return NextResponse.json(createdFood, { status: 201 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/foods/external/import error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import external food" },
      { status: 500 }
    );
  }
}
