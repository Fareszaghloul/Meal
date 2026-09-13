"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Sparkles,
  Plus,
  Calendar,
  ShoppingCart,
  BookOpen,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Utensils,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { WeightTrendWidget } from "@/components/dashboard/WeightTrendWidget";
import { WeightAnalyticsSummary } from "@/lib/nutrition/weight-analytics";
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
  const [recipes, setRecipes] = useState<any[]>([]);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [settings, setSettings] = useState<any>({
    dailyCalories: 2300,
    dailyProtein: 180,
    dailyCarbs: 220,
    dailyFat: 70,
    measurementSystem: "metric",
  });
  const [weightAnalytics, setWeightAnalytics] = useState<WeightAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string>("");

  // Determine today's day of week
  const todayIndex = new Date().getDay();
  const todayKey = DAY_NAMES[todayIndex];
  const todayCapitalized = todayKey.charAt(0).toUpperCase() + todayKey.slice(1);

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
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (weightRes.ok) {
        const weightData = await weightRes.json();
        setWeightAnalytics(weightData.analytics || null);
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        setUsername(meData.displayName || meData.email?.split("@")[0] || "");
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Today's meals from meal plan
  const todayMeals = (mealPlan?.meals || []).filter(
    (m: any) => m.dayOfWeek === todayKey
  );

  // Calculate Today's eaten/planned nutrition
  let todayCalories = 0;
  let todayProtein = 0;
  let todayCarbs = 0;
  let todayFat = 0;

  for (const m of todayMeals) {
    todayCalories += m.calories || 0;
    todayProtein += m.protein || 0;
    todayCarbs += m.carbs || 0;
    todayFat += m.fat || 0;
  }

  // Toggle meal completed
  const handleToggleMeal = async (meal: any) => {
    try {
      await fetch("/api/meal-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealId: meal.id,
          isCompleted: !meal.isCompleted,
        }),
      });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const mealSlots = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Good day, {username ? username.charAt(0).toUpperCase() + username.slice(1) : "Chef"}.
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Here is your daily nutrition, meal prep schedule, and quick actions for {todayCapitalized}.
          </p>
        </div>

        {/* Quick Actions (Section 4) */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/recipes/new"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add recipe</span>
          </Link>
          <Link
            href="/recipes/new"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-medium text-xs hover:bg-[var(--background)] transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Import recipe</span>
          </Link>
          <Link
            href="/meal-plan"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-medium text-xs hover:bg-[var(--background)] transition"
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Plan meals</span>
          </Link>
          <Link
            href="/shopping-list"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-medium text-xs hover:bg-[var(--background)] transition"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Shopping list</span>
          </Link>
        </div>
      </div>

      {/* 1. Today's Nutrition Progress Bars */}
      <div className="p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Today's nutrition ({todayCapitalized})
            </h2>
          </div>
          <Link
            href="/settings"
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition"
          >
            Edit targets
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <ProgressBar
            label="Calories"
            current={todayCalories}
            target={settings.dailyCalories}
            unit="kcal"
            type="calories"
          />
          <ProgressBar
            label="Protein"
            current={todayProtein}
            target={settings.dailyProtein}
            unit="g"
            type="protein"
          />
          <ProgressBar
            label="Carbs"
            current={todayCarbs}
            target={settings.dailyCarbs}
            unit="g"
            type="carbs"
          />
          <ProgressBar
            label="Fat"
            current={todayFat}
            target={settings.dailyFat}
            unit="g"
            type="fat"
          />
        </div>
      </div>

      {/* 2. Weight Trend & Goal Tracking */}
      <WeightTrendWidget
        analytics={weightAnalytics}
        measurementSystem={settings.measurementSystem}
        onWeightUpdated={fetchDashboardData}
      />

      {/* 3. Today's Meals Schedule */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
              Today's meals
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Breakfast, lunch, dinner, and snacks planned for today
            </p>
          </div>
          <Link
            href="/meal-plan"
            className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center"
          >
            <span>Open planner</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mealSlots.map((slot) => {
            const slotMeals = todayMeals.filter(
              (m: any) => m.mealCategory === slot
            );

            return (
              <div
                key={slot}
                className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span className="font-medium text-xs capitalize text-[var(--text-secondary)]">
                      {slot}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-tabular">
                      {slotMeals.length} item{slotMeals.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {slotMeals.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
                      Nothing planned.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {slotMeals.map((m: any) => (
                        <div
                          key={m.id}
                          className={cn(
                            "p-2.5 rounded-xl border transition",
                            m.isCompleted
                              ? "bg-[var(--background)] border-[var(--border)] opacity-60"
                              : "bg-[var(--background)]/60 border-[var(--border)]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            {m.recipeId ? (
                              <Link
                                href={`/recipes/${m.recipeId}`}
                                className={cn(
                                  "font-medium text-xs text-[var(--text-primary)] hover:text-[var(--accent)] line-clamp-1",
                                  m.isCompleted && "line-through"
                                )}
                              >
                                {m.recipe?.name || m.customName}
                              </Link>
                            ) : (
                              <span
                                className={cn(
                                  "font-medium text-xs text-[var(--text-primary)] line-clamp-1",
                                  m.isCompleted && "line-through"
                                )}
                              >
                                {m.customName || "Meal"}
                              </span>
                            )}
                            <button
                              onClick={() => handleToggleMeal(m)}
                              className={cn(
                                "p-0.5 rounded transition",
                                m.isCompleted
                                  ? "text-[var(--status-on-track)]"
                                  : "text-[var(--text-secondary)]/50 hover:text-[var(--text-secondary)]"
                              )}
                              title={
                                m.isCompleted ? "Completed" : "Mark as eaten"
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-1.5 text-xs text-[var(--text-secondary)]">
                            <span className="font-tabular">
                              {m.servings} {m.servings === 1 ? "serving" : "servings"}
                            </span>
                            <div className="flex items-center space-x-1 font-tabular font-medium">
                              <span className="text-[var(--text-primary)]">{Math.round(m.calories)} kcal</span>
                              <span>•</span>
                              <span className="text-[var(--macro-protein)] font-medium">
                                {Math.round(m.protein)}g pro
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href="/meal-plan"
                  className="w-full text-center py-1.5 rounded-lg border border-dashed border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition"
                >
                  + Add to {slot}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Current Meal Prep Overview */}
      <div className="p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Current week's meal prep overview
            </h2>
          </div>
          <Link
            href="/meal-prep"
            className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center"
          >
            <span>Batch prep mode</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        {mealPlan?.meals?.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
            No meal plan set for this week yet.{" "}
            <Link href="/meal-prep" className="text-[var(--accent)] underline">
              Batch prep your week now
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
              (d) => {
                const dayMeals = (mealPlan?.meals || []).filter(
                  (m: any) => m.dayOfWeek === d
                );
                const isToday = d === todayKey;

                return (
                  <div
                    key={d}
                    className={cn(
                      "p-3 rounded-2xl border text-center transition space-y-1",
                      isToday
                        ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                        : "border-[var(--border)] bg-[var(--background)]"
                    )}
                  >
                    <span className="block text-xs font-medium capitalize text-[var(--text-secondary)]">
                      {d.slice(0, 3)}
                    </span>
                    <span className="block text-lg font-semibold text-[var(--text-primary)] font-tabular">
                      {dayMeals.length}
                    </span>
                    <span className="block text-xs text-[var(--text-secondary)]">
                      {dayMeals.length === 1 ? "meal" : "meals"}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* 4. Recent Recipes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
              Recent recipes
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Your most recently added culinary creations
            </p>
          </div>
          <Link
            href="/recipes"
            className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center"
          >
            <span>View all ({recipes.length})</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>

        {recipes.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-2">
            <BookOpen className="w-8 h-8 text-[var(--text-secondary)] mx-auto opacity-50" />
            <h4 className="font-medium text-sm text-[var(--text-primary)]">No recipes yet</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Paste a Reel caption or import a URL to start your library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.slice(0, 3).map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onDelete={fetchDashboardData}
                onDuplicate={fetchDashboardData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
