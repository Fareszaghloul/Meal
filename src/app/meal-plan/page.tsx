"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Flame,
  CheckCircle2,
  Trash2,
  X,
  ArrowRight,
  Pencil,
  Utensils,
  RotateCcw,
  Loader2,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import { invalidateAll } from "@/lib/client/day-store";
import { AddMealModal } from "@/components/meal-plan/AddMealModal";
import { EditMealModal } from "@/components/meal-plan/EditMealModal";
import { GenerateWeekModal } from "@/components/meal-plan/GenerateWeekModal";
import { ReplaceMealModal } from "@/components/meal-plan/ReplaceMealModal";

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const MEAL_CATEGORIES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

function getMondayDate(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function MealPlannerPage() {
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayDate());
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [userGoals, setUserGoals] = useState({
    dailyCalories: 2300,
    dailyProtein: 180,
    dailyCarbs: 220,
    dailyFat: 70,
  });

  const [activeModalSlot, setActiveModalSlot] = useState<{
    day: string;
    category: string;
  } | null>(null);
  const [editingMeal, setEditingMeal] = useState<any | null>(null);
  const [loggingMealId, setLoggingMealId] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [replacingMeal, setReplacingMeal] = useState<any | null>(null);

  const weekStartStr = formatDate(currentMonday);

  const fetchMealPlan = async () => {
    try {
      const res = await fetch(`/api/meal-plan?weekStart=${weekStartStr}`);
      if (res.ok) {
        const data = await res.json();
        setMealPlan(data);
      }
    } catch (err) {
      console.error("Failed to load meal plan:", err);
    }
  };

  useEffect(() => {
    fetchMealPlan();
  }, [weekStartStr]);

  useEffect(() => {
    fetch("/api/recipes")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load recipes");
        return res.json();
      })
      .then((data) => setAllRecipes(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error(err);
        setAllRecipes([]);
      });

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setUserGoals({
            dailyCalories: data.dailyCalories || 2300,
            dailyProtein: data.dailyProtein || 180,
            dailyCarbs: data.dailyCarbs || 220,
            dailyFat: data.dailyFat || 70,
          });
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const handleToday = () => {
    setCurrentMonday(getMondayDate());
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      const res = await fetch(`/api/meal-plan?mealId=${mealId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast("Meal removed from plan", { kind: "info" });
        fetchMealPlan();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogMeal = async (meal: any) => {
    setLoggingMealId(meal.id);
    try {
      const res = await fetch("/api/meal-plan/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealId: meal.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to log meal", { kind: "error" });
      } else {
        toast(`Logged "${meal.recipe?.name || meal.customName || "Meal"}" to Food Log ✓`, { kind: "success" });
        invalidateAll();
        fetchMealPlan();
      }
    } catch {
      toast("Error logging meal to food log", { kind: "error" });
    } finally {
      setLoggingMealId(null);
    }
  };

  const handleUnlogMeal = async (meal: any) => {
    setLoggingMealId(meal.id);
    try {
      const res = await fetch("/api/meal-plan/unlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealId: meal.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to unlog meal", { kind: "error" });
      } else {
        toast(`Unlogged "${meal.recipe?.name || meal.customName || "Meal"}" from Food Log`, { kind: "info" });
        invalidateAll();
        fetchMealPlan();
      }
    } catch {
      toast("Error unlogging meal", { kind: "error" });
    } finally {
      setLoggingMealId(null);
    }
  };

  const getDayMeals = (dayKey: string) => {
    if (!mealPlan?.meals) return [];
    return mealPlan.meals.filter((m: any) => m.dayOfWeek === dayKey);
  };

  const calculateDayNutrition = (dayKey: string) => {
    const meals = getDayMeals(dayKey);
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const m of meals) {
      calories += m.calories || 0;
      protein += m.protein || 0;
      carbs += m.carbs || 0;
      fat += m.fat || 0;
    }

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      mealCount: meals.length,
    };
  };

  // Determine current day key for today
  const todayDateObj = new Date();
  const dayOfWeekIndex = todayDateObj.getDay();
  const todayDayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayOfWeekIndex];
  const isCurrentWeek = formatDate(getMondayDate(todayDateObj)) === weekStartStr;

  // Week label
  const endSunday = new Date(currentMonday);
  endSunday.setDate(endSunday.getDate() + 6);
  const weekLabel = `${currentMonday.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${endSunday.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  // Week summary calculations
  const daysWithMealsCount = useMemo(() => {
    let count = 0;
    DAYS_OF_WEEK.forEach((d) => {
      if (getDayMeals(d.key).length > 0) count++;
    });
    return count;
  }, [mealPlan]);

  const averageCalories = useMemo(() => {
    const activeDays = DAYS_OF_WEEK.map((d) => calculateDayNutrition(d.key)).filter(
      (s) => s.mealCount > 0
    );
    if (activeDays.length === 0) return 0;
    const total = activeDays.reduce((acc, curr) => acc + curr.calories, 0);
    return Math.round(total / activeDays.length);
  }, [mealPlan]);

  const uniquePrepRecipesCount = useMemo(() => {
    const recipeIds = new Set<string>();
    (mealPlan?.meals || []).forEach((m: any) => {
      if (m.recipeId) recipeIds.add(m.recipeId);
    });
    return recipeIds.size;
  }, [mealPlan]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal">
            Weekly planning
          </p>
          <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight text-[var(--text-primary)]">
            Meal Plan
          </h1>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsGenerateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition shadow-none cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Week</span>
          </button>
          <Link
            href="/meal-prep"
            className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--surface)]/80 transition"
          >
            <Flame className="w-4 h-4" />
            <span>Weekly prep mode</span>
          </Link>
          <Link
            href="/shopping-list"
            className="inline-flex items-center px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--surface)]/80 transition"
          >
            Shopping list
          </Link>
        </div>
      </div>

      {/* ─── Summary as Three Pills ─── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Pill 1: Days planned */}
        <div className="px-4 py-2 min-h-[40px] rounded-full bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium flex items-center shadow-none">
          <span className="font-semibold">{daysWithMealsCount} of 7</span>&nbsp;days planned
        </div>

        {/* Pill 2: Average kcal */}
        <div className="px-4 py-2 min-h-[40px] rounded-full bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium flex items-center shadow-none">
          Average&nbsp;<span className="font-semibold font-tabular">{averageCalories.toLocaleString()} kcal</span>&nbsp;/ day
        </div>

        {/* Pill 3: Lime-subtle recipes to cook Sunday */}
        <Link
          href="/meal-prep"
          className="px-4 py-2 min-h-[40px] rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition"
        >
          <Flame className="w-3.5 h-3.5 text-[var(--lime)]" />
          <span>{uniquePrepRecipesCount || 5} recipes to cook Sunday</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>

      {/* ─── Week Controls: Pill Group ─── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center space-x-1.5 bg-[var(--surface)] p-1 rounded-full">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-4 py-1.5 min-h-[36px] rounded-full text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2 text-sm font-semibold text-[var(--text-primary)]">
          <CalendarDays className="w-4 h-4 text-[var(--accent)]" />
          <span>{weekLabel}</span>
        </div>
      </div>

      {/* ─── 7-Column Grid of Borderless Surface Cells (rounded 16px) ─── */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-7 gap-3 min-w-[980px]">
          {DAYS_OF_WEEK.map((day, idx) => {
            const dayDate = new Date(currentMonday);
            dayDate.setDate(dayDate.getDate() + idx);
            const dateNum = dayDate.getDate();

            const isToday = isCurrentWeek && day.key === todayDayKey;
            const stats = calculateDayNutrition(day.key);
            const dayMeals = getDayMeals(day.key);
            const isOverTarget = stats.calories > userGoals.dailyCalories;
            const remaining = userGoals.dailyCalories - stats.calories;
            const calPercentage = userGoals.dailyCalories > 0
              ? Math.min(100, Math.round((stats.calories / userGoals.dailyCalories) * 100))
              : 0;

            return (
              <div
                key={day.key}
                className={cn(
                  "rounded-2xl p-3.5 flex flex-col justify-between space-y-3 transition-colors shadow-none",
                  isToday
                    ? "bg-[var(--accent-subtle)]"
                    : "bg-[var(--surface)]"
                )}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {day.short}
                  </span>

                  {/* Today's date sits in an accent pill */}
                  {isToday ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-bold font-tabular">
                      {dateNum}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-[var(--text-muted)] font-tabular px-1">
                      {dateNum}
                    </span>
                  )}
                </div>

                {/* 4 Meal Slots: Breakfast, Lunch, Dinner, Snack */}
                <div className="space-y-2.5 flex-1">
                  {MEAL_CATEGORIES.map((cat) => {
                    const catMeals = dayMeals.filter((m: any) => m.mealCategory === cat.key);

                    return (
                      <div key={cat.key} className="space-y-1.5">
                        <div className="text-[10px] text-[var(--text-muted)] font-normal">
                          {cat.label}
                        </div>

                        {catMeals.length === 0 ? (
                          /* Empty slot is a dashed outline button */
                          <button
                            type="button"
                            onClick={() =>
                              setActiveModalSlot({ day: day.key, category: cat.key })
                            }
                            className="w-full min-h-[44px] rounded-xl border border-dashed border-[var(--border)] bg-transparent hover:border-[var(--text-muted)] hover:bg-[var(--background)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span>Add</span>
                          </button>
                        ) : (
                          catMeals.map((meal: any) => {
                            const isLogged = meal.status === "logged" || Boolean(meal.foodLogEntryId);
                            const isCompleted = meal.status === "completed" || meal.isCompleted;
                            const isBusy = loggingMealId === meal.id;

                            return (
                              <div
                                key={meal.id}
                                className={cn(
                                  "p-2.5 rounded-xl text-xs transition group",
                                  isToday ? "bg-[var(--surface)]" : "bg-[var(--background)]",
                                  isLogged
                                    ? "ring-1 ring-[var(--lime)]/50 bg-[var(--accent-subtle)]/30"
                                    : (isCompleted && "opacity-60")
                                )}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={cn(
                                          "font-semibold text-xs text-[var(--text-primary)] truncate",
                                          (isLogged || isCompleted) && "line-through text-[var(--text-secondary)]"
                                        )}
                                      >
                                        {meal.recipe?.name || meal.customName || "Meal"}
                                      </span>
                                      {isLogged && (
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-[var(--lime)] text-[var(--on-lime)] text-[9px] font-bold">
                                          Logged ✓
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-[var(--text-muted)] font-tabular mt-0.5">
                                      {Math.round(meal.calories)} kcal · {Math.round(meal.protein)}g P · {Math.round(meal.carbs)}g C · {Math.round(meal.fat)}g F
                                      {meal.servings > 1 && ` · ${meal.servings} serv.`}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
                                    {isLogged ? (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleUnlogMeal(meal)}
                                        className="p-1 rounded-md text-[var(--lime)] hover:text-[var(--text-primary)] cursor-pointer"
                                        title="Unlog / Undo from Food Log"
                                      >
                                        {isBusy ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <RotateCcw className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleLogMeal(meal)}
                                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--lime)] cursor-pointer"
                                        title="Log meal to Food Log (Mark as eaten)"
                                      >
                                        {isBusy ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Utensils className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => setEditingMeal(meal)}
                                      className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                      title="Edit meal"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isLogged}
                                      onClick={() => setReplacingMeal(meal)}
                                      className={cn(
                                        "p-1 rounded-md transition cursor-pointer",
                                        isLogged
                                          ? "text-[var(--text-muted)] opacity-35 cursor-not-allowed"
                                          : "text-[var(--text-muted)] hover:text-[var(--accent)]"
                                      )}
                                      title={isLogged ? "Unlog meal first to replace" : "Replace meal with smart alternative"}
                                    >
                                      <ArrowLeftRight className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMeal(meal.id)}
                                      className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--ui-error)] cursor-pointer"
                                      title="Delete meal"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Column Footer: Total, thin progress bar (rust when over), "X left" or "+X over" */}
                <div className="pt-2.5 border-t border-[var(--border)] space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs font-tabular">
                    <span className="font-bold text-[var(--text-primary)]">
                      {stats.calories.toLocaleString()} kcal
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold",
                        isOverTarget ? "text-[var(--status-over-target)]" : "text-[var(--text-muted)]"
                      )}
                    >
                      {isOverTarget
                        ? `+${Math.abs(remaining)} over`
                        : `${remaining} left`}
                    </span>
                  </div>

                  {/* Thin progress bar: rust when over target */}
                  <div className="w-full h-1 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      style={{
                        width: `${calPercentage}%`,
                        backgroundColor: isOverTarget
                          ? "var(--status-over-target)"
                          : "var(--lime)",
                      }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Planned Meal Modal */}
      <AddMealModal
        open={activeModalSlot !== null}
        slot={activeModalSlot}
        weekStartStr={weekStartStr}
        allRecipes={allRecipes}
        onClose={() => setActiveModalSlot(null)}
        onSuccess={fetchMealPlan}
      />

      {/* Edit Planned Meal Modal */}
      <EditMealModal
        meal={editingMeal}
        allRecipes={allRecipes}
        onClose={() => setEditingMeal(null)}
        onSuccess={fetchMealPlan}
        onDelete={handleDeleteMeal}
      />

      {/* Generate Week Modal */}
      <GenerateWeekModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        weekStartDate={weekStartStr}
        userGoals={userGoals}
        onPlanApplied={fetchMealPlan}
      />

      {/* Replace Meal Modal */}
      <ReplaceMealModal
        meal={replacingMeal}
        isOpen={replacingMeal !== null}
        onClose={() => setReplacingMeal(null)}
        onMealReplaced={fetchMealPlan}
      />
    </div>
  );
}
