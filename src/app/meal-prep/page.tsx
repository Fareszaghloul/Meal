"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  Check,
  ArrowLeft,
  Clock,
  Box,
  Utensils,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const MEAL_SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

export default function MealPrepPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [servings, setServings] = useState<number>(1);
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ]);
  const [mealCategory, setMealCategory] = useState<string>("lunch");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/recipes")
      .then((res) => res.json())
      .then((data) => {
        setRecipes(data);
        if (data.length > 0) setSelectedRecipeId(data[0].id);
      })
      .catch((err) => console.error(err));
  }, []);

  const toggleDay = (key: string) => {
    setSelectedDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  };

  const selectWeekdays = () => {
    setSelectedDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  };

  const selectAllDays = () => {
    setSelectedDays(DAYS.map((d) => d.key));
  };

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  const totalCalories = selectedRecipe
    ? Math.round((selectedRecipe.caloriesPerServing || 0) * servings * selectedDays.length)
    : 0;
  const totalProtein = selectedRecipe
    ? Math.round((selectedRecipe.proteinPerServing || 0) * servings * selectedDays.length)
    : 0;
  const totalCarbs = selectedRecipe
    ? Math.round((selectedRecipe.carbsPerServing || 0) * servings * selectedDays.length)
    : 0;
  const totalFat = selectedRecipe
    ? Math.round((selectedRecipe.fatPerServing || 0) * servings * selectedDays.length)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeId || selectedDays.length === 0) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/meal-plan/batch-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: selectedRecipeId,
          servings,
          days: selectedDays,
          mealCategory,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessCount(data.count);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/meal-plan"
              className="p-2 rounded-full hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition mr-1"
              aria-label="Back to meal plan"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-sm text-[var(--text-muted)] font-normal">
                Batch cooking
              </p>
              <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight text-[var(--text-primary)]">
                Meal Prep Mode
              </h1>
            </div>
          </div>
        </div>

        <Link
          href="/meal-plan"
          className="inline-flex items-center px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--surface)]/80 transition self-start sm:self-auto"
        >
          View weekly plan
        </Link>
      </div>

      {successCount !== null ? (
        <div className="rounded-3xl bg-[var(--surface)] p-8 text-center space-y-4 max-w-xl mx-auto shadow-none">
          <div className="w-14 h-14 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Meal Prep Added!
            </h2>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              Added {successCount} meals of <strong>{selectedRecipe?.name}</strong> to your weekly calendar.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setSuccessCount(null)}
              className="px-5 py-2.5 min-h-[44px] text-xs font-semibold rounded-full bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--border)] transition cursor-pointer"
            >
              Prep another recipe
            </button>
            <Link
              href="/meal-plan"
              className="px-5 py-2.5 min-h-[44px] text-xs font-semibold rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] transition shadow-none"
            >
              View meal plan
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Three Numbered Step Cards */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Pick a recipe as selectable rows */}
            <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-4 shadow-none">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-full bg-[var(--background)] text-[var(--text-primary)] text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Pick a recipe
                </h2>
              </div>

              {recipes.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                  No recipes found.{" "}
                  <Link href="/recipes/new" className="text-[var(--accent)] underline">
                    Add a recipe first
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] max-h-96 overflow-y-auto pr-1">
                  {recipes.map((r) => {
                    const isSelected = selectedRecipeId === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRecipeId(r.id)}
                        className={cn(
                          "py-3.5 px-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition",
                          isSelected
                            ? "bg-[var(--accent-subtle)]"
                            : "hover:bg-[var(--background)]"
                        )}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                              isSelected
                                ? "bg-[var(--accent)] text-[var(--on-accent)]"
                                : "bg-[var(--background)] text-[var(--text-muted)]"
                            )}
                          >
                            <Utensils className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {r.name}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] font-tabular mt-0.5">
                              {Math.round(r.caloriesPerServing)} kcal · {Math.round(r.proteinPerServing)}g P · {Math.round(r.carbsPerServing)}g C
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {isSelected && (
                            <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--on-accent)] flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Portions & Meal Slot */}
            <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-5 shadow-none">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-full bg-[var(--background)] text-[var(--text-primary)] text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Portions & meal slot
                </h2>
              </div>

              {/* Servings Stepper */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">
                    Portions per day
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    How many servings you eat each day
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="w-10 h-10 rounded-full bg-[var(--background)] hover:bg-[var(--border)] text-[var(--text-primary)] font-bold flex items-center justify-center transition cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-lg font-tabular text-[var(--text-primary)] w-8 text-center">
                    {servings}
                  </span>
                  <button
                    type="button"
                    onClick={() => setServings(servings + 1)}
                    className="w-10 h-10 rounded-full bg-[var(--background)] hover:bg-[var(--border)] text-[var(--text-primary)] font-bold flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Segmented Control for Meal Slot */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <div className="text-xs font-medium text-[var(--text-secondary)]">
                  Meal slot
                </div>
                <div className="flex items-center p-1 rounded-full bg-[var(--background)] overflow-x-auto">
                  {MEAL_SLOTS.map((slot) => {
                    const isSelected = mealCategory === slot.key;
                    return (
                      <button
                        key={slot.key}
                        type="button"
                        onClick={() => setMealCategory(slot.key)}
                        className={cn(
                          "flex-1 min-h-[38px] px-4 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap",
                          isSelected
                            ? "bg-[var(--accent)] text-[var(--on-accent)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 3: Choose days as 7 toggle tiles */}
            <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-4 shadow-none">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-3">
                  <span className="w-7 h-7 rounded-full bg-[var(--background)] text-[var(--text-primary)] text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    Choose days
                  </h2>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={selectWeekdays}
                    className="px-3 py-1.5 rounded-full bg-[var(--background)] hover:bg-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition cursor-pointer"
                  >
                    Weekdays
                  </button>
                  <button
                    type="button"
                    onClick={selectAllDays}
                    className="px-3 py-1.5 rounded-full bg-[var(--background)] hover:bg-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition cursor-pointer"
                  >
                    All 7 days
                  </button>
                </div>
              </div>

              {/* 7 Toggle Tiles */}
              <div className="grid grid-cols-7 gap-2 pt-1">
                {DAYS.map((d) => {
                  const isChecked = selectedDays.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={cn(
                        "rounded-2xl p-2.5 sm:p-3 text-center transition flex flex-col items-center justify-center min-h-[64px] cursor-pointer touch-manipulation",
                        isChecked
                          ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                          : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <span className="text-[10px] sm:text-xs font-normal uppercase opacity-80">
                        {d.short}
                      </span>
                      <span className="mt-1 font-bold text-xs sm:text-sm">
                        {isChecked ? "✓" : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Hero Summary Panel */}
          <div className="lg:col-span-4">
            <div className="sticky top-6 rounded-[28px] bg-[var(--hero)] text-[var(--hero-text)] p-6 sm:p-7 space-y-6 shadow-none">
              <div>
                <span className="text-xs text-[var(--hero-muted)] font-normal uppercase tracking-wider">
                  Prep Summary
                </span>
                <h3 className="text-xl font-bold tracking-tight text-[var(--hero-text)] mt-1 truncate">
                  {selectedRecipe?.name || "Select a recipe"}
                </h3>
              </div>

              {/* Key Specs: Containers, Time, Portions */}
              <div className="space-y-3 divide-y divide-[var(--hero-track)] text-xs">
                <div className="flex items-center justify-between pt-2 first:pt-0">
                  <span className="flex items-center gap-2 text-[var(--hero-muted)]">
                    <Box className="w-4 h-4 text-[var(--lime)]" />
                    <span>Containers needed</span>
                  </span>
                  <span className="font-bold text-[var(--hero-text)] font-tabular text-sm">
                    {selectedDays.length * servings} containers
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="flex items-center gap-2 text-[var(--hero-muted)]">
                    <Clock className="w-4 h-4 text-[var(--lime)]" />
                    <span>Est. cooking time</span>
                  </span>
                  <span className="font-semibold text-[var(--hero-text)] font-tabular">
                    {(selectedRecipe?.prepTimeMinutes || 15) + (selectedRecipe?.cookTimeMinutes || 30)} mins
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-[var(--hero-muted)]">Days planned</span>
                  <span className="font-semibold text-[var(--hero-text)] font-tabular">
                    {selectedDays.length} days
                  </span>
                </div>
              </div>

              {/* Total Nutrition */}
              <div className="p-4 rounded-2xl bg-[var(--hero-track)] space-y-2">
                <div className="text-[11px] text-[var(--hero-muted)] font-medium">
                  Total batch nutrition:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-tabular">
                  <div>
                    <span className="text-[var(--hero-muted)]">Calories:</span>{" "}
                    <strong className="text-[var(--hero-text)]">{totalCalories.toLocaleString()} kcal</strong>
                  </div>
                  <div>
                    <span className="text-[var(--hero-muted)]">Protein:</span>{" "}
                    <strong className="text-[var(--hero-text)]">{totalProtein}g</strong>
                  </div>
                  <div>
                    <span className="text-[var(--hero-muted)]">Carbs:</span>{" "}
                    <strong className="text-[var(--hero-text)]">{totalCarbs}g</strong>
                  </div>
                  <div>
                    <span className="text-[var(--hero-muted)]">Fat:</span>{" "}
                    <strong className="text-[var(--hero-text)]">{totalFat}g</strong>
                  </div>
                </div>
              </div>

              {/* Lime "Add to meal plan" button */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedRecipeId || selectedDays.length === 0}
                className="w-full py-3.5 min-h-[44px] rounded-full bg-[var(--lime)] hover:bg-[var(--accent-hover)] text-[var(--on-lime)] font-semibold text-sm transition active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
              >
                <Flame className="w-4 h-4" />
                <span>{isSubmitting ? "Adding..." : "Add to meal plan"}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
