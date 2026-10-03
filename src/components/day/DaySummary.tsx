"use client";

import React from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import type { DayData } from "@/lib/domain";
import { percentOf } from "@/lib/nutrition/core";
import { Bar, fmt } from "@/components/ui/primitives";
import { addWater, undoWater } from "@/lib/client/day-store";
import { cn } from "@/lib/utils";

/** 0 → "0", 250 → "0.25", 2500 → "2.5" */
const liters = (ml: number) => String(Number((ml / 1000).toFixed(2)));

function Row({ label, value, target, unit, color }: { label: string; value: number; target: number | null; unit: string; color: string }) {
  const over = target !== null && value > target;
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-2 text-fg-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          {label}
        </span>
        <span className="tabular">
          <span className="font-medium text-fg">{unit === "kcal" ? fmt.int(value) : fmt.g(value)}</span>
          {target !== null && <span className="text-fg-3"> / {unit === "kcal" ? fmt.int(target) : fmt.g(target)} {unit}</span>}
          {target === null && <span className="text-fg-3"> {unit}</span>}
        </span>
      </div>
      {target !== null && (
        <div className="mt-1.5">
          <Bar value={percentOf(value, target)} color={color} over={over} />
        </div>
      )}
    </div>
  );
}

export function DaySummary({ day }: { day: DayData }) {
  const { totals, goals, water, weight } = day;
  const remaining = goals.calories - totals.calories;
  const over = remaining < 0;
  const kg = weight.unit === "lbs" ? (v: number | null) => (v === null ? null : v * 2.20462) : (v: number | null) => v;
  const latest = kg(weight.avg7Kg ?? weight.latestKg);
  const change = kg(weight.change7Kg);

  return (
    <section className="card" aria-label="Today's summary">
      <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-[1.4fr_1fr] md:divide-x md:divide-y-0">
        {/* Calories + macros */}
        <div className="px-4 py-3 md:px-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-fg-3">Calories</div>
              <div className="mt-0.5 flex items-baseline gap-1.5 tabular">
                <span className="text-2xl font-semibold text-fg">{fmt.int(totals.calories)}</span>
                <span className="text-sm text-fg-3">/ {fmt.int(goals.calories)} kcal</span>
              </div>
            </div>
            <div className={cn("text-right text-sm tabular", over ? "text-negative" : "text-fg-2")}>
              <span className="font-medium">{fmt.int(Math.abs(remaining))}</span> {over ? "over" : "remaining"}
            </div>
          </div>
          <div className="mt-2">
            <Bar value={percentOf(totals.calories, goals.calories)} color="var(--fg)" over={over} />
          </div>
          <div className="mt-1 divide-y divide-line">
            <Row label="Protein" value={totals.protein} target={goals.protein} unit="g" color="var(--protein)" />
            <Row label="Carbs" value={totals.carbs} target={goals.carbs} unit="g" color="var(--carbs)" />
            <Row label="Fat" value={totals.fat} target={goals.fat} unit="g" color="var(--fat)" />
            {(goals.fiber !== null || totals.fiber > 0) && <Row label="Fiber" value={totals.fiber} target={goals.fiber} unit="g" color="var(--fiber)" />}
            {goals.sodium !== null && <Row label="Sodium" value={totals.sodium ?? 0} target={goals.sodium} unit="mg" color="var(--fg-3)" />}
          </div>
        </div>

        {/* Water + weight */}
        <div className="flex flex-col divide-y divide-line">
          <div className="flex-1 px-4 py-3 md:px-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-fg-3">Water</div>
                <div className="mt-0.5 tabular">
                  <span className="text-lg font-semibold text-fg">{liters(water.totalMl)}</span>
                  <span className="text-sm text-fg-3"> / {liters(water.goalMl)} L</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => undoWater(day.date)} className="btn btn-secondary btn-icon btn-sm" aria-label="Remove last glass" disabled={water.totalMl === 0}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => addWater(day.date, 250)} className="btn btn-secondary btn-sm tabular" aria-label="Add 250 millilitres">
                  <Plus className="h-3.5 w-3.5" /> 250
                </button>
                <button type="button" onClick={() => addWater(day.date, 500)} className="btn btn-secondary btn-sm tabular" aria-label="Add 500 millilitres">
                  <Plus className="h-3.5 w-3.5" /> 500
                </button>
              </div>
            </div>
            <div className="mt-2">
              <Bar value={percentOf(water.totalMl, water.goalMl)} color="var(--water)" />
            </div>
          </div>
          <Link href="/weight" className="flex-1 px-4 py-3 transition-colors hover:bg-surface-2 md:px-5">
            <div className="text-xs font-medium uppercase tracking-wide text-fg-3">Weight</div>
            {latest === null ? (
              <div className="mt-0.5 text-sm text-fg-2">No weigh-ins yet · tap to log</div>
            ) : (
              <div className="mt-0.5 flex items-baseline justify-between gap-2 tabular">
                <span>
                  <span className="text-lg font-semibold text-fg">{latest.toFixed(1)}</span>
                  <span className="text-sm text-fg-3"> {weight.unit}</span>
                  {weight.avg7Kg !== null && <span className="ml-1.5 text-xs text-fg-3">7-day avg</span>}
                </span>
                {change !== null && (
                  <span className={cn("text-sm", change < -0.05 ? "text-fg-2" : change > 0.05 ? "text-fg-2" : "text-fg-3")}>
                    {fmt.signed(change)} {weight.unit} / wk
                  </span>
                )}
              </div>
            )}
          </Link>
        </div>
      </div>
    </section>
  );
}
