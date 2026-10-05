"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface RecipeOption {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  caloriesPerServing?: number;
  proteinPerServing?: number;
  carbsPerServing?: number;
  fatPerServing?: number;
  fiberPerServing?: number | null;
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const MEAL_CATEGORIES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

interface EditMealModalProps {
  meal: any | null;
  allRecipes: RecipeOption[];
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (mealId: string) => void;
}

export function EditMealModal({
  meal,
  allRecipes,
  onClose,
  onSuccess,
  onDelete,
}: EditMealModalProps) {
  const isRecipeMeal = Boolean(meal?.recipeId);

  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [customName, setCustomName] = useState("");
  const [servings, setServings] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [mealCategory, setMealCategory] = useState("lunch");

  // Custom macro inputs
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (meal) {
      setSelectedRecipeId(meal.recipeId || "");
      setCustomName(meal.customName || meal.recipe?.name || "");
      setServings(meal.servings || 1);
      setDayOfWeek(meal.dayOfWeek || "monday");
      setMealCategory(meal.mealCategory || "lunch");
      setCalories(meal.calories !== null && meal.calories !== undefined ? String(meal.calories) : "");
      setProtein(meal.protein !== null && meal.protein !== undefined ? String(meal.protein) : "");
      setCarbs(meal.carbs !== null && meal.carbs !== undefined ? String(meal.carbs) : "");
      setFat(meal.fat !== null && meal.fat !== undefined ? String(meal.fat) : "");
      setFiber(meal.fiber !== null && meal.fiber !== undefined ? String(meal.fiber) : "");
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [meal]);

  const selectedRecipe = useMemo(() => {
    return (Array.isArray(allRecipes) ? allRecipes : []).find((r) => r.id === selectedRecipeId) ?? meal?.recipe ?? null;
  }, [allRecipes, selectedRecipeId, meal]);

  const recipePreview = useMemo(() => {
    if (!isRecipeMeal || !selectedRecipe) return null;
    const factor = servings > 0 ? servings : 1;
    const calPerServing = selectedRecipe.caloriesPerServing ?? selectedRecipe.calories ?? 0;
    const pPerServing = selectedRecipe.proteinPerServing ?? selectedRecipe.protein ?? 0;
    const cPerServing = selectedRecipe.carbsPerServing ?? selectedRecipe.carbs ?? 0;
    const fPerServing = selectedRecipe.fatPerServing ?? selectedRecipe.fat ?? 0;
    const fibPerServing = selectedRecipe.fiberPerServing ?? selectedRecipe.fiber ?? 0;

    return {
      calories: Math.round(calPerServing * factor),
      protein: Math.round(pPerServing * factor * 10) / 10,
      carbs: Math.round(cPerServing * factor * 10) / 10,
      fat: Math.round(fPerServing * factor * 10) / 10,
      fiber: fibPerServing ? Math.round(fibPerServing * factor * 10) / 10 : 0,
    };
  }, [isRecipeMeal, selectedRecipe, servings]);

  if (!meal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isRecipeMeal && !customName.trim()) {
      setErrorMsg("Please enter a custom meal name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        mealId: meal.id,
        servings: servings > 0 ? servings : 1,
        dayOfWeek,
        mealCategory,
      };

      if (isRecipeMeal) {
        payload.recipeId = selectedRecipeId;
      } else {
        payload.customName = customName.trim();
        payload.calories = calories !== "" ? Math.max(0, parseFloat(calories) || 0) : 0;
        payload.protein = protein !== "" ? Math.max(0, parseFloat(protein) || 0) : 0;
        payload.carbs = carbs !== "" ? Math.max(0, parseFloat(carbs) || 0) : 0;
        payload.fat = fat !== "" ? Math.max(0, parseFloat(fat) || 0) : 0;
        payload.fiber = fiber !== "" ? Math.max(0, parseFloat(fiber) || 0) : null;
      }

      const res = await fetch("/api/meal-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update meal.");
      } else {
        toast("Meal updated successfully", { kind: "success" });
        onSuccess();
        onClose();
      }
    } catch {
      setErrorMsg("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div>
            <h3 className="font-semibold text-base text-[var(--text-primary)]">
              Edit Planned Meal
            </h3>
            <p className="text-xs text-[var(--text-muted)] capitalize">
              {meal.recipe?.name || meal.customName || "Meal"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl text-xs bg-[var(--macro-fat-bg)] text-[var(--status-over-target)]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Day & Category Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Day of Week
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full px-3 min-h-[40px] text-xs font-medium rounded-xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Meal Category
              </label>
              <select
                value={mealCategory}
                onChange={(e) => setMealCategory(e.target.value)}
                className="w-full px-3 min-h-[40px] text-xs font-medium rounded-xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
              >
                {MEAL_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isRecipeMeal ? (
            <>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Recipe
                </label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full px-4 min-h-[44px] text-sm font-medium rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
                >
                  {allRecipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({Math.round(r.caloriesPerServing ?? r.calories ?? 0)} kcal/serv)
                    </option>
                  ))}
                </select>
              </div>

              {recipePreview && (
                <div className="p-3 rounded-2xl bg-[var(--background)] border border-[var(--border)] text-xs space-y-1">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    Nutrition Preview ({servings} serv.)
                  </div>
                  <div className="flex items-center gap-2 font-tabular font-semibold text-[var(--text-primary)]">
                    <span>{recipePreview.calories} kcal</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span>{recipePreview.protein}g P</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span>{recipePreview.carbs}g C</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span>{recipePreview.fat}g F</span>
                    {recipePreview.fiber > 0 && (
                      <>
                        <span className="text-[var(--text-muted)]">·</span>
                        <span>{recipePreview.fiber}g Fib</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Custom meal name *
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-4 min-h-[44px] text-sm font-medium rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Nutrition
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                      Calories (kcal)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      className="w-full px-3 min-h-[38px] text-xs font-semibold tabular rounded-xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1 focus:ring-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      className="w-full px-3 min-h-[38px] text-xs font-semibold tabular rounded-xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1 focus:ring-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      className="w-full px-3 min-h-[38px] text-xs font-semibold tabular rounded-xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1 focus:ring-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      className="w-full px-3 min-h-[38px] text-xs font-semibold tabular rounded-xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1 focus:ring-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                    Fiber (g, optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="optional"
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                    className="w-1/2 px-3 min-h-[38px] text-xs font-semibold tabular rounded-xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:ring-1 focus:ring-[var(--text-primary)]"
                  />
                </div>
              </div>
            </>
          )}

          {/* Servings Counter */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Portions / Servings
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setServings(Math.max(0.5, Math.round((servings - (servings > 1 ? 1 : 0.5)) * 10) / 10))}
                className="w-10 h-10 rounded-full bg-[var(--background)] text-[var(--text-primary)] font-bold hover:bg-[var(--border)] transition flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                min={0.1}
                step="0.5"
                value={servings}
                onChange={(e) => setServings(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-16 text-center font-bold text-base font-tabular bg-transparent text-[var(--text-primary)] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setServings(Math.round((servings + (servings >= 1 ? 1 : 0.5)) * 10) / 10)}
                className="w-10 h-10 rounded-full bg-[var(--background)] text-[var(--text-primary)] font-bold hover:bg-[var(--border)] transition flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--border)]">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(meal.id);
                  onClose();
                }}
                className="px-4 py-2.5 min-h-[44px] rounded-full text-[var(--ui-error)] hover:bg-[var(--macro-fat-bg)] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--background)] text-[var(--text-primary)] text-xs font-semibold hover:bg-[var(--border)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!isRecipeMeal && !customName.trim())}
                className="inline-flex items-center space-x-1.5 px-6 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
