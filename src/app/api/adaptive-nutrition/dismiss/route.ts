import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { dismissAdaptiveRecommendation } from "@/lib/services/adaptive-nutrition";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { recommendationId } = body;

    if (!recommendationId) {
      return NextResponse.json({ error: "recommendationId is required" }, { status: 400 });
    }

    await dismissAdaptiveRecommendation(user.id, recommendationId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/adaptive-nutrition/dismiss error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dismiss recommendation" },
      { status: error.status || 500 }
    );
  }
}
