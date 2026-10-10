"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Sparkles,
  ArrowUpDown,
  Tag as TagIcon,
  ChevronDown,
  Globe,
  Database,
  DownloadCloud,
  Loader2,
  Check,
  Search,
} from "lucide-react";
import { ParsedRecipe, ParsedIngredient } from "@/lib/ai/types";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { cn } from "@/lib/utils";

interface RecipeReviewFormProps {
  initialData: ParsedRecipe;
  sourcePlatform?: string;
  sourceUrl?: string;
  warnings?: string[];
  onCancel?: () => void;
  onSaved?: (newId: string) => void;
}

export function RecipeReviewForm({
  initialData,
  sourcePlatform = "Manual",
  sourceUrl,
  warnings = [],
  onCancel,
  onSaved,
}: RecipeReviewFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData.name || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [servings, setServings] = useState(initialData.servings || 4);
  const [prepTime, setPrepTime] = useState<number | string>(
    initialData.prepTimeMinutes || ""
  );
  const [cookTime, setCookTime] = useState<number | string>(
    initialData.cookTimeMinutes || ""
  );
  const [tags, setTags] = useState<string[]>(initialData.tags || ["meal-prep"]);
  const [tagInput, setTagInput] = useState("");

  const [ingredients, setIngredients] = useState<
    Array<ParsedIngredient & { id: string }>
  >(
    (initialData.ingredients || []).map((ing, i) => ({
      ...ing,
      id: `ing-${Date.now()}-${i}`,
    }))
  );

  const [instructions, setInstructions] = useState<
    Array<{ id: string; text: string }>
  >(
    (initialData.instructions || []).map((inst, i) => ({
      id: `inst-${Date.now()}-${i}`,
      text: typeof inst === "string" ? inst : "",
    }))
  );

  // Nutrition state
  const [calories, setCalories] = useState<number | string>(
    initialData.nutrition?.calories ?? ""
  );
  const [protein, setProtein] = useState<number | string>(
    initialData.nutrition?.protein ?? ""
  );
  const [carbs, setCarbs] = useState<number | string>(
    initialData.nutrition?.carbs ?? ""
  );
  const [fat, setFat] = useState<number | string>(
    initialData.nutrition?.fat ?? ""
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // External Ingredient Lookup Modal State
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupTargetId, setLookupTargetId] = useState<string | null>(null);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [isSearchingLookup, setIsSearchingLookup] = useState(false);
  const [isImportingLookup, setIsImportingLookup] = useState(false);

  const openIngredientLookup = (ingId: string, currentName: string) => {
    setLookupTargetId(ingId);
    setLookupQuery(currentName || "");
    setLookupResults([]);
    setIsLookupOpen(true);
    if (currentName.trim()) {
      executeLookup(currentName.trim());
    }
  };

  const executeLookup = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingLookup(true);
    try {
      const res = await fetch(`/api/foods/external/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        setLookupResults(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingLookup(false);
    }
  };

  const applyLookupSelection = async (candidate: any) => {
    if (!lookupTargetId) return;
    setIsImportingLookup(true);
    try {
      // Import candidate into local Food database so it's permanently stored
      await fetch("/api/foods/external/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidate),
      });

      // Update the ingredient in state
      setIngredients((prev) =>
        prev.map((ing) => {
          if (ing.id === lookupTargetId) {
            return {
              ...ing,
              rawName: candidate.name,
              unit: candidate.defaultUnit || ing.unit,
            };
          }
          return ing;
        })
      );
      setIsLookupOpen(false);
    } catch (err) {
      console.error("Error linking external food:", err);
    } finally {
      setIsImportingLookup(false);
    }
  };

  // Add ingredient
  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      {
        id: `ing-${Date.now()}-${prev.length}`,
        rawName: "",
        quantity: 100,
        unit: "g",
        uncertainQuantity: false,
      },
    ]);
  };

  // Remove ingredient
  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  // Update ingredient
  const updateIngredient = (
    id: string,
    field: keyof ParsedIngredient,
    val: unknown
  ) => {
    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  // Add step
  const addInstruction = () => {
    setInstructions((prev) => [
      ...prev,
      { id: `inst-${Date.now()}-${prev.length}`, text: "" },
    ]);
  };

  // Remove step
  const removeInstruction = (id: string) => {
    setInstructions((prev) => prev.filter((item) => item.id !== id));
  };

  // Update step
  const updateInstruction = (id: string, text: string) => {
    setInstructions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
  };

  // Tags
  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const clean = tagInput.trim().toLowerCase().replace(/#/g, "");
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Save recipe to database
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Recipe name is required");
      return;
    }
    if (ingredients.length === 0) {
      setErrorMsg("At least one ingredient is required");
      return;
    }
    if (instructions.length === 0) {
      setErrorMsg("At least one instruction step is required");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");

    try {
      const payload = {
        name,
        description,
        servings: Number(servings) || 4,
        prepTimeMinutes: prepTime ? Number(prepTime) : null,
        cookTimeMinutes: cookTime ? Number(cookTime) : null,
        sourcePlatform,
        sourceUrl,
        tags,
        ingredients: ingredients.map((ing) => ({
          rawName: ing.rawName,
          quantity: Number(ing.quantity) || 1,
          unit: ing.unit,
          notes: ing.notes,
        })),
        instructions: instructions.map((inst) => inst.text),
        nutrition:
          calories || protein
            ? {
                calories: Number(calories) || 0,
                protein: Number(protein) || 0,
                carbs: Number(carbs) || 0,
                fat: Number(fat) || 0,
              }
            : null,
      };

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save recipe");
      }

      const saved = await res.json();
      if (onSaved) {
        onSaved(saved.id);
      } else {
        router.push(`/recipes/${saved.id}`);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving recipe");
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header Notification Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--border)] text-[var(--text-primary)]">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-[var(--accent)] text-[var(--on-accent)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Review recipe before saving</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              AI structured this recipe. Every field is editable below. Verify ingredients and servings before saving.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="tap-target px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save recipe"}
          </button>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--ui-error-bg)] border border-[var(--ui-error-border)] text-[var(--ui-error)] space-y-1 text-xs">
          <div className="flex items-center font-semibold mb-1">
            <AlertTriangle className="w-4 h-4 mr-1.5 text-[var(--ui-error)]" />
            <span>Notices for review:</span>
          </div>
          {warnings.map((w, i) => (
            <p key={i} className="pl-5 list-disc">• {w}</p>
          ))}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-[var(--ui-error-bg)] border border-[var(--ui-error-border)] text-[var(--ui-error)] text-xs">
          {errorMsg}
        </div>
      )}

      {/* Basic Metadata Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--surface)] space-y-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
          Recipe overview
        </h2>

        <div>
          <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Recipe name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-base font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            placeholder="e.g. High Protein Chicken Rice Bowl"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            placeholder="Short notes about the meal, flavors, or prep instructions..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Number of servings *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={1}
                max={24}
                required
                value={servings}
                onChange={(e) => setServings(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm font-semibold font-tabular rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Prep time (mins)
            </label>
            <input
              type="number"
              min={0}
              placeholder="10"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              className="w-full px-3 py-2 text-sm font-tabular rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Cook time (mins)
            </label>
            <input
              type="number"
              min={0}
              placeholder="20"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              className="w-full px-3 py-2 text-sm font-tabular rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="pt-2">
          <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Tags (press Enter to add)
          </label>
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium"
              >
                <span>#{t}</span>
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="hover:text-[var(--ui-error)] ml-1"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              className="flex-1 min-w-[120px] bg-transparent text-xs text-[var(--text-primary)] focus:outline-hidden px-1"
            />
          </div>
        </div>
      </div>

      {/* Ingredients Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--surface)] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
              Ingredients ({ingredients.length})
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Total quantities for the whole recipe ({servings} servings)
            </p>
          </div>
          <button
            type="button"
            onClick={addIngredient}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium hover:bg-[var(--background)] text-[var(--text-primary)] transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-[var(--accent)]" />
            <span>Add ingredient</span>
          </button>
        </div>

        <div className="space-y-2">
          {ingredients.map((ing, idx) => (
            <div
              key={ing.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 sm:p-2 rounded-xl bg-[var(--background)] border border-[var(--border)]"
            >
              {/* Row 1: Index, Name, and Mobile Actions */}
              <div className="flex items-center gap-2 flex-1 w-full min-w-0">
                <span className="text-xs font-tabular text-[var(--text-secondary)] w-6 text-center shrink-0">
                  {idx + 1}
                </span>

                <input
                  type="text"
                  required
                  placeholder="Ingredient name (e.g. Chicken breast)"
                  value={ing.rawName}
                  onChange={(e) =>
                    updateIngredient(ing.id, "rawName", e.target.value)
                  }
                  className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                />

                {/* Mobile action buttons (easy touch) */}
                <div className="flex items-center gap-1 shrink-0 sm:hidden">
                  <button
                    type="button"
                    title="Lookup in USDA / Open Food Facts"
                    onClick={() => openIngredientLookup(ing.id, ing.rawName)}
                    className="tap-target inline-flex items-center justify-center p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition"
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing.id)}
                    className="tap-target inline-flex items-center justify-center p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Row 2 on mobile: Quantity, Unit, Notes, and Desktop Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto pl-8 sm:pl-0">
                <input
                  type="number"
                  step="any"
                  placeholder="Qty"
                  value={ing.quantity !== null && ing.quantity !== undefined ? ing.quantity : ""}
                  onChange={(e) =>
                    updateIngredient(
                      ing.id,
                      "quantity",
                      e.target.value === "" ? null : parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-20 flex-1 sm:flex-none px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-center font-semibold font-tabular"
                />

                <select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, "unit", e.target.value)}
                  className="w-24 flex-1 sm:flex-none px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="cup">cup</option>
                  <option value="piece">piece</option>
                  <option value="egg">egg</option>
                  <option value="slice">slice</option>
                  <option value="scoop">scoop</option>
                  <option value="clove">clove</option>
                </select>

                <input
                  type="text"
                  placeholder="Notes (e.g. diced)"
                  value={ing.notes || ""}
                  onChange={(e) =>
                    updateIngredient(ing.id, "notes", e.target.value)
                  }
                  className="flex-1 hidden md:block px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                />

                {/* Desktop action buttons */}
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title="Lookup in USDA / Open Food Facts"
                    onClick={() => openIngredientLookup(ing.id, ing.rawName)}
                    className="tap-target inline-flex items-center justify-center p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition"
                  >
                    <Globe className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeIngredient(ing.id)}
                    className="tap-target inline-flex items-center justify-center p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--surface)] space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
            Instructions ({instructions.length})
          </h2>
          <button
            type="button"
            onClick={addInstruction}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium hover:bg-[var(--background)] text-[var(--text-primary)] transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-[var(--accent)]" />
            <span>Add step</span>
          </button>
        </div>

        <div className="space-y-3">
          {instructions.map((inst, idx) => (
            <div
              key={inst.id}
              className="flex items-start space-x-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]"
            >
              <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                {idx + 1}
              </div>

              <textarea
                rows={2}
                required
                placeholder={`Step ${idx + 1} instruction...`}
                value={inst.text}
                onChange={(e) => updateInstruction(inst.id, e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
              />

              <button
                type="button"
                onClick={() => removeInstruction(inst.id)}
                className="tap-target inline-flex items-center justify-center p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition mt-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Nutrition Card (Calculated or Overridden) */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--surface)] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
              Nutrition per serving
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              If left blank, nutrition is computed automatically from your food database.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Calories (kcal)
            </label>
            <input
              type="number"
              placeholder="e.g. 520"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold font-tabular rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--macro-protein)] mb-1">
              Protein (g)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 45"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold font-tabular rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--macro-carbs)] mb-1">
              Carbs (g)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 55"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold font-tabular rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--macro-fat)] mb-1">
              Fat (g)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 12"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold font-tabular rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
            />
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Action Bar */}
      <div className="sticky bottom-20 md:bottom-4 z-20 flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md shadow-xl">
        <div className="text-xs text-[var(--text-secondary)]">
          Ready to save to your personal recipe library
        </div>
        <div className="flex items-center space-x-3 self-end sm:self-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="tap-target px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[38px] flex items-center justify-center touch-manipulation"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer"
          >
            {isSaving ? "Saving recipe..." : "Save recipe"}
          </button>
        </div>
      </div>

      {/* External Ingredient Lookup Modal */}
      {isLookupOpen && (
        <div 
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsLookupOpen(false)}
        >
          <div 
            className="modal-panel w-full max-w-xl rounded-3xl bg-[var(--surface)] p-6 space-y-5 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[var(--accent)]" />
                  <span>Resolve Ingredient (USDA &amp; Open Food Facts)</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pick an ingredient from USDA FoodData Central or Open Food Facts to automatically link and import it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLookupOpen(false)}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition touch-manipulation"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    executeLookup(lookupQuery);
                  }
                }}
                placeholder="Search food name or barcode..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
              />
              <button
                type="button"
                onClick={() => executeLookup(lookupQuery)}
                disabled={isSearchingLookup || !lookupQuery.trim()}
                className="px-4 min-h-[44px] rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-semibold hover:bg-[var(--accent-hover)] transition disabled:opacity-50"
              >
                {isSearchingLookup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto space-y-2 divide-y divide-[var(--border)] min-h-[200px] p-2 border border-[var(--border)] rounded-xl bg-[var(--background)]/30">
              {isSearchingLookup ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)] space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--accent)]" />
                  <p>Searching USDA &amp; Open Food Facts...</p>
                </div>
              ) : lookupResults.length === 0 ? (
                <div className="py-10 text-center text-xs text-[var(--text-secondary)]">
                  No matching foods found. Try adjusting your search term.
                </div>
              ) : (
                lookupResults.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="pt-2 pb-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-[var(--text-primary)]">
                          {candidate.name}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-semibold uppercase px-1 py-0.5 rounded",
                            candidate.source === "usda"
                              ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                              : "bg-[var(--macro-protein-bg)] text-[var(--macro-protein)]"
                          )}
                        >
                          {candidate.source === "usda" ? "USDA" : "OFF"}
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                        {candidate.caloriesPer100g} kcal • {candidate.proteinPer100g}g Pro • {candidate.carbsPer100g}g Carb • {candidate.fatPer100g}g Fat (per 100g)
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isImportingLookup}
                      onClick={() => applyLookupSelection(candidate)}
                      className="tap-target px-3.5 py-1.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold shrink-0 transition"
                    >
                      Select &amp; Link
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
