import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { regenerateDayInPlan } from "@/lib/services/meal-planner";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { config, currentPlan, dayIndex } = body;

    if (!config || !currentPlan || typeof dayIndex !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updated = await regenerateDayInPlan(user.id, config, currentPlan, dayIndex);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/meal-plan/generate/regenerate-day error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to regenerate day" },
      { status: error.status || 500 }
    );
  }
}
