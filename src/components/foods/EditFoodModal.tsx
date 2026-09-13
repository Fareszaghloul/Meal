"use client";

import React, { useState, useEffect } from "react";
import { X, Edit2, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  food: any | null;
}

export function EditFoodModal({
  isOpen,
  onClose,
  onSuccess,
  food,
}: EditFoodModalProps) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Meat");
  const [rawOrCooked, setRawOrCooked] = useState("unspecified");
  const [servingSize, setServingSize] = useState("1");
  const [servingUnit, setServingUnit] = useState("g");
  const [servingWeight, setServingWeight] = useState("100");
  const [nutritionBasis, setNutritionBasis] = useState("PER_SERVING");

  // Core values
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  // Additional values
  const [fiber, setFiber] = useState("");
  const [totalSugars, setTotalSugars] = useState("");
  const [addedSugars, setAddedSugars] = useState("");
  const [saturatedFat, setSaturatedFat] = useState("");
  const [transFat, setTransFat] = useState("");
  const [sodium, setSodium] = useState("");

  const [showAdditional, setShowAdditional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && food) {
      setName(food.name || "");
      setBrand(food.brand || "");
      setCategory(food.category || "Meat");
      setRawOrCooked(food.rawOrCooked || "unspecified");
      setServingSize(String(food.servingSize ?? "1"));
      setServingUnit(food.servingUnit || food.defaultUnit || "g");
      setServingWeight(String(food.servingWeightGrams ?? "100"));
      setNutritionBasis(food.nutritionBasis || "PER_SERVING");

      // Core per 100g
      setCalories(String(food.caloriesPer100g ?? "0"));
      setProtein(String(food.proteinPer100g ?? "0"));
      setCarbs(String(food.carbsPer100g ?? "0"));
      setFat(String(food.fatPer100g ?? "0"));

      // Additional per 100g (nullable)
      setFiber(food.fiberPer100g !== null && food.fiberPer100g !== undefined ? String(food.fiberPer100g) : "");
      setTotalSugars(food.totalSugarsPer100g !== null && food.totalSugarsPer100g !== undefined ? String(food.totalSugarsPer100g) : "");
      setAddedSugars(food.addedSugarsPer100g !== null && food.addedSugarsPer100g !== undefined ? String(food.addedSugarsPer100g) : "");
      setSaturatedFat(food.saturatedFatPer100g !== null && food.saturatedFatPer100g !== undefined ? String(food.saturatedFatPer100g) : "");
      setTransFat(food.transFatPer100g !== null && food.transFatPer100g !== undefined ? String(food.transFatPer100g) : "");
      setSodium(food.sodiumPer100g !== null && food.sodiumPer100g !== undefined ? String(food.sodiumPer100g) : "");

      setErrorMessage(null);
    }
  }, [isOpen, food]);

  if (!isOpen || !food) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Food name is required");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const parseNum = (val: string) => {
        if (val === "" || val === null || val === undefined) return null;
        const n = Number(val);
        return isNaN(n) ? null : n;
      };

      const res = await fetch(`/api/foods/${food.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || null,
          category: category.trim(),
          rawOrCooked,
          servingSize: Number(servingSize) || 1,
          servingUnit: servingUnit.trim() || "g",
          servingWeightGrams: Number(servingWeight) || 100,
          nutritionBasis,
          defaultUnit: servingUnit.trim() || "g",

          // Core per 100g
          caloriesPer100g: Number(calories) || 0,
          proteinPer100g: Number(protein) || 0,
          carbsPer100g: Number(carbs) || 0,
          fatPer100g: Number(fat) || 0,

          // Additional per 100g
          fiberPer100g: parseNum(fiber),
          totalSugarsPer100g: parseNum(totalSugars),
          addedSugarsPer100g: parseNum(addedSugars),
          saturatedFatPer100g: parseNum(saturatedFat),
          transFatPer100g: parseNum(transFat),
          sodiumPer100g: parseNum(sodium),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update food");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving changes");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                Edit Food Details
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Update nutritional values per 100g, category, and serving sizes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-[var(--ui-error-bg)] border border-[var(--ui-error-border)] text-[var(--ui-error)] text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Food Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Food Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition"
                placeholder="e.g. Greek Yogurt 0%"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition"
                placeholder="e.g. Fage, Chobani"
              />
            </div>
          </div>

          {/* Category & State Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition"
              >
                <option value="Meat">Meat</option>
                <option value="Poultry">Poultry</option>
                <option value="Dairy">Dairy</option>
                <option value="Produce">Produce</option>
                <option value="Grains">Grains</option>
                <option value="Fast Food">Fast Food</option>
                <option value="Pantry">Pantry</option>
                <option value="Snacks">Snacks</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Raw or Cooked
              </label>
              <select
                value={rawOrCooked}
                onChange={(e) => setRawOrCooked(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition"
              >
                <option value="raw">Raw</option>
                <option value="cooked">Cooked</option>
                <option value="unspecified">Unspecified</option>
              </select>
            </div>
          </div>

          {/* Serving info */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Serving Size
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] font-mono focus:outline-hidden focus:border-[var(--accent)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Unit Label
              </label>
              <input
                type="text"
                value={servingUnit}
                onChange={(e) => setServingUnit(e.target.value)}
                placeholder="e.g. g, bar, scoop"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Weight (g)
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={servingWeight}
                onChange={(e) => setServingWeight(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] font-mono focus:outline-hidden focus:border-[var(--accent)] transition"
              />
            </div>
          </div>

          {/* Macronutrients Grid (Per 100g) */}
          <div className="pt-2 border-t border-[var(--border)] space-y-2">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
              Core Nutrition (Per 100g)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-primary)] mb-1">
                  Calories
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] font-mono font-bold focus:outline-hidden focus:border-[var(--accent)] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--macro-protein)] mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--macro-protein)] font-mono font-bold focus:outline-hidden focus:border-[var(--accent)] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--macro-carbs)] mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--macro-carbs)] font-mono font-bold focus:outline-hidden focus:border-[var(--accent)] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--macro-fat)] mb-1">
                  Fat (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--macro-fat)] font-mono font-bold focus:outline-hidden focus:border-[var(--accent)] transition"
                />
              </div>
            </div>
          </div>

          {/* Additional Nutrition Section */}
          <div className="pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowAdditional(!showAdditional)}
              className="w-full flex items-center justify-between py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            >
              <span className="uppercase tracking-wider">Additional Nutrition (Fibers, Sugars, Fats, Sodium)</span>
              {showAdditional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdditional && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Fiber (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Not specified"
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Total Sugars (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Not specified"
                    value={totalSugars}
                    onChange={(e) => setTotalSugars(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Added Sugars (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Not specified"
                    value={addedSugars}
                    onChange={(e) => setAddedSugars(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Saturated Fat (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Not specified"
                    value={saturatedFat}
                    onChange={(e) => setSaturatedFat(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Trans Fat (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Not specified"
                    value={transFat}
                    onChange={(e) => setTransFat(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Sodium (mg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Not specified"
                    value={sodium}
                    onChange={(e) => setSodium(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Save changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
