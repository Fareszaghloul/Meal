"use client";

import React from "react";
import Link from "next/link";
import { Minus, Plus, Scale, Droplet, ArrowUpRight, RotateCcw } from "lucide-react";
import type { DayData } from "@/lib/domain";
import { percentOf } from "@/lib/nutrition/core";
import { fmt } from "@/components/ui/primitives";
import { addWater, undoWater, resetWater } from "@/lib/client/day-store";
import { cn } from "@/lib/utils";
import { formatDate, todayLocal } from "@/lib/dates";
import { fromKg } from "@/lib/weight-units";

const liters = (ml: number) => String(Number((ml / 1000).toFixed(2)));

interface MacroCardProps {
  label: string;
  consumed: number;
  goal: number | null;
  colorVar: string;
  isPriority?: boolean;
}

function MacroProgress({ label, consumed, goal, colorVar, isPriority }: MacroCardProps) {
  const hasGoal = goal !== null && goal > 0;
  const pct = hasGoal ? percentOf(consumed, goal) : 0;
  const remaining = hasGoal ? goal - consumed : null;
  const isOver = remaining !== null && remaining < 0;

  return (
    <div className={cn("flex flex-col justify-between rounded-lg bg-surface-2/50 p-3 transition-colors", isPriority && "bg-surface-2/80 ring-1 ring-line")}>
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-medium", isPriority ? "text-fg" : "text-fg-2")}>
          {label}
        </span>
        <span className="tabular text-fg-3">
          {remaining !== null ? (
            isOver ? (
              <span className="text-warning font-medium">{fmt.g(Math.abs(remaining))}g over target</span>
            ) : (
              <span>{fmt.g(remaining)}g left</span>
            )
          ) : (
            <span>No goal</span>
          )}
        </span>
      </div>

      <div className="my-2 flex items-baseline justify-between gap-1 tabular">
        <span className="text-base font-semibold text-fg">
          {fmt.g(consumed)}
          <span className="ml-0.5 text-xs font-normal text-fg-3">g</span>
        </span>
        {hasGoal && (
          <span className="text-xs text-fg-3">
            / {fmt.g(goal)}g
          </span>
        )}
      </div>

      {/* Progress track */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-label={`${label} progress`} aria-valuenow={Math.round(consumed)} aria-valuemin={0} aria-valuemax={goal ?? 100}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            backgroundColor: isOver ? "var(--warning)" : colorVar,
          }}
        />
      </div>
    </div>
  );
}

export function DaySummary({ day }: { day: DayData }) {
  const { totals, goals, water, weight } = day;
  const hasCalorieGoal = goals.calories > 0;
  const remainingCalories = hasCalorieGoal ? goals.calories - totals.calories : 0;
  const isOverCalories = hasCalorieGoal && remainingCalories < 0;
  const calPercent = hasCalorieGoal ? percentOf(totals.calories, goals.calories) : 0;

  // Weight is per day: this date's latest daily reading. Only on actual Today may an older reading
  // stand in, and then it carries its own date so it never reads as today's measurement.
  const conv = (v: number | null) => (v === null ? null : fromKg(v, weight.unit));
  const loggedThisDay = weight.latestKg !== null && weight.latestDate === day.date;
  const staleLatest = !loggedThisDay && weight.latestKg !== null && day.date === todayLocal();
  const latestWeight = conv(weight.latestKg);
  const avgWeight = conv(weight.avg7Kg);
  const changeWeight = conv(weight.change7Kg);

  return (
    <section className="card overflow-hidden" aria-label="Daily nutrition summary">
      {/* ─── Top Main Nutrition Area ─── */}
      <div className="p-4 md:p-6">
        {/* Calories Headline */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">
              Calories Consumed
            </div>
            <div className="mt-1 flex items-baseline gap-2 tabular">
              <span className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
                {fmt.int(totals.calories)}
              </span>
              {hasCalorieGoal ? (
                <span className="text-sm text-fg-3">
                  of <span className="font-medium text-fg-2">{fmt.int(goals.calories)}</span> kcal
                </span>
              ) : (
                <span className="text-sm text-fg-3">kcal (no target set)</span>
              )}
            </div>
          </div>

          {/* Remaining / Over Indicator */}
          {hasCalorieGoal && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm tabular font-medium",
                  isOverCalories
                    ? "bg-warning/10 text-warning"
                    : "bg-surface-2 text-fg"
                )}
              >
                <span className="text-base font-semibold">
                  {fmt.int(Math.abs(remainingCalories))}
                </span>
                <span className="text-xs text-fg-2">
                  {isOverCalories ? "kcal over target" : "kcal remaining"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Calorie Progress Bar */}
        {hasCalorieGoal && (
          <div className="mt-3.5" role="progressbar" aria-label="Calorie progress" aria-valuenow={Math.round(totals.calories)} aria-valuemin={0} aria-valuemax={goals.calories}>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, calPercent))}%`,
                  backgroundColor: isOverCalories ? "var(--warning)" : "var(--accent)",
                }}
              />
            </div>
          </div>
        )}

        {/* Macros Breakdown */}
        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <MacroProgress
            label="Protein"
            consumed={totals.protein}
            goal={goals.protein}
            colorVar="var(--protein)"
            isPriority
          />
          <MacroProgress
            label="Carbs"
            consumed={totals.carbs}
            goal={goals.carbs}
            colorVar="var(--carbs)"
          />
          <MacroProgress
            label="Fat"
            consumed={totals.fat}
            goal={goals.fat}
            colorVar="var(--fat)"
          />
        </div>

        {/* Optional Fiber Pill */}
        {(goals.fiber !== null || totals.fiber > 0) && (
          <div className="mt-3 flex items-center justify-between rounded-md bg-surface-2/40 px-3 py-1.5 text-xs text-fg-2">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fiber)]" aria-hidden="true" />
              Fiber
            </span>
            <span className="tabular text-fg">
              <span className="font-semibold">{fmt.g(totals.fiber)}</span>
              {goals.fiber !== null && <span className="text-fg-3"> / {fmt.g(goals.fiber)} g</span>}
            </span>
          </div>
        )}

        {/* ─── Target · Consumed · Remaining Table ─── */}
        <div className="mt-4 rounded-xl border border-line bg-surface-2/20 p-3 text-xs">
          <div className="grid grid-cols-4 gap-2 font-semibold text-fg-3 text-[10px] uppercase tracking-wider pb-1.5 border-b border-line">
            <span>Nutrient</span>
            <span className="text-right">Target</span>
            <span className="text-right">Consumed</span>
            <span className="text-right">Remaining</span>
          </div>
          <div className="divide-y divide-line/60 pt-1 font-tabular">
            {[
              {
                name: "Calories",
                target: hasCalorieGoal ? `${fmt.int(goals.calories)} kcal` : "—",
                consumed: `${fmt.int(totals.calories)} kcal`,
                rem: hasCalorieGoal ? goals.calories - totals.calories : null,
                unit: "kcal",
              },
              {
                name: "Protein",
                target: goals.protein > 0 ? `${fmt.g(goals.protein)}g` : "—",
                consumed: `${fmt.g(totals.protein)}g`,
                rem: goals.protein > 0 ? goals.protein - totals.protein : null,
                unit: "g",
              },
              {
                name: "Carbs",
                target: goals.carbs > 0 ? `${fmt.g(goals.carbs)}g` : "—",
                consumed: `${fmt.g(totals.carbs)}g`,
                rem: goals.carbs > 0 ? goals.carbs - totals.carbs : null,
                unit: "g",
              },
              {
                name: "Fat",
                target: goals.fat > 0 ? `${fmt.g(goals.fat)}g` : "—",
                consumed: `${fmt.g(totals.fat)}g`,
                rem: goals.fat > 0 ? goals.fat - totals.fat : null,
                unit: "g",
              },
              ...(goals.fiber !== null || totals.fiber > 0
                ? [
                    {
                      name: "Fiber",
                      target: goals.fiber !== null ? `${fmt.g(goals.fiber)}g` : "—",
                      consumed: `${fmt.g(totals.fiber)}g`,
                      rem: goals.fiber !== null ? goals.fiber - totals.fiber : null,
                      unit: "g",
                    },
                  ]
                : []),
            ].map((row) => (
              <div key={row.name} className="grid grid-cols-4 gap-2 py-1.5 text-xs items-center">
                <span className="font-medium text-fg">{row.name}</span>
                <span className="text-right text-fg-3">{row.target}</span>
                <span className="text-right text-fg font-medium">{row.consumed}</span>
                <span className="text-right">
                  {row.rem === null ? (
                    <span className="text-fg-3">—</span>
                  ) : row.rem < 0 ? (
                    <span className="text-warning font-semibold">
                      +{fmt.g(Math.abs(row.rem))} {row.unit}
                    </span>
                  ) : (
                    <span className="text-accent font-medium">
                      {fmt.g(row.rem)} {row.unit}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Compact Hydration & Weight Bottom Strip ─── */}
      <div className="grid grid-cols-1 divide-y divide-line border-t border-line bg-surface-2/30 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {/* Hydration */}
        <div className="flex items-center justify-between px-4 py-2.5 md:px-5">
          <div className="flex items-center gap-2">
            <Droplet className="h-4 w-4 text-[var(--water)]" />
            <div>
              <span className="text-xs text-fg-3 font-medium uppercase tracking-wide">Water</span>
              <div className="tabular text-sm font-semibold text-fg">
                {liters(water.totalMl)}
                <span className="text-xs font-normal text-fg-3"> / {liters(water.goalMl)} L</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => undoWater(day.date)}
              className="btn btn-ghost btn-icon btn-sm h-7 w-7 text-fg-3 hover:text-fg"
              aria-label="Remove 250ml water"
              disabled={water.totalMl === 0}
              title="Remove water (-250ml)"
            >
              <Minus className="h-3 w-3" />
            </button>
            {water.totalMl > 0 && (
              <button
                type="button"
                onClick={() => resetWater(day.date)}
                className="btn btn-ghost btn-icon btn-sm h-7 w-7 text-fg-3 hover:text-danger"
                aria-label="Reset water to 0"
                title="Reset water to 0"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => addWater(day.date, 250)}
              className="btn btn-secondary btn-sm h-7 px-2 text-xs font-medium tabular"
              aria-label="Add 250 ml water"
            >
              <Plus className="h-3 w-3 mr-0.5" /> 250ml
            </button>
            <button
              type="button"
              onClick={() => addWater(day.date, 500)}
              className="btn btn-secondary btn-sm h-7 px-2 text-xs font-medium tabular"
              aria-label="Add 500 ml water"
            >
              <Plus className="h-3 w-3 mr-0.5" /> 500ml
            </button>
          </div>
        </div>

        {/* Weight */}
        <Link
          href="/weight"
          className="group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-surface-2 md:px-5"
          title="Go to weight tracking"
        >
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-fg-3 group-hover:text-fg transition-colors" />
            <div>
              <span className="text-xs text-fg-3 font-medium uppercase tracking-wide">Weight</span>
              {loggedThisDay && latestWeight !== null ? (
                <div className="flex items-baseline gap-1.5 tabular text-sm font-semibold text-fg">
                  <span>{latestWeight.toFixed(1)} {weight.unit}</span>
                  {avgWeight !== null && (
                    <span className="text-xs font-normal text-fg-3">
                      · 7d avg {avgWeight.toFixed(1)}
                    </span>
                  )}
                  {changeWeight !== null && (
                    <span className="text-xs font-medium text-fg-2">
                      ({fmt.signed(changeWeight)}/wk)
                    </span>
                  )}
                </div>
              ) : staleLatest && latestWeight !== null ? (
                <div className="flex items-baseline gap-1.5 tabular text-sm font-semibold text-fg">
                  <span className="text-xs font-normal text-fg-3">Latest</span>
                  <span>{latestWeight.toFixed(1)} {weight.unit}</span>
                  <span className="text-xs font-normal text-fg-3">· {formatDate(weight.latestDate!, { month: "short", day: "numeric" })}</span>
                </div>
              ) : (
                <div className="text-xs text-fg-2">No weight logged</div>
              )}
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-fg-3 group-hover:text-fg transition-colors" />
        </Link>
      </div>
    </section>
  );
}
