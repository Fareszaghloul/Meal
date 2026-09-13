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
    const { date, weightKg, bodyFatPct, smmKg, bmi, notes } = body;

    if (!weightKg || Number(weightKg) <= 0) {
      return NextResponse.json(
        { error: "Valid weight is required" },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const targetDate = date || todayStr;
    const safeWeight = Number(weightKg);
    const safeBodyFat = bodyFatPct !== undefined && bodyFatPct !== null && bodyFatPct !== "" ? Number(bodyFatPct) : null;
    const safeSmm = smmKg !== undefined && smmKg !== null && smmKg !== "" ? Number(smmKg) : null;
    const safeBmi = bmi !== undefined && bmi !== null && bmi !== "" ? Number(bmi) : null;

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
        bodyFatPct: safeBodyFat !== null ? safeBodyFat : undefined,
        smmKg: safeSmm !== null ? safeSmm : undefined,
        bmi: safeBmi !== null ? safeBmi : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      create: {
        userId: user.id,
        date: targetDate,
        weightKg: safeWeight,
        bodyFatPct: safeBodyFat,
        smmKg: safeSmm,
        bmi: safeBmi,
        notes: notes || null,
      },
    });

    // Also update UserSettings to keep in sync
    const settingsUpdate: Record<string, any> = { currentWeightKg: safeWeight };
    if (safeBodyFat !== null) {
      settingsUpdate.currentBodyFatPct = safeBodyFat;
    }
    if (safeSmm !== null) {
      settingsUpdate.currentSmmKg = safeSmm;
    }
    if (safeBmi !== null) {
      settingsUpdate.currentBmi = safeBmi;
    }
    await prisma.userSettings.updateMany({
      where: { userId: user.id },
      data: settingsUpdate,
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
    const { id, weightKg, bodyFatPct, smmKg, bmi, date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.weightEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Weight entry not found" }, { status: 404 });
    }

    const safeBodyFat = bodyFatPct !== undefined ? (bodyFatPct !== null && bodyFatPct !== "" ? Number(bodyFatPct) : null) : undefined;
    const safeSmm = smmKg !== undefined ? (smmKg !== null && smmKg !== "" ? Number(smmKg) : null) : undefined;
    const safeBmi = bmi !== undefined ? (bmi !== null && bmi !== "" ? Number(bmi) : null) : undefined;

    const updated = await prisma.weightEntry.update({
      where: { id },
      data: {
        weightKg: weightKg !== undefined ? Number(weightKg) : undefined,
        bodyFatPct: safeBodyFat,
        smmKg: safeSmm,
        bmi: safeBmi,
        date: date || undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    const settingsUpdate: Record<string, any> = {};
    if (weightKg !== undefined) settingsUpdate.currentWeightKg = Number(weightKg);
    if (safeBodyFat !== undefined && safeBodyFat !== null) settingsUpdate.currentBodyFatPct = safeBodyFat;
    if (safeSmm !== undefined && safeSmm !== null) settingsUpdate.currentSmmKg = safeSmm;
    if (safeBmi !== undefined && safeBmi !== null) settingsUpdate.currentBmi = safeBmi;

    if (Object.keys(settingsUpdate).length > 0) {
      await prisma.userSettings.updateMany({
        where: { userId: user.id },
        data: settingsUpdate,
      });
    }

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
