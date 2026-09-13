"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ArrowRight,
  Info,
  Activity,
  Dna,
} from "lucide-react";
import {
  ProcessedWeightPoint,
  WeightAnalyticsSummary,
  RawWeightEntry,
} from "@/lib/nutrition/weight-analytics";
import { WeightTrendChart } from "@/components/weight/WeightTrendChart";
import { LogWeightModal } from "@/components/weight/LogWeightModal";
import { cn } from "@/lib/utils";

type WeightTab = "everyday" | "inbody";

export default function WeightTrackingPage() {
  const [activeTab, setActiveTab] = useState<WeightTab>("everyday");
  const [entries, setEntries] = useState<ProcessedWeightPoint[]>([]);
  const [analytics, setAnalytics] = useState<WeightAnalyticsSummary | null>(null);
  const [measurementSystem, setMeasurementSystem] = useState("metric");
  const [userHeightCm, setUserHeightCm] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<"daily" | "inbody">("daily");
  const [selectedEntry, setSelectedEntry] = useState<RawWeightEntry | null>(null);

  // Adaptive recommendation state
  const [isApplyingAdaptive, setIsApplyingAdaptive] = useState(false);
  const [adaptiveDismissed, setAdaptiveDismissed] = useState(false);
  const [adaptiveSuccessMsg, setAdaptiveSuccessMsg] = useState<string | null>(null);

  const [everydayEntries, setEverydayEntries] = useState<ProcessedWeightPoint[]>([]);
  const [inbodyEntries, setInbodyEntries] = useState<any[]>([]);

  const fetchWeightData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/weight");
      if (res.ok) {
        const data = await res.json();
        const all: ProcessedWeightPoint[] = data.entries || [];
        const daily: ProcessedWeightPoint[] =
          data.dailyEntries ||
          all.filter((e) => e.entryType === "daily" || (!e.entryType && !e.bodyFatPct && !e.smmKg));
        const inbody =
          data.inbodyEntries ||
          all.filter((e) => e.entryType === "inbody" || (!e.entryType && (e.bodyFatPct != null || e.smmKg != null)));

        setEntries(all);
        setEverydayEntries(daily);
        setInbodyEntries(inbody);
        setAnalytics(data.analytics || null);
        setMeasurementSystem(data.measurementSystem || "metric");
        setUserHeightCm(data.userHeightCm || null);
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

  const handleOpenAddModal = (type?: "daily" | "inbody") => {
    setSelectedEntry(null);
    setModalDefaultType(type || (activeTab === "inbody" ? "inbody" : "daily"));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (point: any, forcedType?: "daily" | "inbody") => {
    const isScan = forcedType === "inbody" || point.entryType === "inbody" || (point.bodyFatPct != null || point.smmKg != null);
    const resolvedType = forcedType || (isScan ? "inbody" : "daily");
    setSelectedEntry({
      id: point.id,
      date: point.date,
      time: point.time || null,
      entryType: resolvedType,
      weightKg: point.weightKg,
      bodyFatPct: resolvedType === "inbody" ? point.bodyFatPct : null,
      smmKg: resolvedType === "inbody" ? point.smmKg : null,
      bmi: resolvedType === "inbody" ? point.bmi : null,
      notes: point.notes,
    });
    setModalDefaultType(resolvedType);
    setIsModalOpen(true);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this weight entry?")) return;
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

  // Latest and previous InBody for delta calculation
  const latestInBody = inbodyEntries.length > 0 ? inbodyEntries[inbodyEntries.length - 1] : null;
  const prevInBody = inbodyEntries.length > 1 ? inbodyEntries[inbodyEntries.length - 2] : null;

  // InBody calculations
  const inbodyBfChange = useMemo(() => {
    if (!latestInBody?.bodyFatPct || !prevInBody?.bodyFatPct) return null;
    return Math.round((latestInBody.bodyFatPct - prevInBody.bodyFatPct) * 10) / 10;
  }, [latestInBody, prevInBody]);

  const inbodySmmChange = useMemo(() => {
    if (latestInBody?.smmKg == null || prevInBody?.smmKg == null) return null;
    const diffKg = latestInBody.smmKg - prevInBody.smmKg;
    return toDisplay(diffKg);
  }, [latestInBody, prevInBody, isImperial]);

  const latestFatMass = useMemo(() => {
    if (!latestInBody?.weightKg || latestInBody?.bodyFatPct == null) return null;
    const fatKg = latestInBody.weightKg * (latestInBody.bodyFatPct / 100);
    return toDisplay(fatKg);
  }, [latestInBody, isImperial]);

  const latestLeanMass = useMemo(() => {
    if (!latestInBody?.weightKg || latestInBody?.bodyFatPct == null) return null;
    const fatKg = latestInBody.weightKg * (latestInBody.bodyFatPct / 100);
    const leanKg = latestInBody.weightKg - fatKg;
    return toDisplay(leanKg);
  }, [latestInBody, isImperial]);

  // Everyday Weigh-in KPI calculations from everyday entries
  const latestEveryday = everydayEntries.length > 0 ? everydayEntries[everydayEntries.length - 1] : null;
  const current7dAvg = toDisplay(analytics?.latest7dAvgKg ?? latestEveryday?.rollingAvg7d);
  const latestWeight = toDisplay(latestEveryday?.weightKg ?? analytics?.currentWeightKg);
  const weeklyChange = toDisplay(analytics?.weeklyChangeKg);
  const totalChange = toDisplay(analytics?.totalChangeKg);
  const goalWeight = toDisplay(analytics?.goalWeightKg);
  const remainingGoal = toDisplay(analytics?.remainingToGoalKg);
  const estWeeks = analytics?.estimatedWeeksToGoal;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-[var(--accent)]" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Weight &amp; Body Tracking
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
            Separate logs for everyday scale weigh-ins with 7-day smoothing and periodic InBody composition scans.
          </p>
        </div>

        {/* Tab Buttons & CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Segmented Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-[var(--background)] border border-[var(--border)] text-xs overflow-x-auto max-w-full scrollbar-none shrink-0 shadow-inner">
            <button
              onClick={() => setActiveTab("everyday")}
              className={cn(
                "px-3.5 py-2 rounded-xl font-medium transition flex items-center space-x-2 shrink-0 whitespace-nowrap touch-manipulation cursor-pointer",
                activeTab === "everyday"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Scale className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Everyday Weigh-ins</span>
              <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold">
                {everydayEntries.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("inbody")}
              className={cn(
                "px-3.5 py-2 rounded-xl font-medium transition flex items-center space-x-2 shrink-0 whitespace-nowrap touch-manipulation cursor-pointer",
                activeTab === "inbody"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>InBody Scans</span>
              <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold">
                {inbodyEntries.length}
              </span>
            </button>
          </div>

          {/* Primary Add CTA */}
          <button
            type="button"
            onClick={() => handleOpenAddModal(activeTab === "inbody" ? "inbody" : "daily")}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs shadow-xs transition touch-manipulation cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === "inbody" ? "Log InBody scan" : "Log weigh-in"}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {adaptiveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-[var(--status-on-track)]/10 border border-[var(--status-on-track)]/20 text-[var(--status-on-track)] text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{adaptiveSuccessMsg}</span>
        </div>
      )}

      {/* TAB 1: Everyday Weigh-ins */}
      {activeTab === "everyday" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Adaptive Calorie Suggestion Banner */}
          {analytics?.adaptiveSuggestion?.hasSuggestion && !adaptiveDismissed && (
            <div className="p-5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-subtle)]/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-xs text-[var(--text-primary)]">
                      Adaptive Calorie Target Suggestion
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      {analytics.adaptiveSuggestion.reason}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      <span className="text-[var(--text-secondary)]">
                        Current:{" "}
                        <strong className="text-[var(--text-primary)] font-tabular">
                          {analytics.adaptiveSuggestion.currentCalorieTarget} kcal
                        </strong>
                      </span>
                      <span className="text-[var(--accent)] font-semibold flex items-center space-x-1">
                        <span>Suggested:</span>
                        <strong className="font-tabular">
                          {analytics.adaptiveSuggestion.suggestedCalorieTarget} kcal
                        </strong>
                        <span className="text-[11px] font-normal">
                          ({analytics.adaptiveSuggestion.differenceKcal > 0 ? "+" : ""}
                          {analytics.adaptiveSuggestion.differenceKcal} kcal)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setAdaptiveDismissed(true)}
                    className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition cursor-pointer"
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
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    {isApplyingAdaptive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Accept target</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 7-Day Rolling Avg */}
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-1">
              <span className="text-xs font-medium text-[var(--text-secondary)] block">
                7-day rolling avg
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-bold tracking-tight text-[var(--text-primary)] font-tabular">
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
                    "text-3xl font-bold tracking-tight font-tabular",
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
                    "text-3xl font-bold tracking-tight font-tabular",
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
                Start: {toDisplay(analytics?.startWeightKg) || "--"} {unitLabel}
              </span>
            </div>

            {/* Goal Target */}
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-1">
              <span className="text-xs font-medium text-[var(--text-secondary)] block">
                Goal weight
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-bold tracking-tight text-[var(--accent)] font-tabular">
                  {goalWeight !== null ? goalWeight : "--"}
                </span>
                <span className="text-xs font-normal text-[var(--text-secondary)]">
                  {unitLabel}
                </span>
              </div>
              <span className="text-xs text-[var(--text-secondary)] block font-tabular">
                {remainingGoal !== null
                  ? `${remainingGoal} ${unitLabel} to go`
                  : "Set in settings"}
                {estWeeks !== null && estWeeks !== undefined && estWeeks > 0
                  ? ` (~${estWeeks} wks)`
                  : ""}
              </span>
            </div>
          </div>

          {/* Interactive Weight Trend Chart (Exclusively Everyday Scale Weigh-ins) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                  Daily weigh-in trend line
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Raw scale entries (dots) with 7-day rolling average (solid line)
                </p>
              </div>
            </div>

            <WeightTrendChart
              entries={everydayEntries}
              goalWeightKg={analytics?.goalWeightKg}
              measurementSystem={measurementSystem}
            />
          </div>

          {/* Everyday Weigh-in Table (Strictly Everyday Weigh-ins, No InBody Columns) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                  Everyday weigh-in logs
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  {everydayEntries.length} logged scale check-ins
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAddModal("daily")}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--background)] transition"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Add weigh-in</span>
              </button>
            </div>

            {everydayEntries.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-3">
                <Scale className="w-8 h-8 text-[var(--text-secondary)] opacity-40 mx-auto" />
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                  No everyday weigh-ins logged yet
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  Weigh yourself under consistent conditions (e.g. morning, fasted) and log daily to track real fat loss and muscle gain trends.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAddModal("daily")}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log your first weigh-in</span>
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--text-secondary)] font-medium text-xs">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Date &amp; Time</th>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Scale weight</th>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">7-day rolling avg</th>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Change vs prev</th>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Notes</th>
                        <th className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {[...everydayEntries].reverse().map((point, idx, arr) => {
                        const rawDisp = toDisplay(point.weightKg);
                        const avgDisp = toDisplay(point.rollingAvg7d);

                        // Calculate delta vs previous chronologically (which is next item in reversed array)
                        const prevPoint = arr[idx + 1];
                        let deltaDisp = null;
                        let deltaVal = 0;
                        if (prevPoint && point.weightKg && prevPoint.weightKg) {
                          deltaVal = Math.round((point.weightKg - prevPoint.weightKg) * 10) / 10;
                          deltaDisp = toDisplay(deltaVal);
                        }

                        return (
                          <tr
                            key={point.id || `${point.date}-${point.time}`}
                            className="hover:bg-[var(--background)]/50 transition group"
                          >
                            <td className="px-4 sm:px-6 py-3 font-normal text-[var(--text-primary)] whitespace-nowrap">
                              <div className="font-medium font-tabular">{point.date}</div>
                              {point.time && (
                                <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5 font-tabular">
                                  <Clock className="w-3 h-3" />
                                  <span>{point.time}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 font-bold text-[var(--text-primary)] text-sm font-tabular whitespace-nowrap">
                              {rawDisp} {unitLabel}
                            </td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                              <span className="font-semibold text-[var(--accent)] font-tabular">
                                {avgDisp} {unitLabel}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap font-tabular">
                              {deltaDisp !== null ? (
                                <span
                                  className={cn(
                                    "font-medium",
                                    deltaVal < 0
                                      ? "text-[var(--status-on-track)]"
                                      : deltaVal > 0
                                      ? "text-[var(--status-over-target)]"
                                      : "text-[var(--text-secondary)]"
                                  )}
                                >
                                  {deltaVal > 0 ? `+${deltaDisp}` : deltaDisp} {unitLabel}
                                </span>
                              ) : (
                                <span className="text-[var(--text-muted)]">--</span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-[var(--text-secondary)] max-w-xs truncate">
                              {point.notes || "--"}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right space-x-1 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(point, "daily")}
                                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition touch-manipulation"
                                title="Edit weigh-in"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(point.id)}
                                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition"
                                title="Delete weigh-in"
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
        </div>
      )}

      {/* TAB 2: InBody Scans */}
      {activeTab === "inbody" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* InBody KPI Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Body Fat % */}
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-1">
              <span className="text-xs font-medium text-[var(--text-secondary)] block">
                Latest Body Fat %
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-bold tracking-tight text-sky-500 font-tabular">
                  {latestInBody?.bodyFatPct != null ? `${latestInBody.bodyFatPct}%` : "--"}
                </span>
              </div>
              <span className="text-xs text-[var(--text-secondary)] block font-tabular">
                {inbodyBfChange !== null ? (
                  <span
                    className={cn(
                      inbodyBfChange < 0
                        ? "text-[var(--status-on-track)] font-medium"
                        : inbodyBfChange > 0
                        ? "text-[var(--status-over-target)] font-medium"
                        : ""
                    )}
                  >
                    {inbodyBfChange > 0 ? `+${inbodyBfChange}%` : `${inbodyBfChange}%`} vs prev scan
                  </span>
                ) : (
                  "Monthly scan target: ~12-15%"
                )}
              </span>
            </div>

            {/* Skeletal Muscle Mass (SMM) */}
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-1">
              <span className="text-xs font-medium text-[var(--text-secondary)] block">
                Skeletal Muscle (SMM)
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-bold tracking-tight text-emerald-500 font-tabular">
                  {toDisplay(latestInBody?.smmKg) || "--"}
                </span>
                <span className="text-xs font-normal text-[var(--text-secondary)]">
                  {unitLabel}
                </span>
              </div>
              <span className="text-xs text-[var(--text-secondary)] block font-tabular">
                {inbodySmmChange !== null ? (
                  <span
                    className={cn(
                      inbodySmmChange > 0
                        ? "text-[var(--status-on-track)] font-medium"
                        : inbodySmmChange < 0
                        ? "text-[var(--status-over-target)] font-medium"
                        : ""
                    )}
                  >
                    {inbodySmmChange > 0 ? `+${inbodySmmChange}` : `${inbodySmmChange}`} {unitLabel} vs prev
                  </span>
                ) : (
                  "Direct from InBody report"
                )}
              </span>
            </div>

            {/* BMI */}
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-1">
              <span className="text-xs font-medium text-[var(--text-secondary)] block">
                Body Mass Index (BMI)
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-bold tracking-tight text-purple-500 font-tabular">
                  {latestInBody?.bmi != null ? latestInBody.bmi : "--"}
                </span>
              </div>
              <span className="text-xs text-[var(--text-secondary)] block">
                {latestInBody?.bmi ? (
                  latestInBody.bmi < 18.5
                    ? "Underweight (<18.5)"
                    : latestInBody.bmi < 25
                    ? "Normal weight (18.5–24.9)"
                    : latestInBody.bmi < 30
                    ? "Overweight (25–29.9)"
                    : "Obese (≥30)"
                ) : (
                  "Calculated from height & weight"
                )}
              </span>
            </div>

            {/* Lean Mass vs Fat Mass */}
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-1">
              <span className="text-xs font-medium text-[var(--text-secondary)] block">
                Lean vs Fat Mass
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold tracking-tight text-[var(--text-primary)] font-tabular">
                  {latestLeanMass ? `${latestLeanMass} ${unitLabel}` : "--"}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">Lean</span>
              </div>
              <span className="text-xs text-[var(--text-secondary)] block font-tabular">
                Fat mass: {latestFatMass ? `${latestFatMass} ${unitLabel}` : "--"}
              </span>
            </div>
          </div>

          {/* InBody Scan History Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                  InBody scan reports &amp; history
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  {inbodyEntries.length} recorded InBody body composition scans
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAddModal("inbody")}
                className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log InBody scan</span>
              </button>
            </div>

            {inbodyEntries.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-3">
                <Sparkles className="w-8 h-8 text-[var(--accent)] opacity-50 mx-auto" />
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                  No InBody scans logged yet
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                  Take your monthly InBody scan sheet from your gym or clinic, and log your Body Fat %, Skeletal Muscle Mass (SMM), and BMI here to watch true body recomposition progress over time!
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAddModal("inbody")}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log your first InBody scan</span>
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--text-secondary)] font-medium text-xs">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Date &amp; Time</th>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Total weight</th>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Body Fat %</th>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">SMM (Muscle)</th>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">BMI</th>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Lean / Fat Mass</th>
                        <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Notes</th>
                        <th className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {[...inbodyEntries].reverse().map((scan) => {
                        const rawDisp = toDisplay(scan.weightKg);
                        const smmDisp = toDisplay(scan.smmKg);

                        let scanFatDisp = null;
                        let scanLeanDisp = null;
                        if (scan.weightKg && scan.bodyFatPct != null) {
                          const fatKg = scan.weightKg * (scan.bodyFatPct / 100);
                          const leanKg = scan.weightKg - fatKg;
                          scanFatDisp = toDisplay(fatKg);
                          scanLeanDisp = toDisplay(leanKg);
                        }

                        return (
                          <tr
                            key={scan.id || scan.date}
                            className="hover:bg-[var(--background)]/50 transition group"
                          >
                            <td className="px-4 sm:px-6 py-3 font-normal text-[var(--text-primary)] whitespace-nowrap">
                              <div className="font-medium font-tabular">{scan.date}</div>
                              {scan.time && (
                                <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5 font-tabular">
                                  <Clock className="w-3 h-3" />
                                  <span>{scan.time}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 font-bold text-[var(--text-primary)] text-sm font-tabular whitespace-nowrap">
                              {rawDisp} {unitLabel}
                            </td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                              {scan.bodyFatPct != null ? (
                                <span className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-500 font-bold font-tabular text-xs">
                                  {scan.bodyFatPct}%
                                </span>
                              ) : (
                                "--"
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                              {smmDisp != null ? (
                                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 font-bold font-tabular text-xs">
                                  {smmDisp} {unitLabel}
                                </span>
                              ) : (
                                "--"
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                              {scan.bmi != null ? (
                                <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-500 font-bold font-tabular text-xs">
                                  {scan.bmi}
                                </span>
                              ) : (
                                "--"
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap font-tabular text-[11px]">
                              {scanLeanDisp && scanFatDisp ? (
                                <div>
                                  <span className="text-[var(--text-primary)] font-semibold">
                                    {scanLeanDisp} {unitLabel}
                                  </span>{" "}
                                  <span className="text-[var(--text-secondary)]">/ {scanFatDisp} {unitLabel}</span>
                                </div>
                              ) : (
                                "--"
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-[var(--text-secondary)] max-w-xs truncate">
                              {scan.notes || "--"}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right space-x-1 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(scan, "inbody")}
                                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition touch-manipulation"
                                title="Edit scan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(scan.id)}
                                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition"
                                title="Delete scan"
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
        </div>
      )}

      {/* Log/Edit Modal */}
      <LogWeightModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchWeightData}
        initialEntry={selectedEntry}
        measurementSystem={measurementSystem}
        userHeightCm={userHeightCm}
        defaultType={modalDefaultType}
      />
    </div>
  );
}
