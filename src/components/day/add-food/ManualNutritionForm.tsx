"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Calculator, Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { MealCategory } from "@/lib/domain";
import { MEAL_LABELS } from "@/lib/domain";
import type { DateString } from "@/lib/dates";
import { NumberField, TextField, Spinner, fmt, parseNum } from "@/components/ui/primitives";
import { toNutrients, scaleNutrients, roundNutrients } from "@/lib/nutrition/core";
import { api, ApiError } from "@/lib/client/api";
import { toast } from "@/components/ui/Toast";
import type { EntryDraft } from "./types";
import { cn } from "@/lib/utils";

interface ManualNutritionFormProps {
  initialName?: string;
  meal: MealCategory;
  date: DateString;
  onAdd: (entry: EntryDraft, keepOpen: boolean) => void;
  onBack: () => void;
  onFoodCreated?: () => void;
}

export function ManualNutritionForm({
  initialName = "",
  meal,
  date,
  onAdd,
  onBack,
  onFoodCreated,
}: ManualNutritionFormProps) {
  const [name, setName] = useState(initialName);
  const [servingAmount, setServingAmount] = useState("1");
  const [servingUnit, setServingUnit] = useState("serving");
  const [servingGrams, setServingGrams] = useState("");
  const [qty, setQty] = useState("1");
  const [v, setV] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sugar: "",
    sodium: "",
  });
  const [more, setMore] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const quantity = Math.max(0, parseNum(qty) || 1);
  const calNum = Math.max(0, parseNum(v.calories));
  const pNum = Math.max(0, parseNum(v.protein));
  const cNum = Math.max(0, parseNum(v.carbs));
  const fNum = Math.max(0, parseNum(v.fat));

  const calculateFromMacros = () => {
    const calc = Math.round(pNum * 4 + cNum * 4 + fNum * 9);
    if (calc > 0) {
      setV((prev) => ({ ...prev, calories: String(calc) }));
    }
  };

  const perServ = toNutrients({
    calories: Math.max(0, parseNum(v.calories)),
    protein: Math.max(0, parseNum(v.protein)),
    carbs: Math.max(0, parseNum(v.carbs)),
    fat: Math.max(0, parseNum(v.fat)),
    fiber: Math.max(0, parseNum(v.fiber)),
    totalSugars: v.sugar ? Math.max(0, parseNum(v.sugar)) : null,
    sodium: v.sodium ? Math.max(0, parseNum(v.sodium)) : null,
  });

  const totalNutrients = roundNutrients(scaleNutrients(perServ, quantity));
  const isWeight = servingUnit === "g" || servingUnit === "ml";
  const valid =
    name.trim().length > 0 &&
    quantity > 0 &&
    quantity <= 10000 &&
    parseNum(servingAmount) > 0 &&
    calNum <= 50000 &&
    pNum <= 2000 &&
    cNum <= 2000 &&
    fNum <= 2000;
  const gramsPerServing = isWeight ? parseNum(servingAmount) : parseNum(servingGrams) || 100;

  const submit = async (keepOpen: boolean) => {
    if (!valid || busy) return;
    setBusy(true);

    let foodId: string | null = null;
    if (saveToLibrary) {
      try {
        const created = await api<{ id: string }>("/api/foods", {
          method: "POST",
          json: {
            name: name.trim(),
            category: "Custom",
            nutritionBasis: "PER_SERVING",
            servingSize: parseNum(servingAmount) || 1,
            servingUnit,
            servingWeightGrams: gramsPerServing || 100,
            defaultUnit: isWeight ? servingUnit : "serving",
            calories: perServ.calories,
            protein: perServ.protein,
            carbs: perServ.carbs,
            fat: perServ.fat,
            fiber: perServ.fiber,
            totalSugars: perServ.totalSugars,
            sodium: perServ.sodium,
            servings: isWeight
              ? []
              : [{ label: `${fmt.qty(parseNum(servingAmount) || 1)} ${servingUnit}`, grams: gramsPerServing || 100, isDefault: true }],
          },
        });
        foodId = created.id;
        onFoodCreated?.();
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          // Food exists
        } else {
          toast(`Saved entry, but couldn't save to My Foods: ${e instanceof Error ? e.message : "unknown error"}`, { kind: "error" });
        }
      }
    }

    onAdd(
      {
        name: name.trim(),
        servings: isWeight ? quantity * parseNum(servingAmount) : quantity,
        servingUnit: isWeight ? servingUnit : servingUnit || "serving",
        foodId,
        recipeId: null,
        ...totalNutrients,
      },
      keepOpen
    );

    setBusy(false);
    if (keepOpen) {
      setName("");
      setV({ calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", sodium: "" });
      setQty("1");
      nameRef.current?.focus();
    }
  };

  const setField = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  return (
    <form
      className="space-y-4 py-1"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-ghost btn-sm -ml-2 text-fg-2 hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to search
        </button>
        <span className="text-xs text-fg-3">Manual Nutrition Entry</span>
      </div>

      <TextField
        ref={nameRef}
        label="Food name"
        placeholder="e.g. 4 sunny side up eggs"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={200}
      />

      {/* Calories with Calculate from Macros Helper */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="label mb-0" htmlFor="manual-cal">
            Calories
          </label>
          {(pNum > 0 || cNum > 0 || fNum > 0) && (
            <button
              type="button"
              onClick={calculateFromMacros}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
            >
              <Calculator className="h-3 w-3" />
              Calculate from macros ({Math.round(pNum * 4 + cNum * 4 + fNum * 9)} kcal)
            </button>
          )}
        </div>
        <div className="relative">
          <NumberField
            id="manual-cal"
            value={v.calories}
            onChange={setField("calories")}
            placeholder="0"
            unit="kcal"
          />
        </div>
      </div>

      {/* Protein, Carbs, Fat */}
      <div>
        <label className="label mb-1.5 block">Macronutrients</label>
        <div className="grid grid-cols-3 gap-2">
          <NumberField
            label="Protein"
            value={v.protein}
            onChange={setField("protein")}
            unit="g"
            placeholder="0"
          />
          <NumberField
            label="Carbs"
            value={v.carbs}
            onChange={setField("carbs")}
            unit="g"
            placeholder="0"
          />
          <NumberField
            label="Fat"
            value={v.fat}
            onChange={setField("fat")}
            unit="g"
            placeholder="0"
          />
        </div>
      </div>

      {/* Expandable Extra Details */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setMore(!more)}
          className="flex items-center gap-1 text-xs text-fg-2 hover:text-fg font-medium"
        >
          {more ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {more ? "Less nutrition details" : "+ More nutrition (Fiber, Sugar, Sodium, Portion)"}
        </button>

        {more && (
          <div className="mt-3 space-y-3 rounded-lg border border-line bg-surface-2/40 p-3">
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label="Fiber"
                value={v.fiber}
                onChange={setField("fiber")}
                unit="g"
                placeholder="0"
              />
              <NumberField
                label="Sugar"
                value={v.sugar}
                onChange={setField("sugar")}
                unit="g"
                placeholder="0"
              />
              <NumberField
                label="Sodium"
                value={v.sodium}
                onChange={setField("sodium")}
                unit="mg"
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 pt-1 border-t border-line/50">
              <NumberField
                label="Serving size"
                value={servingAmount}
                onChange={setServingAmount}
              />
              <div>
                <label className="label" htmlFor="m-unit">
                  Unit
                </label>
                <select
                  id="m-unit"
                  className="input h-10 w-24 text-xs"
                  value={servingUnit}
                  onChange={(e) => setServingUnit(e.target.value)}
                >
                  {["serving", "g", "ml", "piece", "cup", "tbsp", "tsp", "slice", "scoop", "oz"].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <NumberField label="Quantity" value={qty} onChange={setQty} />
            </div>

            {!isWeight && (
              <NumberField
                label="Weight of one serving (optional)"
                value={servingGrams}
                onChange={setServingGrams}
                unit="g"
              />
            )}
          </div>
        )}
      </div>

      {/* Footer / Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <label className="flex items-center gap-2 text-xs text-fg-2 cursor-pointer">
          <input
            type="checkbox"
            checked={saveToLibrary}
            onChange={(e) => setSaveToLibrary(e.target.checked)}
            className="h-4 w-4 rounded accent-[var(--accent)]"
          />
          Save to My Foods for future use
        </label>

        <div className="text-sm font-semibold tabular text-fg">
          {fmt.int(totalNutrients.calories)} kcal
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
        <button
          type="button"
          disabled={!valid || busy}
          onClick={() => void submit(true)}
          className="btn btn-secondary w-full sm:w-auto h-10 text-xs font-medium"
        >
          Add &amp; continue
        </button>
        <button
          type="submit"
          disabled={!valid || busy}
          className="btn btn-primary w-full sm:w-auto h-10 text-xs font-semibold shadow-sm"
        >
          {busy ? <Spinner /> : null} Add to {MEAL_LABELS[meal]} · {fmt.int(totalNutrients.calories)} kcal
        </button>
      </div>
    </form>
  );
}
