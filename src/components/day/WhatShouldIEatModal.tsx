"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Utensils,
  Sparkles,
  Star,
  Package,
  Plus,
  CalendarDays,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import { invalidateAll } from "@/lib/client/day-store";
import type { WhatShouldIEatResponse, MealRecommendation } from "@/lib/services/meal-recommendations";

interface WhatShouldIEatModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onLogged?: () => void;
}

export function WhatShouldIEatModal({
  isOpen,
  onClose,
  date,
  onLogged,
}: WhatShouldIEatModalProps) {
  const [data, setData] = useState<WhatShouldIEatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [planningSlot, setPlanningSlot] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [showSlotPickerFor, setShowSlotPickerFor] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    fetch(`/api/meal-recommendations/what-should-i-eat?date=${date}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
      })
      .catch((err) => {
        console.error(err);
        toast("Failed to load recommendations", { kind: "error" });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, date]);

  if (!isOpen) return null;

  const handleLogNow = async (item: MealRecommendation) => {
    setLoggingId(item.id);
    try {
      if (item.type === "saved_meal" && item.savedMealId) {
        // Log saved meal
        const res = await fetch(`/api/saved-meals/${item.savedMealId}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            mealCategory: "lunch",
            multiplier: 1,
          }),
        });
        if (res.ok) {
          toast(`Logged "${item.name}" to today's food log ✓`, { kind: "success" });
          invalidateAll();
          onLogged?.();
          onClose();
          return;
        }
      }

      // Log recipe or food
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealCategory: "lunch",
          name: item.name,
          servings: item.servings || 1,
          servingUnit: item.servingUnit || "serving",
          recipeId: item.recipeId,
          foodId: item.foodId,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
        }),
      });

      if (res.ok) {
        toast(`Logged "${item.name}" to today's food log ✓`, { kind: "success" });
        invalidateAll();
        onLogged?.();
        onClose();
      } else {
        const json = await res.json();
        toast(json.error || "Failed to log meal", { kind: "error" });
      }
    } catch {
      toast("Error logging meal", { kind: "error" });
    } finally {
      setLoggingId(null);
    }
  };

  const handleAddToPlan = async (item: MealRecommendation) => {
    setPlanningId(item.id);
    try {
      // Find week start for date
      const targetDate = new Date(date);
      const day = targetDate.getDay();
      const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(targetDate.setDate(diff)).toISOString().split("T")[0];
      const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
        new Date(date).getDay()
      ];

      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: monday,
          dayOfWeek: dayName,
          mealCategory: planningSlot,
          recipeId: item.recipeId,
          customName: item.recipeId ? null : item.name,
          servings: item.servings || 1,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
        }),
      });

      if (res.ok) {
        toast(`Added "${item.name}" to planned meals for ${dayName} ✓`, { kind: "success" });
        setShowSlotPickerFor(null);
      } else {
        toast("Failed to add meal to plan", { kind: "error" });
      }
    } catch {
      toast("Error adding meal to plan", { kind: "error" });
    } finally {
      setPlanningId(null);
    }
  };

  const remaining = data?.remaining;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                What Should I Eat?
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Smart recommendations fitted to your remaining daily macros
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Remaining Macros Card */}
          {remaining && (
            <div
              className={cn(
                "p-4 rounded-2xl border space-y-2",
                data.isOverCalories
                  ? "bg-amber-500/5 border-amber-500/30"
                  : "bg-[var(--background)] border-[var(--border)]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Remaining Today
                </span>
                {data.isOverCalories && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    Over target
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-[var(--surface)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Calories</span>
                  <span
                    className={cn(
                      "text-base font-bold font-tabular",
                      data.isOverCalories ? "text-amber-500" : "text-[var(--text-primary)]"
                    )}
                  >
                    {remaining.calories > 0 ? remaining.calories : 0} <span className="text-[10px] font-normal">kcal</span>
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--surface)]">
                  <span className="text-[10px] text-[var(--macro-protein)] block">Protein</span>
                  <span className="text-base font-bold font-tabular text-[var(--macro-protein)]">
                    {remaining.protein > 0 ? remaining.protein : 0}g
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--surface)]">
                  <span className="text-[10px] text-[var(--macro-carbs)] block">Carbs</span>
                  <span className="text-base font-bold font-tabular text-[var(--macro-carbs)]">
                    {remaining.carbs > 0 ? remaining.carbs : 0}g
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--surface)]">
                  <span className="text-[10px] text-[var(--macro-fat)] block">Fat</span>
                  <span className="text-base font-bold font-tabular text-[var(--macro-fat)]">
                    {remaining.fat > 0 ? remaining.fat : 0}g
                  </span>
                </div>
              </div>

              {data.message && (
                <p className="text-xs text-[var(--text-secondary)] pt-1">
                  {data.message}
                </p>
              )}
            </div>
          )}

          {/* Recommendations List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Top Matches ({data?.recommendations.length || 0})
            </h3>

            {isLoading ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
                <p className="text-xs text-[var(--text-muted)]">Computing best nutritional matches...</p>
              </div>
            ) : data?.recommendations.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-[var(--background)] p-6 space-y-2">
                <p className="text-xs font-semibold text-[var(--text-primary)]">No recommendations found</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                  Add recipes, saved meals, or favorite foods to your library for smart suggestions.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.recommendations.map((rec) => {
                  const isLogging = loggingId === rec.id;
                  const isPlanning = planningId === rec.id;
                  const isPickingSlot = showSlotPickerFor === rec.id;

                  return (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-2xl bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-[var(--text-primary)]">
                            {rec.name}
                          </span>

                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--surface)] text-[var(--text-secondary)]">
                            {rec.type === "recipe" ? "Recipe" : rec.type === "saved_meal" ? "Saved Meal" : "Food"}
                          </span>

                          {rec.isFavorite && (
                            <span className="inline-flex items-center text-[10px] text-amber-500 font-medium">
                              <Star className="w-3 h-3 fill-amber-500 mr-0.5" />
                              Favorite
                            </span>
                          )}

                          {rec.pantryMatchPercent >= 70 && (
                            <span className="inline-flex items-center text-[10px] text-[var(--accent)] font-medium">
                              <Package className="w-3 h-3 mr-0.5" />
                              Pantry ready
                            </span>
                          )}

                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                              rec.macroFitPercent >= 85
                                ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                                : "bg-surface-2 text-fg-2"
                            )}
                          >
                            {rec.fitLabel} ({rec.macroFitPercent}% fit)
                          </span>
                        </div>

                        {/* Macros */}
                        <div className="flex items-center gap-2 text-xs font-tabular text-[var(--text-muted)] flex-wrap">
                          <span className="font-bold text-[var(--text-primary)]">{rec.calories} kcal</span>
                          <span>·</span>
                          <span className="text-[var(--macro-protein)] font-medium">{rec.protein}g P</span>
                          <span>·</span>
                          <span className="text-[var(--macro-carbs)] font-medium">{rec.carbs}g C</span>
                          <span>·</span>
                          <span className="text-[var(--macro-fat)] font-medium">{rec.fat}g F</span>
                        </div>

                        {/* Slot Picker popup if user clicked Plan */}
                        {isPickingSlot && (
                          <div className="pt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Slot:</span>
                            {(["breakfast", "lunch", "dinner", "snack"] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setPlanningSlot(s)}
                                className={cn(
                                  "px-2 py-1 rounded-md text-[10px] font-semibold capitalize transition cursor-pointer",
                                  planningSlot === s
                                    ? "bg-[var(--accent)] text-[var(--on-accent)]"
                                    : "bg-[var(--surface)] text-[var(--text-secondary)]"
                                )}
                              >
                                {s}
                              </button>
                            ))}
                            <button
                              type="button"
                              disabled={isPlanning}
                              onClick={() => handleAddToPlan(rec)}
                              className="px-2.5 py-1 rounded-md bg-[var(--accent)] text-[var(--on-accent)] text-[10px] font-bold transition cursor-pointer ml-1"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowSlotPickerFor(null)}
                              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isLogging}
                          onClick={() => handleLogNow(rec)}
                          className="px-3.5 py-2 min-h-[36px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isLogging ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Utensils className="w-3.5 h-3.5" />
                          )}
                          <span>Log Now</span>
                        </button>

                        <button
                          type="button"
                          disabled={isPlanning}
                          onClick={() => setShowSlotPickerFor(isPickingSlot ? null : rec.id)}
                          className="px-3 py-2 min-h-[36px] rounded-full bg-[var(--surface)] hover:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Add to planned meals"
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Plan</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex justify-end bg-[var(--surface)]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
