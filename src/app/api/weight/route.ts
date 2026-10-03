import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import {
  processWeightEntries,
  calculateWeightAnalytics,
} from "@/lib/nutrition/weight-analytics";
import { isDateString } from "@/lib/dates";

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

    // Separate everyday weigh-in entries from InBody scans
    const dailyEntries = entries.filter(
      (e) => e.entryType === "daily" || (!e.entryType && !e.bodyFatPct && !e.smmKg)
    );
    const inbodyEntries = entries.filter(
      (e) => e.entryType === "inbody" || (!e.entryType && (e.bodyFatPct != null || e.smmKg != null))
    );

    const processedDaily = processWeightEntries(dailyEntries);
    const processedAll = processWeightEntries(entries);

    // Compute analytics strictly on everyday weigh-ins so sporadic scans don't distort rolling averages
    const analytics = calculateWeightAnalytics(
      dailyEntries.length > 0 ? dailyEntries : entries,
      settings?.goalWeightKg,
      settings?.goalType || "lose",
      settings?.goalWeeklyRateKg || 0.5,
      settings?.dailyCalories || 2300
    );

    return NextResponse.json({
      entries: processedAll,
      dailyEntries: processedDaily,
      inbodyEntries: inbodyEntries,
      analytics,
      measurementSystem: settings?.measurementSystem || "metric",
      userHeightCm: settings?.heightCm || null,
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
    const { date, time, entryType, weightKg, bodyFatPct, smmKg, bmi, notes } = body;

    if (!weightKg || Number(weightKg) <= 0) {
      return NextResponse.json(
        { error: "Valid weight is required" },
        { status: 400 }
      );
    }

    // The client always sends its local date; the server has no idea what "today" is for the user.
    if (!isDateString(date)) {
      return NextResponse.json({ error: "A valid date (YYYY-MM-DD) is required" }, { status: 400 });
    }
    const targetDate = date;
    const targetTime = typeof time === "string" && /^\d{2}:\d{2}$/.test(time) ? time : null;
    const safeWeight = Number(weightKg);

    const computedEntryType = entryType === "inbody" ? "inbody" : "daily";
    const isDaily = computedEntryType === "daily";

    // Strictly isolate InBody metrics to InBody scans only
    const safeBodyFat = !isDaily && bodyFatPct !== undefined && bodyFatPct !== null && bodyFatPct !== "" ? Number(bodyFatPct) : null;
    const safeSmm = !isDaily && smmKg !== undefined && smmKg !== null && smmKg !== "" ? Number(smmKg) : null;
    const safeBmi = !isDaily && bmi !== undefined && bmi !== null && bmi !== "" ? Number(bmi) : null;

    // Check if an entry with exact same date, time, and entryType exists for this user to update or create
    const existingEntry = await prisma.weightEntry.findFirst({
      where: {
        userId: user.id,
        date: targetDate,
        time: targetTime,
        entryType: computedEntryType,
      },
    });

    let entry;
    if (existingEntry) {
      entry = await prisma.weightEntry.update({
        where: { id: existingEntry.id },
        data: {
          weightKg: safeWeight,
          bodyFatPct: safeBodyFat,
          smmKg: safeSmm,
          bmi: safeBmi,
          entryType: computedEntryType,
          notes: notes !== undefined ? notes : undefined,
        },
      });
    } else {
      entry = await prisma.weightEntry.create({
        data: {
          userId: user.id,
          date: targetDate,
          time: targetTime,
          entryType: computedEntryType,
          weightKg: safeWeight,
          bodyFatPct: safeBodyFat,
          smmKg: safeSmm,
          bmi: safeBmi,
          notes: notes || null,
        },
      });
    }

    // Keep the profile's "current weight" in sync, but only when this is the newest reading
    // (a back-dated entry must not overwrite a more recent weigh-in).
    const newer = await prisma.weightEntry.findFirst({
      where: { userId: user.id, date: { gt: targetDate } },
      select: { id: true },
    });
    if (!newer) {
      const settingsUpdate: Record<string, any> = { currentWeightKg: safeWeight };
      if (!isDaily && safeBodyFat !== null) settingsUpdate.currentBodyFatPct = safeBodyFat;
      if (!isDaily && safeSmm !== null) settingsUpdate.currentSmmKg = safeSmm;
      if (!isDaily && safeBmi !== null) settingsUpdate.currentBmi = safeBmi;
      await prisma.userSettings.updateMany({ where: { userId: user.id }, data: settingsUpdate });
    }

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
    const { id, weightKg, bodyFatPct, smmKg, bmi, date, time, entryType, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.weightEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Weight entry not found" }, { status: 404 });
    }

    const targetEntryType = entryType || existing.entryType;
    const isDaily = targetEntryType === "daily";

    const safeBodyFat = isDaily
      ? null
      : bodyFatPct !== undefined
      ? bodyFatPct !== null && bodyFatPct !== ""
        ? Number(bodyFatPct)
        : null
      : undefined;
    const safeSmm = isDaily
      ? null
      : smmKg !== undefined
      ? smmKg !== null && smmKg !== ""
        ? Number(smmKg)
        : null
      : undefined;
    const safeBmi = isDaily
      ? null
      : bmi !== undefined
      ? bmi !== null && bmi !== ""
        ? Number(bmi)
        : null
      : undefined;

    const updated = await prisma.weightEntry.update({
      where: { id },
      data: {
        weightKg: weightKg !== undefined ? Number(weightKg) : undefined,
        bodyFatPct: safeBodyFat,
        smmKg: safeSmm,
        bmi: safeBmi,
        date: date || undefined,
        time: time !== undefined ? time : undefined,
        entryType: entryType || undefined,
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
