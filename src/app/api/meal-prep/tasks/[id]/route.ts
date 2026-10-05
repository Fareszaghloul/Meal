import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { togglePrepTask, deletePrepTask } from "@/lib/services/meal-prep";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;
    const body = await request.json().catch(() => ({}));
    const { completed } = body;

    const task = await togglePrepTask(user.id, id, completed);
    return NextResponse.json(task);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH /api/meal-prep/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to update prep task" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;

    await deletePrepTask(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/meal-prep/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete prep task" }, { status: 500 });
  }
}
