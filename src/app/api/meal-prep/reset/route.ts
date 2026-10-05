import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { resetPrepSession } from "@/lib/services/meal-prep";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const { weekStart } = body;

    if (!weekStart) {
      return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
    }

    const data = await resetPrepSession(user.id, weekStart);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/meal-prep/reset error:", error);
    return NextResponse.json({ error: "Failed to reset prep session" }, { status: 500 });
  }
}
