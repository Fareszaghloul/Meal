"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Settings as SettingsIcon,
  Target,
  Sliders,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  User,
  Flame,
  Activity,
  Plus,
  Trash2,
  Sparkles,
  Info,
  Scale,
  Dumbbell,
  Footprints,
  Zap,
  Database,
  Globe,
} from "lucide-react";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import {
  MET_TABLE,
  STEP_RANGES,
  SIMPLE_ACTIVITY_MULTIPLIERS,
  calculateTDEEAndTarget,
  WorkoutRoutineInput,
} from "@/lib/nutrition/tdee";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // 1. Daily Nutrition Targets State
  const [dailyCalories, setDailyCalories] = useState<number | string>(2300);
  const [dailyProtein, setDailyProtein] = useState<number | string>(180);
  const [dailyCarbs, setDailyCarbs] = useState<number | string>(220);
  const [dailyFat, setDailyFat] = useState<number | string>(70);
  const [defaultServings, setDefaultServings] = useState<number>(4);
  const [measurementSystem, setMeasurementSystem] = useState("metric");

  // 2. Body & Goals State (Section 38a)
  const [sex, setSex] = useState<string>("male");
  const [age, setAge] = useState<number | string>(28);
  const [heightInput, setHeightInput] = useState<number | string>(178); // cm or inches
  const [heightFeet, setHeightFeet] = useState<number | string>(5);
  const [heightInches, setHeightInches] = useState<number | string>(10);
  const [currentWeightInput, setCurrentWeightInput] = useState<number | string>(78); // kg or lbs
  const [goalType, setGoalType] = useState<string>("lose"); // "lose" | "maintain" | "gain"
  const [goalWeeklyRateKg, setGoalWeeklyRateKg] = useState<number>(0.5);
  const [goalWeightInput, setGoalWeightInput] = useState<number | string>(72);
  const [avgDailySteps, setAvgDailySteps] = useState<number>(8000);
  const [useSimpleActivityMode, setUseSimpleActivityMode] = useState<boolean>(false);
  const [simpleActivityLevel, setSimpleActivityLevel] = useState<string>("moderate");
  const [useThermicEffectAdjustment, setUseThermicEffectAdjustment] = useState<boolean>(true);
  const [workouts, setWorkouts] = useState<WorkoutRoutineInput[]>([]);

  // 3. AI & Local Engine State
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("qwen2.5:7b");
  const [screenshotMethod, setScreenshotMethod] = useState("ocr_local");
  const [cloudApiKey, setCloudApiKey] = useState("");
  const [hasCloudApiKey, setHasCloudApiKey] = useState(false);

  // 4. External Nutrition Database State (Section 39)
  const [usdaApiKey, setUsdaApiKey] = useState("");
  const [hasUsdaApiKey, setHasUsdaApiKey] = useState(false);
  const [usdaApiKeyMasked, setUsdaApiKeyMasked] = useState("");

  // Health check state
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [ollamaTestResult, setOllamaTestResult] = useState<{
    isRunning: boolean;
    models: string[];
    error?: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [appliedSuggestedMessage, setAppliedSuggestedMessage] = useState<string | null>(null);

  const isImperial = measurementSystem === "imperial";
  const weightUnit = isImperial ? "lbs" : "kg";
  const heightUnit = isImperial ? "ft/in" : "cm";

  // Fetch settings on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setDailyCalories(data.dailyCalories ?? 2300);
          setDailyProtein(data.dailyProtein ?? 180);
          setDailyCarbs(data.dailyCarbs ?? 220);
          setDailyFat(data.dailyFat ?? 70);
          setDefaultServings(data.defaultServings ?? 4);
          setMeasurementSystem(data.measurementSystem ?? "metric");

          setSex(data.sex ?? "male");
          setAge(data.age ?? 28);

          const isImp = data.measurementSystem === "imperial";
          const hCm = data.heightCm ?? 178;
          if (isImp) {
            const totalInches = Math.round(hCm / 2.54);
            setHeightFeet(Math.floor(totalInches / 12));
            setHeightInches(totalInches % 12);
            setHeightInput(totalInches);
          } else {
            setHeightInput(hCm);
          }

          const curWKg = data.currentWeightKg ?? 78;
          setCurrentWeightInput(
            isImp ? Math.round(curWKg * 2.20462 * 10) / 10 : curWKg
          );

          setGoalType(data.goalType ?? "lose");
          setGoalWeeklyRateKg(data.goalWeeklyRateKg ?? 0.5);

          if (data.goalWeightKg) {
            setGoalWeightInput(
              isImp
                ? Math.round(data.goalWeightKg * 2.20462 * 10) / 10
                : data.goalWeightKg
            );
          } else {
            setGoalWeightInput("");
          }

          setAvgDailySteps(data.avgDailySteps ?? 8000);
          setUseSimpleActivityMode(data.useSimpleActivityMode ?? false);
          setSimpleActivityLevel(data.simpleActivityLevel ?? "moderate");
          setUseThermicEffectAdjustment(data.useThermicEffectAdjustment ?? true);

          if (data.workouts && Array.isArray(data.workouts)) {
            setWorkouts(data.workouts);
          }

          setOllamaUrl(data.ollamaUrl ?? "http://localhost:11434");
          setOllamaModel(data.ollamaModel ?? "qwen2.5:7b");
          setScreenshotMethod(data.screenshotMethod ?? "ocr_local");
          setHasCloudApiKey(data.hasCloudApiKey ?? false);
          setHasUsdaApiKey(data.hasUsdaApiKey ?? false);
          setUsdaApiKeyMasked(data.usdaApiKeyMasked ?? "");
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Convert current inputs to standard metric for TDEE calculation
  const calculatedHeightCm = useMemo(() => {
    if (isImperial) {
      const ft = Number(heightFeet) || 0;
      const inch = Number(heightInches) || 0;
      return Math.round((ft * 12 + inch) * 2.54);
    }
    return Number(heightInput) || 178;
  }, [isImperial, heightFeet, heightInches, heightInput]);

  const calculatedWeightKg = useMemo(() => {
    const rawVal = Number(currentWeightInput) || 78;
    return isImperial ? Math.round((rawVal / 2.20462) * 10) / 10 : rawVal;
  }, [isImperial, currentWeightInput]);

  const calculatedGoalWeightKg = useMemo(() => {
    if (!goalWeightInput) return null;
    const rawVal = Number(goalWeightInput);
    return isImperial ? Math.round((rawVal / 2.20462) * 10) / 10 : rawVal;
  }, [isImperial, goalWeightInput]);

  // Live Component-Based TDEE Calculation (Section 38b)
  const tdeeBreakdown = useMemo(() => {
    return calculateTDEEAndTarget({
      sex,
      age: Number(age) || 28,
      heightCm: calculatedHeightCm,
      weightKg: calculatedWeightKg,
      goalType,
      goalWeeklyRateKg,
      avgDailySteps: Number(avgDailySteps) || 8000,
      workouts,
      useSimpleActivityMode,
      simpleActivityLevel,
      useThermicEffectAdjustment,
    });
  }, [
    sex,
    age,
    calculatedHeightCm,
    calculatedWeightKg,
    goalType,
    goalWeeklyRateKg,
    avgDailySteps,
    workouts,
    useSimpleActivityMode,
    simpleActivityLevel,
    useThermicEffectAdjustment,
  ]);

  // Apply suggested targets to the nutrition targets inputs
  const handleApplySuggestedTarget = () => {
    setDailyCalories(tdeeBreakdown.targetCalories);
    setDailyProtein(tdeeBreakdown.suggestedMacros.protein);
    setDailyCarbs(tdeeBreakdown.suggestedMacros.carbs);
    setDailyFat(tdeeBreakdown.suggestedMacros.fat);

    setAppliedSuggestedMessage(
      `Applied suggested target of ${tdeeBreakdown.targetCalories} kcal (P: ${tdeeBreakdown.suggestedMacros.protein}g, C: ${tdeeBreakdown.suggestedMacros.carbs}g, F: ${tdeeBreakdown.suggestedMacros.fat}g) to Daily Nutrition Targets above.`
    );
    setTimeout(() => setAppliedSuggestedMessage(null), 6000);
  };

  // Workout Routine List Handlers
  const handleAddWorkoutRow = () => {
    setWorkouts([
      ...workouts,
      {
        workoutType: "weightlifting_moderate",
        durationMinutes: 45,
        sessionsPerWeek: 3,
      },
    ]);
  };

  const handleUpdateWorkoutRow = (
    index: number,
    field: keyof WorkoutRoutineInput,
    value: unknown
  ) => {
    const updated = [...workouts];
    updated[index] = { ...updated[index], [field]: value };
    setWorkouts(updated);
  };

  const handleRemoveWorkoutRow = async (index: number) => {
    const item = workouts[index];
    if (item.id) {
      try {
        await fetch(`/api/workouts?id=${item.id}`, { method: "DELETE" });
      } catch (err) {
        console.error(err);
      }
    }
    setWorkouts(workouts.filter((_, i) => i !== index));
  };

  const handleTestOllama = async () => {
    setIsTestingOllama(true);
    setOllamaTestResult(null);
    try {
      const res = await fetch("/api/ai/health");
      const data = await res.json();
      setOllamaTestResult(data);
    } catch (err: unknown) {
      setOllamaTestResult({
        isRunning: false,
        models: [],
        error: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setIsTestingOllama(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Sync workout routines
      for (const w of workouts) {
        if (!w.id) {
          await fetch("/api/workouts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workoutType: w.workoutType,
              durationMinutes: Number(w.durationMinutes) || 45,
              sessionsPerWeek: Number(w.sessionsPerWeek) || 3,
            }),
          });
        } else {
          await fetch("/api/workouts", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: w.id,
              workoutType: w.workoutType,
              durationMinutes: Number(w.durationMinutes) || 45,
              sessionsPerWeek: Number(w.sessionsPerWeek) || 3,
            }),
          });
        }
      }

      // 2. Save Settings
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyCalories: Number(dailyCalories),
          dailyProtein: Number(dailyProtein),
          dailyCarbs: Number(dailyCarbs),
          dailyFat: Number(dailyFat),
          defaultServings: Number(defaultServings),
          measurementSystem,
          theme,
          sex,
          age: Number(age),
          heightCm: calculatedHeightCm,
          currentWeightKg: calculatedWeightKg,
          goalType,
          goalWeeklyRateKg: Number(goalWeeklyRateKg),
          goalWeightKg: calculatedGoalWeightKg,
          avgDailySteps: Number(avgDailySteps),
          useSimpleActivityMode,
          simpleActivityLevel,
          useThermicEffectAdjustment,
          ollamaUrl,
          ollamaModel,
          screenshotMethod,
          cloudApiKey: cloudApiKey ? cloudApiKey.trim() : undefined,
          usdaApiKey: usdaApiKey ? usdaApiKey.trim() : undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        if (updated.workouts) setWorkouts(updated.workouts);
        if (updated.hasUsdaApiKey !== undefined) setHasUsdaApiKey(updated.hasUsdaApiKey);
        if (updated.usdaApiKeyMasked !== undefined) setUsdaApiKeyMasked(updated.usdaApiKeyMasked);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveSettings} className="max-w-6xl mx-auto space-y-8 pb-16 px-4 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal mb-1">
            Nutrition &amp; body parameters
          </p>
          <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] leading-tight">
            Settings
          </h1>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-sm transition touch-manipulation cursor-pointer min-h-[44px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Settings</span>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] text-sm flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {appliedSuggestedMessage && (
        <div className="p-4 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] text-sm flex items-center space-x-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{appliedSuggestedMessage}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Grouped Surface Cards */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Body and goal */}
          <div className="p-6 rounded-3xl bg-[var(--surface)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="font-semibold text-base text-[var(--text-primary)]">
                  Body and goal
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Parameters used for Mifflin-St Jeor BMR and target deficit calculations
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  href="/profile"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 bg-[var(--accent-subtle)] px-3 py-1.5 rounded-full"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/weight"
                  className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center px-2 py-1.5"
                >
                  <Scale className="w-3.5 h-3.5 mr-1" />
                  <span>Weight log</span>
                </Link>
              </div>
            </div>

            {/* Profile Inputs: Sex, Age, Height, Weight */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Sex */}
              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Biological sex
                </label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Age */}
              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Age (years)
                </label>
                <input
                  type="number"
                  min={15}
                  max={100}
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] font-tabular transition"
                />
              </div>

              {/* Height */}
              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Height ({heightUnit})
                </label>
                {isImperial ? (
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={3}
                      max={7}
                      value={heightFeet}
                      onChange={(e) => setHeightFeet(e.target.value)}
                      className="w-1/2 px-3 py-2.5 text-xs font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                      placeholder="ft"
                    />
                    <span className="text-xs text-[var(--text-muted)]">ft</span>
                    <input
                      type="number"
                      min={0}
                      max={11}
                      value={heightInches}
                      onChange={(e) => setHeightInches(e.target.value)}
                      className="w-1/2 px-3 py-2.5 text-xs font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                      placeholder="in"
                    />
                    <span className="text-xs text-[var(--text-muted)]">in</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    min={100}
                    max={250}
                    required
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                  />
                )}
              </div>

              {/* Current Weight */}
              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Current weight ({weightUnit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={30}
                  max={400}
                  required
                  value={currentWeightInput}
                  onChange={(e) => setCurrentWeightInput(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
              </div>
            </div>

            {/* Goal Type & Target Rate & Goal Weight */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
              {/* Goal Type */}
              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Goal type
                </label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                >
                  <option value="lose">Lose weight (Deficit)</option>
                  <option value="maintain">Maintain current weight</option>
                  <option value="gain">Gain weight / muscle (Surplus)</option>
                </select>
              </div>

              {/* Target Weekly Rate */}
              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Target weekly pace
                </label>
                <select
                  disabled={goalType === "maintain"}
                  value={goalWeeklyRateKg}
                  onChange={(e) => setGoalWeeklyRateKg(Number(e.target.value))}
                  className={cn(
                    "w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition",
                    goalType === "maintain" && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {isImperial ? (
                    <>
                      <option value={0.23}>0.5 lb / week (Mild &amp; sustainable)</option>
                      <option value={0.45}>1.0 lb / week (Standard recommended)</option>
                      <option value={0.68}>1.5 lb / week (Aggressive)</option>
                      <option value={0.91}>2.0 lb / week (Maximum)</option>
                    </>
                  ) : (
                    <>
                      <option value={0.25}>0.25 kg / week (Mild &amp; sustainable)</option>
                      <option value={0.5}>0.50 kg / week (Standard recommended)</option>
                      <option value={0.75}>0.75 kg / week (Aggressive)</option>
                      <option value={1.0}>1.00 kg / week (Maximum)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Optional Goal Weight */}
              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Goal target weight ({weightUnit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={`e.g. ${isImperial ? "160" : "72"}`}
                  value={goalWeightInput}
                  onChange={(e) => setGoalWeightInput(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Activity with workout rows */}
          <div className="p-6 rounded-3xl bg-[var(--surface)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="font-semibold text-base text-[var(--text-primary)]">
                  Activity and workout routine
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Steps and structured exercise to calculate accurate daily expenditure
                </p>
              </div>

              {/* Mode switch pill */}
              <div className="flex items-center p-1 rounded-full bg-[var(--background)] text-xs">
                <button
                  type="button"
                  onClick={() => setUseSimpleActivityMode(false)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer min-h-[32px]",
                    !useSimpleActivityMode
                      ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Component-based
                </button>
                <button
                  type="button"
                  onClick={() => setUseSimpleActivityMode(true)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer min-h-[32px]",
                    useSimpleActivityMode
                      ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Flat multiplier
                </button>
              </div>
            </div>

            {!useSimpleActivityMode ? (
              <div className="space-y-5">
                {/* Daily Steps Quick-Pick */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-normal text-[var(--text-secondary)]">
                      Average daily steps (NEAT movement)
                    </span>
                    <span className="text-xs font-tabular font-semibold text-[var(--accent)]">
                      {Number(avgDailySteps).toLocaleString()} steps (~{tdeeBreakdown.stepCalories} kcal/day)
                    </span>
                  </div>

                  {/* Quick-Pick Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {STEP_RANGES.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setAvgDailySteps(item.steps)}
                        className={cn(
                          "py-2 px-3 rounded-full text-center text-xs font-medium transition font-tabular cursor-pointer min-h-[36px]",
                          avgDailySteps === item.steps
                            ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                            : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-xs text-[var(--text-muted)]">Exact steps:</span>
                    <input
                      type="number"
                      step="250"
                      min="1000"
                      max="50000"
                      value={avgDailySteps}
                      onChange={(e) => setAvgDailySteps(Number(e.target.value) || 0)}
                      className="w-36 px-3 py-1.5 text-xs font-tabular rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[36px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                    />
                  </div>
                </div>

                {/* Weekly Structured Workouts List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-[var(--text-primary)] block">
                        Weekly workout routines
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        ~{tdeeBreakdown.dailyExerciseCalories} kcal/day averaged across the week
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddWorkoutRow}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[var(--background)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] transition cursor-pointer min-h-[36px]"
                    >
                      <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Add workout</span>
                    </button>
                  </div>

                  {workouts.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[var(--background)] text-center text-xs text-[var(--text-secondary)] space-y-1">
                      <p>No structured workouts added yet.</p>
                      <button
                        type="button"
                        onClick={handleAddWorkoutRow}
                        className="text-[var(--accent)] hover:underline font-medium cursor-pointer"
                      >
                        + Add weightlifting, running, cycling, HIIT, etc.
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {workouts.map((w, idx) => {
                        const met = MET_TABLE[w.workoutType]?.met || 5.0;
                        const sessionKcal = Math.round(
                          met * calculatedWeightKg * (w.durationMinutes / 60)
                        );
                        const weeklyKcal = sessionKcal * (w.sessionsPerWeek || 0);

                        return (
                          <div
                            key={w.id || idx}
                            className="p-4 rounded-2xl bg-[var(--background)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                              {/* Workout Type */}
                              <div>
                                <label className="text-[11px] text-[var(--text-muted)] block font-normal mb-1">
                                  Activity type
                                </label>
                                <select
                                  value={w.workoutType}
                                  onChange={(e) =>
                                    handleUpdateWorkoutRow(
                                      idx,
                                      "workoutType",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] text-[var(--text-primary)] text-xs min-h-[40px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                                >
                                  {Object.entries(MET_TABLE).map(([key, info]) => (
                                    <option key={key} value={key}>
                                      {info.label} (MET {info.met})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Duration */}
                              <div>
                                <label className="text-[11px] text-[var(--text-muted)] block font-normal mb-1">
                                  Duration (mins)
                                </label>
                                <input
                                  type="number"
                                  step="5"
                                  min="10"
                                  max="300"
                                  value={w.durationMinutes}
                                  onChange={(e) =>
                                    handleUpdateWorkoutRow(
                                      idx,
                                      "durationMinutes",
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] text-[var(--text-primary)] text-xs font-tabular min-h-[40px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                                />
                              </div>

                              {/* Sessions Per Week */}
                              <div>
                                <label className="text-[11px] text-[var(--text-muted)] block font-normal mb-1">
                                  Sessions / week
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="14"
                                  value={w.sessionsPerWeek}
                                  onChange={(e) =>
                                    handleUpdateWorkoutRow(
                                      idx,
                                      "sessionsPerWeek",
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] text-[var(--text-primary)] text-xs font-tabular min-h-[40px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                                />
                              </div>
                            </div>

                            {/* Calculated Stats & Remove */}
                            <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                              <div className="text-right font-tabular">
                                <span className="block font-semibold text-[var(--text-primary)]">
                                  ~{sessionKcal} kcal/ses
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">
                                  {weeklyKcal} kcal/wk
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveWorkoutRow(idx)}
                                className="p-2 text-[var(--text-secondary)] hover:text-[var(--status-over-target)] rounded-full hover:bg-[var(--status-over-target)]/10 transition cursor-pointer"
                                title="Remove workout"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Thermic Effect of Food (TEF) Toggle */}
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-normal text-[var(--text-secondary)] block">
                      Thermic effect of food (TEF) adjustment (+8%)
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      Accounts for energy expended during digestion and nutrient processing
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={useThermicEffectAdjustment}
                    onChange={(e) => setUseThermicEffectAdjustment(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)] cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              /* Simple Mode Dropdown */
              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Flat activity multiplier
                </label>
                <select
                  value={simpleActivityLevel}
                  onChange={(e) => setSimpleActivityLevel(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                >
                  <option value="sedentary">Sedentary (BMR × 1.2 — desk job, little to no exercise)</option>
                  <option value="light">Lightly Active (BMR × 1.375 — light exercise 1-3 days/wk)</option>
                  <option value="moderate">Moderately Active (BMR × 1.55 — moderate exercise 3-5 days/wk)</option>
                  <option value="very">Very Active (BMR × 1.725 — hard exercise 6-7 days/wk)</option>
                  <option value="extra">Extremely Active (BMR × 1.9 — hard daily training / physical job)</option>
                </select>
              </div>
            )}
          </div>

          {/* Card 3: Daily targets with dot labels */}
          <div className="p-6 rounded-3xl bg-[var(--surface)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h2 className="font-semibold text-base text-[var(--text-primary)]">
                  Daily targets
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Used across Dashboard, Meal Planner, and batch recipes
                </p>
              </div>
              <span className="text-xs text-[var(--text-muted)] font-normal">
                Manual override
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  required
                  value={dailyCalories}
                  onChange={(e) => setDailyCalories(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5 flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--macro-protein)] mr-1.5" />
                  Protein (g)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={dailyProtein}
                  onChange={(e) => setDailyProtein(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5 flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--macro-carbs)] mr-1.5" />
                  Carbs (g)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={dailyCarbs}
                  onChange={(e) => setDailyCarbs(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5 flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--macro-fat)] mr-1.5" />
                  Fat (g)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={dailyFat}
                  onChange={(e) => setDailyFat(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] font-tabular focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Preferences & Units */}
          <div className="p-6 rounded-3xl bg-[var(--surface)] space-y-5">
            <div className="border-b border-[var(--border)] pb-3">
              <h2 className="font-semibold text-base text-[var(--text-primary)]">
                Units and appearance
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Display preferences for measurements, portioning, and theme
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Default recipe servings
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={defaultServings}
                  onChange={(e) => setDefaultServings(Number(e.target.value) || 4)}
                  className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Measurement system
                </label>
                <div className="flex items-center p-1 rounded-full bg-[var(--background)] text-xs">
                  <button
                    type="button"
                    onClick={() => setMeasurementSystem("metric")}
                    className={cn(
                      "flex-1 py-2 rounded-full transition text-center cursor-pointer min-h-[36px]",
                      measurementSystem === "metric"
                        ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Metric (kg/cm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeasurementSystem("imperial")}
                    className={cn(
                      "flex-1 py-2 rounded-full transition text-center cursor-pointer min-h-[36px]",
                      measurementSystem === "imperial"
                        ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Imperial (lb/in)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                  Appearance
                </label>
                <div className="flex items-center p-1 rounded-full bg-[var(--background)] text-xs">
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex-1 py-2 rounded-full transition text-center cursor-pointer min-h-[36px]",
                      theme === "dark"
                        ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex-1 py-2 rounded-full transition text-center cursor-pointer min-h-[36px]",
                      theme === "light"
                        ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={cn(
                      "flex-1 py-2 rounded-full transition text-center cursor-pointer min-h-[36px]",
                      theme === "system"
                        ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Auto
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Local AI Engine (Admin only) */}
          {isAdmin && (
            <div className="p-6 rounded-3xl bg-[var(--surface)] space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center space-x-2">
                  <h2 className="font-semibold text-base text-[var(--text-primary)]">
                    Local AI engine (Ollama)
                  </h2>
                </div>

                <div className="flex items-center space-x-2">
                  {ollamaTestResult?.isRunning ? (
                    <span className="px-3 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-semibold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                      <span>Connected</span>
                    </span>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleTestOllama}
                    disabled={isTestingOllama}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[var(--background)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] transition cursor-pointer min-h-[36px]"
                  >
                    {isTestingOllama ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                    )}
                    <span>Test connection</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)]">
                Recipe parsing runs 100% locally via Ollama inference. No cloud API keys needed for core operation.
              </p>

              {/* Ollama Test Result Banner */}
              {ollamaTestResult && (
                <div
                  className={cn(
                    "p-4 rounded-2xl text-xs space-y-1.5",
                    ollamaTestResult.isRunning
                      ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                      : "bg-[var(--status-over-target)]/10 text-[var(--status-over-target)]"
                  )}
                >
                  <div className="flex items-center space-x-2 font-semibold">
                    {ollamaTestResult.isRunning ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ollama is online and connected!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>Could not reach Ollama server</span>
                      </>
                    )}
                  </div>
                  {ollamaTestResult.isRunning ? (
                    <p>
                      Available models:{" "}
                      <span className="font-mono font-semibold">
                        {ollamaTestResult.models.length > 0
                          ? ollamaTestResult.models.join(", ")
                          : "None pulled yet (run 'ollama run qwen2.5:7b')"}
                      </span>
                    </p>
                  ) : (
                    <p>{ollamaTestResult.error}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                    Ollama base URL
                  </label>
                  <input
                    type="text"
                    required
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-mono rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                    placeholder="http://localhost:11434"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                    Model name
                  </label>
                  <input
                    type="text"
                    required
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-mono rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                    placeholder="qwen2.5:7b"
                  />
                </div>
              </div>

              {/* Screenshot Parsing Pipeline */}
              <div className="pt-2 border-t border-[var(--border)] space-y-3">
                <span className="text-xs font-medium text-[var(--text-primary)] block">
                  Screenshot parsing pipeline
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setScreenshotMethod("ocr_local")}
                    className={cn(
                      "p-3.5 rounded-2xl text-left transition cursor-pointer",
                      screenshotMethod === "ocr_local"
                        ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                        : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <div className="font-semibold">OCR + Local model</div>
                    <div className={cn(
                      "text-[11px] font-normal mt-0.5",
                      screenshotMethod === "ocr_local" ? "text-[var(--on-accent)]/80" : "text-[var(--text-muted)]"
                    )}>
                      100% offline text extraction &amp; structuring.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScreenshotMethod("vision_local")}
                    className={cn(
                      "p-3.5 rounded-2xl text-left transition cursor-pointer",
                      screenshotMethod === "vision_local"
                        ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                        : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <div className="font-semibold">Local vision model</div>
                    <div className={cn(
                      "text-[11px] font-normal mt-0.5",
                      screenshotMethod === "vision_local" ? "text-[var(--on-accent)]/80" : "text-[var(--text-muted)]"
                    )}>
                      Direct multimodal via Ollama (Qwen2-VL).
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScreenshotMethod("cloud_vision")}
                    className={cn(
                      "p-3.5 rounded-2xl text-left transition cursor-pointer",
                      screenshotMethod === "cloud_vision"
                        ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                        : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <div className="font-semibold">Cloud fallback</div>
                    <div className={cn(
                      "text-[11px] font-normal mt-0.5",
                      screenshotMethod === "cloud_vision" ? "text-[var(--on-accent)]/80" : "text-[var(--text-muted)]"
                    )}>
                      Optional cloud API for OCR fallback.
                    </div>
                  </button>
                </div>

                {screenshotMethod === "cloud_vision" && (
                  <div className="pt-2">
                    <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
                      Cloud vision API key
                    </label>
                    <input
                      type="password"
                      placeholder={
                        hasCloudApiKey
                          ? "•••••••• (Key saved, type new key to replace)"
                          : "Enter API key"
                      }
                      value={cloudApiKey}
                      onChange={(e) => setCloudApiKey(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card 6: External Nutrition Sources (Admin only) */}
          {isAdmin && (
            <div className="p-6 rounded-3xl bg-[var(--surface)] space-y-4">
              <div className="border-b border-[var(--border)] pb-3">
                <h2 className="font-semibold text-base text-[var(--text-primary)]">
                  External nutrition data sources
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Free food sources for whole ingredients and branded UPC items. Cached permanently offline.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-[var(--background)] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                    <span>USDA FoodData Central</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Whole ingredients (meats, grains, produce, dairy) with distinct raw vs. cooked profiles.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--background)] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--macro-protein)]" />
                    <span>Open Food Facts</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Commercial packaged goods, protein powders, snacks, and barcode lookups.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] space-y-2">
                <label className="block text-xs font-normal text-[var(--text-secondary)]">
                  USDA FoodData Central API key <span className="text-[var(--text-muted)]">(Optional)</span>
                </label>
                <input
                  type="password"
                  placeholder={
                    hasUsdaApiKey
                      ? "•••••••• (Custom USDA Key saved, type to replace)"
                      : "DEMO_KEY active by default. Enter personal key for higher limits."
                  }
                  value={usdaApiKey}
                  onChange={(e) => setUsdaApiKey(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-2xl bg-[var(--background)] text-[var(--text-primary)] min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Hero Panel */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 rounded-[28px] bg-[var(--hero)] text-[var(--hero-text)] p-6 space-y-6">
            <div>
              <p className="text-xs text-[var(--hero-muted)] font-normal">Component-based TDEE</p>
              <h3 className="text-lg font-semibold text-[var(--hero-text)] mt-0.5">
                Energy Breakdown
              </h3>
            </div>

            {/* Suggested Target Big Number */}
            <div className="space-y-1">
              <span className="text-xs text-[var(--hero-muted)] block">Suggested daily intake</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold tracking-tight text-[var(--hero-text)] font-tabular">
                  {tdeeBreakdown.targetCalories.toLocaleString()}
                </span>
                <span className="text-sm text-[var(--hero-muted)]">kcal/day</span>
              </div>
              {tdeeBreakdown.deficitOrSurplus !== 0 && (
                <div className="mt-1">
                  <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-[var(--hero-track)] text-[var(--hero-text)] font-tabular font-medium">
                    {tdeeBreakdown.deficitOrSurplus > 0 ? "+" : ""}
                    {tdeeBreakdown.deficitOrSurplus} kcal {goalType === "lose" ? "deficit" : goalType === "gain" ? "surplus" : "maintenance"}
                  </span>
                </div>
              )}
            </div>

            {/* TDEE Component Breakdown */}
            <div className="divide-y divide-[var(--hero-track)] text-xs font-tabular">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[var(--hero-muted)]">Basal metabolic rate (BMR)</span>
                <span className="font-semibold text-[var(--hero-text)]">{tdeeBreakdown.bmr} kcal</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[var(--hero-muted)]">NEAT steps movement</span>
                <span className="font-semibold text-[var(--hero-text)]">+{tdeeBreakdown.stepCalories} kcal</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[var(--hero-muted)]">Structured exercise workouts</span>
                <span className="font-semibold text-[var(--hero-text)]">+{tdeeBreakdown.dailyExerciseCalories} kcal</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[var(--hero-muted)] font-medium">Maintenance TDEE</span>
                <span className="font-bold text-[var(--lime)]">{tdeeBreakdown.tdee} kcal</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[var(--hero-muted)]">Goal adjustment</span>
                <span className="font-semibold text-[var(--hero-text)]">
                  {tdeeBreakdown.deficitOrSurplus > 0 ? "+" : ""}
                  {tdeeBreakdown.deficitOrSurplus} kcal
                </span>
              </div>
            </div>

            {/* Macro Split Preview */}
            <div className="pt-2 border-t border-[var(--hero-track)] space-y-2 text-xs">
              <p className="text-[var(--hero-muted)] font-normal">Suggested macro split:</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-tabular text-xs">
                <span className="flex items-center text-[var(--hero-text)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--macro-protein)] mr-1.5 shrink-0" />
                  {tdeeBreakdown.suggestedMacros.protein}g Protein
                </span>
                <span className="flex items-center text-[var(--hero-text)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--macro-carbs)] mr-1.5 shrink-0" />
                  {tdeeBreakdown.suggestedMacros.carbs}g Carbs
                </span>
                <span className="flex items-center text-[var(--hero-text)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--macro-fat)] mr-1.5 shrink-0" />
                  {tdeeBreakdown.suggestedMacros.fat}g Fat
                </span>
              </div>
            </div>

            {/* Apply Suggested Target Lime Button */}
            <button
              type="button"
              onClick={handleApplySuggestedTarget}
              className="w-full py-3 px-4 rounded-full bg-[var(--lime)] hover:bg-[var(--accent-hover)] text-[var(--on-lime)] font-semibold text-sm transition cursor-pointer min-h-[44px] flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply suggested target</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
