"use client";

import React from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import type { DayData } from "@/lib/domain";
import { percentOf } from "@/lib/nutrition/core";
import { fmt } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface MacroRowProps {
  label: string;
  consumed: number;
  goal: number | null;
  colorVar: string;
}

function MacroRow({ label, consumed, goal, colorVar }: MacroRowProps) {
  const hasGoal = goal !== null && goal > 0;
  const pct = hasGoal ? percentOf(consumed, goal) : 0;
  const isOver = hasGoal && consumed > goal;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorVar }} aria-hidden="true" />
          {label}
        </span>
        <span className="tabular text-[15px]">
          <span className={cn("font-bold", isOver && "text-warning")}>{fmt.g(consumed)}</span>
          <span className="text-fg-3">{hasGoal ? ` / ${fmt.g(goal)} g` : " g · no goal"}</span>
        </span>
      </div>
      <div className="bar" style={{ height: 10 }} role="progressbar" aria-label={`${label} progress`} aria-valuenow={Math.round(consumed)} aria-valuemin={0} aria-valuemax={goal ?? 100}>
        <span style={{ width: `${Math.min(100, pct)}%`, backgroundColor: isOver ? "var(--warning)" : colorVar }} />
      </div>
    </div>
  );
}

/** The calorie hero: eaten / left, a thick progress bar, macro rows and the "what should I eat" shortcut. */
export function DaySummary({ day, onWhatToEat }: { day: DayData; onWhatToEat?: () => void }) {
  const { totals, goals } = day;
  const hasCalorieGoal = goals.calories > 0;
  const remaining = hasCalorieGoal ? goals.calories - totals.calories : 0;
  const isOver = hasCalorieGoal && remaining < 0;
  const calPercent = hasCalorieGoal ? percentOf(totals.calories, goals.calories) : 0;
  const showFiber = goals.fiber !== null || totals.fiber > 0;

  return (
    <section className="card p-5 sm:p-6" aria-label="Daily nutrition summary">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-3">Eaten</div>
          <div className="tabular mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[52px] font-bold leading-none tracking-[-0.04em] sm:text-6xl">{fmt.int(totals.calories)}</span>
            <span className="text-[15px] font-medium text-fg-2">kcal</span>
          </div>
        </div>
        {hasCalorieGoal && (
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-3">{isOver ? "Over" : "Left"}</div>
            <div className={cn("tabular mt-0.5 text-[28px] font-bold leading-tight tracking-tight", isOver ? "text-warning" : "text-accent")}>{fmt.int(Math.abs(remaining))}</div>
          </div>
        )}
      </div>

      {hasCalorieGoal ? (
        <>
          <div className="bar mt-[18px]" style={{ height: 12 }} role="progressbar" aria-label="Calorie progress" aria-valuenow={Math.round(totals.calories)} aria-valuemin={0} aria-valuemax={goals.calories}>
            <span style={{ width: `${Math.min(100, calPercent)}%`, backgroundColor: isOver ? "var(--warning)" : "var(--accent)" }} />
          </div>
          <div className="tabular mt-2 flex justify-between text-[13px] text-fg-3">
            <span>0</span>
            <span>Goal {fmt.int(goals.calories)}</span>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[13px] text-fg-3">No calorie target set.</p>
      )}

      <div className="mt-5 space-y-4">
        <MacroRow label="Protein" consumed={totals.protein} goal={goals.protein} colorVar="var(--protein)" />
        <MacroRow label="Carbs" consumed={totals.carbs} goal={goals.carbs} colorVar="var(--carbs)" />
        <MacroRow label="Fat" consumed={totals.fat} goal={goals.fat} colorVar="var(--fat)" />
        {showFiber && (
          <div className="tabular flex items-center justify-between border-t border-line pt-3.5 text-sm text-fg-2">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--fiber)]" aria-hidden="true" />
              Fiber
            </span>
            <span>
              <span className="font-semibold text-fg">{fmt.g(totals.fiber)}</span>
              <span className="text-fg-3">{goals.fiber !== null ? ` / ${fmt.g(goals.fiber)} g` : " g"}</span>
            </span>
          </div>
        )}
      </div>

      {onWhatToEat && (
        <button type="button" onClick={onWhatToEat} className="mt-4 flex min-h-[56px] w-full items-center gap-3 rounded-2xl bg-surface-2 py-0 pl-3.5 pr-4 text-left transition-colors hover:bg-surface-3">
          <Sparkles className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">What should I eat?</span>
            <span className="tabular block text-[13px] text-fg-3">{hasCalorieGoal && !isOver ? `Ideas for your ${fmt.int(remaining)} kcal left` : "Ideas that fit your remaining macros"}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-fg-3" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
