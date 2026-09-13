import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import {
  processWeightEntries,
  calculateWeightAnalytics,
} from "@/lib/nutrition/weight-analytics";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const [entries, settings] = await Promise.all([
      prisma.weightEntry.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
      }),
      prisma.userSettings.findUnique({ where: { userId: user.id } }),
    ]);

    const processed = processWeightEntries(entries);
    const analytics = calculateWeightAnalytics(
      entries,
      settings?.goalWeightKg,
      settings?.goalType || "lose",
      settings?.goalWeeklyRateKg || 0.5,
      settings?.dailyCalories || 2300
    );

    return NextResponse.json({
      entries: processed,
      analytics,
      measurementSystem: settings?.measurementSystem || "metric",
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/weight error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weight logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { date, weightKg, notes } = body;

    if (!weightKg || Number(weightKg) <= 0) {
      return NextResponse.json(
        { error: "Valid weight is required" },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const targetDate = date || todayStr;
    const safeWeight = Number(weightKg);

    // Upsert weight entry for the date for this user
    const entry = await prisma.weightEntry.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: targetDate,
        },
      },
      update: {
        weightKg: safeWeight,
        notes: notes !== undefined ? notes : undefined,
      },
      create: {
        userId: user.id,
        date: targetDate,
        weightKg: safeWeight,
        notes: notes || null,
      },
    });

    // Also update UserSettings.currentWeightKg to keep in sync
    await prisma.userSettings.updateMany({
      where: { userId: user.id },
      data: { currentWeightKg: safeWeight },
    });

    return NextResponse.json(entry);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/weight error:", error);
    return NextResponse.json(
      { error: "Failed to log weight" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { id, weightKg, date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.weightEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Weight entry not found" }, { status: 404 });
    }

    const updated = await prisma.weightEntry.update({
      where: { id },
      data: {
        weightKg: weightKg !== undefined ? Number(weightKg) : undefined,
        date: date || undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/weight error:", error);
    return NextResponse.json(
      { error: "Failed to update weight entry" },
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

    const existing = await prisma.weightEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Weight entry not found" }, { status: 404 });
    }

    await prisma.weightEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/weight error:", error);
    return NextResponse.json(
      { error: "Failed to delete weight entry" },
      { status: 500 }
    );
  }
}
