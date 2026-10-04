import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { displayName: { contains: q } },
      ];
    }

    const [totalUsers, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              recipes: true,
              mealPlans: true,
              weightEntries: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json().catch(() => ({}));
    const { email, displayName, password, role = "user" } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    if (!displayName || typeof displayName !== "string" || displayName.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();
    const cleanRole = role === "admin" ? "admin" : "user";

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const { hashPassword } = await import("@/lib/auth/password");
    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        displayName: cleanName,
        passwordHash,
        role: cleanRole,
        status: "active",
        settings: {
          create: {
            dailyCalories: 2300,
            dailyProtein: 180,
            dailyCarbs: 220,
            dailyFat: 70,
            defaultServings: 4,
            measurementSystem: "metric",
            theme: "system",
            sex: "male",
            age: 28,
            heightCm: 178,
            currentWeightKg: null,
            goalType: "lose",
            goalWeeklyRateKg: 0.5,
            goalWeightKg: 72,
            avgDailySteps: 8000,
            useSimpleActivityMode: false,
            simpleActivityLevel: "moderate",
            useThermicEffectAdjustment: true,
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            recipes: true,
            mealPlans: true,
            weightEntries: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: newUser,
        message: `Account created for ${newUser.email}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user account" },
      { status: 500 }
    );
  }
}

