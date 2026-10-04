"use client";

import React, { useState, useMemo } from "react";
import { X, Plus, Minus } from "lucide-react";
import type { RecipeSummary, MealCategory } from "@/lib/domain";
import { MEAL_CATEGORIES, MEAL_LABELS } from "@/lib/domain";
import { todayLocal, type DateString } from "@/lib/dates";
import { addEntry } from "@/lib/client/day-store";
import { fmt, parseNum } from "@/components/ui/primitives";
import { roundNutrients, scaleNutrients, toNutrients, type Nutrients } from "@/lib/nutrition/core";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface LogRecipeModalProps {
  recipe: RecipeSummary | null;
  open: boolean;
  onClose: () => void;
  defaultMeal?: MealCategory;
  defaultDate?: DateString;
}

export function LogRecipeModal({
  recipe,
  open,
  onClose,
  defaultMeal = "lunch",
  defaultDate,
}: LogRecipeModalProps) {
  const [meal, setMeal] = useState<MealCategory>(defaultMeal);
  const [date, setDate] = useState<DateString>(defaultDate || todayLocal());
  const [unitMode, setUnitMode] = useState<"serving" | "g">("serving");
  const [quantity, setQuantity] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync defaults when recipe changes
  React.useEffect(() => {
    if (open) {
      setMeal(defaultMeal);
      setDate(defaultDate || todayLocal());
      setUnitMode("serving");
      setQuantity("1");
      setIsSubmitting(false);
    }
  }, [open, defaultMeal, defaultDate, recipe]);

  const hasYield = Boolean(recipe?.yieldWeightGrams && recipe.yieldWeightGrams > 0);
  const servingLabel = recipe?.servingLabel?.trim() || "serving";

  const n = parseNum(quantity);

  // Calculate scaled nutrients
  const nutrients = useMemo<Nutrients>(() => {
    if (!recipe || !(n > 0)) return toNutrients({});

    const perServ = toNutrients({
      calories: recipe.caloriesPerServing,
      protein: recipe.proteinPerServing,
      carbs: recipe.carbsPerServing,
      fat: recipe.fatPerServing,
      fiber: recipe.fiberPerServing,
      totalSugars: recipe.totalSugarsPerServing,
      addedSugars: recipe.addedSugarsPerServing,
      saturatedFat: recipe.saturatedFatPerServing,
      transFat: recipe.transFatPerServing,
      sodium: recipe.sodiumPerServing,
    });

    if (unitMode === "g" && hasYield && recipe.yieldWeightGrams) {
      const totalRecipe = scaleNutrients(perServ, recipe.servings);
      const perGram = scaleNutrients(totalRecipe, 1 / recipe.yieldWeightGrams);
      return roundNutrients(scaleNutrients(perGram, n));
    }

    return roundNutrients(scaleNutrients(perServ, n));
  }, [recipe, n, unitMode, hasYield]);

  if (!open || !recipe) return null;

  const handleBump = (delta: number) => {
    setQuantity(fmt.qty(Math.max(0, Math.round((n + delta) * 100) / 100)));
  };

  const handleUnitSwitch = (mode: "serving" | "g") => {
    setUnitMode(mode);
    if (mode === "g") {
      setQuantity("150");
    } else {
      setQuantity("1");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !(n > 0)) return;
    setIsSubmitting(true);

    try {
      addEntry({
        name: recipe.name,
        servings: n,
        servingUnit: unitMode === "g" ? "g" : servingLabel,
        foodId: null,
        recipeId: recipe.id,
        date,
        mealCategory: meal,
        ...nutrients,
      });

      toast(`Logged ${recipe.name} to ${MEAL_LABELS[meal]}`, { kind: "success" });
      onClose();
    } catch {
      toast("Failed to log recipe", { kind: "error" });
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
        className="w-full max-w-md rounded-2xl bg-surface-1 border border-line p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h3 className="font-semibold text-base text-fg tracking-tight">
              Log Recipe
            </h3>
            <p className="text-xs text-fg-3 truncate max-w-[280px]">
              {recipe.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-icon btn-sm text-fg-3 hover:text-fg"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Meal & Date Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-3 mb-1">
                Meal
              </label>
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value as MealCategory)}
                className="input h-9 text-xs"
              >
                {MEAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {MEAL_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-3 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value as DateString)}
                className="input h-9 text-xs"
              />
            </div>
          </div>

          {/* Portion Controls: Stepper & Unit Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">
                Portion
              </label>
              {hasYield && (
                <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => handleUnitSwitch("serving")}
                    className={cn(
                      "px-2.5 py-0.5 rounded-md font-medium transition-colors",
                      unitMode === "serving"
                        ? "bg-[var(--accent)] text-[var(--on-accent)]"
                        : "text-fg-3 hover:text-fg"
                    )}
                  >
                    {servingLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitSwitch("g")}
                    className={cn(
                      "px-2.5 py-0.5 rounded-md font-medium transition-colors",
                      unitMode === "g"
                        ? "bg-[var(--accent)] text-[var(--on-accent)]"
                        : "text-fg-3 hover:text-fg"
                    )}
                  >
                    grams (g)
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-icon h-10 w-10 text-fg-2 hover:text-fg"
                onClick={() => handleBump(-(unitMode === "g" ? 25 : 0.5))}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input h-10 flex-1 text-center font-semibold text-base tabular"
                aria-label="Quantity"
              />
              <button
                type="button"
                className="btn btn-secondary btn-icon h-10 w-10 text-fg-2 hover:text-fg"
                onClick={() => handleBump(unitMode === "g" ? 25 : 0.5)}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-fg-3 w-16 text-right">
                {unitMode === "g" ? "g" : servingLabel}
              </span>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {unitMode === "g"
                ? [100, 150, 200, 250, 300, 400].map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs tabular font-medium transition-colors",
                        n === g
                          ? "bg-[var(--accent)] text-[var(--on-accent)]"
                          : "bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg"
                      )}
                      onClick={() => setQuantity(String(g))}
                    >
                      {g}g
                    </button>
                  ))
                : [0.5, 1, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs tabular font-medium transition-colors",
                        n === s
                          ? "bg-[var(--accent)] text-[var(--on-accent)]"
                          : "bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg"
                      )}
                      onClick={() => setQuantity(String(s))}
                    >
                      {s} {servingLabel}
                    </button>
                  ))}
            </div>
          </div>

          {/* Live Nutrition Display */}
          <div className="rounded-lg bg-surface-2/60 p-3.5 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-fg-3">Nutrition</span>
              <div className="text-right">
                <span className="text-2xl font-bold tabular text-fg">
                  {fmt.int(nutrients.calories)}
                </span>
                <span className="ml-1 text-xs text-fg-3">kcal</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-line/40">
              <div className="flex items-center gap-1.5">
                <span className="text-fg-3">Protein</span>
                <span className="font-semibold tabular text-fg">{fmt.one(nutrients.protein)}g</span>
              </div>
              <span className="text-fg-4 select-none">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-fg-3">Carbs</span>
                <span className="font-semibold tabular text-fg">{fmt.one(nutrients.carbs)}g</span>
              </div>
              <span className="text-fg-4 select-none">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-fg-3">Fat</span>
                <span className="font-semibold tabular text-fg">{fmt.one(nutrients.fat)}g</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary h-10 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !(n > 0)}
              className="btn btn-primary h-10 text-xs font-semibold shadow-sm"
            >
              Log to {MEAL_LABELS[meal]} · {fmt.int(nutrients.calories)} kcal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
