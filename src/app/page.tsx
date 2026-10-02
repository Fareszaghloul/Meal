"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Coffee,
  Sun,
  Moon,
  Apple,
  Droplets,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Scale,
  Check,
  X,
  ArrowRight,
} from "lucide-react";
import { WeightAnalyticsSummary } from "@/lib/nutrition/weight-analytics";
import { useAuth } from "@/context/AuthContext";
import { LogFoodModal } from "@/components/food-log/LogFoodModal";
import { LogWeightModal } from "@/components/weight/LogWeightModal";
import { cn } from "@/lib/utils";

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MEAL_SLOTS = [
  { id: "breakfast", title: "Breakfast", defaultTime: "8:00 AM", icon: Coffee },
  { id: "lunch", title: "Lunch", defaultTime: "1:00 PM", icon: Sun },
  { id: "dinner", title: "Dinner", defaultTime: "7:30 PM", icon: Moon },
  { id: "snack", title: "Snacks", defaultTime: "Anytime", icon: Apple },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();

  // Date selection (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Food Log & Water Data
  const [foodLogEntries, setFoodLogEntries] = useState<any[]>([]);
  const [foodLogTotals, setFoodLogTotals] = useState({
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
  });
  const [isNutritionDetailsModalOpen, setIsNutritionDetailsModalOpen] = useState(false);
  const [isLogWeightModalOpen, setIsLogWeightModalOpen] = useState(false);
  const [waterTotalMl, setWaterTotalMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(2500);

  // Other dashboard data
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [settings, setSettings] = useState<any>({
    dailyCalories: 2300,
    dailyProtein: 180,
    dailyCarbs: 220,
    dailyFat: 70,
    dailyWaterGoalMl: 2500,
    measurementSystem: "metric",
  });
  const [weightAnalytics, setWeightAnalytics] = useState<WeightAnalyticsSummary | null>(null);
  const [recentWeights, setRecentWeights] = useState<{ date: string; weight: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string>("");

  // Log Food Modal state
  const [isLogFoodModalOpen, setIsLogFoodModalOpen] = useState(false);
  const [modalDefaultCategory, setModalDefaultCategory] = useState<
    "breakfast" | "lunch" | "dinner" | "snack"
  >("lunch");

  // Determine day of week from selected date
  const selectedDateObj = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);
  const dayIndex = selectedDateObj.getDay();
  const dayKey = DAY_NAMES[dayIndex];
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const formattedDateTitle = useMemo(() => {
    return selectedDateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, [selectedDateObj]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const fetchFoodAndWaterLog = async (dateStr: string) => {
    try {
      const [foodRes, waterRes] = await Promise.all([
        fetch(`/api/food-log?date=${dateStr}`),
        fetch(`/api/water-log?date=${dateStr}`),
      ]);

      if (foodRes.ok) {
        const foodData = await foodRes.json();
        setFoodLogEntries(foodData.entries || []);
        setFoodLogTotals(
          foodData.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
        );
      }

      if (waterRes.ok) {
        const waterData = await waterRes.json();
        setWaterTotalMl(waterData.totalMl || 0);
        if (waterData.goalMl) setWaterGoalMl(waterData.goalMl);
      }
    } catch (e) {
      console.error("Failed to load food/water log:", e);
    }
  };

  const fetchDashboardData = async (dateStr: string = selectedDate) => {
    setIsLoading(true);
    try {
      const [dashRes, weightRes] = await Promise.all([
        fetch(`/api/dashboard?date=${dateStr}`),
        fetch("/api/weight"),
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        if (data.mealPlan) setMealPlan(data.mealPlan);
        if (data.settings) {
          setSettings(data.settings);
          if (data.settings.dailyWaterGoalMl) setWaterGoalMl(data.settings.dailyWaterGoalMl);
        }
        if (data.weightAnalytics) setWeightAnalytics(data.weightAnalytics);
        if (data.user) {
          setUsername(data.user.displayName || data.user.email?.split("@")[0] || "");
        }
        if (data.foodLog) {
          setFoodLogEntries(data.foodLog.entries || []);
          setFoodLogTotals(
            data.foodLog.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
          );
        }
        if (data.waterLog) {
          setWaterTotalMl(data.waterLog.totalMl || 0);
          if (data.waterLog.goalMl) setWaterGoalMl(data.waterLog.goalMl);
        }
      }

      if (weightRes.ok) {
        const wData = await weightRes.json();
        if (Array.isArray(wData.entries)) {
          const sorted = [...wData.entries]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-7)
            .map((e) => ({ date: e.date, weight: e.weightKg }));
          setRecentWeights(sorted);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedDate);
  }, [selectedDate]);

  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const handleAddWater = async (amountMl: number) => {
    try {
      const res = await fetch("/api/water-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, amountMl }),
      });
      if (res.ok) {
        const data = await res.json();
        setWaterTotalMl(data.totalMl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetWater = async () => {
    try {
      const res = await fetch(`/api/water-log?date=${selectedDate}&reset=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWaterTotalMl(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFoodLogEntry = async (entryId: string) => {
    try {
      const res = await fetch(`/api/food-log?id=${entryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchFoodAndWaterLog(selectedDate);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogPlannedMeal = async (meal: any) => {
    try {
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          mealCategory: meal.mealCategory || "lunch",
          name: meal.recipe?.name || meal.customName || "Planned meal",
          servings: meal.servings || 1,
          servingUnit: "serving",
          calories: meal.calories || 0,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
          recipeId: meal.recipeId || null,
        }),
      });

      if (res.ok) {
        fetchFoodAndWaterLog(selectedDate);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Group food log entries by meal category
  const categorizedEntries = useMemo(() => {
    const buckets: Record<string, any[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };

    foodLogEntries.forEach((entry) => {
      const cat = entry.mealCategory?.toLowerCase() || "snack";
      if (buckets[cat]) {
        buckets[cat].push(entry);
      } else {
        buckets.snack.push(entry);
      }
    });

    return buckets;
  }, [foodLogEntries]);

  // Today's planned meals from weekly meal plan
  const todayPlannedMeals = useMemo(() => {
    return (mealPlan?.meals || []).filter((m: any) => m.dayOfWeek === dayKey);
  }, [mealPlan, dayKey]);

  // Unlogged planned meals (items not yet present in food log)
  const unloggedPlannedMeals = useMemo(() => {
    return todayPlannedMeals.filter((pm: any) => {
      const pName = (pm.recipe?.name || pm.customName || "").toLowerCase();
      const alreadyLogged = foodLogEntries.some(
        (fe: any) => fe.name?.toLowerCase() === pName
      );
      return !alreadyLogged;
    });
  }, [todayPlannedMeals, foodLogEntries]);

  const openLogModal = (category: "breakfast" | "lunch" | "dinner" | "snack" = "lunch") => {
    setModalDefaultCategory(category);
    setIsLogFoodModalOpen(true);
  };

  // Calculations
  const isOverCalories = foodLogTotals.calories > settings.dailyCalories;
  const caloriesRemaining = Math.max(0, settings.dailyCalories - foodLogTotals.calories);
  const caloriesOver = Math.max(0, foodLogTotals.calories - settings.dailyCalories);
  const caloriesPct = settings.dailyCalories > 0
    ? Math.min(100, Math.round((foodLogTotals.calories / settings.dailyCalories) * 100))
    : 0;

  const proteinPct = settings.dailyProtein > 0
    ? Math.min(100, Math.round((foodLogTotals.protein / settings.dailyProtein) * 100))
    : 0;

  const carbsPct = settings.dailyCarbs > 0
    ? Math.min(100, Math.round((foodLogTotals.carbs / settings.dailyCarbs) * 100))
    : 0;

  const fatPct = settings.dailyFat > 0
    ? Math.min(100, Math.round((foodLogTotals.fat / settings.dailyFat) * 100))
    : 0;

  // Calorie ring SVG params
  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (caloriesPct / 100) * ringCircumference;

  // Water blocks: 10 segments
  const filledWaterBlocks = Math.min(10, Math.round((waterTotalMl / (waterGoalMl || 2500)) * 10));

  // Weight display
  const isImperial = settings.measurementSystem === "imperial";
  const weightUnit = isImperial ? "lbs" : "kg";
  const displayCurrentWeight = weightAnalytics?.latest7dAvgKg
    ? isImperial
      ? Math.round(weightAnalytics.latest7dAvgKg * 2.20462 * 10) / 10
      : Math.round(weightAnalytics.latest7dAvgKg * 10) / 10
    : recentWeights.length > 0
    ? isImperial
      ? Math.round(recentWeights[recentWeights.length - 1].weight * 2.20462 * 10) / 10
      : Math.round(recentWeights[recentWeights.length - 1].weight * 10) / 10
    : null;

  const weeklyChangeDisplay = weightAnalytics?.weeklyChangeKg
    ? (isImperial
        ? Math.round(weightAnalytics.weeklyChangeKg * 2.20462 * 10) / 10
        : Math.round(weightAnalytics.weeklyChangeKg * 10) / 10)
    : null;

  const displayName = user?.displayName || username;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        <div className="skeleton h-10 w-64 rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="skeleton h-64 w-full rounded-[28px]" />
            <div className="skeleton h-80 w-full rounded-3xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="skeleton h-44 w-full rounded-3xl" />
            <div className="skeleton h-44 w-full rounded-3xl" />
            <div className="skeleton h-24 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ─── Page Header: Muted 14px subtitle above 34px h1, actions on right ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal">
            {formattedDateTitle}
          </p>
          <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight text-[var(--text-primary)]">
            {greeting}{displayName ? `, ${displayName}` : ""}
          </h1>
        </div>

        {/* Date Selector & Primary Log Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[var(--surface)] rounded-full p-1 shadow-none">
            <button
              type="button"
              onClick={() => changeDateByDays(-1)}
              className="p-2.5 rounded-full hover:bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className={cn(
                "px-4 py-2 min-h-[44px] text-xs font-semibold rounded-full transition cursor-pointer flex items-center",
                isToday
                  ? "bg-[var(--accent)] text-[var(--on-accent)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--background)]"
              )}
            >
              {isToday ? "Today" : formattedDateTitle}
            </button>

            <button
              type="button"
              onClick={() => changeDateByDays(1)}
              className="p-2.5 rounded-full hover:bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              title="Next Day"
              aria-label="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => openLogModal("lunch")}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer touch-manipulation active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Log food</span>
          </button>
        </div>
      </div>

      {/* ─── Main Two-Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Hero Card + Single Meals Surface Card */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. One Hero Card: Large lime calorie ring + macro bars with dot labels */}
          <div className="rounded-[28px] bg-[var(--hero)] text-[var(--hero-text)] p-6 sm:p-8 shadow-none">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Left: Large Lime Calorie Ring */}
              <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  {/* Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r={ringRadius}
                    className="fill-none"
                    stroke="var(--hero-track)"
                    strokeWidth="9"
                  />
                  {/* Progress Ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r={ringRadius}
                    className="fill-none transition-all duration-700 ease-out"
                    stroke={isOverCalories ? "var(--status-over-target)" : "var(--lime)"}
                    strokeWidth="9"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center of Ring: Large number + "kcal left" / "kcal over" */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hero-text)] font-tabular leading-none">
                    {isOverCalories ? `+${caloriesOver.toLocaleString()}` : caloriesRemaining.toLocaleString()}
                  </span>
                  <span className="text-xs text-[var(--hero-muted)] font-normal mt-1">
                    {isOverCalories ? "kcal over" : "kcal left"}
                  </span>
                </div>
              </div>

              {/* Right: "1,239 / 2,300 kcal" headline + Three Macro Bars with dot labels */}
              <div className="flex-1 w-full space-y-5">
                <div className="flex items-baseline justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hero-text)] font-tabular">
                      {Math.round(foodLogTotals.calories).toLocaleString()} <span className="text-[var(--hero-muted)] font-normal text-lg sm:text-xl">/ {settings.dailyCalories.toLocaleString()} kcal</span>
                    </div>
                    <div className="text-xs text-[var(--hero-muted)] mt-0.5">
                      {caloriesPct}% of daily intake target
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsNutritionDetailsModalOpen(true)}
                    className="text-xs font-medium text-[var(--lime)] hover:underline cursor-pointer"
                  >
                    View details
                  </button>
                </div>

                {/* Three Macro Progress Bars with Dot Labels */}
                <div className="space-y-3 pt-1">
                  {/* Protein */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-normal text-[var(--hero-text)]">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 inline-block"
                          style={{ backgroundColor: "var(--macro-protein)" }}
                          aria-hidden="true"
                        />
                        <span>Protein</span>
                      </span>
                      <span className="font-tabular text-[var(--hero-text)] font-semibold">
                        {Math.round(foodLogTotals.protein)} <span className="font-normal text-[var(--hero-muted)]">/ {settings.dailyProtein}g</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--hero-track)] overflow-hidden">
                      <div
                        style={{ width: `${proteinPct}%`, backgroundColor: "var(--macro-protein)" }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-normal text-[var(--hero-text)]">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 inline-block"
                          style={{ backgroundColor: "var(--macro-carbs)" }}
                          aria-hidden="true"
                        />
                        <span>Carbs</span>
                      </span>
                      <span className="font-tabular text-[var(--hero-text)] font-semibold">
                        {Math.round(foodLogTotals.carbs)} <span className="font-normal text-[var(--hero-muted)]">/ {settings.dailyCarbs}g</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--hero-track)] overflow-hidden">
                      <div
                        style={{ width: `${carbsPct}%`, backgroundColor: "var(--macro-carbs)" }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-normal text-[var(--hero-text)]">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 inline-block"
                          style={{ backgroundColor: "var(--macro-fat)" }}
                          aria-hidden="true"
                        />
                        <span>Fat</span>
                      </span>
                      <span className="font-tabular text-[var(--hero-text)] font-semibold">
                        {Math.round(foodLogTotals.fat)} <span className="font-normal text-[var(--hero-muted)]">/ {settings.dailyFat}g</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--hero-track)] overflow-hidden">
                      <div
                        style={{ width: `${fatPct}%`, backgroundColor: "var(--macro-fat)" }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. ONE Surface Card for Meals (Breakfast, Lunch, Dinner, Snack) */}
          <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-4 shadow-none">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                  Today&apos;s meals
                </h2>
                <p className="text-xs text-[var(--text-secondary)] font-normal">
                  Logged entries and planned meals for {formattedDateTitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openLogModal("lunch")}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-full bg-[var(--background)] hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] text-xs font-medium transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Add meal</span>
              </button>
            </div>

            {/* List of Meal Rows divided by 1px var(--border) */}
            <div className="divide-y divide-[var(--border)]">
              {MEAL_SLOTS.map((slot) => {
                const Icon = slot.icon;
                const items = categorizedEntries[slot.id] || [];
                const slotCalories = items.reduce((sum, i) => sum + (i.calories || 0), 0);
                const slotProtein = items.reduce((sum, i) => sum + (i.protein || 0), 0);
                const slotCarbs = items.reduce((sum, i) => sum + (i.carbs || 0), 0);
                const slotFat = items.reduce((sum, i) => sum + (i.fat || 0), 0);
                const isLogged = items.length > 0;

                const mealSummaryName = isLogged
                  ? items.map((i) => i.name).join(", ")
                  : "No meal logged";

                return (
                  <div
                    key={slot.id}
                    className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Left: Icon Tile + Small muted label + Meal Name + Muted P · C · F line */}
                    <div className="flex items-start sm:items-center space-x-3.5 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-2xl bg-[var(--background)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 group-hover:text-[var(--accent)] transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-[var(--text-muted)] font-normal">
                          {slot.title} · {slot.defaultTime}
                        </div>
                        <div className="text-sm font-semibold text-[var(--text-primary)] truncate mt-0.5">
                          {mealSummaryName}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] font-tabular mt-0.5">
                          {isLogged ? (
                            <span>
                              {Math.round(slotProtein)}g P · {Math.round(slotCarbs)}g C · {Math.round(slotFat)}g F
                            </span>
                          ) : (
                            <span>0g P · 0g C · 0g F</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Calories or Log button */}
                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      {isLogged ? (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-sm font-bold text-[var(--text-primary)] font-tabular">
                              {Math.round(slotCalories).toLocaleString()} kcal
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openLogModal(slot.id)}
                            className="p-2 rounded-full hover:bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                            title={`Add item to ${slot.title}`}
                            aria-label={`Add item to ${slot.title}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openLogModal(slot.id)}
                          className="px-4 py-2 min-h-[44px] rounded-full bg-[var(--background)] hover:bg-[var(--accent-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>Log {slot.title}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Planned but Unlogged Meals: Accent-subtle rows with "Log it" pill */}
            {unloggedPlannedMeals.length > 0 && (
              <div className="pt-4 border-t border-[var(--border)] space-y-2.5">
                <div className="text-xs text-[var(--text-muted)] font-medium">
                  Planned for today from weekly schedule
                </div>
                {unloggedPlannedMeals.map((meal: any) => (
                  <div
                    key={meal.id}
                    className="p-4 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-[var(--surface)] text-[var(--lime)] flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-[var(--text-muted)] font-normal capitalize">
                          {meal.mealCategory} · {meal.calories} kcal
                        </div>
                        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {meal.recipe?.name || meal.customName || "Planned recipe"}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] font-tabular mt-0.5">
                          {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLogPlannedMeal(meal)}
                      className="px-4 py-2 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer touch-manipulation active:scale-[0.98] shrink-0 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Log it</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Rail: Water Card, Weight Card, Sunday prep link card */}
        <div className="lg:col-span-4 space-y-6">
          {/* Water Card: 10 segmented blocks and +250/+500 ml pills */}
          <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-4 shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--background)] flex items-center justify-center text-[var(--lime)]">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Water
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-tabular">
                    {waterTotalMl} / {waterGoalMl} ml
                  </p>
                </div>
              </div>

              {waterTotalMl > 0 && (
                <button
                  type="button"
                  onClick={handleResetWater}
                  className="p-2 rounded-full hover:bg-[var(--background)] text-[var(--text-muted)] hover:text-[var(--ui-error)] transition cursor-pointer"
                  title="Reset water"
                  aria-label="Reset water"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 10 Segmented Blocks */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-8 flex-1 rounded-md transition-colors",
                    idx < filledWaterBlocks
                      ? "bg-[var(--lime)]"
                      : "bg-[var(--background)]"
                  )}
                />
              ))}
            </div>

            {/* +250 / +500 ml pills */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleAddWater(250)}
                className="flex-1 py-2 min-h-[44px] rounded-full bg-[var(--background)] hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>+250 ml</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddWater(500)}
                className="flex-1 py-2 min-h-[44px] rounded-full bg-[var(--background)] hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>+500 ml</span>
              </button>
            </div>
          </div>

          {/* Weight Card: Big number, lime-subtle change badge, sparkline */}
          <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-4 shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--background)] flex items-center justify-center text-[var(--lime)]">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Weight
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">7-day average</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLogWeightModalOpen(true)}
                className="px-3.5 py-1.5 min-h-[36px] rounded-full bg-[var(--background)] hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Log</span>
              </button>
            </div>

            {/* Big Number & Lime-subtle Change Badge */}
            <div className="flex items-baseline justify-between gap-2 pt-1">
              <div>
                <span className="text-3xl font-bold tracking-tight text-[var(--text-primary)] font-tabular">
                  {displayCurrentWeight !== null ? `${displayCurrentWeight} ${weightUnit}` : "--"}
                </span>
              </div>

              {weeklyChangeDisplay !== null && (
                <div className="px-3 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-semibold font-tabular">
                  {weeklyChangeDisplay > 0 ? `+${weeklyChangeDisplay}` : weeklyChangeDisplay} {weightUnit} this week
                </div>
              )}
            </div>

            {/* Sparkline Curve */}
            <div className="w-full h-12 pt-2">
              {recentWeights.length >= 2 ? (
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 40">
                  {(() => {
                    const vals = recentWeights.map((w) => w.weight);
                    const min = Math.min(...vals) - 0.2;
                    const max = Math.max(...vals) + 0.2;
                    const range = max - min || 1;
                    const points = vals
                      .map((v, i) => {
                        const x = (i / (vals.length - 1)) * 190 + 5;
                        const y = 35 - ((v - min) / range) * 30;
                        return `${x},${y}`;
                      })
                      .join(" ");

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="var(--lime)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points}
                        />
                        {recentWeights.map((w, i) => {
                          const x = (i / (vals.length - 1)) * 190 + 5;
                          const y = 35 - ((w.weight - min) / range) * 30;
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="3"
                              fill="var(--surface)"
                              stroke="var(--lime)"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
                  Track weekly weigh-ins to see sparkline
                </div>
              )}
            </div>
          </div>

          {/* Sunday Prep Link Card */}
          <Link
            href="/meal-prep"
            className="rounded-3xl bg-[var(--surface)] p-5 hover:bg-[var(--surface)]/80 transition flex items-center justify-between group block shadow-none"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent-subtle)] text-[var(--lime)] flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  Sunday prep
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Batch cook recipes for the week
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition">
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      {/* Log Food Modal */}
      <LogFoodModal
        isOpen={isLogFoodModalOpen}
        onClose={() => setIsLogFoodModalOpen(false)}
        defaultMealCategory={modalDefaultCategory}
        selectedDate={selectedDate}
        onLogSuccess={() => {
          fetchDashboardData();
        }}
      />

      {/* Log Weight Modal */}
      <LogWeightModal
        isOpen={isLogWeightModalOpen}
        onClose={() => setIsLogWeightModalOpen(false)}
        onWeightLogged={() => {
          fetchDashboardData();
        }}
      />

      {/* Modal: Today's Detailed Nutrition */}
      {isNutritionDetailsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsNutritionDetailsModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="font-semibold text-base text-[var(--text-primary)]">
                  Nutrition details
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {formattedDateTitle} total intake
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNutritionDetailsModalOpen(false)}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
                aria-label="Close nutrition details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 divide-y divide-[var(--border)] text-xs">
              <div className="flex items-center justify-between pt-2 first:pt-0">
                <span className="text-[var(--text-secondary)]">Fiber</span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {foodLogTotals.fiber || 0} g
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[var(--text-secondary)]">Total sugars</span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {(foodLogTotals as any).totalSugars || 0} g
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[var(--text-secondary)]">Added sugars</span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {(foodLogTotals as any).addedSugars || 0} g
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[var(--text-secondary)]">Saturated fat</span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {(foodLogTotals as any).saturatedFat || 0} g
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[var(--text-secondary)]">Trans fat</span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {(foodLogTotals as any).transFat || 0} g
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[var(--text-secondary)]">Sodium</span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {Math.round((foodLogTotals as any).sodium || 0).toLocaleString()} mg
                </span>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsNutritionDetailsModalOpen(false)}
                className="px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
