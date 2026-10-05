import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import {
  analyzeAdaptiveNutrition,
  createRecommendationRecord,
} from "@/lib/services/adaptive-nutrition";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days")) || 21;

    const analysis = await analyzeAdaptiveNutrition(user.id, days);

    // If ready and no existing pending recommendation record, persist one
    if (analysis.status === "ready" && !analysis.existingRecommendationId) {
      const record = await createRecommendationRecord(user.id, analysis);
      analysis.existingRecommendationId = record.id;
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/adaptive-nutrition error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze adaptive nutrition" },
      { status: error.status || 500 }
    );
  }
}
