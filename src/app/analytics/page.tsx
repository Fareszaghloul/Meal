"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { weightUnitFor, fromKg } from "@/lib/weight-units";
import { fmt, Segmented } from "@/components/ui/primitives";
import { useAnalytics } from "@/lib/client/analytics-store";
import { CalorieTrendChart } from "@/components/analytics/CalorieTrendChart";
import { WeightAnalyticsChart } from "@/components/analytics/WeightAnalyticsChart";
import { MacroBreakdownCard } from "@/components/analytics/MacroBreakdownCard";
import { MealPatternsCard } from "@/components/analytics/MealPatternsCard";
import { FrequentFoodsCard } from "@/components/analytics/FrequentFoodsCard";
import type { PeriodId } from "@/lib/nutrition/analytics";

function SummaryCard({
  title,
  value,
  sub,
  delta,
  testId,
}: {
  title: string;
  value: React.ReactNode;
  sub?: string;
  delta?: string | null;
  testId?: string;
}) {
  return (
    <div className="card p-4 space-y-1" data-testid={testId}>
      <div className="text-xs font-medium text-fg-3">{title}</div>
      <div className="text-xl font-semibold tabular text-fg">{value}</div>
      <div className="flex flex-wrap items-baseline justify-between gap-1 pt-0.5 text-xs text-fg-3">
        {sub && <span>{sub}</span>}
        {delta && <span className="tabular text-fg-2 font-medium">{delta}</span>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodId>("30d");
  const { data, isLoading, error } = useAnalytics(period);

  const unit = weightUnitFor(data?.goals?.measurementSystem);
  const conv = (kg: number | null) => (kg === null ? null : fromKg(kg, unit));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-fg">Analytics</h1>
          <p className="text-xs text-fg-3">
            {data
              ? `${formatDate(data.current.from, { month: "short", day: "numeric" })} – ${formatDate(
                  data.current.to,
                  { month: "short", day: "numeric", year: "numeric" }
                )} (${data.totalDays} days)`
              : "Nutrition and body weight patterns"}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Segmented
            value={period}
            onChange={(v) => setPeriod(v as PeriodId)}
            ariaLabel="Analytics timeframe"
            options={[
              { value: "7d", label: "7D" },
              { value: "30d", label: "30D" },
              { value: "90d", label: "90D" },
              { value: "6m", label: "6M" },
              { value: "1y", label: "1Y" },
            ]}
            size="sm"
            className="w-full sm:w-auto"
            itemClassName="min-h-[44px] sm:min-h-[28px] py-2 sm:py-1 px-3 sm:px-2.5"
          />
        </div>
      </header>

      {/* Error state */}
      {error && (
        <div className="card border-negative/30 bg-negative/5 px-4 py-3 text-xs text-negative" role="alert">
          Unable to load analytics: {error}
        </div>
      )}

      {/* Initial Loading Skeleton */}
      {isLoading && !data && (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="skeleton h-24 rounded-lg" />
            <div className="skeleton h-24 rounded-lg" />
            <div className="skeleton h-24 rounded-lg" />
            <div className="skeleton h-24 rounded-lg" />
          </div>
          <div className="skeleton h-64 rounded-lg" />
          <div className="skeleton h-48 rounded-lg" />
        </div>
      )}

      {data && (
        <>
          {/* Global Empty State (brand new account) */}
          {data.stats.daysLogged === 0 && data.weight.latestKg === null && (
            <div className="card p-8 text-center space-y-3" data-testid="empty-analytics-banner">
              <h2 className="text-sm font-semibold text-fg">Not enough logged data yet</h2>
              <p className="text-xs text-fg-3 max-w-sm mx-auto">
                Log meals or weigh-ins to start observing descriptive nutrition and weight patterns.
              </p>
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-fg hover:opacity-90 transition-opacity"
                >
                  Go to Today
                </Link>
              </div>
            </div>
          )}

          {/* Primary Summary Metrics (Restrained 4-card grid) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              title="Average Calories"
              value={data.stats.avgCalories !== null ? `${fmt.int(data.stats.avgCalories)} kcal` : "—"}
              sub="on logged days"
              delta={
                data.deltas.avgCalories !== null
                  ? `${data.deltas.avgCalories >= 0 ? "+" : ""}${fmt.int(data.deltas.avgCalories)} vs prev`
                  : null
              }
              testId="metric-avg-calories"
            />

            <SummaryCard
              title="Average Protein"
              value={data.stats.avgProtein !== null ? `${fmt.g(data.stats.avgProtein)} g` : "—"}
              sub="on logged days"
              delta={
                data.deltas.avgProtein !== null
                  ? `${data.deltas.avgProtein >= 0 ? "+" : ""}${fmt.g(data.deltas.avgProtein)} g vs prev`
                  : null
              }
              testId="metric-avg-protein"
            />

            <SummaryCard
              title="Logging Coverage"
              value={`${data.stats.daysLogged} / ${data.totalDays}`}
              sub={`${data.stats.coveragePct}% of days`}
              delta={
                data.deltas.daysLogged !== 0
                  ? `${data.deltas.daysLogged >= 0 ? "+" : ""}${data.deltas.daysLogged} days vs prev`
                  : null
              }
              testId="metric-coverage"
            />

            <SummaryCard
              title="Weight Trend"
              value={
                data.weight.changePeriodKg !== null && conv(data.weight.changePeriodKg) !== null
                  ? `${fmt.signed(conv(data.weight.changePeriodKg)!)} ${unit}`
                  : data.weight.latestKg !== null
                  ? `${conv(data.weight.latestKg)!.toFixed(1)} ${unit}`
                  : "—"
              }
              sub={data.weight.changePeriodKg !== null ? "7-day trend change" : "latest weigh-in"}
              delta={
                data.weight.latestKg !== null && data.weight.changePeriodKg !== null
                  ? `latest ${conv(data.weight.latestKg)!.toFixed(1)} ${unit}`
                  : null
              }
              testId="metric-weight-trend"
            />
          </div>

          {/* Calorie Trend Chart */}
          <section className="card overflow-hidden" aria-labelledby="intake-heading">
            <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
              <h2 id="intake-heading" className="text-sm font-semibold text-fg">Daily Calorie Intake</h2>
              <span className="text-xs text-fg-3">
                {data.stats.daysLogged} logged of {data.totalDays} days
              </span>
            </div>
            <div className="p-4">
              <CalorieTrendChart
                daily={data.dailyIntake}
                from={data.current.from}
                to={data.current.to}
                target={data.goals.calories || null}
              />
            </div>
          </section>

          {/* Aligned Weight Trend Chart */}
          <section className="card overflow-hidden" aria-labelledby="weight-heading">
            <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h2 id="weight-heading" className="text-sm font-semibold text-fg">Body Weight Trend</h2>
                <span className="text-xs text-fg-3">Trailing 7-day average</span>
              </div>
              <Link href="/weight" className="text-xs font-normal text-fg-2 hover:text-fg hover:underline">
                Weight details →
              </Link>
            </div>
            <div className="p-4">
              <WeightAnalyticsChart
                points={data.weight.points}
                from={data.current.from}
                to={data.current.to}
                unit={unit}
                goalKg={data.goals.goalWeightKg}
              />
            </div>
          </section>

          {/* Lower Two-Column Section: Macros & Meal Patterns, Frequent Foods */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <MacroBreakdownCard stats={data.stats} goals={data.goals} />
              <MealPatternsCard distribution={data.mealDistribution} daysLogged={data.stats.daysLogged} />
            </div>

            <div>
              <FrequentFoodsCard foods={data.frequentFoods} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
