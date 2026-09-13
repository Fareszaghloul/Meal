"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Sparkles,
  Plus,
  Minus,
  Calendar,
  ShoppingCart,
  BookOpen,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Utensils,
  Trash2,
  Droplets,
  Droplet,
  Coffee,
  Apple,
  RotateCcw,
  Check,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { RecipeCard } from "@/components/recipes/RecipeCard";
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
  const [recipes, setRecipes] = useState<any[]>([]);
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
      const [recipesRes, mealPlanRes, settingsRes, weightRes, meRes] = await Promise.all([
        fetch("/api/recipes"),
        fetch("/api/meal-plan"),
        fetch("/api/settings"),
        fetch("/api/weight"),
        fetch("/api/auth/me"),
      ]);

      if (recipesRes.ok) setRecipes(await recipesRes.json());
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

  // Calorie calculations
  const caloriesRemaining = Math.max(0, settings.dailyCalories - foodLogTotals.calories);
  const waterPct = Math.min(100, Math.round((waterTotalMl / (waterGoalMl || 2500)) * 100));

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      {/* Top Header & Day Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Good day{user?.displayName || username ? `, ${user?.displayName || username}` : ""}.
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Track what you eat and drink today, monitor nutrition targets, and manage your meals.
          </p>
        </div>

        {/* Date Selector & Primary Log Action */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-1 shadow-xs">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-1.5 rounded-xl hover:bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-xl transition",
                isToday
                  ? "bg-amber-500 text-zinc-950 font-bold"
                  : "text-[var(--text-primary)] hover:bg-[var(--background)]"
              )}
            >
              {isToday ? "Today" : formattedDateTitle}
            </button>

            <button
              onClick={() => changeDateByDays(1)}
              className="p-1.5 rounded-xl hover:bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => openLogModal("lunch")}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Log Food</span>
          </button>
        </div>
      </div>

      {/* 1. Daily Nutrition Targets & Progress (Based on Actual Food Eaten) */}
      <div className="p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Daily Nutrition Intake ({formattedDateTitle})
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-[var(--text-secondary)]">
              {caloriesRemaining > 0 ? (
                <>
                  <strong className="text-amber-500 font-mono">{caloriesRemaining} kcal</strong> remaining
                </>
              ) : (
                <strong className="text-emerald-500 font-semibold">Calorie goal reached</strong>
              )}
            </span>
            <Link
              href="/settings"
              className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition text-[11px]"
            >
              Edit Targets
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <ProgressBar
            label="Calories"
            current={foodLogTotals.calories}
            target={settings.dailyCalories}
            unit="kcal"
            type="calories"
          />
          <ProgressBar
            label="Protein"
            current={foodLogTotals.protein}
            target={settings.dailyProtein}
            unit="g"
            type="protein"
          />
          <ProgressBar
            label="Carbs"
            current={foodLogTotals.carbs}
            target={settings.dailyCarbs}
            unit="g"
            type="carbs"
          />
          <ProgressBar
            label="Fat"
            current={foodLogTotals.fat}
            target={settings.dailyFat}
            unit="g"
            type="fat"
          />
        </div>
      </div>

      {/* 2. Hydration / Water Tracker Widget */}
      <div className="p-5 sm:p-6 rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-[var(--surface)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Water &amp; Hydration</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold font-mono">
                {waterPct}%
              </span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
              <strong className="text-sky-400 text-sm">{waterTotalMl}</strong> / {waterGoalMl} ml logged
            </div>
            {/* Water progress mini-bar */}
            <div className="w-48 sm:w-64 h-2 rounded-full bg-zinc-800 overflow-hidden mt-1.5 border border-white/5">
              <div
                style={{ width: `${waterPct}%` }}
                className="h-full bg-gradient-to-r from-sky-500 to-teal-400 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Quick Water Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleAddWater(250)}
            className="px-3 py-2 rounded-xl bg-[var(--surface)] hover:bg-sky-500 hover:text-zinc-950 text-[var(--text-primary)] border border-[var(--border)] text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>+250 ml (Glass)</span>
          </button>

          <button
            onClick={() => handleAddWater(500)}
            className="px-3 py-2 rounded-xl bg-[var(--surface)] hover:bg-sky-500 hover:text-zinc-950 text-[var(--text-primary)] border border-[var(--border)] text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>+500 ml (Bottle)</span>
          </button>

          <button
            onClick={() => handleAddWater(750)}
            className="px-3 py-2 rounded-xl bg-[var(--surface)] hover:bg-sky-500 hover:text-zinc-950 text-[var(--text-primary)] border border-[var(--border)] text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>+750 ml</span>
          </button>

          {waterTotalMl > 0 && (
            <button
              onClick={handleResetWater}
              className="p-2 rounded-xl bg-[var(--surface)] hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 border border-[var(--border)] transition"
              title="Reset Water"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. "What We Have Eaten Today" (Meal Timeline) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <Utensils className="w-5 h-5 text-amber-500" />
              <span>What We Have Eaten Today</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Logged food items, recipes, and fast food breakdown for {formattedDateTitle}
            </p>
          </div>

          <button
            onClick={() => openLogModal("lunch")}
            className="text-xs font-semibold text-amber-500 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        {/* 4 Meal Category Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              { id: "breakfast", title: "Breakfast", icon: "🌅" },
              { id: "lunch", title: "Lunch", icon: "☀️" },
              { id: "dinner", title: "Dinner", icon: "🌙" },
              { id: "snack", title: "Snacks & Drinks", icon: "🍎" },
            ] as const
          ).map((slot) => {
            const items = categorizedEntries[slot.id] || [];
            const slotCalories = items.reduce((sum, i) => sum + (i.calories || 0), 0);
            const slotProtein = items.reduce((sum, i) => sum + (i.protein || 0), 0);
            const slotCarbs = items.reduce((sum, i) => sum + (i.carbs || 0), 0);
            const slotFat = items.reduce((sum, i) => sum + (i.fat || 0), 0);

            return (
              <div
                key={slot.id}
                className="p-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Slot Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{slot.icon}</span>
                      <h3 className="font-bold text-sm text-[var(--text-primary)]">
                        {slot.title}
                      </h3>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        ({items.length})
                      </span>
                    </div>

                    <div className="text-xs font-mono font-bold text-amber-500">
                      {Math.round(slotCalories)} kcal
                    </div>
                  </div>

                  {/* Slot Items List */}
                  <div className="space-y-2 mt-3 min-h-[70px]">
                    {items.length === 0 ? (
                      <div className="py-4 text-center text-xs text-[var(--text-secondary)] italic">
                        Nothing logged for {slot.title.toLowerCase()} yet.
                      </div>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--background)]/60 border border-[var(--border)] text-xs hover:border-[var(--accent)]/30 transition group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-xs text-[var(--text-primary)] truncate">
                              {item.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                              <span>
                                {item.servings} {item.servingUnit}
                              </span>
                              <span>•</span>
                              <span className="text-amber-500 font-bold">{item.calories} kcal</span>
                              <span>•</span>
                              <span className="text-emerald-500">{item.protein}g P</span>
                              <span>•</span>
                              <span className="text-sky-500">{item.carbs}g C</span>
                              <span>•</span>
                              <span className="text-rose-500">{item.fat}g F</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteFoodLogEntry(item.id)}
                            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition opacity-60 group-hover:opacity-100"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Slot Footer: Subtotal Macros & Quick Add */}
                <div className="pt-2.5 border-t border-[var(--border)] flex items-center justify-between">
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono flex items-center gap-1.5">
                    <span className="text-emerald-500">{Math.round(slotProtein * 10) / 10}g P</span>
                    <span>•</span>
                    <span className="text-sky-500">{Math.round(slotCarbs * 10) / 10}g C</span>
                    <span>•</span>
                    <span className="text-rose-500">{Math.round(slotFat * 10) / 10}g F</span>
                  </div>

                  <button
                    onClick={() => openLogModal(slot.id)}
                    className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Today's Planned Meals (From Meal Planner) */}
      {todayPlannedMeals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--accent)]" />
                <span>Planned Meals from Weekly Schedule</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Meals scheduled on your planner for {formattedDateTitle}. Click &ldquo;Log as Eaten&rdquo; to copy them into your food intake.
              </p>
            </div>

            <Link
              href="/meal-plan"
              className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center"
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
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] mb-1">
                    <span>{meal.mealCategory}</span>
                    <span className="font-mono text-amber-500">{meal.calories} kcal</span>
                  </div>
                  <h4 className="font-semibold text-xs text-[var(--text-primary)]">
                    {meal.recipe?.name || meal.customName || "Planned Meal"}
                  </h4>
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                    {meal.servings} serving(s) • {meal.protein}g Pro • {meal.carbs}g Carb • {meal.fat}g Fat
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                  <button
                    onClick={() => handleLogPlannedMeal(meal)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
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

      {/* 5. Weight Trend & Goal Tracking */}
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
