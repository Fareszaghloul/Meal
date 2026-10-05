import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { addPrepTask } from "@/lib/services/meal-prep";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { weekStart, label } = body;

    if (!weekStart || !label || !label.trim()) {
      return NextResponse.json({ error: "weekStart and label are required" }, { status: 400 });
    }

    const task = await addPrepTask(user.id, weekStart, label);
    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/meal-prep/tasks error:", error);
    return NextResponse.json({ error: "Failed to add prep task" }, { status: 500 });
  }
}
