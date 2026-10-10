"use client";

import React from "react";
import { ArrowUpRight, Calendar, Droplets, Scale, Utensils } from "lucide-react";
import { formatDate, relativeDayLabel, todayLocal, type DateString } from "@/lib/dates";
import type { MonthHistoryDay, NutritionGoals } from "@/lib/domain";
import { fmt } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { formatWeight, type WeightUnit } from "@/lib/weight-units";

interface DayPreviewPanelProps {
  date: DateString;
  dayData?: MonthHistoryDay | null;
  goals?: NutritionGoals;
  onOpenDay: (date: DateString) => void;
  isLoading?: boolean;
  /** Display unit for the day's weight (stored in kg). */
  weightUnit?: WeightUnit;
}

const MEAL_CATEGORIES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
] as const;

export function DayPreviewPanel({
  date,
  dayData,
  goals,
  onOpenDay,
  isLoading,
  weightUnit = "kg",
}: DayPreviewPanelProps) {
  const today = todayLocal();
  const isCurrentDay = date === today;
  const isFuture = date > today;
  const relativeLabel = relativeDayLabel(date, today);

  const formattedTitle = formatDate(date, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined,
  });

  const hasEntries = dayData && dayData.entryCount > 0;
  // The latest daily weigh-in for this date, chosen on the server.
  const weightBadge =
    dayData?.weightKg != null && dayData.weightKg > 0 ? (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs text-fg-2" data-testid="history-weight">
        <Scale className="h-3.5 w-3.5 text-accent" />
        <span className="tabular font-medium">
          {formatWeight(dayData.weightKg, weightUnit)} {weightUnit}
        </span>
      </div>
    ) : null;
  const calories = dayData?.calories ?? 0;
  const goalCals = goals?.calories ?? 0;
  const protein = dayData?.protein ?? 0;
  const carbs = dayData?.carbs ?? 0;
  const fat = dayData?.fat ?? 0;

  // Calorie target difference & percentage
  const calDiff = goalCals > 0 ? calories - goalCals : 0;
  const calPercent = goalCals > 0 ? Math.min(100, Math.round((calories / goalCals) * 100)) : 0;

  // Restrained target status messaging without gamification or judgmental colors
  const targetStatus =
    goalCals <= 0
      ? null
      : Math.abs(calDiff) <= 100
      ? { label: "Near target", color: "text-accent" }
      : calDiff < 0
      ? { label: `${fmt.int(Math.abs(calDiff))} kcal remaining`, color: "text-fg-3" }
      : { label: `${fmt.int(calDiff)} kcal over target`, color: "text-carbs" };

  return (
    <aside
      className="card flex flex-col space-y-6 p-5"
      aria-label={`Details for ${formattedTitle}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-line pb-5">
        <div className="min-w-0">
          <span
            className={cn(
              "mb-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              isCurrentDay ? "bg-accent text-on-accent" : "bg-surface-2 text-fg-3"
            )}
          >
            {relativeLabel}
          </span>
          <h2 className="text-lg font-bold leading-tight tracking-tight text-fg">{formattedTitle}</h2>
          <p className="mt-1 text-[13px] text-fg-3">
            {hasEntries
              ? `${dayData.entryCount} ${dayData.entryCount === 1 ? "entry" : "entries"} across ${dayData.mealsLogged} ${dayData.mealsLogged === 1 ? "meal" : "meals"}`
              : isFuture
              ? "Future date"
              : "No food entries logged"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenDay(date)}
          className="btn btn-primary h-11 shrink-0 gap-1 px-4 font-bold"
          aria-label={`Open full daily log for ${formattedTitle}`}
        >
          <span>Open day</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-4 animate-pulse">
          <div className="h-16 rounded-lg bg-surface-2" />
          <div className="h-24 rounded-lg bg-surface-2" />
        </div>
      ) : hasEntries ? (
        <>
          {/* Calorie & Macro Hero */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-fg-3">Calories</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-4xl font-bold tabular tracking-[-0.035em] text-fg">
                    {fmt.int(calories)}
                  </span>
                  <span className="text-xs text-fg-3 font-normal">kcal</span>
                  {goalCals > 0 && (
                    <span className="text-xs tabular text-fg-3 ml-1">
                      / {fmt.int(goalCals)} kcal
                    </span>
                  )}
                </div>
              </div>

              {targetStatus && (
                <span className={cn("text-xs tabular font-medium", targetStatus.color)}>
                  {targetStatus.label}
                </span>
              )}
            </div>

            {/* Target Progress Bar */}
            {goalCals > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    calDiff > 100 ? "bg-amber-400" : "bg-accent"
                  )}
                  style={{ width: `${calPercent}%` }}
                />
              </div>
            )}

            {/* Macros Row */}
            <div className="grid grid-cols-3 gap-3 border-t border-line/60 pt-4 text-xs">
              <div>
                <span className="text-[11px] font-medium text-protein">Protein</span>
                <p className="font-semibold tabular text-fg mt-0.5">
                  {fmt.g(protein)}
                  {goals?.protein ? (
                    <span className="text-[11px] font-normal text-fg-3"> / {goals.protein}g</span>
                  ) : null}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-carbs">Carbs</span>
                <p className="font-semibold tabular text-fg mt-0.5">
                  {fmt.g(carbs)}
                  {goals?.carbs ? (
                    <span className="text-[11px] font-normal text-fg-3"> / {goals.carbs}g</span>
                  ) : null}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-fat">Fat</span>
                <p className="font-semibold tabular text-fg mt-0.5">
                  {fmt.g(fat)}
                  {goals?.fat ? (
                    <span className="text-[11px] font-normal text-fg-3"> / {goals.fat}g</span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>

          {/* Meal Breakdown List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-3">
              Meal Breakdown
            </h3>
            <div className="divide-y divide-line/60 rounded-2xl bg-surface-2/50">
              {MEAL_CATEGORIES.map(({ key, label }) => {
                const mealCals = dayData.mealCalories?.[key] ?? 0;
                const pct = calories > 0 && mealCals > 0 ? Math.round((mealCals / calories) * 100) : 0;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span className={cn("font-medium", mealCals > 0 ? "text-fg" : "text-fg-3")}>
                      {label}
                    </span>
                    <div className="flex items-center gap-2 tabular">
                      {mealCals > 0 ? (
                        <>
                          <span className="font-semibold text-fg">
                            {fmt.int(mealCals)} <span className="text-[10px] font-normal text-fg-3">kcal</span>
                          </span>
                          <span className="text-[10px] text-fg-3 w-8 text-right">
                            {pct}%
                          </span>
                        </>
                      ) : (
                        <span className="text-fg-3">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Context Badges (Water & Weight) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {dayData.waterMl > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-fg-2">
                <Droplets className="h-3.5 w-3.5 text-protein" />
                <span className="tabular font-medium">{dayData.waterMl} ml</span>
                {goals?.waterMl ? (
                  <span className="text-fg-3 text-[10px]">/ {goals.waterMl} ml</span>
                ) : null}
              </div>
            )}
            {weightBadge}
          </div>
        </>
      ) : (
        /* Empty Day State */
        <div className="rounded-xl border border-dashed border-line bg-surface-1/50 p-6 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-fg-3">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-fg">No meals logged</p>
            <p className="mt-0.5 text-xs text-fg-3">
              {isFuture ? "This date is in the future." : "No food entries were logged on this day."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenDay(date)}
            className="btn btn-secondary btn-sm"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Open day log</span>
          </button>
          {weightBadge && <div className="flex justify-center">{weightBadge}</div>}
        </div>
      )}
    </aside>
  );
}
