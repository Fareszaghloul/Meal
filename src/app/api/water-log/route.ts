import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const [entries, settings] = await Promise.all([
      prisma.waterLogEntry.findMany({
        where: {
          userId: user.id,
          date,
        },
        orderBy: { loggedAt: "asc" },
      }),
      prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: { dailyWaterGoalMl: true },
      }),
    ]);

    const totalMl = entries.reduce((sum, e) => sum + (e.amountMl || 0), 0);
    const goalMl = settings?.dailyWaterGoalMl || 2500;

    return NextResponse.json({
      date,
      totalMl,
      goalMl,
      entries,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/water-log error:", error);
    return NextResponse.json({ error: "Failed to fetch water log" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      date = new Date().toISOString().split("T")[0],
      amountMl = 250,
      action,
    } = body;

    // Reset daily water
    if (action === "reset") {
      await prisma.waterLogEntry.deleteMany({
        where: {
          userId: user.id,
          date,
        },
      });

      return NextResponse.json({ success: true, totalMl: 0, date });
    }

    if (!amountMl || Number(amountMl) <= 0) {
      return NextResponse.json({ error: "Positive water amount is required" }, { status: 400 });
    }

    const entry = await prisma.waterLogEntry.create({
      data: {
        userId: user.id,
        date,
        amountMl: Math.round(Number(amountMl)),
      },
    });

    const entries = await prisma.waterLogEntry.findMany({
      where: { userId: user.id, date },
    });
    const totalMl = entries.reduce((sum, e) => sum + (e.amountMl || 0), 0);

    return NextResponse.json({
      entry,
      totalMl,
    }, { status: 201 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/water-log error:", error);
    return NextResponse.json({ error: "Failed to log water" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const date = searchParams.get("date");

    if (id) {
      const existing = await prisma.waterLogEntry.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }
      await prisma.waterLogEntry.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (date) {
      await prisma.waterLogEntry.deleteMany({
        where: { userId: user.id, date },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "id or date is required" }, { status: 400 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/water-log error:", error);
    return NextResponse.json({ error: "Failed to delete water log entry" }, { status: 500 });
  }
}
