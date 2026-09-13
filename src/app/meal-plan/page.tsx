"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Flame,
  CheckCircle2,
  Trash2,
  Utensils,
  X,
  Sparkles,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { cn } from "@/lib/utils";

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

// Helper to get Monday date
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

  const [selectedDayTab, setSelectedDayTab] = useState<string>("monday");
  const [activeModalSlot, setActiveModalSlot] = useState<{
    day: string;
    category: string;
  } | null>(null);

  // Add meal modal state
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [mealServings, setMealServings] = useState(1);
  const [customName, setCustomName] = useState("");
  const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);

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
    // Fetch recipes for selector
    fetch("/api/recipes")
      .then((res) => res.json())
      .then((data) => setAllRecipes(data))
      .catch((err) => console.error(err));

    // Fetch user goals
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

  // Add meal to slot
  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalSlot) return;
    setIsSubmittingMeal(true);

    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: weekStartStr,
          dayOfWeek: activeModalSlot.day,
          mealCategory: activeModalSlot.category,
          recipeId: selectedRecipeId || null,
          customName: selectedRecipeId ? null : customName,
          servings: mealServings,
        }),
      });

      if (res.ok) {
        setActiveModalSlot(null);
        setSelectedRecipeId("");
        setCustomName("");
        setMealServings(1);
        fetchMealPlan();
      }
    } finally {
      setIsSubmittingMeal(false);
    }
  };

  // Delete meal
  const handleDeleteMeal = async (mealId: string) => {
    try {
      const res = await fetch(`/api/meal-plan?mealId=${mealId}`, {
        method: "DELETE",
      });
      if (res.ok) fetchMealPlan();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle meal complete
  const handleToggleComplete = async (meal: any) => {
    try {
      await fetch("/api/meal-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealId: meal.id,
          isCompleted: !meal.isCompleted,
        }),
      });
      fetchMealPlan();
    } catch (err) {
      console.error(err);
    }
  };

  // Compute daily totals for a day
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

  const currentDayTotals = calculateDayNutrition(selectedDayTab);

  // Format week range display e.g. "Sep 13 - Sep 19, 2026"
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

  const totalMealsThisWeek = mealPlan?.meals?.length || 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Week Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Weekly Meal Planner
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Plan your daily nutrition and schedule meals for the week
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <Link
            href="/meal-prep"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium shadow-xs transition"
          >
            <Flame className="w-3.5 h-3.5 text-white" />
            <span>Weekly Meal Prep Mode</span>
          </Link>
          <Link
            href="/shopping-list"
            className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--background)] transition"
          >
            Shopping List
          </Link>
        </div>
      </div>

      {/* Week Navigator Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation"
              title="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface)] transition min-h-[36px] flex items-center justify-center touch-manipulation"
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation"
              title="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-[var(--text-secondary)] font-medium font-tabular sm:hidden">
            {totalMealsThisWeek} {totalMealsThisWeek === 1 ? "meal" : "meals"}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm font-semibold text-[var(--text-primary)]">
          <CalendarDays className="w-4 h-4 text-[var(--accent)]" />
          <span>{weekLabel}</span>
        </div>

        <div className="hidden sm:block text-xs text-[var(--text-secondary)] font-medium font-tabular">
          {totalMealsThisWeek} {totalMealsThisWeek === 1 ? "meal" : "meals"} planned
        </div>
      </div>

      {/* Days of Week Tab Switcher */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {DAYS_OF_WEEK.map((day) => {
          const stats = calculateDayNutrition(day.key);
          const isSelected = selectedDayTab === day.key;

          return (
            <button
              key={day.key}
              onClick={() => setSelectedDayTab(day.key)}
              className={cn(
                "p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition flex flex-col justify-between touch-manipulation",
                isSelected
                  ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-semibold"
                  : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-primary)]"
              )}
            >
              <div>
                <span className="block text-[10px] sm:text-[11px] font-medium uppercase tracking-wider opacity-80">
                  {day.short}
                </span>
                <span className="block text-[11px] sm:text-xs font-semibold mt-0.5 font-tabular">
                  {stats.calories > 0 ? `${stats.calories}` : "0"}
                </span>
                <span className="block text-[9px] sm:text-[10px] opacity-70">kcal</span>
              </div>
              <div className="mt-1 sm:mt-2 text-[9px] sm:text-[10px] font-medium opacity-80 font-tabular truncate">
                {stats.mealCount} <span className="hidden sm:inline">{stats.mealCount === 1 ? "meal" : "meals"}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Daily Nutrition Summary for Selected Day (Section 15) */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {DAYS_OF_WEEK.find((d) => d.key === selectedDayTab)?.label} Daily Nutrition Target
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            Compared to daily goals
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ProgressBar
            label="Calories"
            current={currentDayTotals.calories}
            target={userGoals.dailyCalories}
            unit="kcal"
            type="calories"
          />
          <ProgressBar
            label="Protein"
            current={currentDayTotals.protein}
            target={userGoals.dailyProtein}
            unit="g"
            type="protein"
          />
          <ProgressBar
            label="Carbs"
            current={currentDayTotals.carbs}
            target={userGoals.dailyCarbs}
            unit="g"
            type="carbs"
          />
          <ProgressBar
            label="Fat"
            current={currentDayTotals.fat}
            target={userGoals.dailyFat}
            unit="g"
            type="fat"
          />
        </div>
      </div>

      {/* Meal Slots (Breakfast, Lunch, Dinner, Snack) for Selected Day */}
      <div className="space-y-4">
        {MEAL_CATEGORIES.map((cat) => {
          const meals = getDayMeals(selectedDayTab).filter(
            (m: any) => m.mealCategory === cat.key
          );

          return (
            <div
              key={cat.key}
              className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm text-[var(--text-primary)]">
                    {cat.label}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-tabular">
                    ({meals.length})
                  </span>
                </div>
                <button
                  onClick={() =>
                    setActiveModalSlot({
                      day: selectedDayTab,
                      category: cat.key,
                    })
                  }
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Meal</span>
                </button>
              </div>

              {meals.length === 0 ? (
                <div className="py-4 text-center text-xs text-[var(--text-secondary)]">
                  No {cat.label.toLowerCase()} planned yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {meals.map((meal: any) => {
                    const title =
                      meal.recipe?.name || meal.customName || "Planned Meal";
                    return (
                      <div
                        key={meal.id}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition",
                          meal.isCompleted
                            ? "bg-[var(--background)]/60 border-[var(--border)] opacity-60"
                            : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleToggleComplete(meal)}
                            className={cn(
                              "p-1 rounded-lg border transition",
                              meal.isCompleted
                                ? "bg-[var(--status-on-track)] border-[var(--status-on-track)] text-white"
                                : "border-[var(--border)] text-transparent hover:text-[var(--text-secondary)]"
                            )}
                            title={
                              meal.isCompleted
                                ? "Mark as uncompleted"
                                : "Mark as eaten"
                            }
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          <div>
                            {meal.recipeId ? (
                              <Link
                                href={`/recipes/${meal.recipeId}`}
                                className={cn(
                                  "text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline transition",
                                  meal.isCompleted && "line-through opacity-75"
                                )}
                              >
                                {title}
                              </Link>
                            ) : (
                              <span
                                className={cn(
                                  "text-sm font-semibold text-[var(--text-primary)]",
                                  meal.isCompleted && "line-through opacity-75"
                                )}
                              >
                                {title}
                              </span>
                            )}
                            <div className="text-[11px] text-[var(--text-secondary)] font-tabular">
                              {meal.servings} {meal.servings === 1 ? "serving" : "servings"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end space-x-3">
                          <div className="flex items-center space-x-1 text-xs">
                            <MacroBadge
                              label="Cal"
                              value={Math.round(meal.calories)}
                              type="calories"
                              size="sm"
                            />
                            <MacroBadge
                              label="Pro"
                              value={Math.round(meal.protein)}
                              unit="g"
                              type="protein"
                              size="sm"
                            />
                          </div>
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--ui-error)] rounded-lg hover:bg-[var(--ui-error-bg)] transition"
                            title="Remove meal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Meal to Slot Modal */}
      {activeModalSlot && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveModalSlot(null)}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-semibold text-base text-[var(--text-primary)] capitalize">
                Add {activeModalSlot.category} ({activeModalSlot.day})
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalSlot(null)}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMeal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Choose from Recipe Library
                </label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => {
                    setSelectedRecipeId(e.target.value);
                    if (e.target.value) setCustomName("");
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                >
                  <option value="">-- Or enter custom meal name below --</option>
                  {allRecipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({Math.round(r.caloriesPerServing)} kcal, {Math.round(r.proteinPerServing)}g protein)
                    </option>
                  ))}
                </select>
              </div>

              {!selectedRecipeId && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                    Custom Meal Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Protein shake with banana, 3 eggs with toast"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Portion Servings
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={mealServings}
                  onChange={(e) => setMealServings(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-semibold font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalSlot(null)}
                  className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMeal || (!selectedRecipeId && !customName.trim())}
                  className="px-5 py-2 text-xs font-medium rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:opacity-90 disabled:opacity-50 text-white transition shadow-xs"
                >
                  {isSubmittingMeal ? "Adding..." : "Add to Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
