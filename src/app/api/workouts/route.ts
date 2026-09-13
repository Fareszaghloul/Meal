import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const workouts = await prisma.workoutRoutineEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(workouts);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/workouts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { workoutType, durationMinutes = 45, sessionsPerWeek = 3, customLabel } = body;

    if (!workoutType) {
      return NextResponse.json(
        { error: "workoutType is required" },
        { status: 400 }
      );
    }

    const created = await prisma.workoutRoutineEntry.create({
      data: {
        userId: user.id,
        workoutType,
        durationMinutes: Number(durationMinutes) || 45,
        sessionsPerWeek: Number(sessionsPerWeek) || 3,
        customLabel: customLabel || null,
      },
    });

    return NextResponse.json(created);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/workouts error:", error);
    return NextResponse.json(
      { error: "Failed to create workout routine" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { id, workoutType, durationMinutes, sessionsPerWeek, customLabel } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.workoutRoutineEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Workout routine not found" }, { status: 404 });
    }

    const updated = await prisma.workoutRoutineEntry.update({
      where: { id },
      data: {
        workoutType: workoutType || undefined,
        durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
        sessionsPerWeek: sessionsPerWeek !== undefined ? Number(sessionsPerWeek) : undefined,
        customLabel: customLabel !== undefined ? customLabel : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/workouts error:", error);
    return NextResponse.json(
      { error: "Failed to update workout routine" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.workoutRoutineEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Workout routine not found" }, { status: 404 });
    }

    await prisma.workoutRoutineEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/workouts error:", error);
    return NextResponse.json(
      { error: "Failed to delete workout routine" },
      { status: 500 }
    );
  }
}
