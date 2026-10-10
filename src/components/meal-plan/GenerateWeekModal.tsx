"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  RotateCw,
  Check,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import type { GeneratedWeekPlan, PlannerSlot } from "@/lib/services/meal-planner";

interface GenerateWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekStartDate: string;
  userGoals: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
  };
  onPlanApplied: () => void;
}

export function GenerateWeekModal({
  isOpen,
  onClose,
  weekStartDate,
  userGoals,
  onPlanApplied,
}: GenerateWeekModalProps) {
  // Configuration state
  const [calories, setCalories] = useState(userGoals.dailyCalories);
  const [protein, setProtein] = useState(userGoals.dailyProtein);
  const [carbs, setCarbs] = useState(userGoals.dailyCarbs);
  const [fat, setFat] = useState(userGoals.dailyFat);

  const [selectedSlots, setSelectedSlots] = useState<PlannerSlot[]>([
    "breakfast",
    "lunch",
    "dinner",
    "snack",
  ]);
  const [variety, setVariety] = useState<"low" | "medium" | "high">("medium");
  const [pantryPreference, setPantryPreference] = useState<"ignore" | "prefer" | "strongly_prefer">("prefer");
  const [useSavedMeals, setUseSavedMeals] = useState(true);
  const [useRecipes, setUseRecipes] = useState(true);
  const [prioritizeFavorites, setPrioritizeFavorites] = useState(true);
  const [prioritizeFrequent, setPrioritizeFrequent] = useState(true);

  // Execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedWeekPlan | null>(null);
  const [previewDay, setPreviewDay] = useState(0); // phones preview one day at a time
  const [applyMode, setApplyMode] = useState<"replace" | "fill_empty">("replace");
  const [isApplying, setIsApplying] = useState(false);
  const [regeneratingDayIdx, setRegeneratingDayIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const toggleSlot = (slot: PlannerSlot) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleGenerate = async () => {
    if (selectedSlots.length === 0) {
      toast("Please select at least one meal slot", { kind: "info" });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/meal-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate,
          targets: {
            calories: Number(calories) || 2000,
            protein: Number(protein) || 150,
            carbs: Number(carbs) || 200,
            fat: Number(fat) || 65,
          },
          slots: selectedSlots,
          variety,
          pantryPreference,
          useSavedMeals,
          useRecipes,
          prioritizeFavorites,
          prioritizeFrequent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to generate meal plan", { kind: "error" });
      } else {
        setGeneratedPlan(data);
      }
    } catch {
      toast("Error generating meal plan", { kind: "error" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateDay = async (dayIndex: number) => {
    if (!generatedPlan) return;
    setRegeneratingDayIdx(dayIndex);
    try {
      const res = await fetch("/api/meal-plan/generate/regenerate-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            weekStartDate,
            targets: {
              calories: Number(calories) || 2000,
              protein: Number(protein) || 150,
              carbs: Number(carbs) || 200,
              fat: Number(fat) || 65,
            },
            slots: selectedSlots,
            variety,
            pantryPreference,
            useSavedMeals,
            useRecipes,
            prioritizeFavorites,
            prioritizeFrequent,
          },
          currentPlan: generatedPlan,
          dayIndex,
        }),
      });

      const updated = await res.json();
      if (res.ok) {
        setGeneratedPlan(updated);
        toast(`Regenerated ${updated.days[dayIndex].dayOfWeek}`, { kind: "success" });
      }
    } catch {
      toast("Failed to regenerate day", { kind: "error" });
    } finally {
      setRegeneratingDayIdx(null);
    }
  };

  const handleApply = async () => {
    if (!generatedPlan) return;
    setIsApplying(true);
    try {
      const res = await fetch("/api/meal-plan/generate/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate,
          plan: generatedPlan,
          mode: applyMode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast(
          `Weekly plan applied successfully (${data.addedCount} meals added)!`,
          { kind: "success" }
        );
        onPlanApplied();
        onClose();
      } else {
        toast(data.error || "Failed to apply plan", { kind: "error" });
      }
    } catch {
      toast("Error applying meal plan", { kind: "error" });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="modal-panel w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] p-4 sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {generatedPlan ? "Review Generated Plan" : "Generate Weekly Meal Plan"}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Week of {weekStartDate} · Deterministic & pantry-aware
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-target flex items-center justify-center p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!generatedPlan ? (
            /* ─── Configuration Form ─── */
            <div className="space-y-6">
              {/* Nutrition Targets */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Daily Targets (kcal & macros)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Calories</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={calories}
                      onChange={(e) => setCalories(Number(e.target.value))}
                      className="input-field text-xs font-semibold font-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--macro-protein)] mb-1">Protein (g)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={protein}
                      onChange={(e) => setProtein(Number(e.target.value))}
                      className="input-field text-xs font-semibold font-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--macro-carbs)] mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={carbs}
                      onChange={(e) => setCarbs(Number(e.target.value))}
                      className="input-field text-xs font-semibold font-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--macro-fat)] mb-1">Fat (g)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={fat}
                      onChange={(e) => setFat(Number(e.target.value))}
                      className="input-field text-xs font-semibold font-tabular"
                    />
                  </div>
                </div>
              </div>

              {/* Meal Slots */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Meal Slots to Plan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(["breakfast", "lunch", "dinner", "snack"] as PlannerSlot[]).map((slot) => {
                    const isSelected = selectedSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        className={cn(
                          "min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-semibold capitalize border transition flex items-center justify-between cursor-pointer",
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                            : "border-[var(--border)] bg-[var(--background)] text-[var(--text-muted)]"
                        )}
                      >
                        <span>{slot}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Variety and Pantry Preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Meal Variety
                  </label>
                  <select
                    value={variety}
                    onChange={(e) => setVariety(e.target.value as any)}
                    className="input-field text-xs cursor-pointer"
                  >
                    <option value="low">Low (Repeats meals more often, easiest prep)</option>
                    <option value="medium">Medium (Balanced repeats, max ~2-3x/week)</option>
                    <option value="high">High (Maximum variation, avoids repeating)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Pantry Preference
                  </label>
                  <select
                    value={pantryPreference}
                    onChange={(e) => setPantryPreference(e.target.value as any)}
                    className="input-field text-xs cursor-pointer"
                  >
                    <option value="prefer">Prefer pantry (Boost available ingredients)</option>
                    <option value="strongly_prefer">Strongly prefer pantry (Maximize stock usage)</option>
                    <option value="ignore">Ignore pantry stock</option>
                  </select>
                </div>
              </div>

              {/* Checkbox Options */}
              <div className="pt-2 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex min-h-[44px] items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSavedMeals}
                    onChange={(e) => setUseSavedMeals(e.target.checked)}
                    className="rounded text-[var(--accent)]"
                  />
                  <span>Include Saved Meals in pool</span>
                </label>

                <label className="flex min-h-[44px] items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRecipes}
                    onChange={(e) => setUseRecipes(e.target.checked)}
                    className="rounded text-[var(--accent)]"
                  />
                  <span>Include Recipes in pool</span>
                </label>

                <label className="flex min-h-[44px] items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prioritizeFavorites}
                    onChange={(e) => setPrioritizeFavorites(e.target.checked)}
                    className="rounded text-[var(--accent)]"
                  />
                  <span>Prioritize Favorite items</span>
                </label>

                <label className="flex min-h-[44px] items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prioritizeFrequent}
                    onChange={(e) => setPrioritizeFrequent(e.target.checked)}
                    className="rounded text-[var(--accent)]"
                  />
                  <span>Prioritize Frequently logged meals</span>
                </label>
              </div>
            </div>
          ) : (
            /* ─── Generated Plan Preview ─── */
            <div className="space-y-5">
              {/* Summary Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[var(--accent-subtle)]/40 border border-[var(--accent)]/20">
                <div>
                  <span className="text-[11px] text-[var(--text-muted)] block">Avg Calories</span>
                  <span className="text-base font-bold font-tabular text-[var(--text-primary)]">
                    {generatedPlan.averages.calories.toLocaleString()} <span className="text-xs font-normal">/ {calories}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--text-muted)] block">Avg Protein</span>
                  <span className="text-base font-bold font-tabular text-[var(--macro-protein)]">
                    {generatedPlan.averages.protein}g <span className="text-xs font-normal">/ {protein}g</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--text-muted)] block">Unique Meals</span>
                  <span className="text-base font-bold font-tabular text-[var(--text-primary)]">
                    {generatedPlan.uniqueMealsCount}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--text-muted)] block">Pantry-Friendly</span>
                  <span className="text-base font-bold font-tabular text-[var(--accent)]">
                    {generatedPlan.pantryFriendlyCount} meals
                  </span>
                </div>
              </div>

              {/* Phones: one previewed day at a time. From sm up every day is listed. */}
              <div role="tablist" aria-label="Preview day" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none sm:hidden">
                {generatedPlan.days.map((day, idx) => (
                  <button
                    key={day.dayOfWeek}
                    type="button"
                    role="tab"
                    aria-selected={previewDay === idx}
                    onClick={() => setPreviewDay(idx)}
                    className={cn(
                      "min-h-[44px] shrink-0 rounded-xl px-3 text-xs font-semibold capitalize",
                      previewDay === idx ? "bg-[var(--accent)] text-[var(--on-accent)]" : "bg-[var(--background)] text-[var(--text-secondary)]"
                    )}
                  >
                    {day.dayOfWeek.slice(0, 3)}
                  </button>
                ))}
              </div>

              {/* 7 Days Preview List */}
              <div className="space-y-3">
                {generatedPlan.days.map((day, idx) => {
                  const isRegenThis = regeneratingDayIdx === idx;
                  const calDiff = day.targetDiff.caloriesDiff;
                  const proDiff = day.targetDiff.proteinDiff;

                  return (
                    <div
                      key={day.dayOfWeek}
                      className={cn("p-3 sm:p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] space-y-3", idx !== previewDay && "hidden sm:block")}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                            {day.dayOfWeek}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {day.date}
                          </span>
                        </div>

                        <div className="flex w-full items-center gap-2 sm:w-auto">
                          <span className="text-xs font-tabular font-semibold text-[var(--text-primary)]">
                            {day.totals.calories} kcal ({calDiff >= 0 ? `+${calDiff}` : calDiff})
                          </span>
                          <span className="text-xs font-tabular text-[var(--macro-protein)]">
                            {day.totals.protein}g P ({proDiff >= 0 ? `+${proDiff}` : proDiff})
                          </span>

                          <button
                            type="button"
                            disabled={isRegenThis}
                            onClick={() => handleRegenerateDay(idx)}
                            className="tap-target ml-auto px-2.5 py-1 rounded-lg bg-[var(--surface)] text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 sm:ml-2"
                          >
                            <RotateCw className={cn("w-3 h-3", isRegenThis && "animate-spin")} />
                            <span>Regenerate</span>
                          </button>
                        </div>
                      </div>

                      {/* Meals in Day */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {day.meals.map((m) => (
                          <div
                            key={m.mealCategory}
                            className="p-2.5 rounded-xl bg-[var(--surface)] text-xs space-y-1"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                              {m.mealCategory}
                            </span>
                            <span className="font-semibold text-[var(--text-primary)] line-clamp-1">
                              {m.candidate.name}
                            </span>
                            <div className="text-[10px] text-[var(--text-muted)] font-tabular flex items-center justify-between">
                              <span>{m.calories} kcal</span>
                              <span>{m.protein}g P</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Apply Mode Selector */}
              <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  How should this plan be applied?
                </span>
                <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-4">
                  <label className="flex min-h-[44px] items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyMode"
                      value="replace"
                      checked={applyMode === "replace"}
                      onChange={() => setApplyMode("replace")}
                    />
                    <span>Replace existing planned meals</span>
                  </label>
                  <label className="flex min-h-[44px] items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyMode"
                      value="fill_empty"
                      checked={applyMode === "fill_empty"}
                      onChange={() => setApplyMode("fill_empty")}
                    />
                    <span>Fill empty slots only</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-3 sm:p-5 border-t border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface)]">
          {!generatedPlan ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="px-6 py-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Plan</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setGeneratedPlan(null)}
                className="min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Settings</span>
              </button>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || isApplying}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-[var(--background)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Regenerate Week</span>
                </button>

                <button
                  type="button"
                  disabled={isApplying}
                  onClick={handleApply}
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Applying Plan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Apply Week Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
