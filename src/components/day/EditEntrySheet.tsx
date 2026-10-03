"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { NumberField, Segmented, TextField, fmt, parseNum } from "@/components/ui/primitives";
import { MEAL_CATEGORIES, MEAL_LABELS, type MealCategory, type MealItem } from "@/lib/domain";
import { roundNutrients, scaleNutrients, toNutrients } from "@/lib/nutrition/core";
import { deleteEntry, updateEntry } from "@/lib/client/day-store";
import { toast } from "@/components/ui/Toast";
import type { MealItemPatch } from "@/lib/validation";

interface EditEntrySheetProps {
  entry: MealItem | null;
  onClose: () => void;
}

export function EditEntrySheet({ entry, onClose }: EditEntrySheetProps) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [meal, setMeal] = useState<MealCategory>("lunch");
  const [date, setDate] = useState("");
  const [macros, setMacros] = useState({ calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const [macrosDirty, setMacrosDirty] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setName(entry.name);
    setQty(fmt.qty(entry.servings));
    setMeal(entry.mealCategory);
    setDate(entry.date);
    setMacros({
      calories: String(Math.round(entry.calories)),
      protein: fmt.one(entry.protein),
      carbs: fmt.one(entry.carbs),
      fat: fmt.one(entry.fat),
      fiber: fmt.one(entry.fiber),
    });
    setMacrosDirty(false);
  }, [entry]);

  // Base quantity from entry
  const baseServings = entry?.servings ?? 1;

  // Live recalculation when quantity changes
  const preview = useMemo(() => {
    if (!entry) return null;
    const q = parseNum(qty);
    if (macrosDirty || !(q > 0) || !(baseServings > 0)) return null;
    return roundNutrients(scaleNutrients(toNutrients(entry), q / baseServings));
  }, [entry, qty, macrosDirty, baseServings]);

  useEffect(() => {
    if (preview && !macrosDirty) {
      setMacros({
        calories: String(Math.round(preview.calories)),
        protein: fmt.one(preview.protein),
        carbs: fmt.one(preview.carbs),
        fat: fmt.one(preview.fat),
        fiber: fmt.one(preview.fiber),
      });
    }
  }, [preview, macrosDirty]);

  if (!entry) return null;
  const q = parseNum(qty);
  const valid = name.trim().length > 0 && q > 0;

  const handleMultiplier = (factor: number) => {
    const next = Math.round(baseServings * factor * 100) / 100;
    setQty(fmt.qty(next));
    setMacrosDirty(false);
  };

  const save = () => {
    if (!valid) return;
    const patch: MealItemPatch = {};
    if (name.trim() !== entry.name) patch.name = name.trim();
    if (meal !== entry.mealCategory) patch.mealCategory = meal;
    if (date && date !== entry.date) patch.date = date;
    if (q !== entry.servings) patch.servings = q;
    if (macrosDirty) {
      patch.calories = parseNum(macros.calories);
      patch.protein = parseNum(macros.protein);
      patch.carbs = parseNum(macros.carbs);
      patch.fat = parseNum(macros.fat);
      patch.fiber = parseNum(macros.fiber);
    }
    if (Object.keys(patch).length) {
      updateEntry(entry, patch);
      toast(`Updated ${entry.name}`);
    }
    onClose();
  };

  const setMacro = (k: keyof typeof macros) => (v: string) => {
    setMacrosDirty(true);
    setMacros((m) => ({ ...m, [k]: v }));
  };

  return (
    <Sheet
      open={!!entry}
      onClose={onClose}
      title="Edit Portion & Entry"
      size="sm"
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            className="btn btn-danger text-xs"
            onClick={() => {
              deleteEntry(entry);
              toast(`Removed ${entry.name}`);
              onClose();
            }}
          >
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              form="edit-entry-form"
              className="btn btn-primary btn-sm"
              disabled={!valid}
            >
              Save Changes
            </button>
          </div>
        </div>
      }
    >
      <form
        id="edit-entry-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <TextField
          label="Food Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={200}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <NumberField
              label="Quantity"
              value={qty}
              onChange={(val) => {
                setQty(val);
                setMacrosDirty(false);
              }}
              unit={entry.servingUnit === "serving" ? "serv." : entry.servingUnit}
              error={q > 0 ? undefined : "Must be > 0"}
            />
            {/* Quick multiplier chips */}
            <div className="mt-1.5 flex items-center gap-1">
              {[0.5, 1, 1.5, 2].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMultiplier(m)}
                  className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-fg-3 hover:bg-surface-3 hover:text-fg transition-colors"
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="edit-date">
              Date
            </label>
            <input
              id="edit-date"
              type="date"
              className="input tabular"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <span className="label">Meal Category</span>
          <Segmented
            value={meal}
            onChange={setMeal}
            options={MEAL_CATEGORIES.map((c) => ({ value: c, label: MEAL_LABELS[c] }))}
            className="w-full"
            size="sm"
          />
        </div>

        {/* Nutrition Preview / Overrides */}
        <fieldset className="rounded-lg border border-line bg-surface-2/30 p-3">
          <legend className="label px-1">Nutrition Breakdown</legend>
          <div className="grid grid-cols-5 gap-2">
            <NumberField label="Calories" value={macros.calories} onChange={setMacro("calories")} unit="kcal" />
            <NumberField label="Protein" value={macros.protein} onChange={setMacro("protein")} unit="g" />
            <NumberField label="Carbs" value={macros.carbs} onChange={setMacro("carbs")} unit="g" />
            <NumberField label="Fat" value={macros.fat} onChange={setMacro("fat")} unit="g" />
            <NumberField label="Fiber" value={macros.fiber} onChange={setMacro("fiber")} unit="g" />
          </div>
          <p className="mt-2 text-[11px] text-fg-3">
            {macrosDirty
              ? "Manual values entered — changing quantity will no longer scale automatically."
              : "Adjusting quantity rescales all nutrients automatically."}
          </p>
        </fieldset>
      </form>
    </Sheet>
  );
}
