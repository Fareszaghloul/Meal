"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Scale,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  Target,
  Sparkles,
  Calendar,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  ProcessedWeightPoint,
  WeightAnalyticsSummary,
  RawWeightEntry,
} from "@/lib/nutrition/weight-analytics";
import { WeightTrendChart } from "@/components/weight/WeightTrendChart";
import { LogWeightModal } from "@/components/weight/LogWeightModal";
import { cn } from "@/lib/utils";

export default function WeightTrackingPage() {
  const [entries, setEntries] = useState<ProcessedWeightPoint[]>([]);
  const [analytics, setAnalytics] = useState<WeightAnalyticsSummary | null>(null);
  const [measurementSystem, setMeasurementSystem] = useState("metric");
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RawWeightEntry | null>(null);

  // Adaptive recommendation state
  const [isApplyingAdaptive, setIsApplyingAdaptive] = useState(false);
  const [adaptiveDismissed, setAdaptiveDismissed] = useState(false);
  const [adaptiveSuccessMsg, setAdaptiveSuccessMsg] = useState<string | null>(null);

  const fetchWeightData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/weight");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setAnalytics(data.analytics || null);
        setMeasurementSystem(data.measurementSystem || "metric");
      }
    } catch (err) {
      console.error("Failed to load weight logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeightData();
  }, []);

  const isImperial = measurementSystem === "imperial";
  const unitLabel = isImperial ? "lbs" : "kg";

  const toDisplay = (kg: number | null | undefined) => {
    if (kg === null || kg === undefined) return null;
    return isImperial
      ? Math.round(kg * 2.20462 * 10) / 10
      : Math.round(kg * 10) / 10;
  };

  const handleOpenAddModal = () => {
    setSelectedEntry(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (point: ProcessedWeightPoint) => {
    setSelectedEntry({
      id: point.id,
      date: point.date,
      weightKg: point.weightKg,
      notes: point.notes,
    });
    setIsModalOpen(true);
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/weight?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchWeightData();
      }
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  const handleAcceptAdaptiveSuggestion = async (newCalories: number) => {
    setIsApplyingAdaptive(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyCalories: newCalories,
        }),
      });

      if (res.ok) {
        setAdaptiveSuccessMsg(
          `Daily calorie target successfully updated to ${newCalories} kcal!`
        );
        setAdaptiveDismissed(true);
        fetchWeightData();
        setTimeout(() => setAdaptiveSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error("Failed to apply adaptive target:", err);
    } finally {
      setIsApplyingAdaptive(false);
    }
  };

  // KPI calculations
  const current7dAvg = toDisplay(analytics?.latest7dAvgKg);
  const latestWeight = toDisplay(analytics?.currentWeightKg);
  const weeklyChange = toDisplay(analytics?.weeklyChangeKg);
  const totalChange = toDisplay(analytics?.totalChangeKg);
  const goalWeight = toDisplay(analytics?.goalWeightKg);
  const remainingGoal = toDisplay(analytics?.remainingToGoalKg);
  const estWeeks = analytics?.estimatedWeeksToGoal;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-[var(--accent)]" />
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Weight tracking &amp; trend
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Monitor your 7-day rolling weight average, track progress toward your goal, and receive adaptive calorie adjustments
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/settings"
            className="px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-medium text-xs hover:bg-[var(--background)] transition"
          >
            Body &amp; goals settings
          </Link>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Log weight</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {adaptiveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-[var(--ui-success-bg)] border border-[var(--ui-success-border)] text-[var(--ui-success)] text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{adaptiveSuccessMsg}</span>
        </div>
      )}

      {/* 1. Adaptive Recalculation Suggestion Banner (Section 38d) */}
      {analytics?.adaptiveSuggestion?.hasSuggestion && !adaptiveDismissed && (
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--macro-carbs)] shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--macro-carbs-bg)] text-[var(--macro-carbs)] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Adaptive calorie recalculation suggested
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {analytics.adaptiveSuggestion.reason}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAdaptiveDismissed(true)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
            >
              Dismiss
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-6 text-xs font-tabular">
              <div>
                <span className="text-xs text-[var(--text-secondary)] block font-medium">
                  Current target
                </span>
                <span className="text-base font-semibold text-[var(--text-primary)]">
                  {analytics.adaptiveSuggestion.currentCalorieTarget} kcal
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] opacity-50 shrink-0" />
              <div>
                <span className="text-xs text-[var(--macro-carbs)] block font-medium">
                  Suggested target
                </span>
                <span className="text-base font-semibold text-[var(--accent)]">
                  {analytics.adaptiveSuggestion.suggestedCalorieTarget} kcal
                </span>
                <span className="ml-1.5 text-xs text-[var(--text-secondary)] font-normal">
                  ({analytics.adaptiveSuggestion.differenceKcal > 0 ? "+" : ""}
                  {analytics.adaptiveSuggestion.differenceKcal} kcal/day)
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setAdaptiveDismissed(true)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
              >
                Keep current
              </button>
              <button
                type="button"
                disabled={isApplyingAdaptive}
                onClick={() =>
                  handleAcceptAdaptiveSuggestion(
                    analytics.adaptiveSuggestion!.suggestedCalorieTarget
                  )
                }
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium shadow-xs transition"
              >
                {isApplyingAdaptive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Accept suggested target</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-[var(--text-secondary)]">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Suggestions are based on your actual 7-day average rate of change compared to predicted energy balance. Targets are never changed automatically.
            </span>
          </div>
        </div>
      )}

      {/* 2. Key Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 7-Day Rolling Avg */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-1">
          <span className="text-xs font-medium text-[var(--text-secondary)] block">
            7-day rolling avg
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] font-tabular">
              {current7dAvg !== null ? current7dAvg : "--"}
            </span>
            <span className="text-xs font-normal text-[var(--text-secondary)]">
              {unitLabel}
            </span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] block font-tabular">
            Latest raw: {latestWeight !== null ? `${latestWeight} ${unitLabel}` : "--"}
          </span>
        </div>

        {/* Change this week */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-1">
          <span className="text-xs font-medium text-[var(--text-secondary)] block">
            Weekly trend
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span
              className={cn(
                "text-3xl font-semibold tracking-tight font-tabular",
                weeklyChange !== null && weeklyChange < 0
                  ? "text-[var(--status-on-track)]"
                  : weeklyChange !== null && weeklyChange > 0
                  ? "text-[var(--status-over-target)]"
                  : "text-[var(--text-primary)]"
              )}
            >
              {weeklyChange !== null
                ? weeklyChange > 0
                  ? `+${weeklyChange}`
                  : `${weeklyChange}`
                : "--"}
            </span>
            <span className="text-xs font-normal text-[var(--text-secondary)]">
              {unitLabel}/wk
            </span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] block">
            vs. previous 7-day average
          </span>
        </div>

        {/* Total Progress */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-1">
          <span className="text-xs font-medium text-[var(--text-secondary)] block">
            Total change
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span
              className={cn(
                "text-3xl font-semibold tracking-tight font-tabular",
                totalChange !== null && totalChange < 0
                  ? "text-[var(--status-on-track)]"
                  : totalChange !== null && totalChange > 0
                  ? "text-[var(--status-over-target)]"
                  : "text-[var(--text-primary)]"
              )}
            >
              {totalChange !== null
                ? totalChange > 0
                  ? `+${totalChange}`
                  : `${totalChange}`
                : "--"}
            </span>
            <span className="text-xs font-normal text-[var(--text-secondary)]">
              {unitLabel}
            </span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] block font-tabular">
            from start ({toDisplay(analytics?.startWeightKg) || "--"} {unitLabel})
          </span>
        </div>

        {/* Goal Weight & ETA */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-1">
          <span className="text-xs font-medium text-[var(--text-secondary)] block">
            Goal progress
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] font-tabular">
              {goalWeight !== null ? goalWeight : "--"}
            </span>
            <span className="text-xs font-normal text-[var(--text-secondary)]">
              {unitLabel}
            </span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] block font-tabular">
            {remainingGoal !== null && estWeeks !== null
              ? `${remainingGoal} ${unitLabel} to go (~${estWeeks} wks)`
              : goalWeight
              ? `${remainingGoal || 0} ${unitLabel} to target`
              : "No goal weight set"}
          </span>
        </div>
      </div>

      {/* 3. Weight Trend Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            Weight trend &amp; moving average
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            Smoothes daily water weight fluctuations
          </span>
        </div>

        <WeightTrendChart
          entries={entries}
          goalWeightKg={analytics?.goalWeightKg}
          measurementSystem={measurementSystem}
        />
      </div>

      {/* 4. Weight Log History Table (Section 38c) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
              Weight log history
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {entries.length} logged entries
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--background)] transition"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Add entry</span>
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-3">
            <Scale className="w-8 h-8 text-[var(--text-secondary)] opacity-40 mx-auto" />
            <h3 className="font-medium text-sm text-[var(--text-primary)]">
              No weight entries logged yet
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              Weigh yourself under consistent conditions (e.g. morning, fasted) and log daily or weekly to track real fat loss and muscle gain trends.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Log your first entry</span>
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--text-secondary)] font-medium text-xs">
                  <tr>
                    <th className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap">Date</th>
                    <th className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap">Raw weight</th>
                    <th className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap">7-day rolling avg</th>
                    <th className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap">Notes</th>
                    <th className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {[...entries].reverse().map((point, idx) => {
                    const rawDisp = toDisplay(point.weightKg);
                    const avgDisp = toDisplay(point.rollingAvg7d);

                    return (
                      <tr
                        key={point.id || point.date}
                        className="hover:bg-[var(--background)]/50 transition group"
                      >
                        <td className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 font-normal text-[var(--text-primary)] font-tabular whitespace-nowrap">
                          {point.date}
                        </td>
                        <td className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 font-semibold text-[var(--text-primary)] text-sm font-tabular whitespace-nowrap">
                          {rawDisp} {unitLabel}
                        </td>
                        <td className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap">
                          <span className="font-semibold text-[var(--accent)] font-tabular">
                            {avgDisp} {unitLabel}
                          </span>
                        </td>
                        <td className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 text-[var(--text-secondary)] max-w-xs truncate">
                          {point.notes || "--"}
                        </td>
                        <td className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(point)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition touch-manipulation"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(point.id)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Log/Edit Modal */}
      <LogWeightModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchWeightData}
        initialEntry={selectedEntry}
        measurementSystem={measurementSystem}
      />
    </div>
  );
}
