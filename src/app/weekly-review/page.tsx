"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Scale,
  Droplets,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Loader2,
  CalendarDays,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import type { WeeklyReviewMetrics } from "@/lib/services/weekly-review";
import type { AdaptiveNutritionAnalysis } from "@/lib/services/adaptive-nutrition";

function getMondayDate(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDisplayDateRange(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

export default function WeeklyReviewPage() {
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayDate());
  const [review, setReview] = useState<WeeklyReviewMetrics | null>(null);
  const [loadingReview, setLoadingReview] = useState(true);
  const [errorReview, setErrorReview] = useState<string | null>(null);

  // Adaptive nutrition state
  const [adaptive, setAdaptive] = useState<AdaptiveNutritionAnalysis | null>(null);
  const [loadingAdaptive, setLoadingAdaptive] = useState(true);
  const [isApplyingAdaptive, setIsApplyingAdaptive] = useState(false);
  const [isDismissingAdaptive, setIsDismissingAdaptive] = useState(false);

  const weekStartStr = formatDate(currentMonday);

  const fetchReview = async (weekStart: string) => {
    setLoadingReview(true);
    setErrorReview(null);
    try {
      const res = await fetch(`/api/weekly-review?weekStart=${weekStart}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch weekly review");
      }
      const data: WeeklyReviewMetrics = await res.json();
      setReview(data);
    } catch (err: any) {
      setErrorReview(err.message || "Failed to load weekly review");
    } finally {
      setLoadingReview(false);
    }
  };

  const fetchAdaptive = async () => {
    setLoadingAdaptive(true);
    try {
      const res = await fetch("/api/adaptive-nutrition?days=21");
      if (res.ok) {
        const data: AdaptiveNutritionAnalysis = await res.json();
        setAdaptive(data);
      }
    } catch (err) {
      console.error("Failed to fetch adaptive recommendations:", err);
    } finally {
      setLoadingAdaptive(false);
    }
  };

  useEffect(() => {
    fetchReview(weekStartStr);
  }, [weekStartStr]);

  useEffect(() => {
    fetchAdaptive();
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

  const handleThisWeek = () => {
    setCurrentMonday(getMondayDate());
  };

  const handleApplyAdaptive = async () => {
    if (!adaptive || adaptive.status !== "ready") return;
    setIsApplyingAdaptive(true);
    try {
      const res = await fetch("/api/adaptive-nutrition/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendedCalories: adaptive.recommendedCalories,
          recommendationId: adaptive.existingRecommendationId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to apply recommendation");
      }

      toast(`Calorie target updated to ${adaptive.recommendedCalories} kcal!`, { kind: "success" });
      // Refresh review and adaptive
      fetchReview(weekStartStr);
      fetchAdaptive();
    } catch (err: any) {
      toast(err.message || "Failed to apply recommendation", { kind: "error" });
    } finally {
      setIsApplyingAdaptive(false);
    }
  };

  const handleDismissAdaptive = async () => {
    if (!adaptive?.existingRecommendationId) {
      setAdaptive(null);
      return;
    }
    setIsDismissingAdaptive(true);
    try {
      const res = await fetch("/api/adaptive-nutrition/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId: adaptive.existingRecommendationId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to dismiss recommendation");
      }

      toast("Recommendation dismissed", { kind: "info" });
      fetchAdaptive();
    } catch (err: any) {
      toast(err.message || "Failed to dismiss recommendation", { kind: "error" });
    } finally {
      setIsDismissingAdaptive(false);
    }
  };

  const isCurrentWeek = formatDate(getMondayDate()) === weekStartStr;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header and Week Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-fg">Weekly Review</h1>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              Intelligence
            </span>
          </div>
          <p className="mt-1 text-sm text-fg-3">
            Deterministic weekly report on nutrition adherence, meal planning, hydration, and weight trends.
          </p>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="tap-target flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-2 hover:bg-surface hover:text-fg"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleThisWeek}
            className={cn(
              "tap-target flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
              isCurrentWeek
                ? "border-accent bg-accent/10 text-accent font-semibold"
                : "border-line bg-surface-2 text-fg-2 hover:bg-surface hover:text-fg"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            This Week
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            className="tap-target flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-2 hover:bg-surface hover:text-fg"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week Title & Period */}
      {review && (
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="text-base font-medium text-fg">
            Week of {formatDisplayDateRange(review.weekStartDate, review.weekEndDate)}
          </div>
          <div className="text-xs text-fg-3">
            {review.daysLoggedCount === 7 ? (
              <span className="text-lime-500 font-medium">Logged 7 / 7 days</span>
            ) : review.daysLoggedCount > 0 ? (
              <span>Logged {review.daysLoggedCount} / 7 days</span>
            ) : (
              <span className="text-amber-500">No food logged</span>
            )}
          </div>
        </div>
      )}

      {loadingReview && (
        <div className="flex h-64 items-center justify-center rounded-xl border border-line bg-surface-2">
          <div className="flex items-center gap-2 text-sm text-fg-3">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            Calculating weekly metrics...
          </div>
        </div>
      )}

      {errorReview && !loadingReview && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            Error loading review
          </div>
          <p className="mt-1 text-xs text-red-300">{errorReview}</p>
        </div>
      )}

      {!loadingReview && review && (
        <div className="space-y-6">
          {/* Weekly Insights Card */}
          {review.insights.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Sparkles className="h-4 w-4 text-accent" />
                Deterministic Insights
              </div>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {review.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg border border-line/60 bg-surface-2/60 p-3 text-xs text-fg-2"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Week-Over-Week Comparison (if available) */}
          {review.previousWeekComparison?.hasPreviousWeek && (
            <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <TrendingUp className="h-4 w-4 text-fg-2" />
                  Week-Over-Week Changes
                </div>
                <span className="text-xs text-fg-3">Compared with previous 7 days</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* Calorie Adherence Delta */}
                <div className="rounded-lg border border-line/60 bg-surface-2/60 p-3">
                  <div className="text-[11px] font-medium text-fg-3">Calorie Adherence</div>
                  <div className="mt-1 text-base font-bold text-fg">
                    {review.previousWeekComparison.calorieAdherenceDelta !== undefined && (
                      <span
                        className={
                          review.previousWeekComparison.calorieAdherenceDelta >= 0
                            ? "text-lime-500"
                            : "text-fg-2"
                        }
                      >
                        {review.previousWeekComparison.calorieAdherenceDelta > 0 ? "+" : ""}
                        {review.previousWeekComparison.calorieAdherenceDelta}%
                      </span>
                    )}
                  </div>
                  {review.previousWeekComparison.previousWeekSummary && (
                    <div className="text-[10px] text-fg-3">
                      Prev: {review.previousWeekComparison.previousWeekSummary.calorieAdherencePercent}%
                    </div>
                  )}
                </div>

                {/* Protein Average Delta */}
                <div className="rounded-lg border border-line/60 bg-surface-2/60 p-3">
                  <div className="text-[11px] font-medium text-fg-3">Protein Average</div>
                  <div className="mt-1 text-base font-bold text-fg">
                    {review.previousWeekComparison.proteinAverageDelta !== undefined && (
                      <span
                        className={
                          review.previousWeekComparison.proteinAverageDelta >= 0
                            ? "text-lime-500"
                            : "text-amber-500"
                        }
                      >
                        {review.previousWeekComparison.proteinAverageDelta > 0 ? "+" : ""}
                        {review.previousWeekComparison.proteinAverageDelta}g
                      </span>
                    )}
                  </div>
                  {review.previousWeekComparison.previousWeekSummary && (
                    <div className="text-[10px] text-fg-3">
                      Prev: {review.previousWeekComparison.previousWeekSummary.averageProtein}g
                    </div>
                  )}
                </div>

                {/* Meal Plan Adherence Delta */}
                <div className="rounded-lg border border-line/60 bg-surface-2/60 p-3">
                  <div className="text-[11px] font-medium text-fg-3">Meal Plan Completion</div>
                  <div className="mt-1 text-base font-bold text-fg">
                    {review.previousWeekComparison.mealAdherenceDelta !== null &&
                    review.previousWeekComparison.mealAdherenceDelta !== undefined ? (
                      <span
                        className={
                          review.previousWeekComparison.mealAdherenceDelta >= 0
                            ? "text-lime-500"
                            : "text-fg-2"
                        }
                      >
                        {review.previousWeekComparison.mealAdherenceDelta > 0 ? "+" : ""}
                        {review.previousWeekComparison.mealAdherenceDelta}%
                      </span>
                    ) : (
                      <span className="text-fg-3">—</span>
                    )}
                  </div>
                  {review.previousWeekComparison.previousWeekSummary?.mealAdherencePercent !== null && (
                    <div className="text-[10px] text-fg-3">
                      Prev: {review.previousWeekComparison.previousWeekSummary?.mealAdherencePercent}%
                    </div>
                  )}
                </div>

                {/* Weight Trend Delta */}
                <div className="rounded-lg border border-line/60 bg-surface-2/60 p-3">
                  <div className="text-[11px] font-medium text-fg-3">Weight Net Shift</div>
                  <div className="mt-1 text-base font-bold text-fg">
                    {review.previousWeekComparison.weightChangeDelta !== null &&
                    review.previousWeekComparison.weightChangeDelta !== undefined ? (
                      <span>
                        {review.previousWeekComparison.weightChangeDelta > 0 ? "+" : ""}
                        {review.previousWeekComparison.weightChangeDelta} kg
                      </span>
                    ) : (
                      <span className="text-fg-3">—</span>
                    )}
                  </div>
                  {review.previousWeekComparison.previousWeekSummary?.weightChangeKg !== null && (
                    <div className="text-[10px] text-fg-3">
                      Prev: {review.previousWeekComparison.previousWeekSummary?.weightChangeKg} kg
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Primary Metrics Grid (This Week) */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 1. Nutrition Card */}
            <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Flame className="h-4 w-4 text-accent" />
                  Nutrition Intake
                </div>
                <span className="text-xs text-fg-3">
                  Based on {review.daysLoggedCount} logged {review.daysLoggedCount === 1 ? "day" : "days"}
                </span>
              </div>

              {review.daysLoggedCount === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-line p-4 text-center text-xs text-fg-3">
                  No food logs recorded this week.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* Calories */}
                  <div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-fg">Calories</span>
                      <span className="text-fg-3">
                        Target: {review.nutrition.targetCalories.toLocaleString()} kcal
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <div className="text-xl font-bold text-fg">
                        {review.nutrition.averageDailyCalories.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-fg-3">kcal/day</span>
                      </div>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-semibold",
                          review.nutrition.calorieAdherencePercent >= 90 &&
                            review.nutrition.calorieAdherencePercent <= 110
                            ? "bg-lime-500/10 text-lime-500"
                            : "bg-amber-500/10 text-amber-500"
                        )}
                      >
                        {review.nutrition.calorieAdherencePercent}%
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-fg-3">
                      {review.nutrition.daysWithinCalorieTarget} of 7 days within ±10% target
                    </div>
                  </div>

                  {/* Protein */}
                  <div className="border-t border-line/60 pt-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-fg">Protein</span>
                      <span className="text-fg-3">Target: {review.nutrition.targetProtein}g</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <div className="text-xl font-bold text-fg">
                        {review.nutrition.averageDailyProtein}
                        <span className="text-xs font-normal text-fg-3">g/day</span>
                      </div>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-semibold",
                          review.nutrition.proteinAdherencePercent >= 90
                            ? "bg-lime-500/10 text-lime-500"
                            : "bg-amber-500/10 text-amber-500"
                        )}
                      >
                        {review.nutrition.proteinAdherencePercent}%
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-fg-3">
                      {review.nutrition.daysProteinTargetHit} of 7 days reached protein target
                    </div>
                  </div>

                  {/* Other Macros */}
                  <div className="grid grid-cols-3 gap-2 border-t border-line/60 pt-3 text-center">
                    <div className="rounded-lg bg-surface-2/60 p-2">
                      <div className="text-[10px] text-fg-3">Carbs</div>
                      <div className="text-sm font-semibold text-fg">
                        {review.nutrition.averageDailyCarbs}g
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-2/60 p-2">
                      <div className="text-[10px] text-fg-3">Fat</div>
                      <div className="text-sm font-semibold text-fg">
                        {review.nutrition.averageDailyFat}g
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-2/60 p-2">
                      <div className="text-[10px] text-fg-3">Fiber</div>
                      <div className="text-sm font-semibold text-fg">
                        {review.nutrition.averageDailyFiber !== null
                          ? `${review.nutrition.averageDailyFiber}g`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Weight Trend Card */}
            <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Scale className="h-4 w-4 text-accent" />
                  Weight Trend
                </div>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
                    review.weight.status === "sufficient_data"
                      ? "bg-lime-500/10 text-lime-500"
                      : review.weight.status === "limited_data"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-surface-2 text-fg-3"
                  )}
                >
                  {review.weight.status === "sufficient_data"
                    ? "Sufficient data"
                    : review.weight.status === "limited_data"
                    ? "Limited data"
                    : "No weigh-ins"}
                </span>
              </div>

              {review.weight.status === "no_data" ? (
                <div className="mt-4 rounded-lg border border-dashed border-line p-4 text-center text-xs text-fg-3">
                  No weigh-in entries logged this week.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-fg-3">Start → End Weight</div>
                      <div className="mt-1 text-lg font-bold text-fg">
                        {review.weight.startWeightKg} → {review.weight.endWeightKg} kg
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-fg-3">Net Weekly Shift</div>
                      <div
                        className={cn(
                          "mt-1 text-lg font-bold",
                          review.weight.changeKg !== null && review.weight.changeKg < 0
                            ? "text-lime-500"
                            : review.weight.changeKg !== null && review.weight.changeKg > 0
                            ? "text-amber-500"
                            : "text-fg"
                        )}
                      >
                        {review.weight.changeKg !== null ? (
                          <>
                            {review.weight.changeKg > 0 ? "+" : ""}
                            {review.weight.changeKg} kg
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                    <span className="text-fg-3">7-Day Representative Average</span>
                    <span className="font-semibold text-fg">
                      {review.weight.averageWeightKg !== null
                        ? `${review.weight.averageWeightKg} kg`
                        : "—"}
                    </span>
                  </div>

                  {review.weight.status === "limited_data" && (
                    <div className="rounded-lg bg-amber-500/10 p-2.5 text-xs text-carbs">
                      Limited weight entries ({review.weight.entriesCount} logged). Log at least 3
                      days to produce a reliable rolling trend.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Meal Planning Card */}
            <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <UtensilsCrossed className="h-4 w-4 text-accent" />
                  Meal Plan Execution
                </div>
                {review.mealPlanning.planAdherencePercent !== null && (
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-semibold",
                      review.mealPlanning.planAdherencePercent >= 80
                        ? "bg-lime-500/10 text-lime-500"
                        : "bg-surface-2 text-fg-2"
                    )}
                  >
                    {review.mealPlanning.planAdherencePercent}% Logged
                  </span>
                )}
              </div>

              {review.mealPlanning.totalPlannedMeals === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-line p-4 text-center text-xs text-fg-3">
                  No meals planned for this week.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-3">Planned Meals Logged</span>
                    <span className="font-semibold text-fg">
                      {review.mealPlanning.loggedPlannedMeals} of{" "}
                      {review.mealPlanning.totalPlannedMeals}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          review.mealPlanning.planAdherencePercent || 0
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-fg-3">
                    <span>Skipped Meals</span>
                    <span className="font-medium text-fg">
                      {review.mealPlanning.skippedMeals}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Hydration & Consistency Card */}
            <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Droplets className="h-4 w-4 text-protein" />
                  Hydration & Consistency
                </div>
                <span className="text-xs text-fg-3">
                  Target: {review.hydration.targetWaterMl.toLocaleString()} ml/day
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-xs text-fg-3">Average Daily Water</div>
                  <div className="text-lg font-bold text-fg">
                    {review.hydration.averageDailyWaterMl.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-fg-3">ml</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-fg-3">Hydration Goal Hit</span>
                  <span className="font-semibold text-fg">
                    {review.hydration.daysWaterGoalAchieved} of 7 days
                  </span>
                </div>

                <div className="border-t border-line/60 pt-3">
                  <div className="text-xs font-medium text-fg">Overall Consistency</div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-surface-2/60 p-2">
                      <div className="text-[10px] text-fg-3">Logged Days</div>
                      <div className="font-semibold text-fg">
                        {review.daysLoggedCount}/7
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-2/60 p-2">
                      <div className="text-[10px] text-fg-3">Calorie Target</div>
                      <div className="font-semibold text-fg">
                        {review.nutrition.daysWithinCalorieTarget}/7
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-2/60 p-2">
                      <div className="text-[10px] text-fg-3">Protein Target</div>
                      <div className="font-semibold text-fg">
                        {review.nutrition.daysProteinTargetHit}/7
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Adaptive Nutrition Recommendation Card */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-fg">Adaptive Nutrition Recommendation</h3>
                  <p className="text-xs text-fg-3">
                    Conservative adjustment based on {adaptive?.daysAnalyzed || 21}-day smoothed weight trend
                  </p>
                </div>
              </div>

              {adaptive?.status === "ready" && (
                <span
                  className={cn(
                    "rounded px-2.5 py-0.5 text-xs font-medium self-start sm:self-auto",
                    adaptive.confidence === "high"
                      ? "bg-lime-500/10 text-lime-500"
                      : "bg-surface-2 text-fg-2"
                  )}
                >
                  {adaptive.confidence.toUpperCase()} CONFIDENCE
                </span>
              )}
            </div>

            {loadingAdaptive && (
              <div className="mt-4 flex items-center gap-2 text-xs text-fg-3">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                Analyzing recent intake and weight history...
              </div>
            )}

            {!loadingAdaptive && adaptive?.status === "insufficient_data" && (
              <div className="mt-4 rounded-lg border border-dashed border-line p-4 text-xs text-fg-3">
                <div className="font-medium text-fg">Keep current target — more data needed</div>
                <p className="mt-1">
                  {adaptive.message ||
                    `Adaptive adjustments require at least 14 days of data with at least 4 weight entries and regular logging (currently ${adaptive.weightDaysCount} weigh-ins, ${adaptive.foodLogDaysCount} food log days).`}
                </p>
              </div>
            )}

            {!loadingAdaptive && adaptive?.status === "ready" && (
              <div className="mt-4 space-y-4">
                {/* Stats comparison */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-surface-2/60 p-3">
                    <div className="text-[11px] text-fg-3">Current Target</div>
                    <div className="mt-1 text-base font-bold text-fg">
                      {adaptive.currentCalories} <span className="text-xs font-normal">kcal</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface-2/60 p-3">
                    <div className="text-[11px] text-fg-3">Observed Weekly Rate</div>
                    <div className="mt-1 text-base font-bold text-fg">
                      {adaptive.observedWeeklyRateKg > 0 ? "+" : ""}
                      {adaptive.observedWeeklyRateKg} <span className="text-xs font-normal">kg/wk</span>
                    </div>
                    <div className="text-[10px] text-fg-3">
                      Goal: {adaptive.targetWeeklyRateKg} kg/wk
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface-2/60 p-3">
                    <div className="text-[11px] text-fg-3">Average Logged Intake</div>
                    <div className="mt-1 text-base font-bold text-fg">
                      {adaptive.averageLoggedCalories} <span className="text-xs font-normal">kcal</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                    <div className="text-[11px] font-medium text-accent">Recommended Target</div>
                    <div className="mt-1 text-base font-bold text-accent">
                      {adaptive.recommendedCalories} <span className="text-xs font-normal">kcal</span>
                    </div>
                    <div className="text-[10px] text-accent/80 font-medium">
                      {adaptive.calorieChange > 0 ? `+${adaptive.calorieChange}` : adaptive.calorieChange} kcal/day
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="rounded-lg border border-line/60 bg-surface-2/40 p-3 text-xs text-fg-2">
                  <span className="font-semibold text-fg">Rationale: </span>
                  {adaptive.reason}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleDismissAdaptive}
                    disabled={isDismissingAdaptive || isApplyingAdaptive}
                    className="rounded-lg border border-line bg-surface-2 px-3.5 py-1.5 text-xs font-medium text-fg-2 hover:bg-surface hover:text-fg disabled:opacity-50"
                  >
                    Keep Current Target
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyAdaptive}
                    disabled={isApplyingAdaptive || isDismissingAdaptive}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent/90 disabled:opacity-50"
                  >
                    {isApplyingAdaptive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Apply {adaptive.recommendedCalories} kcal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
