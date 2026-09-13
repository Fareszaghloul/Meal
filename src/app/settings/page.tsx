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
    <form onSubmit={handleSaveSettings} className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Settings &amp; Goals
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Customize your body stats, component-based TDEE, nutrition targets, and local AI configuration
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 sm:py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:opacity-90 text-white font-medium text-xs shadow-xs transition self-start sm:self-auto min-h-[38px] flex items-center justify-center touch-manipulation"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-[var(--ui-success-bg)] border border-[var(--ui-success-border)] text-[var(--ui-success)] text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {appliedSuggestedMessage && (
        <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)] text-[var(--accent)] text-xs flex items-center space-x-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{appliedSuggestedMessage}</span>
        </div>
      )}

      {/* 1. Body & Goals (Section 38a & 38b) */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-[var(--text-primary)]">
                Body Profile &amp; Calorie Deficit Calculator
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Component-based TDEE using Mifflin-St Jeor BMR, NEAT steps, and MET structured workouts
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/profile"
              className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 bg-[var(--accent-subtle)] px-2.5 py-1.5 rounded-lg"
            >
              <User className="w-3.5 h-3.5" />
              <span>Edit in User Profile</span>
            </Link>
            <Link
              href="/weight"
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center"
            >
              <Scale className="w-3.5 h-3.5 mr-1" />
              <span>Weight Log</span>
            </Link>
          </div>
        </div>

        {/* Profile Inputs: Sex, Age, Height, Weight */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Sex */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Biological Sex
            </label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* Age */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Age (years)
            </label>
            <input
              type="number"
              min={15}
              max={100}
              required
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] font-tabular"
            />
          </div>

          {/* Height */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
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
                  className="w-1/2 px-2 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                  placeholder="ft"
                />
                <span className="text-xs text-[var(--text-secondary)]">ft</span>
                <input
                  type="number"
                  min={0}
                  max={11}
                  value={heightInches}
                  onChange={(e) => setHeightInches(e.target.value)}
                  className="w-1/2 px-2 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                  placeholder="in"
                />
                <span className="text-xs text-[var(--text-secondary)]">in</span>
              </div>
            ) : (
              <input
                type="number"
                min={100}
                max={250}
                required
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
              />
            )}
          </div>

          {/* Current Weight */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Current Weight ({weightUnit})
            </label>
            <input
              type="number"
              step="0.1"
              min={30}
              max={400}
              required
              value={currentWeightInput}
              onChange={(e) => setCurrentWeightInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Goal Type & Target Rate & Goal Weight */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--border)]">
          {/* Goal Type */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Goal Type
            </label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            >
              <option value="lose">Lose Weight (Calorie Deficit)</option>
              <option value="maintain">Maintain Current Weight</option>
              <option value="gain">Gain Weight / Muscle (Surplus)</option>
            </select>
          </div>

          {/* Target Weekly Rate */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Target Weekly Rate
            </label>
            <select
              disabled={goalType === "maintain"}
              value={goalWeeklyRateKg}
              onChange={(e) => setGoalWeeklyRateKg(Number(e.target.value))}
              className={cn(
                "w-full px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]",
                goalType === "maintain" && "opacity-50 cursor-not-allowed"
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
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Goal Target Weight ({weightUnit}) <span className="font-normal text-[var(--text-secondary)]">(optional)</span>
            </label>
            <input
              type="number"
              step="0.1"
              placeholder={`e.g. ${isImperial ? "160" : "72"}`}
              value={goalWeightInput}
              onChange={(e) => setGoalWeightInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Activity Mode Toggle: Component-based vs Flat Multiplier */}
        <div className="pt-2 border-t border-[var(--border)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-medium text-[var(--text-primary)] block">
                Activity Estimation Mode
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Component-based breaks expenditure into BMR, steps, and specific workouts for higher accuracy
              </span>
            </div>
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs overflow-x-auto scrollbar-none self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setUseSimpleActivityMode(false)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition shrink-0 whitespace-nowrap touch-manipulation",
                  !useSimpleActivityMode
                    ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                Component-Based (Default)
              </button>
              <button
                type="button"
                onClick={() => setUseSimpleActivityMode(true)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition shrink-0 whitespace-nowrap touch-manipulation",
                  useSimpleActivityMode
                    ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                Simple Flat Multiplier
              </button>
            </div>
          </div>

          {!useSimpleActivityMode ? (
            <div className="space-y-4 pt-2">
              {/* Daily Steps Quick-Pick (Section 38b Step 2) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--text-primary)] flex items-center space-x-1.5">
                    <Footprints className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Average daily steps (NEAT movement)</span>
                  </label>
                  <span className="text-xs font-tabular font-semibold text-[var(--accent)]">
                    {Number(avgDailySteps).toLocaleString()} steps (~{tdeeBreakdown.stepCalories} kcal/day)
                  </span>
                </div>

                {/* Quick-Pick Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {STEP_RANGES.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setAvgDailySteps(item.steps)}
                      className={cn(
                        "py-1.5 px-2 rounded-xl border text-center text-xs font-medium transition font-tabular",
                        avgDailySteps === item.steps
                          ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-xs text-[var(--text-secondary)]">Or exact steps:</span>
                  <input
                    type="number"
                    step="250"
                    min="1000"
                    max="50000"
                    value={avgDailySteps}
                    onChange={(e) => setAvgDailySteps(Number(e.target.value) || 0)}
                    className="w-32 px-2.5 py-1 text-xs font-tabular rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Weekly Structured Workouts List (Section 38b Step 3) */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-primary)] flex items-center space-x-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-[var(--macro-protein)]" />
                      <span>Weekly workout routine</span>
                    </label>
                    <span className="text-xs text-[var(--text-secondary)]">
                      MET energy expenditure averaged across 7 days (~{tdeeBreakdown.dailyExerciseCalories} kcal/day)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddWorkoutRow}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--background)] transition self-start sm:self-auto touch-manipulation"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Add Workout Type</span>
                  </button>
                </div>

                {workouts.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--text-secondary)] space-y-1">
                    <p>No structured workouts added yet (sedentary/step-only).</p>
                    <button
                      type="button"
                      onClick={handleAddWorkoutRow}
                      className="text-[var(--accent)] hover:underline font-medium"
                    >
                      + Add weightlifting, running, cycling, HIIT, etc.
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workouts.map((w, idx) => {
                      const met = MET_TABLE[w.workoutType]?.met || 5.0;
                      const sessionKcal = Math.round(
                        met * calculatedWeightKg * (w.durationMinutes / 60)
                      );
                      const weeklyKcal = sessionKcal * (w.sessionsPerWeek || 0);

                      return (
                        <div
                          key={w.id || idx}
                          className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                            {/* Workout Type */}
                            <div>
                              <label className="text-[10px] text-[var(--text-secondary)] block font-medium mb-0.5">
                                Activity Type
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
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs focus:outline-hidden focus:border-[var(--accent)]"
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
                              <label className="text-[10px] text-[var(--text-secondary)] block font-medium mb-0.5">
                                Duration (mins/session)
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
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                              />
                            </div>

                            {/* Sessions Per Week */}
                            <div>
                              <label className="text-xs text-[var(--text-secondary)] block font-normal mb-0.5">
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
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                              />
                            </div>
                          </div>

                          {/* Calculated Stats & Remove */}
                          <div className="flex items-center justify-between sm:justify-end space-x-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                            <div className="text-right font-tabular">
                              <span className="block font-semibold text-[var(--text-primary)]">
                                ~{sessionKcal} kcal/ses
                              </span>
                              <span className="text-xs text-[var(--text-secondary)]">
                                {weeklyKcal} kcal/wk
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveWorkoutRow(idx)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--ui-error)] rounded-lg hover:bg-[var(--ui-error-bg)] transition"
                              title="Remove workout"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                  <span className="text-xs font-medium text-[var(--text-primary)] block">
                    Thermic Effect of Food (TEF) Adjustment (+8%)
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Accounts for energy expended during digestion and nutrient processing
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={useThermicEffectAdjustment}
                  onChange={(e) => setUseThermicEffectAdjustment(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)]"
                />
              </div>
            </div>
          ) : (
            /* Simple Mode Dropdown */
            <div className="pt-2">
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                Flat Activity Level Multiplier
              </label>
              <select
                value={simpleActivityLevel}
                onChange={(e) => setSimpleActivityLevel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
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

        {/* Live TDEE & Calorie Target Calculation Breakdown Card (Section 38b & 38g) */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-semibold text-xs text-[var(--text-primary)]">
                Calculated energy expenditure breakdown
              </h3>
            </div>
            <span className="text-xs text-[var(--text-secondary)] bg-[var(--background)] border border-[var(--border)] px-2 py-0.5 rounded">
              Mifflin-St Jeor + MET components
            </span>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <span className="text-xs text-[var(--text-secondary)] block font-normal">Basal metabolic rate (BMR)</span>
              <span className="text-base font-semibold font-tabular text-[var(--text-primary)]">
                {tdeeBreakdown.bmr} <span className="text-xs text-[var(--text-secondary)] font-normal">kcal</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <span className="text-xs text-[var(--text-secondary)] block font-normal">Steps NEAT</span>
              <span className="text-base font-semibold font-tabular text-[var(--text-primary)]">
                +{tdeeBreakdown.stepCalories} <span className="text-xs text-[var(--text-secondary)] font-normal">kcal</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <span className="text-xs text-[var(--text-secondary)] block font-normal">Exercise workouts</span>
              <span className="text-base font-semibold font-tabular text-[var(--text-primary)]">
                +{tdeeBreakdown.dailyExerciseCalories} <span className="text-xs text-[var(--text-secondary)] font-normal">kcal</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <span className="text-xs text-[var(--text-secondary)] block font-normal">Total TDEE (Maintenance)</span>
              <span className="text-base font-semibold font-tabular text-[var(--accent)]">
                {tdeeBreakdown.tdee} <span className="text-xs text-[var(--text-secondary)] font-normal">kcal</span>
              </span>
            </div>
          </div>

          {/* Goal Deficit / Surplus banner & Suggested Target */}
          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Suggested target ({goalType === "lose" ? "Deficit" : goalType === "gain" ? "Surplus" : "Maintenance"}):
                </span>
                <span className="text-2xl font-semibold font-tabular text-[var(--accent)]">
                  {tdeeBreakdown.targetCalories} kcal/day
                </span>
                {tdeeBreakdown.deficitOrSurplus !== 0 && (
                  <span className="text-xs font-tabular text-[var(--text-secondary)]">
                    ({tdeeBreakdown.deficitOrSurplus > 0 ? "+" : ""}
                    {tdeeBreakdown.deficitOrSurplus} kcal)
                  </span>
                )}
              </div>

              <div className="text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-x-3 gap-y-1 font-tabular">
                <span>
                  Suggested macros:{" "}
                  <strong className="text-[var(--macro-protein)] font-semibold">
                    {tdeeBreakdown.suggestedMacros.protein}g P
                  </strong>{" "}
                  (2.0g/kg) •{" "}
                  <strong className="text-[var(--macro-carbs)] font-semibold">
                    {tdeeBreakdown.suggestedMacros.carbs}g C
                  </strong>{" "}
                  •{" "}
                  <strong className="text-[var(--macro-fat)] font-semibold">
                    {tdeeBreakdown.suggestedMacros.fat}g F
                  </strong>{" "}
                  (25%)
                </span>
              </div>
            </div>

            {/* 1-Click Apply Button */}
            <button
              type="button"
              onClick={handleApplySuggestedTarget}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 sm:py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:opacity-90 text-white font-medium text-xs shadow-xs shrink-0 transition self-start lg:self-auto touch-manipulation"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply suggested target</span>
            </button>
          </div>

          <div className="text-xs text-[var(--text-secondary)] flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Section 38g Note: Personal estimation tool, not medical advice. Mifflin-St Jeor, MET values, and step-calorie formulas provide evidence-based estimates.
            </span>
          </div>
        </div>
      </div>

      {/* 2. Daily Nutrition Targets */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">
              Daily nutrition targets
            </h2>
          </div>
          <span className="text-xs text-[var(--text-secondary)] font-normal">
            Manual override allowed
          </span>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Used across your Dashboard, Meal Planner, and batch recipes. Click &quot;Apply suggested target&quot; above to auto-populate from your profile.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Calories (kcal)
            </label>
            <input
              type="number"
              required
              value={dailyCalories}
              onChange={(e) => setDailyCalories(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--macro-protein)] mb-1">
              Protein (g)
            </label>
            <input
              type="number"
              step="0.5"
              required
              value={dailyProtein}
              onChange={(e) => setDailyProtein(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--macro-carbs)] mb-1">
              Carbs (g)
            </label>
            <input
              type="number"
              step="0.5"
              required
              value={dailyCarbs}
              onChange={(e) => setDailyCarbs(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--macro-fat)] mb-1">
              Fat (g)
            </label>
            <input
              type="number"
              step="0.5"
              required
              value={dailyFat}
              onChange={(e) => setDailyFat(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* 3. Preferences */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">
            Preferences &amp; Units
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Default Servings
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={defaultServings}
              onChange={(e) => setDefaultServings(Number(e.target.value) || 4)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Measurement System
            </label>
            <select
              value={measurementSystem}
              onChange={(e) => setMeasurementSystem(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            >
              <option value="metric">Metric (grams, ml, kg, cm)</option>
              <option value="imperial">Imperial (oz, lb, cups, ft/in)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Appearance
            </label>
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex-1 py-1 rounded-lg transition text-center",
                  theme === "light"
                    ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)]"
                )}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex-1 py-1 rounded-lg transition text-center",
                  theme === "dark"
                    ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)]"
                )}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={cn(
                  "flex-1 py-1 rounded-lg transition text-center",
                  theme === "system"
                    ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)]"
                )}
              >
                Auto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. AI & Ollama Configuration */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">
              Local AI Engine (Ollama)
            </h2>
          </div>
          <button
            type="button"
            onClick={handleTestOllama}
            disabled={isTestingOllama}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--background)] transition"
          >
            {isTestingOllama ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[var(--accent)]" />
            )}
            <span>Test Connection</span>
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)]">
          All recipe text parsing runs 100% locally via Ollama CPU inference. No cloud API keys needed for core operation.
        </p>

        {/* Ollama Test Result Banner */}
        {ollamaTestResult && (
          <div
            className={cn(
              "p-4 rounded-xl text-xs space-y-1.5",
              ollamaTestResult.isRunning
                ? "bg-[var(--ui-success-bg)] border border-[var(--ui-success-border)] text-[var(--ui-success)]"
                : "bg-[var(--ui-error-bg)] border border-[var(--ui-error-border)] text-[var(--ui-error)]"
            )}
          >
            <div className="flex items-center space-x-2 font-semibold">
              {ollamaTestResult.isRunning ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[var(--ui-success)]" />
                  <span>Ollama is online and connected!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-[var(--ui-error)]" />
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
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Ollama Base URL
            </label>
            <input
              type="text"
              required
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
              placeholder="http://localhost:11434"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Model Name for Text Parsing
            </label>
            <input
              type="text"
              required
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
              placeholder="qwen2.5:7b"
            />
          </div>
        </div>

        {/* Screenshot Parsing Pipeline */}
        <div className="pt-2 border-t border-[var(--border)] space-y-3">
          <label className="block text-xs font-semibold text-[var(--text-primary)]">
            Screenshot Parsing Pipeline
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setScreenshotMethod("ocr_local")}
              className={cn(
                "p-3 rounded-xl border text-left transition",
                screenshotMethod === "ocr_local"
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] font-medium text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <div className="font-semibold">OCR + Local Model (Default)</div>
              <div className="text-[11px] text-[var(--text-secondary)] font-normal mt-0.5">
                Tesseract OCR extracts text, then local LLM structures it. 100% offline.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScreenshotMethod("vision_local")}
              className={cn(
                "p-3 rounded-xl border text-left transition",
                screenshotMethod === "vision_local"
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] font-medium text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <div className="font-semibold">Local Vision Model</div>
              <div className="text-[11px] text-[var(--text-secondary)] font-normal mt-0.5">
                Direct multimodal inference via Ollama (e.g. Qwen2-VL or LLaVA).
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScreenshotMethod("cloud_vision")}
              className={cn(
                "p-3 rounded-xl border text-left transition",
                screenshotMethod === "cloud_vision"
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] font-medium text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <div className="font-semibold">Cloud Fallback</div>
              <div className="text-[11px] text-[var(--text-secondary)] font-normal mt-0.5">
                Optional cloud API for screenshot OCR fallback only.
              </div>
            </button>
          </div>

          {screenshotMethod === "cloud_vision" && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Cloud Vision API Key (Optional fallback)
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
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
              />
            </div>
          )}
        </div>
      </div>

      {/* 5. External Nutrition Data Sources (Section 39) */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">
            External Nutrition Data Sources (Section 39)
          </h2>
        </div>

        <p className="text-xs text-[var(--text-secondary)]">
          The app searches two free, legitimate food sources to cover both whole ingredients and branded items without requiring private APIs. Lookups are saved permanently to your local database for 100% offline access.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]/50 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span>Primary: USDA FoodData Central</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Official U.S. government database for whole ingredients (meats, grains, produce, dairy) with distinct raw vs. cooked profiles.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]/50 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
              <span className="w-2 h-2 rounded-full bg-[#4C6E8C]" />
              <span>Secondary: Open Food Facts</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Crowdsourced open database for commercial packaged goods, protein powders, snacks, and barcode (UPC/EAN) lookups.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--border)] space-y-2">
          <label className="block text-xs font-medium text-[var(--text-primary)]">
            USDA FoodData Central API Key <span className="font-normal text-[var(--text-secondary)]">(Optional personal key)</span>
          </label>
          <input
            type="password"
            placeholder={
              hasUsdaApiKey
                ? "•••••••• (Custom USDA Key saved, type to replace)"
                : "DEMO_KEY active by default (30 req/hr). Enter personal key for 1,000 req/hr."
            }
            value={usdaApiKey}
            onChange={(e) => setUsdaApiKey(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
          />
          <p className="text-[11px] text-[var(--text-secondary)]">
            Free instant signup at{" "}
            <a
              href="https://fdc.nal.usda.gov/api-key-signup.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              fdc.nal.usda.gov/api-key-signup.html
            </a>
            . Open Food Facts requires no key.
          </p>
        </div>
      </div>
    </form>
  );
}
