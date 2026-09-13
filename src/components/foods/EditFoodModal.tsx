"use client";

import React, { useState, useEffect } from "react";
import { X, Edit2, Loader2, Check, Sparkles } from "lucide-react";
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
  const [category, setCategory] = useState("Meat");
  const [rawOrCooked, setRawOrCooked] = useState("unspecified");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("g");
  const [servingWeight, setServingWeight] = useState("100");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && food) {
      setName(food.name || "");
      setCategory(food.category || "Meat");
      setRawOrCooked(food.rawOrCooked || "unspecified");
      setCalories(String(food.caloriesPer100g ?? "0"));
      setProtein(String(food.proteinPer100g ?? "0"));
      setCarbs(String(food.carbsPer100g ?? "0"));
      setFat(String(food.fatPer100g ?? "0"));
      setFiber(String(food.fiberPer100g ?? "0"));
      setDefaultUnit(food.defaultUnit || "g");
      setServingWeight(String(food.servingWeightGrams ?? "100"));
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
      const res = await fetch(`/api/foods/${food.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          rawOrCooked,
          caloriesPer100g: Number(calories) || 0,
          proteinPer100g: Number(protein) || 0,
          carbsPer100g: Number(carbs) || 0,
          fatPer100g: Number(fat) || 0,
          fiberPer100g: Number(fiber) || 0,
          defaultUnit: defaultUnit.trim() || "g",
          servingWeightGrams: Number(servingWeight) || 100,
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
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition"
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
          {/* Food Name */}
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
              placeholder="e.g. Burrito Beef Cheese Meal"
            />
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
                <option value="McDonald's">McDonald&apos;s</option>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Default Serving Weight (g)
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
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Default Unit Label
              </label>
              <input
                type="text"
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value)}
                placeholder="e.g. g, serving, piece"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition"
              />
            </div>
          </div>

          {/* Macronutrients Grid (Per 100g) */}
          <div className="pt-2 border-t border-[var(--border)] space-y-2">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
              Nutrition Values (Per 100g)
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

          {/* Actions */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition"
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
