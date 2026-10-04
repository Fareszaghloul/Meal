"use client";

import React from "react";
import { fmt } from "@/components/ui/primitives";
import type { MealDistributionItem } from "@/lib/nutrition/analytics";

interface MealPatternsCardProps {
  distribution: MealDistributionItem[];
  daysLogged: number;
}

export function MealPatternsCard({ distribution, daysLogged }: MealPatternsCardProps) {
  const hasData = distribution.some((d) => d.totalCalories > 0);

  return (
    <section className="card overflow-hidden" aria-labelledby="meal-patterns-heading">
      <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
        <h2 id="meal-patterns-heading" className="text-sm font-semibold text-fg">Meal Distribution</h2>
        <span className="text-xs text-fg-3">Calorie contribution</span>
      </div>

      {!hasData ? (
        <div className="p-6 text-center text-xs text-fg-3">No meal data recorded in this period</div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Proportional breakdown bar */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
            {distribution.map((item) => {
              if (item.sharePct <= 0) return null;
              const bg =
                item.category === "breakfast"
                  ? "bg-amber-500/80"
                  : item.category === "lunch"
                  ? "bg-primary"
                  : item.category === "dinner"
                  ? "bg-blue-500/80"
                  : "bg-purple-500/80";

              return (
                <div
                  key={item.category}
                  style={{ width: `${item.sharePct}%` }}
                  className={`${bg} transition-all`}
                  title={`${item.label} ${item.sharePct}%`}
                />
              );
            })}
          </div>

          {/* Table of categories */}
          <div className="divide-y divide-line text-sm">
            {distribution.map((item) => {
              const dotBg =
                item.category === "breakfast"
                  ? "bg-amber-500"
                  : item.category === "lunch"
                  ? "bg-primary"
                  : item.category === "dinner"
                  ? "bg-blue-500"
                  : "bg-purple-500";

              return (
                <div key={item.category} className="flex items-center justify-between py-2 text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-xs ${dotBg}`} />
                    <span className="font-medium text-fg">{item.label}</span>
                    <span className="tabular text-fg-3">({item.sharePct}%)</span>
                  </span>
                  <div className="flex items-center gap-4 tabular">
                    <span className="text-fg-3">
                      {item.daysLogged} / {daysLogged} days
                    </span>
                    <span className="font-medium text-fg min-w-[4rem] text-right">
                      {item.avgCaloriesPerLoggedMeal !== null ? `${fmt.int(item.avgCaloriesPerLoggedMeal)} kcal/meal` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
