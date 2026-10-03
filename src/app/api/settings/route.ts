import { NextResponse } from "next/server";
import type { UserSettings, WorkoutRoutineEntry } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

/** Secrets never leave the server; the client only learns whether a key is set. */
function publicSettings(settings: UserSettings, workouts: WorkoutRoutineEntry[]) {
  const { cloudApiKey, usdaApiKey, ...safe } = settings;
  return {
    ...safe,
    workouts,
    hasCloudApiKey: Boolean(cloudApiKey),
    hasUsdaApiKey: Boolean(usdaApiKey),
  };
}

const optionalNumber = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number(v));

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

    return NextResponse.json(publicSettings(settings, workouts));
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
      currentSmmKg,
      currentBmi,
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
    if (body.dailyFiber !== undefined) dataToUpdate.dailyFiber = optionalNumber(body.dailyFiber);
    if (body.dailySodium !== undefined) dataToUpdate.dailySodium = optionalNumber(body.dailySodium);
    if (body.dailyWaterGoalMl !== undefined) dataToUpdate.dailyWaterGoalMl = Math.max(0, Math.round(Number(body.dailyWaterGoalMl) || 0));
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
    if (currentSmmKg !== undefined) {
      dataToUpdate.currentSmmKg = currentSmmKg !== null && currentSmmKg !== "" ? Number(currentSmmKg) : null;
    }
    if (currentBmi !== undefined) {
      dataToUpdate.currentBmi = currentBmi !== null && currentBmi !== "" ? Number(currentBmi) : null;
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

    return NextResponse.json(publicSettings(updated, workouts));
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
