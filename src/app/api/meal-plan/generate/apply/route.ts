import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { applyGeneratedPlan } from "@/lib/services/meal-planner";
import { applyPlanInput } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { weekStartDate, plan, mode } = applyPlanInput.parse(body);

    const result = await applyGeneratedPlan(user.id, weekStartDate, plan, mode);
    return NextResponse.json({ success: true, ...result });
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
    console.error("POST /api/meal-plan/generate/apply error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply meal plan" },
      { status: error.status || 500 }
    );
  }
}
