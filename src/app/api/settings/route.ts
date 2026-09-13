import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    let settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
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
          currentWeightKg: 78,
          goalType: "lose",
          goalWeeklyRateKg: 0.5,
          goalWeightKg: 72,
          avgDailySteps: 8000,
          useSimpleActivityMode: false,
          simpleActivityLevel: "moderate",
          useThermicEffectAdjustment: true,
          ollamaUrl: "http://localhost:11434",
          ollamaModel: "qwen2.5:7b",
          screenshotMethod: "ocr_local",
        },
      });
    }

    const workouts = await prisma.workoutRoutineEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    const maskedApiKey = settings.cloudApiKey
      ? `${settings.cloudApiKey.slice(0, 4)}...${settings.cloudApiKey.slice(-4)}`
      : "";

    const maskedUsdaKey = settings.usdaApiKey
      ? `${settings.usdaApiKey.slice(0, 4)}...${settings.usdaApiKey.slice(-4)}`
      : "";

    return NextResponse.json({
      ...settings,
      workouts,
      cloudApiKeyMasked: maskedApiKey,
      hasCloudApiKey: Boolean(settings.cloudApiKey),
      usdaApiKeyMasked: maskedUsdaKey,
      hasUsdaApiKey: Boolean(settings.usdaApiKey),
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      dailyCalories,
      dailyProtein,
      dailyCarbs,
      dailyFat,
      defaultServings,
      measurementSystem,
      theme,
      sex,
      birthDate,
      age,
      heightCm,
      currentWeightKg,
      currentBodyFatPct,
      goalType,
      goalWeeklyRateKg,
      goalWeightKg,
      avgDailySteps,
      useSimpleActivityMode,
      simpleActivityLevel,
      useThermicEffectAdjustment,
      ollamaUrl,
      ollamaModel,
      screenshotMethod,
      cloudApiKey,
      usdaApiKey,
    } = body;

    const dataToUpdate: Record<string, unknown> = {};
    if (dailyCalories !== undefined) dataToUpdate.dailyCalories = Number(dailyCalories);
    if (dailyProtein !== undefined) dataToUpdate.dailyProtein = Number(dailyProtein);
    if (dailyCarbs !== undefined) dataToUpdate.dailyCarbs = Number(dailyCarbs);
    if (dailyFat !== undefined) dataToUpdate.dailyFat = Number(dailyFat);
    if (defaultServings !== undefined) dataToUpdate.defaultServings = Number(defaultServings);
    if (measurementSystem !== undefined) dataToUpdate.measurementSystem = measurementSystem;
    if (theme !== undefined) dataToUpdate.theme = theme;

    if (sex !== undefined) dataToUpdate.sex = sex;
    if (birthDate !== undefined) {
      dataToUpdate.birthDate = birthDate ? String(birthDate).trim() : null;
      if (birthDate) {
        // Automatically calculate exact current age from birthday
        const birth = new Date(birthDate);
        const today = new Date();
        let calculatedAge = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge > 0 && calculatedAge < 125) {
          dataToUpdate.age = calculatedAge;
        }
      }
    }
    if (age !== undefined && dataToUpdate.age === undefined) dataToUpdate.age = Number(age);
    if (heightCm !== undefined) dataToUpdate.heightCm = Number(heightCm);
    if (currentWeightKg !== undefined) dataToUpdate.currentWeightKg = Number(currentWeightKg);
    if (currentBodyFatPct !== undefined) {
      dataToUpdate.currentBodyFatPct = currentBodyFatPct !== null && currentBodyFatPct !== "" ? Number(currentBodyFatPct) : null;
    }
    if (goalType !== undefined) dataToUpdate.goalType = goalType;
    if (goalWeeklyRateKg !== undefined) dataToUpdate.goalWeeklyRateKg = Number(goalWeeklyRateKg);
    if (goalWeightKg !== undefined) dataToUpdate.goalWeightKg = goalWeightKg ? Number(goalWeightKg) : null;
    if (avgDailySteps !== undefined) dataToUpdate.avgDailySteps = Number(avgDailySteps);
    if (useSimpleActivityMode !== undefined) dataToUpdate.useSimpleActivityMode = Boolean(useSimpleActivityMode);
    if (simpleActivityLevel !== undefined) dataToUpdate.simpleActivityLevel = simpleActivityLevel;
    if (useThermicEffectAdjustment !== undefined)
      dataToUpdate.useThermicEffectAdjustment = Boolean(useThermicEffectAdjustment);

    const isAdmin = user.role === "admin";
    if (isAdmin) {
      if (ollamaUrl !== undefined) dataToUpdate.ollamaUrl = String(ollamaUrl).trim();
      if (ollamaModel !== undefined) dataToUpdate.ollamaModel = String(ollamaModel).trim();
      if (screenshotMethod !== undefined) dataToUpdate.screenshotMethod = screenshotMethod;
      if (cloudApiKey !== undefined && cloudApiKey !== null) {
        dataToUpdate.cloudApiKey = String(cloudApiKey).trim() || null;
      }
      if (usdaApiKey !== undefined && usdaApiKey !== null) {
        dataToUpdate.usdaApiKey = String(usdaApiKey).trim() || null;
      }
    }

    const updated = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: dataToUpdate,
      create: {
        userId: user.id,
        ...dataToUpdate,
      },
    });

    const workouts = await prisma.workoutRoutineEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      ...updated,
      workouts,
      hasCloudApiKey: Boolean(updated.cloudApiKey),
      cloudApiKeyMasked: updated.cloudApiKey
        ? `${updated.cloudApiKey.slice(0, 4)}...${updated.cloudApiKey.slice(-4)}`
        : "",
      hasUsdaApiKey: Boolean(updated.usdaApiKey),
      usdaApiKeyMasked: updated.usdaApiKey
        ? `${updated.usdaApiKey.slice(0, 4)}...${updated.usdaApiKey.slice(-4)}`
        : "",
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
