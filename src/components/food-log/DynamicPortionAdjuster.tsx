"use client";

import React, { useState, useEffect } from "react";
import { Flame, Dna, Wheat, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScaledNutrition {
  grams: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface DynamicPortionAdjusterProps {
  baseWeightGrams: number; // e.g. 100g
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  baseFiber?: number;
  initialGrams?: number;
  initialServings?: number;
  unitLabel?: string;
  onChange: (scaled: ScaledNutrition) => void;
  className?: string;
}

export function DynamicPortionAdjuster({
  baseWeightGrams = 100,
  baseCalories = 0,
  baseProtein = 0,
  baseCarbs = 0,
  baseFat = 0,
  baseFiber = 0,
  initialGrams,
  initialServings,
  unitLabel = "g",
  onChange,
  className,
}: DynamicPortionAdjusterProps) {
  const safeBaseGrams = baseWeightGrams > 0 ? baseWeightGrams : 100;

  // Internal inputs
  const defaultStartingGrams = initialGrams ?? (initialServings ? initialServings * safeBaseGrams : safeBaseGrams);
  const [gramsInput, setGramsInput] = useState<string>(String(Math.round(defaultStartingGrams * 10) / 10));
  const [servingsInput, setServingsInput] = useState<string>(
    String(Math.round((defaultStartingGrams / safeBaseGrams) * 100) / 100)
  );

  // Sync if baseWeightGrams or initial inputs change
  useEffect(() => {
    const g = initialGrams ?? (initialServings ? initialServings * safeBaseGrams : safeBaseGrams);
    setGramsInput(String(Math.round(g * 10) / 10));
    setServingsInput(String(Math.round((g / safeBaseGrams) * 100) / 100));
  }, [baseWeightGrams, initialGrams, initialServings, safeBaseGrams]);

  const currentGrams = Math.max(0, parseFloat(gramsInput) || 0);
  const multiplier = safeBaseGrams > 0 ? currentGrams / safeBaseGrams : 1;

  const currentCalories = Math.round(baseCalories * multiplier);
  const currentProtein = Math.round(baseProtein * multiplier * 10) / 10;
  const currentCarbs = Math.round(baseCarbs * multiplier * 10) / 10;
  const currentFat = Math.round(baseFat * multiplier * 10) / 10;
  const currentFiber = Math.round(baseFiber * multiplier * 10) / 10;
  const currentServings = Math.round(multiplier * 100) / 100;

  // Ref-stabilized onChange to avoid render loops if parent provides inline function
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  // Notify parent on change
  useEffect(() => {
    onChangeRef.current({
      grams: currentGrams,
      servings: currentServings,
      calories: currentCalories,
      protein: currentProtein,
      carbs: currentCarbs,
      fat: currentFat,
      fiber: currentFiber,
    });
  }, [currentGrams, currentServings, currentCalories, currentProtein, currentCarbs, currentFat, currentFiber]);

  const handleGramsChange = (val: string) => {
    setGramsInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      const computedServings = Math.round((parsed / safeBaseGrams) * 100) / 100;
      setServingsInput(String(computedServings));
    }
  };

  const handleServingsChange = (val: string) => {
    setServingsInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      const computedGrams = Math.round(parsed * safeBaseGrams * 10) / 10;
      setGramsInput(String(computedGrams));
    }
  };

  const applyMultiplier = (mult: number) => {
    const newGrams = Math.round(safeBaseGrams * mult * 10) / 10;
    setGramsInput(String(newGrams));
    setServingsInput(String(mult));
  };

  const addGrams = (delta: number) => {
    const next = Math.max(0, Math.round((currentGrams + delta) * 10) / 10);
    setGramsInput(String(next));
    setServingsInput(String(Math.round((next / safeBaseGrams) * 100) / 100));
  };

  return (
    <div className={cn("p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] space-y-3.5", className)}>
      {/* Portion Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <span className="text-xs font-semibold text-[var(--text-primary)] block">
            Portion &amp; Gram Scaling
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">
            Base: {safeBaseGrams} {unitLabel} = {Math.round(baseCalories)} kcal
          </span>
        </div>

        {/* Quick Multiplier Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => applyMultiplier(0.5)}
            className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition cursor-pointer"
          >
            0.5x
          </button>
          <button
            type="button"
            onClick={() => applyMultiplier(1)}
            className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition cursor-pointer"
          >
            1x
          </button>
          <button
            type="button"
            onClick={() => applyMultiplier(1.5)}
            className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition cursor-pointer"
          >
            1.5x
          </button>
          <button
            type="button"
            onClick={() => applyMultiplier(2)}
            className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition cursor-pointer"
          >
            2x
          </button>
          <button
            type="button"
            onClick={() => addGrams(50)}
            className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition cursor-pointer"
          >
            +50g
          </button>
          <button
            type="button"
            onClick={() => addGrams(100)}
            className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition cursor-pointer"
          >
            +100g
          </button>
        </div>
      </div>

      {/* Dual Synchronized Inputs: Grams and Servings */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
            Weight ({unitLabel})
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="1"
              value={gramsInput}
              onChange={(e) => handleGramsChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-mono font-bold text-sm focus:outline-hidden focus:border-[var(--accent)] transition"
              placeholder="e.g. 200"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] font-medium">
              {unitLabel}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
            Servings (multiplier)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={servingsInput}
              onChange={(e) => handleServingsChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-mono font-bold text-sm focus:outline-hidden focus:border-[var(--accent)] transition"
              placeholder="e.g. 1.5"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] font-medium">
              serv
            </span>
          </div>
        </div>
      </div>

      {/* Live Calculated Macronutrients Preview */}
      <div className="pt-2 border-t border-[var(--border)]">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
          <span>Scaled Nutrition ({currentGrams}{unitLabel})</span>
          <span className="text-[var(--accent)] font-bold">{currentCalories} kcal</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-[var(--accent)]" />
              <span>Calories</span>
            </div>
            <div className="text-xs font-bold text-[var(--text-primary)] font-mono mt-0.5">
              {currentCalories}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1">
              <Dna className="w-3 h-3 text-[var(--macro-protein)]" />
              <span>Protein</span>
            </div>
            <div className="text-xs font-bold text-[var(--macro-protein)] font-mono mt-0.5">
              {currentProtein}g
            </div>
          </div>

          <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1">
              <Wheat className="w-3 h-3 text-[var(--macro-carbs)]" />
              <span>Carbs</span>
            </div>
            <div className="text-xs font-bold text-[var(--macro-carbs)] font-mono mt-0.5">
              {currentCarbs}g
            </div>
          </div>

          <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-secondary)] flex items-center justify-center gap-1">
              <Droplet className="w-3 h-3 text-[var(--macro-fat)]" />
              <span>Fat</span>
            </div>
            <div className="text-xs font-bold text-[var(--macro-fat)] font-mono mt-0.5">
              {currentFat}g
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
