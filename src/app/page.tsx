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
  Check,
} from "lucide-react";
import { WeightTrendWidget } from "@/components/dashboard/WeightTrendWidget";
import { WeightAnalyticsSummary } from "@/lib/nutrition/weight-analytics";
import { useAuth } from "@/context/AuthContext";
import { LogFoodModal } from "@/components/food-log/LogFoodModal";
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
  { id: "breakfast", title: "Breakfast", icon: Coffee },
  { id: "lunch", title: "Lunch", icon: Sun },
  { id: "dinner", title: "Dinner", icon: Moon },
  { id: "snack", title: "Snacks", icon: Apple },
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
  });
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

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [mealPlanRes, settingsRes, weightRes, meRes] = await Promise.all([
        fetch("/api/meal-plan"),
        fetch("/api/settings"),
        fetch("/api/weight"),
        fetch("/api/auth/me"),
      ]);

      if (mealPlanRes.ok) setMealPlan(await mealPlanRes.json());
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings(s);
        if (s.dailyWaterGoalMl) setWaterGoalMl(s.dailyWaterGoalMl);
      }
      if (weightRes.ok) {
        const weightData = await weightRes.json();
        setWeightAnalytics(weightData.analytics || null);
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        const u = meData.user || meData;
        setUsername(u.displayName || u.email?.split("@")[0] || "");
      }

      await fetchFoodAndWaterLog(selectedDate);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleMealLogged = () => {
      fetchFoodAndWaterLog(selectedDate);
      fetchDashboardData();
    };

    window.addEventListener("meal-logged", handleMealLogged);
    return () => window.removeEventListener("meal-logged", handleMealLogged);
  }, []);

  useEffect(() => {
    fetchFoodAndWaterLog(selectedDate);
  }, [selectedDate]);

  // Date Navigator Controls
  const changeDateByDays = (days: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Water Log Handlers
  const handleAddWater = async (amountMl: number) => {
    try {
      const res = await fetch("/api/water-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          amountMl,
        }),
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
    if (!confirm("Reset water logged for this day?")) return;
    try {
      const res = await fetch("/api/water-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          action: "reset",
        }),
      });

      if (res.ok) {
        setWaterTotalMl(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete logged food entry
  const handleDeleteFoodLogEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/food-log?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchFoodAndWaterLog(selectedDate);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Log planned meal straight to food log
  const handleLogPlannedMeal = async (meal: any) => {
    try {
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          mealCategory: meal.mealCategory || "lunch",
          name: meal.recipe?.name || meal.customName || "Planned Meal",
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
  const todayPlannedMeals = (mealPlan?.meals || []).filter(
    (m: any) => m.dayOfWeek === dayKey
  );

  const openLogModal = (category: "breakfast" | "lunch" | "dinner" | "snack" = "lunch") => {
    setModalDefaultCategory(category);
    setIsLogFoodModalOpen(true);
  };

  // Calorie and Macro calculations
  const isOverCalories = foodLogTotals.calories > settings.dailyCalories;
  const caloriesRemaining = Math.max(0, settings.dailyCalories - foodLogTotals.calories);
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

  const waterPct = Math.min(100, Math.round((waterTotalMl / (waterGoalMl || 2500)) * 100));

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto pb-16">
        {/* Skeleton: Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="skeleton h-8 w-60 mb-2 rounded-lg" />
            <div className="skeleton h-4 w-44 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton h-9 w-32 rounded-xl" />
            <div className="skeleton h-9 w-28 rounded-xl" />
          </div>
        </div>

        {/* Skeleton: Primary Nutrition Card */}
        <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-2">
              <div className="skeleton h-3.5 w-32 rounded-md" />
              <div className="skeleton h-10 w-48 rounded-lg" />
            </div>
            <div className="skeleton h-4 w-36 rounded-md" />
          </div>
          <div className="skeleton h-2 w-full rounded-full" />
          <div className="border-t border-[var(--border)] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="skeleton h-3 w-16 rounded-md" />
                  <div className="skeleton h-3 w-20 rounded-md" />
                </div>
                <div className="skeleton h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton: Today's Meals Header */}
        <div className="flex justify-between items-center">
          <div className="skeleton h-6 w-36 rounded-md" />
          <div className="skeleton h-4 w-20 rounded-md" />
        </div>

        {/* Skeleton: Meals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-[var(--border)]">
                <div className="skeleton h-4 w-28 rounded-md" />
                <div className="skeleton h-4 w-16 rounded-md" />
              </div>
              <div className="skeleton h-10 w-full rounded-xl" />
              <div className="skeleton h-3 w-32 rounded-md" />
            </div>
          ))}
        </div>

        {/* Skeleton: Hydration */}
        <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-32 rounded-md" />
              <div className="skeleton h-3 w-24 rounded-md" />
              <div className="skeleton h-1.5 w-48 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user?.displayName || username;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {greeting}{displayName ? `, ${displayName}` : ""}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            {formattedDateTitle}
          </p>
        </div>

        {/* Date Selector & Primary Log Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1 shadow-xs">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-1.5 rounded-lg hover:bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition cursor-pointer",
                isToday
                  ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                  : "text-[var(--text-primary)] hover:bg-[var(--background)]"
              )}
            >
              {isToday ? "Today" : formattedDateTitle}
            </button>

            <button
              onClick={() => changeDateByDays(1)}
              className="p-1.5 rounded-lg hover:bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              title="Next Day"
              aria-label="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => openLogModal("lunch")}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs shadow-xs transition touch-manipulation cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Food</span>
          </button>
        </div>
      </div>

      {/* ─── 1. Primary Nutrition Section (Visual Anchor) ─── */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-6">
        {/* Calories Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Today&apos;s Nutrition
              </h2>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] font-tabular">
                {Math.round(foodLogTotals.calories).toLocaleString()}
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                kcal consumed
              </span>
              <span className="text-xs text-[var(--text-muted)]">•</span>
              <span className="text-xs font-medium">
                {isOverCalories ? (
                  <span className="text-[var(--status-over-target)] font-semibold font-tabular">
                    +{Math.abs(Math.round(foodLogTotals.calories - settings.dailyCalories)).toLocaleString()} kcal over target
                  </span>
                ) : (
                  <span className="text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)] font-tabular font-semibold">
                      {caloriesRemaining.toLocaleString()}
                    </strong>{" "}
                    kcal remaining
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span>
              Goal: <strong className="text-[var(--text-primary)] font-tabular">{settings.dailyCalories.toLocaleString()} kcal</strong>
            </span>
            <Link
              href="/settings"
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition font-medium"
            >
              Edit targets
            </Link>
          </div>
        </div>

        {/* Horizontal Calorie Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              style={{ width: `${caloriesPct}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isOverCalories ? "bg-[var(--status-over-target)]" : "bg-[var(--accent)]"
              )}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-tabular">
            <span>0 kcal</span>
            <span>{caloriesPct}% of daily goal</span>
            <span>{settings.dailyCalories.toLocaleString()} kcal</span>
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="border-t border-[var(--border)]" />

        {/* Macros: 3 Clean Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Protein */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[11px]" style={{ color: "var(--macro-protein)" }}>
                Protein
              </span>
              <span className="font-tabular text-[var(--text-secondary)] text-xs">
                <strong className="text-[var(--text-primary)] font-semibold">{Math.round(foodLogTotals.protein)}</strong> / {settings.dailyProtein} g
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                style={{
                  width: `${proteinPct}%`,
                  backgroundColor: "var(--macro-protein)",
                }}
                className="h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[11px]" style={{ color: "var(--macro-carbs)" }}>
                Carbs
              </span>
              <span className="font-tabular text-[var(--text-secondary)] text-xs">
                <strong className="text-[var(--text-primary)] font-semibold">{Math.round(foodLogTotals.carbs)}</strong> / {settings.dailyCarbs} g
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                style={{
                  width: `${carbsPct}%`,
                  backgroundColor: "var(--macro-carbs)",
                }}
                className="h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Fat */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[11px]" style={{ color: "var(--macro-fat)" }}>
                Fat
              </span>
              <span className="font-tabular text-[var(--text-secondary)] text-xs">
                <strong className="text-[var(--text-primary)] font-semibold">{Math.round(foodLogTotals.fat)}</strong> / {settings.dailyFat} g
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                style={{
                  width: `${fatPct}%`,
                  backgroundColor: "var(--macro-fat)",
                }}
                className="h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Today's Meals Section ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              Today&apos;s meals
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Logged items and nutritional breakdown for {formattedDateTitle}
            </p>
          </div>

          <button
            onClick={() => openLogModal("lunch")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add meal</span>
          </button>
        </div>

        {/* 4 Meal Category Cards (2-column on desktop, 1-column on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MEAL_SLOTS.map((slot) => {
            const Icon = slot.icon;
            const items = categorizedEntries[slot.id] || [];
            const slotCalories = items.reduce((sum, i) => sum + (i.calories || 0), 0);
            const slotProtein = items.reduce((sum, i) => sum + (i.protein || 0), 0);
            const slotCarbs = items.reduce((sum, i) => sum + (i.carbs || 0), 0);
            const slotFat = items.reduce((sum, i) => sum + (i.fat || 0), 0);

            return (
              <div
                key={slot.id}
                className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Card Header: Outline Icon, Title, Item Count & Subtotal Calories */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
                      <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                        {slot.title}
                      </h3>
                      {items.length > 0 && (
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">
                          ({items.length})
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-tabular font-semibold text-[var(--text-primary)]">
                      {Math.round(slotCalories).toLocaleString()} kcal
                    </div>
                  </div>

                  {/* Card Content: Empty state or populated items list */}
                  <div className="mt-3 min-h-[44px]">
                    {items.length === 0 ? (
                      <div className="py-2.5 px-3 rounded-xl bg-[var(--background)] border border-dashed border-[var(--border)] flex items-center justify-between">
                        <span className="text-xs text-[var(--text-muted)]">No meal logged</span>
                        <button
                          onClick={() => openLogModal(slot.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add {slot.title.toLowerCase()}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs hover:border-[var(--accent)]/40 transition group"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-medium text-xs text-[var(--text-primary)] truncate">
                                {item.name}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-tabular mt-0.5">
                                <span>
                                  {item.servings} {item.servingUnit}
                                </span>
                                <span>•</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {item.calories} kcal
                                </span>
                                <span>•</span>
                                <span style={{ color: "var(--macro-protein)" }}>{item.protein}g Pro</span>
                                <span>•</span>
                                <span style={{ color: "var(--macro-carbs)" }}>{item.carbs}g Carb</span>
                                <span>•</span>
                                <span style={{ color: "var(--macro-fat)" }}>{item.fat}g Fat</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteFoodLogEntry(item.id)}
                              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition opacity-60 group-hover:opacity-100 cursor-pointer"
                              title="Remove item"
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Subtotal Macros & Optional Quick Add */}
                <div className="pt-2.5 border-t border-[var(--border)] flex items-center justify-between">
                  <div className="text-[10px] text-[var(--text-secondary)] font-tabular flex items-center gap-1.5">
                    <span style={{ color: "var(--macro-protein)" }}>
                      {Math.round(slotProtein * 10) / 10}g P
                    </span>
                    <span>•</span>
                    <span style={{ color: "var(--macro-carbs)" }}>
                      {Math.round(slotCarbs * 10) / 10}g C
                    </span>
                    <span>•</span>
                    <span style={{ color: "var(--macro-fat)" }}>
                      {Math.round(slotFat * 10) / 10}g F
                    </span>
                  </div>

                  {items.length > 0 && (
                    <button
                      onClick={() => openLogModal(slot.id)}
                      className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 3. Today's Planned Meals (If scheduled in weekly planner) ─── */}
      {todayPlannedMeals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--accent)]" />
                <span>Planned Meals from Weekly Schedule</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Scheduled for {formattedDateTitle}. Click &ldquo;Log as Eaten&rdquo; to add to food intake.
              </p>
            </div>

            <Link
              href="/meal-plan"
              className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center"
            >
              <span>Weekly Planner</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {todayPlannedMeals.map((meal: any) => (
              <div
                key={meal.id}
                className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">
                    <span>{meal.mealCategory}</span>
                    <span className="font-tabular font-bold text-[var(--text-primary)]">
                      {meal.calories} kcal
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-[var(--text-primary)]">
                    {meal.recipe?.name || meal.customName || "Planned Meal"}
                  </h4>
                  <div className="text-[10px] text-[var(--text-secondary)] font-tabular mt-0.5">
                    {meal.servings} serving(s) • {meal.protein}g Pro • {meal.carbs}g Carb • {meal.fat}g Fat
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                  <button
                    onClick={() => handleLogPlannedMeal(meal)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Log as Eaten</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. Hydration Section (Compact Secondary Tracker) ─── */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Hydration</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold font-tabular">
                {waterPct}%
              </span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5 font-tabular">
              <strong className="text-[var(--text-primary)]">
                {waterTotalMl >= 1000 ? `${(waterTotalMl / 1000).toFixed(2)} L` : `${waterTotalMl} ml`}
              </strong>{" "}
              / {(waterGoalMl / 1000).toFixed(1)} L logged
            </div>
            {/* Water progress bar with standard --border track */}
            <div className="w-48 sm:w-64 h-1.5 rounded-full bg-[var(--border)] overflow-hidden mt-2">
              <div
                style={{ width: `${waterPct}%` }}
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Compact Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleAddWater(250)}
            className="px-3 py-1.5 rounded-xl bg-[var(--background)] hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] border border-[var(--border)] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>+250 ml</span>
          </button>

          <button
            onClick={() => handleAddWater(500)}
            className="px-3 py-1.5 rounded-xl bg-[var(--background)] hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] border border-[var(--border)] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>+500 ml</span>
          </button>

          <button
            onClick={() => handleAddWater(750)}
            className="px-3 py-1.5 rounded-xl bg-[var(--background)] hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] border border-[var(--border)] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>+750 ml</span>
          </button>

          {waterTotalMl > 0 && (
            <button
              onClick={handleResetWater}
              className="p-1.5 rounded-xl bg-[var(--background)] hover:text-[var(--ui-error)] text-[var(--text-secondary)] border border-[var(--border)] transition cursor-pointer"
              title="Reset Water"
              aria-label="Reset Water"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── 5. Weight Trend Section (Secondary Tracker) ─── */}
      <WeightTrendWidget
        analytics={weightAnalytics}
        measurementSystem={settings.measurementSystem}
        onWeightUpdated={fetchDashboardData}
      />

      {/* Log Food Modal */}
      <LogFoodModal
        isOpen={isLogFoodModalOpen}
        onClose={() => setIsLogFoodModalOpen(false)}
        defaultMealCategory={modalDefaultCategory}
        selectedDate={selectedDate}
        onLogSuccess={() => fetchFoodAndWaterLog(selectedDate)}
      />
    </div>
  );
}
