"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Scale,
  Plus,
  Target,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { WeightAnalyticsSummary } from "@/lib/nutrition/weight-analytics";
import { LogWeightModal } from "@/components/weight/LogWeightModal";
import { cn } from "@/lib/utils";

interface WeightTrendWidgetProps {
  analytics: WeightAnalyticsSummary | null;
  measurementSystem?: string;
  onWeightUpdated?: () => void;
  className?: string;
}

export function WeightTrendWidget({
  analytics,
  measurementSystem = "metric",
  onWeightUpdated,
  className,
}: WeightTrendWidgetProps) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const isImperial = measurementSystem === "imperial";
  const unitLabel = isImperial ? "lbs" : "kg";

  const toDisplay = (kg: number | null | undefined) => {
    if (kg === null || kg === undefined) return null;
    return isImperial
      ? Math.round(kg * 2.20462 * 10) / 10
      : Math.round(kg * 10) / 10;
  };

  const current7dAvg = toDisplay(analytics?.latest7dAvgKg);
  const weeklyChange = toDisplay(analytics?.weeklyChangeKg);
  const goalWeight = toDisplay(analytics?.goalWeightKg);
  const weeksRemaining = analytics?.estimatedWeeksToGoal;

  const hasData = Boolean(analytics && analytics.entryCount > 0);

  return (
    <>
      <div
        className={cn(
          "p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Weight trend
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">7-day rolling average</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--background)] transition"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Log weight</span>
          </button>
        </div>

        {/* Content Body */}
        {!hasData ? (
          <div className="py-4 text-center space-y-2">
            <p className="text-xs text-[var(--text-secondary)]">
              No weight logged yet. Start tracking to see your weekly trend and goal ETA.
            </p>
            <button
              type="button"
              onClick={() => setIsLogModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log your first weight</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Primary Stat: 7-day average & weekly rate */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <span className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] font-tabular">
                  {current7dAvg}{" "}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">
                    {unitLabel}
                  </span>
                </span>
                <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                  (7-day avg)
                </span>
              </div>

              {weeklyChange !== null && (
                <div
                  className={cn(
                    "flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium font-tabular self-start sm:self-auto",
                    weeklyChange < 0
                      ? "bg-[var(--accent-subtle)] text-[var(--status-on-track)]"
                      : weeklyChange > 0
                      ? "bg-[var(--macro-carbs-bg)] text-[var(--macro-carbs)]"
                      : "bg-[var(--background)] text-[var(--text-secondary)]"
                  )}
                >
                  {weeklyChange < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5 text-[var(--status-on-track)]" />
                  ) : weeklyChange > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-[var(--macro-carbs)]" />
                  ) : (
                    <Minus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  )}
                  <span>
                    {weeklyChange > 0 ? `+${weeklyChange}` : weeklyChange}{" "}
                    {unitLabel} this week
                  </span>
                </div>
              )}
            </div>

            {/* Goal Progress Banner */}
            {goalWeight ? (
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-[var(--accent)]" />
                  <span className="font-medium text-[var(--text-primary)] font-tabular">
                    Goal: {goalWeight} {unitLabel}
                  </span>
                </div>
                {weeksRemaining !== null ? (
                  <span className="text-xs text-[var(--text-secondary)] font-tabular">
                    ~{weeksRemaining} {weeksRemaining === 1 ? "week" : "weeks"} at current rate
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-secondary)]">
                    Maintain pace
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-[var(--text-secondary)]">
                Set a target weight in{" "}
                <Link href="/settings" className="text-[var(--accent)] underline">
                  Settings &gt; Body &amp; Goals
                </Link>
                .
              </div>
            )}

            {/* Adaptive suggestion teaser if triggered */}
            {analytics?.adaptiveSuggestion?.hasSuggestion && (
              <div className="p-2.5 rounded-xl bg-[var(--macro-carbs-bg)] border border-[var(--macro-carbs-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                <div className="flex items-center space-x-1.5 text-[var(--macro-carbs)]">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium text-xs line-clamp-1">
                    Calorie target adjustment suggested
                  </span>
                </div>
                <Link
                  href="/weight"
                  className="font-semibold text-[var(--macro-carbs)] hover:underline shrink-0 text-xs ml-2"
                >
                  Review &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Footer Link */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">
            {analytics?.entryCount || 0} entries logged
          </span>
          <Link
            href="/weight"
            className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center"
          >
            <span>View weight log</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>
      </div>

      <LogWeightModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSuccess={() => onWeightUpdated?.()}
        measurementSystem={measurementSystem}
      />
    </>
  );
}
