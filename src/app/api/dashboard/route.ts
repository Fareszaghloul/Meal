import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { calculateWeightAnalytics, processWeightEntries } from "@/lib/nutrition/weight-analytics";

// Helper to get current week's Monday in YYYY-MM-DD
function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const weekStart = getMonday(date);

    // Parallel fetch of all dashboard requirements in a single server roundtrip
    const [
      dbUser,
      rawSettings,
      foodEntries,
      waterEntries,
      weightEntries,
      mealPlan,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, displayName: true, role: true },
      }),
      prisma.userSettings.findUnique({
        where: { userId: user.id },
      }),
      prisma.foodLogEntry.findMany({
        where: { userId: user.id, date },
        include: {
          recipe: { select: { id: true, name: true, imageUrl: true } },
          food: { select: { id: true, name: true, category: true } },
        },
        orderBy: { loggedAt: "asc" },
      }),
      prisma.waterLogEntry.findMany({
        where: { userId: user.id, date },
        orderBy: { loggedAt: "asc" },
      }),
      prisma.weightEntry.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
      }),
      prisma.mealPlan.findUnique({
        where: {
          userId_weekStartDate: {
            userId: user.id,
            weekStartDate: weekStart,
          },
        },
        include: {
          meals: {
            include: {
              recipe: {
                include: {
                  tags: { include: { tag: true } },
                  ingredients: { include: { food: true } },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
    ]);

    const settings = rawSettings || {
      dailyCalories: 2300,
      dailyProtein: 180,
      dailyCarbs: 220,
      dailyFat: 70,
      dailyWaterGoalMl: 2500,
      defaultServings: 4,
      measurementSystem: "metric",
      theme: "system",
      goalType: "lose",
      goalWeeklyRateKg: 0.5,
      goalWeightKg: 72,
    };

    // Calculate Food Log totals
    const foodTotals = foodEntries.reduce(
      (acc, e) => {
        acc.calories += e.calories || 0;
        acc.protein += e.protein || 0;
        acc.carbs += e.carbs || 0;
        acc.fat += e.fat || 0;
        acc.fiber += e.fiber || 0;
        acc.totalSugars += e.totalSugars || 0;
        acc.addedSugars += e.addedSugars || 0;
        acc.saturatedFat += e.saturatedFat || 0;
        acc.transFat += e.transFat || 0;
        acc.sodium += e.sodium || 0;
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        totalSugars: 0,
        addedSugars: 0,
        saturatedFat: 0,
        transFat: 0,
        sodium: 0,
      }
    );

    foodTotals.calories = Math.round(foodTotals.calories);
    foodTotals.protein = Math.round(foodTotals.protein * 10) / 10;
    foodTotals.carbs = Math.round(foodTotals.carbs * 10) / 10;
    foodTotals.fat = Math.round(foodTotals.fat * 10) / 10;
    foodTotals.fiber = Math.round(foodTotals.fiber * 10) / 10;
    foodTotals.totalSugars = Math.round(foodTotals.totalSugars * 10) / 10;
    foodTotals.addedSugars = Math.round(foodTotals.addedSugars * 10) / 10;
    foodTotals.saturatedFat = Math.round(foodTotals.saturatedFat * 10) / 10;
    foodTotals.transFat = Math.round(foodTotals.transFat * 10) / 10;
    foodTotals.sodium = Math.round(foodTotals.sodium);

    // Calculate Water total
    const waterTotalMl = waterEntries.reduce((sum, e) => sum + (e.amountMl || 0), 0);
    const waterGoalMl = settings.dailyWaterGoalMl || 2500;

    // Calculate Weight Analytics
    const dailyEntries = weightEntries.filter(
      (e) => e.entryType === "daily" || (!e.entryType && !e.bodyFatPct && !e.smmKg)
    );
    const weightAnalytics = calculateWeightAnalytics(
      dailyEntries.length > 0 ? dailyEntries : weightEntries,
      settings?.goalWeightKg,
      settings?.goalType || "lose",
      settings?.goalWeeklyRateKg || 0.5,
      settings?.dailyCalories || 2300
    );

    return NextResponse.json({
      user: dbUser,
      settings,
      foodLog: {
        entries: foodEntries,
        totals: foodTotals,
      },
      waterLog: {
        date,
        totalMl: waterTotalMl,
        goalMl: waterGoalMl,
        entries: waterEntries,
      },
      weightAnalytics,
      mealPlan,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
