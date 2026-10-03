"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { NumberField, Segmented, TextField, fmt, parseNum } from "@/components/ui/primitives";
import { MEAL_CATEGORIES, MEAL_LABELS, type MealCategory, type MealItem } from "@/lib/domain";
import { roundNutrients, scaleNutrients, toNutrients } from "@/lib/nutrition/core";
import { deleteEntry, updateEntry } from "@/lib/client/day-store";
import type { MealItemPatch } from "@/lib/validation";

/**
 * Edit a logged item. Changing the quantity rescales nutrients; editing a nutrient
 * directly overrides it (for fixing a bad label) without touching the others.
 */
export function EditEntrySheet({ entry, onClose }: { entry: MealItem | null; onClose: () => void }) {
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

  // Live preview of what the quantity change does.
  const preview = useMemo(() => {
    if (!entry) return null;
    const q = parseNum(qty);
    if (macrosDirty || !(q > 0) || !(entry.servings > 0)) return null;
    return roundNutrients(scaleNutrients(toNutrients(entry), q / entry.servings));
  }, [entry, qty, macrosDirty]);

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
      // Quantity change plus manual macros: the macros typed are for the new quantity.
    }
    if (Object.keys(patch).length) updateEntry(entry, patch);
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
      title="Edit entry"
      size="sm"
      footer={
        <>
          <button
            type="button"
            className="btn btn-danger mr-auto"
            onClick={() => {
              deleteEntry(entry);
              onClose();
            }}
          >
            Delete
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="edit-entry-form" className="btn btn-primary" disabled={!valid}>
            Save
          </button>
        </>
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
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Quantity" value={qty} onChange={setQty} unit={entry.servingUnit === "serving" ? "serv." : entry.servingUnit} error={q > 0 ? undefined : "Must be more than 0"} />
          <div>
            <label className="label" htmlFor="edit-date">
              Date
            </label>
            <input id="edit-date" type="date" className="input tabular" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <span className="label">Meal</span>
          <Segmented value={meal} onChange={setMeal} options={MEAL_CATEGORIES.map((c) => ({ value: c, label: MEAL_LABELS[c] }))} className="w-full" size="sm" />
        </div>
        <fieldset>
          <legend className="label">Nutrition for this quantity</legend>
          <div className="grid grid-cols-5 gap-2">
            <NumberField label="kcal" value={macros.calories} onChange={setMacro("calories")} />
            <NumberField label="Protein" value={macros.protein} onChange={setMacro("protein")} />
            <NumberField label="Carbs" value={macros.carbs} onChange={setMacro("carbs")} />
            <NumberField label="Fat" value={macros.fat} onChange={setMacro("fat")} />
            <NumberField label="Fiber" value={macros.fiber} onChange={setMacro("fiber")} />
          </div>
          <p className="mt-1.5 text-xs text-fg-3">{macrosDirty ? "Edited by hand — quantity changes won't rescale these values." : "Changing the quantity rescales these automatically."}</p>
        </fieldset>
      </form>
    </Sheet>
  );
}
