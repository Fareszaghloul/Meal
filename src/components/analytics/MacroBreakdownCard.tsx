"use client";

import React from "react";
import { fmt } from "@/components/ui/primitives";
import type { NutritionAverages } from "@/lib/nutrition/analytics";
import type { NutritionGoals } from "@/lib/domain";
import { formatDate, type DateString } from "@/lib/dates";

interface MacroBreakdownCardProps {
  stats: NutritionAverages;
  goals: Partial<NutritionGoals> | null;
  /** First date with a recorded target; earlier days have no known target. */
  goalHistoryFrom?: DateString | null;
}

export function MacroBreakdownCard({ stats, goals, goalHistoryFrom }: MacroBreakdownCardProps) {
  const p = stats.avgProtein ?? 0;
  const c = stats.avgCarbs ?? 0;
  const f = stats.avgFat ?? 0;
  const fib = stats.avgFiber ?? 0;

  // Calorie contributions: protein 4 kcal/g, carbs 4 kcal/g, fat 9 kcal/g
  const pCals = p * 4;
  const cCals = c * 4;
  const fCals = f * 9;
  const totalMacroCals = pCals + cCals + fCals;

  const pPct = totalMacroCals > 0 ? Math.round((pCals / totalMacroCals) * 100) : 0;
  const cPct = totalMacroCals > 0 ? Math.round((cCals / totalMacroCals) * 100) : 0;
  const fPct = totalMacroCals > 0 ? Math.max(0, 100 - pPct - cPct) : 0;

  const pGoal = goals?.protein && goals.protein > 0 ? goals.protein : null;

  return (
    <section className="card overflow-hidden" aria-labelledby="macros-heading">
      <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
        <h2 id="macros-heading" className="text-sm font-semibold text-fg">Macronutrient Profile</h2>
        <span className="text-xs text-fg-3">Average per logged day</span>
      </div>

      {stats.daysLogged === 0 ? (
        <div className="p-6 text-center text-xs text-fg-3">No nutrition logged in this period</div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Restrained horizontal ratio bar */}
          <div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div style={{ width: `${pPct}%` }} className="bg-primary/90 transition-all" title={`Protein ${pPct}%`} />
              <div style={{ width: `${cPct}%` }} className="bg-fg-2 transition-all" title={`Carbohydrates ${cPct}%`} />
              <div style={{ width: `${fPct}%` }} className="bg-fg-3 transition-all" title={`Fat ${fPct}%`} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-fg-3">
              <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                <span className="inline-block h-2 w-2 rounded-xs bg-primary" />
                Protein {pPct}%
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-fg-2">
                <span className="inline-block h-2 w-2 rounded-xs bg-fg-2" />
                Carbs {cPct}%
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-fg-3">
                <span className="inline-block h-2 w-2 rounded-xs bg-fg-3" />
                Fat {fPct}%
              </span>
            </div>
          </div>

          {/* Detailed macro cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-line bg-surface-2/40 p-3">
              <div className="text-xs text-fg-3">Protein</div>
              <div className="mt-0.5 text-base font-semibold tabular text-fg">
                {stats.avgProtein !== null ? `${fmt.g(stats.avgProtein)} g` : "—"}
              </div>
              <div className="mt-1 text-xs tabular text-fg-3">
                {pGoal !== null ? (
                  <>
                    Target {fmt.g(pGoal)} g
                    {stats.daysMeetingProtein !== null && (
                      <span className="block text-fg-2 font-medium">
                        {stats.daysMeetingProtein} / {stats.daysWithProteinGoal} days met target
                      </span>
                    )}
                  </>
                ) : (
                  "No target configured"
                )}
              </div>
            </div>

            <div className="rounded-md border border-line bg-surface-2/40 p-3">
              <div className="text-xs text-fg-3">Carbohydrates</div>
              <div className="mt-0.5 text-base font-semibold tabular text-fg">
                {stats.avgCarbs !== null ? `${fmt.g(stats.avgCarbs)} g` : "—"}
              </div>
              <div className="mt-1 text-xs text-fg-3">
                {goals?.carbs ? `Target ${fmt.g(goals.carbs)} g` : `${cPct}% of calories`}
              </div>
            </div>

            <div className="rounded-md border border-line bg-surface-2/40 p-3">
              <div className="text-xs text-fg-3">Fat</div>
              <div className="mt-0.5 text-base font-semibold tabular text-fg">
                {stats.avgFat !== null ? `${fmt.g(stats.avgFat)} g` : "—"}
              </div>
              <div className="mt-1 text-xs text-fg-3">
                {goals?.fat ? `Target ${fmt.g(goals.fat)} g` : `${fPct}% of calories`}
              </div>
            </div>

            <div className="rounded-md border border-line bg-surface-2/40 p-3">
              <div className="text-xs text-fg-3">Fiber</div>
              <div className="mt-0.5 text-base font-semibold tabular text-fg">
                {stats.avgFiber !== null ? `${fmt.g(stats.avgFiber)} g` : "—"}
              </div>
              <div className="mt-1 text-xs text-fg-3">
                {goals?.fiber ? `Target ${fmt.g(goals.fiber)} g` : "Dietary fiber"}
              </div>
            </div>
          </div>

          {/* Adherence uses the target in effect on each day; days before goal history began are excluded. */}
          {pGoal !== null && (
            <p className="text-xs text-fg-3" data-testid="goal-history-note">
              Targets shown are current. Days met uses each day&apos;s own target
              {goalHistoryFrom ? `; targets are known from ${formatDate(goalHistoryFrom, { month: "short", day: "numeric", year: "numeric" })}` : ""}
              {stats.daysLogged > stats.daysWithProteinGoal ? `, so ${stats.daysLogged - stats.daysWithProteinGoal} earlier logged day${stats.daysLogged - stats.daysWithProteinGoal === 1 ? " is" : "s are"} not counted` : ""}.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
