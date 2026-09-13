"use client";

import React, { useState, useEffect } from "react";
import {
  Check,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { ParsedNutritionLabel } from "@/lib/nutrition/label-parser";
import { cn } from "@/lib/utils";

interface NutritionScanReviewProps {
  parsedData: ParsedNutritionLabel;
  onSaveSuccess: (food: any) => void;
  onRetake: () => void;
  onCancel: () => void;
}

export function NutritionScanReview({
  parsedData,
  onSaveSuccess,
  onRetake,
  onCancel,
}: NutritionScanReviewProps) {
  // Basic Information
  const [foodName, setFoodName] = useState(parsedData.foodName || "");
  const [brand, setBrand] = useState(parsedData.brand || "");
  const [category, setCategory] = useState("Pantry");
  const [rawOrCooked, setRawOrCooked] = useState("unspecified");
  const [servingSize, setServingSize] = useState<string>(
    parsedData.servingSize !== undefined ? String(parsedData.servingSize) : "1"
  );
  const [servingUnit, setServingUnit] = useState(parsedData.servingUnit || "serving");
  const [servingWeightGrams, setServingWeightGrams] = useState<string>(
    parsedData.servingWeightGrams !== undefined
      ? String(parsedData.servingWeightGrams)
      : parsedData.servingUnit === "g" && parsedData.servingSize
      ? String(parsedData.servingSize)
      : "100"
  );
  const [nutritionBasis, setNutritionBasis] = useState<
    "PER_SERVING" | "PER_100G" | "PER_100ML" | "PER_CONTAINER"
  >(parsedData.nutritionBasis || "PER_SERVING");

  // Core Nutrients
  const [calories, setCalories] = useState<string>(
    parsedData.calories !== undefined ? String(parsedData.calories) : ""
  );
  const [protein, setProtein] = useState<string>(
    parsedData.protein !== undefined ? String(parsedData.protein) : ""
  );
  const [carbs, setCarbs] = useState<string>(
    parsedData.carbohydrates !== undefined ? String(parsedData.carbohydrates) : ""
  );
  const [fat, setFat] = useState<string>(
    parsedData.fat !== undefined ? String(parsedData.fat) : ""
  );

  // Additional Nutrients (nullable)
  const [fiber, setFiber] = useState<string>(
    parsedData.fiber !== null && parsedData.fiber !== undefined ? String(parsedData.fiber) : ""
  );
  const [totalSugars, setTotalSugars] = useState<string>(
    parsedData.totalSugars !== null && parsedData.totalSugars !== undefined
      ? String(parsedData.totalSugars)
      : ""
  );
  const [addedSugars, setAddedSugars] = useState<string>(
    parsedData.addedSugars !== null && parsedData.addedSugars !== undefined
      ? String(parsedData.addedSugars)
      : ""
  );
  const [saturatedFat, setSaturatedFat] = useState<string>(
    parsedData.saturatedFat !== null && parsedData.saturatedFat !== undefined
      ? String(parsedData.saturatedFat)
      : ""
  );
  const [transFat, setTransFat] = useState<string>(
    parsedData.transFat !== null && parsedData.transFat !== undefined
      ? String(parsedData.transFat)
      : ""
  );
  const [sodium, setSodium] = useState<string>(
    parsedData.sodium !== null && parsedData.sodium !== undefined ? String(parsedData.sodium) : ""
  );

  // UI States
  const [showAdditional, setShowAdditional] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Duplicate Food State
  const [duplicateCandidate, setDuplicateCandidate] = useState<any | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Check for potential duplicate food when name/brand changes
  useEffect(() => {
    if (!foodName.trim()) return;

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const params = new URLSearchParams({
          name: foodName.trim(),
          ...(brand.trim() ? { brand: brand.trim() } : {}),
          ...(servingSize ? { servingSize } : {}),
        });
        const res = await fetch(`/api/foods/check-duplicate?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setDuplicateCandidate(data.duplicate || null);
        }
      } catch {
        // Non-blocking duplicate check
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [foodName, brand, servingSize]);

  const handleSave = async (forceCreate: boolean = false) => {
    if (!foodName.trim()) {
      setErrorMsg("Food name is required");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: Record<string, any> = {
        name: foodName.trim(),
        brand: brand.trim() || null,
        source: "SCANNED",
        category,
        rawOrCooked,
        servingSize: parseFloat(servingSize) || 1,
        servingUnit: servingUnit.trim() || "g",
        servingWeightGrams: parseFloat(servingWeightGrams) || 100,
        nutritionBasis,
        defaultUnit: servingUnit.trim() || "g",
        forceCreate,
      };

      // Set values based on nutrition basis
      const isServing = nutritionBasis === "PER_SERVING";
      const calNum = parseFloat(calories);
      const proNum = parseFloat(protein);
      const carbsNum = parseFloat(carbs);
      const fatNum = parseFloat(fat);

      if (isServing) {
        payload.caloriesPerServing = !isNaN(calNum) ? calNum : 0;
        payload.proteinPerServing = !isNaN(proNum) ? proNum : 0;
        payload.carbsPerServing = !isNaN(carbsNum) ? carbsNum : 0;
        payload.fatPerServing = !isNaN(fatNum) ? fatNum : 0;
        payload.fiberPerServing = fiber !== "" ? parseFloat(fiber) : null;
        payload.totalSugarsPerServing = totalSugars !== "" ? parseFloat(totalSugars) : null;
        payload.addedSugarsPerServing = addedSugars !== "" ? parseFloat(addedSugars) : null;
        payload.saturatedFatPerServing = saturatedFat !== "" ? parseFloat(saturatedFat) : null;
        payload.transFatPerServing = transFat !== "" ? parseFloat(transFat) : null;
        payload.sodiumPerServing = sodium !== "" ? parseFloat(sodium) : null;
      } else {
        payload.caloriesPer100g = !isNaN(calNum) ? calNum : 0;
        payload.proteinPer100g = !isNaN(proNum) ? proNum : 0;
        payload.carbsPer100g = !isNaN(carbsNum) ? carbsNum : 0;
        payload.fatPer100g = !isNaN(fatNum) ? fatNum : 0;
        payload.fiberPer100g = fiber !== "" ? parseFloat(fiber) : null;
        payload.totalSugarsPer100g = totalSugars !== "" ? parseFloat(totalSugars) : null;
        payload.addedSugarsPer100g = addedSugars !== "" ? parseFloat(addedSugars) : null;
        payload.saturatedFatPer100g = saturatedFat !== "" ? parseFloat(saturatedFat) : null;
        payload.transFatPer100g = transFat !== "" ? parseFloat(transFat) : null;
        payload.sodiumPer100g = sodium !== "" ? parseFloat(sodium) : null;
      }

      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.existingFood) {
          setDuplicateCandidate(data.existingFood);
          setErrorMsg("A food with this name already exists.");
          return;
        }
        throw new Error(data.error || "Failed to save food");
      }

      onSaveSuccess(data);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving food");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUncertain = (field: string) => parsedData.uncertainFields.includes(field);

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
      {/* 1. Clear Guidance Banner */}
      <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-secondary)] flex items-start space-x-2">
        <Info className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-[var(--text-primary)]">
            Review the extracted nutrition information before saving.
          </p>
          <p className="mt-0.5 text-[11px]">
            Every field can be edited. Leave fields blank if they are not specified on your packaging.
          </p>
        </div>
      </div>

      {/* 2. Salt Warning Notice */}
      {parsedData.saltDetected && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
          <div className="flex items-center space-x-1.5 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Salt Detected on Packaging</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            The packaging lists <strong>{parsedData.detectedSaltGrams}g salt</strong> instead of sodium.
            This has been converted to approx. <strong>{sodium} mg sodium</strong> (1g salt ≈ 400mg sodium).
            Please verify or adjust as needed.
          </p>
        </div>
      )}

      {/* 3. Duplicate Food Notice */}
      {duplicateCandidate && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>This food may already exist</span>
            </div>
            <button
              type="button"
              onClick={() => setDuplicateCandidate(null)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            <strong>{duplicateCandidate.brand ? `${duplicateCandidate.brand} ` : ""}{duplicateCandidate.name}</strong> •{" "}
            {duplicateCandidate.caloriesPerServing || duplicateCandidate.caloriesPer100g} kcal
          </p>
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={() => onSaveSuccess(duplicateCandidate)}
              className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
            >
              Use existing food
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-white text-[11px] font-medium hover:bg-[var(--accent-hover)] transition cursor-pointer"
            >
              Save as new food
            </button>
          </div>
        </div>
      )}

      {/* 4. Basic Information */}
      <div className="space-y-3 pt-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Basic Information
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Food Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dark Chocolate Almond Bar"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Brand (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Kind, Barebells, Chobani"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            >
              <option value="Pantry">Pantry</option>
              <option value="Snacks">Snacks</option>
              <option value="Dairy">Dairy</option>
              <option value="Beverages">Beverages</option>
              <option value="Grains">Grains</option>
              <option value="Meat">Meat</option>
              <option value="Produce">Produce</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Nutrition Basis
            </label>
            <select
              value={nutritionBasis}
              onChange={(e) => setNutritionBasis(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            >
              <option value="PER_SERVING">Per Serving</option>
              <option value="PER_100G">Per 100g</option>
              <option value="PER_100ML">Per 100ml</option>
              <option value="PER_CONTAINER">Per Package</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Serving Size
            </label>
            <input
              type="number"
              step="any"
              placeholder="1"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Serving Unit
            </label>
            <input
              type="text"
              placeholder="e.g. g, bar, scoop, slice"
              value={servingUnit}
              onChange={(e) => setServingUnit(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {nutritionBasis === "PER_SERVING" && (
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
              Weight in grams per serving (used for recipe scaling)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="any"
                placeholder="100"
                value={servingWeightGrams}
                onChange={(e) => setServingWeightGrams(e.target.value)}
                className="w-32 px-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">grams</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Core Nutrition */}
      <div className="space-y-2.5 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Core Nutrition {nutritionBasis === "PER_SERVING" ? "(Per Serving)" : "(Per 100g)"}
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-[var(--text-secondary)]">Calories</label>
              {isUncertain("calories") && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Verify</span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="1"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 text-xs rounded-xl border bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]",
                  isUncertain("calories") ? "border-amber-500/50" : "border-[var(--border)]"
                )}
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">kcal</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-[var(--text-secondary)]">Protein</label>
              {isUncertain("protein") && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Verify</span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 text-xs rounded-xl border bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]",
                  isUncertain("protein") ? "border-amber-500/50" : "border-[var(--border)]"
                )}
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-[var(--text-secondary)]">Total Carbs</label>
              {isUncertain("carbohydrates") && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Verify</span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 text-xs rounded-xl border bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]",
                  isUncertain("carbohydrates") ? "border-amber-500/50" : "border-[var(--border)]"
                )}
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-[var(--text-secondary)]">Total Fat</label>
              {isUncertain("fat") && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Verify</span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 text-xs rounded-xl border bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]",
                  isUncertain("fat") ? "border-amber-500/50" : "border-[var(--border)]"
                )}
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Additional Nutrition Details */}
      <div className="pt-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={() => setShowAdditional(!showAdditional)}
          className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
        >
          <span className="uppercase tracking-wider">Additional Nutrition (Fibers, Sugars, Fats, Sodium)</span>
          {showAdditional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdditional && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--text-secondary)]">Dietary Fiber</label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Not specified"
                  value={fiber}
                  onChange={(e) => setFiber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--text-secondary)]">Total Sugars</label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Not specified"
                  value={totalSugars}
                  onChange={(e) => setTotalSugars(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--text-secondary)]">Added Sugars</label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Not specified"
                  value={addedSugars}
                  onChange={(e) => setAddedSugars(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--text-secondary)]">Saturated Fat</label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Not specified"
                  value={saturatedFat}
                  onChange={(e) => setSaturatedFat(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--text-secondary)]">Trans Fat</label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Not specified"
                  value={transFat}
                  onChange={(e) => setTransFat(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--text-secondary)]">Sodium</label>
                {isUncertain("sodium") && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Verify</span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  placeholder="Not specified"
                  value={sodium}
                  onChange={(e) => setSodium(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-xs rounded-xl border bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]",
                    isUncertain("sodium") ? "border-amber-500/50" : "border-[var(--border)]"
                  )}
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">mg</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
          {errorMsg}
        </div>
      )}

      {/* 7. Footer Actions */}
      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retake Photo</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Save Food</span>
          </button>
        </div>
      </div>
    </div>
  );
}
