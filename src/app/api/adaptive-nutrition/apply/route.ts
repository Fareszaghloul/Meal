import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { applyAdaptiveRecommendation } from "@/lib/services/adaptive-nutrition";
import { applyAdaptiveInput } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { recommendedCalories, recommendationId } = applyAdaptiveInput.parse(body);

    const updated = await applyAdaptiveRecommendation(
      user.id,
      recommendedCalories,
      recommendationId
    );

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }
    console.error("POST /api/adaptive-nutrition/apply error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply recommendation" },
      { status: error.status || 500 }
    );
  }
}
