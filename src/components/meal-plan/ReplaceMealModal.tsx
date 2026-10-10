"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ArrowLeftRight,
  Star,
  Package,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import type { MealAlternative, MealReplacementResponse } from "@/lib/services/meal-replacement";

interface ReplaceMealModalProps {
  meal: any | null;
  isOpen: boolean;
  onClose: () => void;
  onMealReplaced: () => void;
}

export function ReplaceMealModal({
  meal,
  isOpen,
  onClose,
  onMealReplaced,
}: ReplaceMealModalProps) {
  const [data, setData] = useState<MealReplacementResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !meal?.id) {
      setData(null);
      return;
    }

    setIsLoading(true);
    fetch(`/api/meal-plan/meals/${meal.id}/alternatives`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
      })
      .catch((err) => {
        console.error(err);
        toast("Failed to load alternatives", { kind: "error" });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, meal?.id]);

  if (!isOpen || !meal) return null;

  const handleExecuteReplace = async (alt: MealAlternative) => {
    setReplacingId(alt.id);
    try {
      const res = await fetch(`/api/meal-plan/meals/${meal.id}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: alt.type,
          id: alt.type === "recipe" ? alt.recipeId : alt.savedMealId,
          servings: alt.servings || 1,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        toast(`Replaced meal with "${alt.name}" ✓`, { kind: "success" });
        onMealReplaced();
        onClose();
      } else {
        toast(resJson.error || "Failed to replace meal", { kind: "error" });
      }
    } catch {
      toast("Error replacing meal", { kind: "error" });
    } finally {
      setReplacingId(null);
    }
  };

  const isLogged = meal.status === "logged" || Boolean(meal.foodLogEntryId);

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="modal-panel w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Smart Meal Replacement
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Find nutritionally similar alternatives without breaking your macros
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
             aria-label="Close" className="tap-target inline-flex items-center justify-center p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Current Meal Summary Card */}
          <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Current Meal ({meal.dayOfWeek} · {meal.mealCategory})
              </span>
              {isLogged && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                  <AlertCircle className="w-3 h-3" />
                  Logged in food log
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <span className="font-bold text-sm text-[var(--text-primary)]">
                {meal.recipe?.name || meal.customName || "Meal"}
              </span>
              <div className="text-xs font-semibold font-tabular text-[var(--text-primary)] flex items-center gap-2">
                <span>{Math.round(meal.calories)} kcal</span>
                <span className="text-[var(--macro-protein)]">{Math.round(meal.protein)}g P</span>
                <span className="text-[var(--macro-carbs)]">{Math.round(meal.carbs)}g C</span>
                <span className="text-[var(--macro-fat)]">{Math.round(meal.fat)}g F</span>
              </div>
            </div>

            {isLogged && (
              <p className="text-xs text-amber-500/90 pt-1 border-t border-[var(--border)]">
                This meal is already logged in today&apos;s food log. Please unlog it first to replace it.
              </p>
            )}
          </div>

          {/* Alternatives List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Recommended Alternatives ({data?.alternatives.length || 0})
            </h3>

            {isLoading ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
                <p className="text-xs text-[var(--text-muted)]">Finding closest macro matches...</p>
              </div>
            ) : data?.alternatives.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-[var(--background)] p-6 space-y-2">
                <p className="text-xs font-semibold text-[var(--text-primary)]">No alternative meals found</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                  Add more recipes or saved meals to your library to see smart alternatives.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.alternatives.map((alt) => {
                  const isBusy = replacingId === alt.id;
                  const calDiff = alt.diff.caloriesDiff;
                  const proDiff = alt.diff.proteinDiff;

                  return (
                    <div
                      key={alt.id}
                      className="p-3.5 rounded-2xl bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-[var(--text-primary)]">
                            {alt.name}
                          </span>

                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--surface)] text-[var(--text-secondary)]">
                            {alt.type === "recipe" ? "Recipe" : "Saved Meal"}
                          </span>

                          {alt.isFavorite && (
                            <span className="inline-flex items-center text-[10px] text-amber-500 font-medium">
                              <Star className="w-3 h-3 fill-amber-500 mr-0.5" />
                              Favorite
                            </span>
                          )}

                          {alt.pantryMatchPercent >= 70 && (
                            <span className="inline-flex items-center text-[10px] text-[var(--accent)] font-medium">
                              <Package className="w-3 h-3 mr-0.5" />
                              Pantry ready
                            </span>
                          )}

                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                              alt.fitPercentage >= 85
                                ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                                : "bg-surface-2 text-fg-2"
                            )}
                          >
                            {alt.fitLabel}
                          </span>
                        </div>

                        {/* Macros & Differences */}
                        <div className="flex items-center gap-2 text-xs font-tabular text-[var(--text-muted)] flex-wrap">
                          <span className="font-bold text-[var(--text-primary)]">{alt.calories} kcal</span>
                          <span>·</span>
                          <span className="text-[var(--macro-protein)] font-medium">{alt.protein}g P</span>
                          <span>·</span>
                          <span className="text-[var(--macro-carbs)] font-medium">{alt.carbs}g C</span>
                          <span>·</span>
                          <span className="text-[var(--macro-fat)] font-medium">{alt.fat}g F</span>

                          {/* Delta tags */}
                          <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-[var(--surface)] text-[var(--text-secondary)] font-medium">
                            {calDiff >= 0 ? `+${calDiff}` : calDiff} kcal
                          </span>
                          <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-[var(--surface)] text-[var(--text-secondary)] font-medium">
                            {proDiff >= 0 ? `+${proDiff}` : proDiff}g P
                          </span>
                        </div>
                      </div>

                      {/* Replace Button */}
                      <button
                        type="button"
                        disabled={isLogged || isBusy}
                        onClick={() => handleExecuteReplace(alt)}
                        className="tap-target px-4 py-2 min-h-[36px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Replace</span>
                      </button>
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
