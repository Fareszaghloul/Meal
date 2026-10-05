import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { generateWeeklyPlan } from "@/lib/services/meal-planner";
import { plannerConfigInput } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const config = plannerConfigInput.parse(body);

    const generated = await generateWeeklyPlan(user.id, config);
    return NextResponse.json(generated);
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
    console.error("POST /api/meal-plan/generate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate meal plan" },
      { status: error.status || 500 }
    );
  }
}
