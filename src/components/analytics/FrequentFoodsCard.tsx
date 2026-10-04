"use client";

import React from "react";
import { fmt } from "@/components/ui/primitives";
import type { FrequentFoodItem } from "@/lib/nutrition/analytics";

interface FrequentFoodsCardProps {
  foods: FrequentFoodItem[];
}

export function FrequentFoodsCard({ foods }: FrequentFoodsCardProps) {
  return (
    <section className="card overflow-hidden" aria-labelledby="frequent-foods-heading">
      <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
        <h2 id="frequent-foods-heading" className="text-sm font-semibold text-fg">Frequently Logged Foods</h2>
        <span className="text-xs text-fg-3">Most logged this period</span>
      </div>

      {foods.length === 0 ? (
        <div className="p-6 text-center text-xs text-fg-3">No foods logged in this period</div>
      ) : (
        <ol className="divide-y divide-line" role="list">
          {foods.map((f, i) => (
            <li
              key={f.key}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-surface-2/40 transition-colors"
              aria-label={`${f.name}, logged ${f.count} times`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="w-4 shrink-0 text-center font-medium tabular text-fg-3">{i + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate font-medium text-fg">{f.name}</span>
                    {f.brand && !f.name.toLowerCase().includes(f.brand.toLowerCase()) && (
                      <span className="shrink-0 text-[11px] text-fg-3">({f.brand})</span>
                    )}
                    {f.isRecipe && (
                      <span className="shrink-0 rounded-xs bg-surface-2 px-1 py-0.5 text-[10px] font-medium text-fg-2">
                        Recipe
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] tabular text-fg-3">
                    {f.totalProtein > 0 && <span>{fmt.g(f.totalProtein)}g protein total · </span>}
                    <span>{fmt.int(f.totalCalories)} kcal total</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="rounded-md border border-line bg-surface-2/60 px-2 py-0.5 font-medium tabular text-fg">
                  {f.count} {f.count === 1 ? "log" : "logs"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
