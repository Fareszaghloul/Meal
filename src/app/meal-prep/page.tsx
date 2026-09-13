"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Check,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Utensils,
  Plus,
} from "lucide-react";
import { MacroBadge } from "@/components/ui/MacroBadge";
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

export default function MealPrepPage() {
  const router = useRouter();
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
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/meal-plan"
          className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Weekly Meal Prep Mode
            </h1>
            <span className="p-1 rounded-lg bg-[var(--macro-carbs-bg)] text-[var(--macro-carbs)]">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Batch-cook a recipe and populate multiple days of your weekly plan in 1 click
          </p>
        </div>
      </div>

      {successCount !== null ? (
        <div className="p-8 rounded-3xl border border-[var(--accent)] bg-[var(--surface)] text-center space-y-4 shadow-xs animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Meal Prep Scheduled!
            </h2>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              Added {successCount} meals of <strong>{selectedRecipe?.name}</strong> to your weekly calendar.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => setSuccessCount(null)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--background)]"
            >
              Prep Another Recipe
            </button>
            <Link
              href="/meal-plan"
              className="px-5 py-2 text-xs font-medium rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs"
            >
              View Weekly Planner
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Choose Recipe */}
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
            <label className="block text-sm font-semibold text-[var(--text-primary)]">
              1. Select Recipe to Batch Prep
            </label>

            {recipes.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
                No recipes found.{" "}
                <Link href="/recipes/new" className="text-[var(--accent)] underline">
                  Add a recipe first
                </Link>
              </div>
            ) : (
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {Math.round(r.caloriesPerServing)} kcal / {Math.round(r.proteinPerServing)}g protein
                  </option>
                ))}
              </select>
            )}

            {selectedRecipe && (
              <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2">
                <div className="text-xs font-medium text-[var(--text-secondary)]">
                  Nutrition Per Planned Serving:
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <MacroBadge
                    label="Cal"
                    value={Math.round(selectedRecipe.caloriesPerServing * servings)}
                    type="calories"
                    size="sm"
                  />
                  <MacroBadge
                    label="Pro"
                    value={Math.round(selectedRecipe.proteinPerServing * servings)}
                    unit="g"
                    type="protein"
                    size="sm"
                  />
                  <MacroBadge
                    label="Carb"
                    value={Math.round(selectedRecipe.carbsPerServing * servings)}
                    unit="g"
                    type="carbs"
                    size="sm"
                  />
                  <MacroBadge
                    label="Fat"
                    value={Math.round(selectedRecipe.fatPerServing * servings)}
                    unit="g"
                    type="fat"
                    size="sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Servings & Meal Category */}
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
            <label className="block text-sm font-semibold text-[var(--text-primary)]">
              2. Portion & Meal Slot
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Portion Servings per Meal
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="5"
                  value={servings}
                  onChange={(e) => setServings(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Meal Slot
                </label>
                <select
                  value={mealCategory}
                  onChange={(e) => setMealCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] capitalize focus:outline-hidden focus:border-[var(--accent)]"
                >
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Days to Populate */}
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                3. Choose Days ({selectedDays.length} selected)
              </label>
              <div className="space-x-2 text-xs">
                <button
                  type="button"
                  onClick={selectWeekdays}
                  className="text-[var(--accent)] hover:underline font-medium"
                >
                  Mon–Fri
                </button>
                <span className="text-[var(--border)]">|</span>
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="text-[var(--accent)] hover:underline font-medium"
                >
                  All Days
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {DAYS.map((day) => {
                const isChecked = selectedDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={cn(
                      "py-3 px-1 rounded-xl text-center font-medium text-xs transition border",
                      isChecked
                        ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-semibold"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <span className="block text-[10px] uppercase opacity-70">
                      {day.short}
                    </span>
                    {isChecked ? <Check className="w-3.5 h-3.5 mx-auto mt-1" /> : <Plus className="w-3.5 h-3.5 mx-auto mt-1 opacity-40" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !selectedRecipeId || selectedDays.length === 0}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:opacity-90 disabled:opacity-50 text-white font-medium text-sm shadow-xs transition"
          >
            <Flame className="w-4 h-4 text-amber-200" />
            <span>
              {isSubmitting
                ? "Populating Calendar..."
                : `Populate ${selectedDays.length} ${
                    selectedDays.length === 1 ? "Meal" : "Meals"
                  } into Meal Plan`}
            </span>
          </button>
        </form>
      )}
    </div>
  );
}
