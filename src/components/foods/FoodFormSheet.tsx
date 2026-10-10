"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Plus, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { NumberField, Segmented, TextField, fmt, parseNum } from "@/components/ui/primitives";
import type { FoodSummary } from "@/lib/domain";
import {
  caloriesFromMacros,
  nutrientsPer100g,
  roundNutrients,
  scaleNutrients,
  toNutrients,
} from "@/lib/nutrition/core";
import { findDuplicateCandidates, type DuplicateCandidate } from "@/lib/nutrition/duplicate-detector";
import { api } from "@/lib/client/api";
import { toast } from "@/components/ui/Toast";

type Basis = "serving" | "100g";
const UNITS = ["g", "ml", "serving", "piece", "item", "cup", "tbsp", "tsp", "slice", "scoop", "bar", "oz"];
const CATEGORIES = ["Custom", "Meat", "Fish", "Dairy", "Eggs", "Grains", "Produce", "Legumes", "Nuts", "Snacks", "Drinks", "Pantry", "Restaurant"];

interface FoodFormSheetProps {
  open: boolean;
  food: FoodSummary | null;
  existingFoods?: FoodSummary[];
  onClose: () => void;
  onSaved: () => void;
  onSelectExisting?: (food: FoodSummary) => void;
}

/** Create or edit a food with linear precision, duplicate warning, and authoritative calorie handling. */
export function FoodFormSheet({
  open,
  food,
  existingFoods = [],
  onClose,
  onSaved,
  onSelectExisting,
}: FoodFormSheetProps) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Custom");
  const [basis, setBasis] = useState<Basis>("serving");
  const [servingSize, setServingSize] = useState("100");
  const [servingUnit, setServingUnit] = useState("g");
  const [servingGrams, setServingGrams] = useState("");
  const [v, setV] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sugar: "",
    satFat: "",
    sodium: "",
  });
  const [servings, setServings] = useState<{ label: string; grams: string }[]>([]);
  const [showMicros, setShowMicros] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Duplicate detection state
  const [ignoredDuplicateId, setIgnoredDuplicateId] = useState<string | null>(null);
  const [forceCreate, setForceCreate] = useState(false);

  // Initial values snapshot for unsaved changes detection
  const [initialJson, setInitialJson] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setForceCreate(false);
    setIgnoredDuplicateId(null);

    if (food) {
      setName(food.name);
      setBrand(food.brand ?? "");
      setCategory(food.category || "Custom");
      const hasServing = !!(food.servingSize && food.servingUnit);
      setBasis(hasServing ? "serving" : "100g");
      setServingSize(hasServing ? fmt.qty(food.servingSize!) : "100");
      setServingUnit(hasServing ? food.servingUnit! : "g");
      setServingGrams(
        hasServing && food.servingUnit !== "g" && food.servingUnit !== "ml"
          ? fmt.qty(food.servingWeightGrams)
          : ""
      );

      const labelServing = hasServing ? `${fmt.qty(food.servingSize!)} ${food.servingUnit}` : null;
      setServings(
        (food.servings ?? [])
          .filter((s) => s.label !== labelServing)
          .map((s) => ({ label: s.label, grams: fmt.qty(s.grams) }))
      );

      const per = hasServing
        ? scaleNutrients(nutrientsPer100g(food), food.servingWeightGrams / 100)
        : nutrientsPer100g(food);
      const r = roundNutrients(per);
      const initialV = {
        calories: String(r.calories),
        protein: String(r.protein),
        carbs: String(r.carbs),
        fat: String(r.fat),
        fiber: r.fiber ? String(r.fiber) : "",
        sugar: r.totalSugars === null ? "" : String(r.totalSugars),
        satFat: r.saturatedFat === null ? "" : String(r.saturatedFat),
        sodium: r.sodium === null ? "" : String(r.sodium),
      };
      setV(initialV);

      if (r.fiber || r.totalSugars || r.saturatedFat || r.sodium) {
        setShowMicros(true);
      } else {
        setShowMicros(false);
      }

      setInitialJson(JSON.stringify({ name: food.name, brand: food.brand, v: initialV }));
    } else {
      setName("");
      setBrand("");
      setCategory("Custom");
      setBasis("100g");
      setServingSize("100");
      setServingUnit("g");
      setServingGrams("");
      setServings([]);
      const emptyV = {
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        fiber: "",
        sugar: "",
        satFat: "",
        sodium: "",
      };
      setV(emptyV);
      setShowMicros(false);
      setInitialJson(JSON.stringify({ name: "", brand: "", v: emptyV }));
    }
  }, [open, food]);

  const isWeightUnit = servingUnit === "g" || servingUnit === "ml";
  const gramsPerServing = isWeightUnit ? parseNum(servingSize) : parseNum(servingGrams);

  const entered = toNutrients({
    calories: v.calories,
    protein: v.protein,
    carbs: v.carbs,
    fat: v.fat,
    fiber: v.fiber,
    totalSugars: v.sugar || null,
    saturatedFat: v.satFat || null,
    sodium: v.sodium || null,
  });

  const { per100, perServing } = useMemo(() => {
    if (basis === "100g") {
      const ps = gramsPerServing > 0 ? scaleNutrients(entered, gramsPerServing / 100) : entered;
      return { per100: entered, perServing: ps };
    }
    const p100 = gramsPerServing > 0 ? scaleNutrients(entered, 100 / gramsPerServing) : entered;
    return { per100: p100, perServing: entered };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis, gramsPerServing, v]);

  // Client duplicate detection against loaded library / user foods
  const duplicateCandidate = useMemo<DuplicateCandidate | null>(() => {
    if (food || !name.trim() || forceCreate) return null;
    const candidates = findDuplicateCandidates(
      {
        name: name.trim(),
        brand: brand.trim(),
        caloriesPer100g: per100.calories,
        servingWeightGrams: gramsPerServing > 0 ? gramsPerServing : 100,
      },
      existingFoods,
      null
    );
    const candidate = candidates[0] ?? null;
    if (candidate && candidate.food.id === ignoredDuplicateId) return null;
    return candidate;
  }, [food, name, brand, per100.calories, gramsPerServing, existingFoods, forceCreate, ignoredDuplicateId]);

  const servingsValid = servings.every((s) => s.label.trim() && parseNum(s.grams) > 0);

  const valid =
    name.trim().length > 0 &&
    parseNum(servingSize) > 0 &&
    (basis === "100g" || isWeightUnit || gramsPerServing > 0) &&
    servingsValid;

  // Check if form is dirty for unsaved changes confirmation
  const isDirty = useMemo(() => {
    const currentJson = JSON.stringify({ name, brand, v });
    return initialJson !== "" && currentJson !== initialJson;
  }, [name, brand, v, initialJson]);

  const handleSafeClose = () => {
    if (isDirty && !busy) {
      if (!window.confirm("You have unsaved changes. Discard them?")) return;
    }
    onClose();
  };

  const calculateFromMacros = () => {
    const p = parseNum(v.protein);
    const c = parseNum(v.carbs);
    const f = parseNum(v.fat);
    const est = Math.round(caloriesFromMacros({ protein: p, carbs: c, fat: f }));
    setV((prev) => ({ ...prev, calories: String(est) }));
    toast(`Calculated ${est} kcal (4P + 4C + 9F)`, { kind: "info" });
  };

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);

    const p100 = roundNutrients(per100);
    const ps = roundNutrients(perServing);

    const payload = {
      name: name.trim(),
      brand: brand.trim() || null,
      category,
      nutritionBasis: basis === "100g" ? "PER_100G" : "PER_SERVING",
      servingSize: parseNum(servingSize),
      servingUnit,
      servingWeightGrams: gramsPerServing > 0 ? gramsPerServing : 100,
      defaultUnit: isWeightUnit ? servingUnit : "g",
      caloriesPer100g: p100.calories,
      proteinPer100g: p100.protein,
      carbsPer100g: p100.carbs,
      fatPer100g: p100.fat,
      fiberPer100g: p100.fiber,
      totalSugarsPer100g: p100.totalSugars,
      saturatedFatPer100g: p100.saturatedFat,
      sodiumPer100g: p100.sodium,
      caloriesPerServing: ps.calories,
      proteinPerServing: ps.protein,
      carbsPerServing: ps.carbs,
      fatPerServing: ps.fat,
      fiberPerServing: ps.fiber,
      totalSugarsPerServing: ps.totalSugars,
      saturatedFatPerServing: ps.saturatedFat,
      sodiumPerServing: ps.sodium,
      forceCreate,
      servings: [
        ...(!isWeightUnit && gramsPerServing > 0
          ? [{ label: `${fmt.qty(parseNum(servingSize))} ${servingUnit}`, grams: gramsPerServing, isDefault: true }]
          : []),
        ...servings
          .filter((s) => s.label.trim() && parseNum(s.grams) > 0)
          .map((s) => ({ label: s.label.trim(), grams: parseNum(s.grams), isDefault: false })),
      ],
    };

    try {
      if (food) {
        await api(`/api/foods/${food.id}`, { method: "PUT", json: payload });
      } else {
        await api("/api/foods", { method: "POST", json: payload });
      }
      toast(food ? "Food updated" : "Food added to library", { kind: "success" });
      onSaved();
      onClose();
    } catch (e: any) {
      if (e?.status === 409 && !forceCreate) {
        setErr("A food with this name already exists in your library. Click 'Create anyway' to save a new copy.");
        setForceCreate(true);
      } else {
        setErr(e instanceof Error ? e.message : "Couldn't save food");
      }
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  return (
    <Sheet
      open={open}
      onClose={handleSafeClose}
      title={food ? `Edit ${food.name}` : "New Food"}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button type="button" className="btn btn-secondary" onClick={handleSafeClose} disabled={busy}>
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {forceCreate && (
              <span className="text-xs text-carbs">Saving with copy suffix</span>
            )}
            <button
              type="submit"
              form="food-form"
              className="btn btn-primary"
              disabled={!valid || busy}
            >
              {busy ? "Saving…" : food ? "Save changes" : "Add food"}
            </button>
          </div>
        </div>
      }
    >
      <form
        id="food-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {/* Duplicate detection warning banner */}
        {duplicateCandidate && (
          <div
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200"
            role="alert"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-carbs mt-0.5" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-amber-300">
                  Possible duplicate ({duplicateCandidate.reason})
                </p>
                <p className="text-fg-2">
                  <strong className="text-fg">{duplicateCandidate.food.name}</strong>
                  {duplicateCandidate.food.brand && <span> · {duplicateCandidate.food.brand}</span>}
                  <span className="ml-1.5 tabular text-fg-3">
                    ({fmt.int(duplicateCandidate.food.caloriesPer100g)} kcal/100g)
                  </span>
                </p>
                <div className="flex items-center gap-2 pt-1.5">
                  {onSelectExisting && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm text-xs h-7"
                      onClick={() => onSelectExisting(duplicateCandidate.food)}
                    >
                      Use existing
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-xs h-7 text-amber-300 hover:text-amber-100"
                    onClick={() => {
                      setIgnoredDuplicateId(duplicateCandidate.food.id);
                      setForceCreate(true);
                    }}
                  >
                    Create anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Name and Brand */}
        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <TextField
            label="Food name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (forceCreate) setForceCreate(false);
            }}
            placeholder="e.g. Chicken Breast"
            required
            autoFocus
            maxLength={200}
          />
          <TextField
            label="Brand (optional)"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Fage"
            maxLength={100}
          />
        </div>

        {/* Serving definition and Category */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <NumberField
            label="Serving size"
            value={servingSize}
            onChange={setServingSize}
            placeholder="100"
          />
          <div>
            <label className="label" htmlFor="ff-unit">
              Unit
            </label>
            <select
              id="ff-unit"
              className="input w-24"
              value={servingUnit}
              onChange={(e) => setServingUnit(e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ff-cat">
              Category
            </label>
            <select
              id="ff-cat"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {(CATEGORIES.includes(category) ? CATEGORIES : [category, ...CATEGORIES]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isWeightUnit && (
          <NumberField
            label="Weight of one serving"
            value={servingGrams}
            onChange={setServingGrams}
            unit="g"
            placeholder="e.g. 60"
            error={gramsPerServing > 0 ? undefined : "Required to accurately scale nutrition by grams"}
          />
        )}

        {/* Nutrition values section */}
        <div className="rounded-xl border border-line bg-surface-1 p-3.5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-3">
              Nutrition Values
            </span>
            <Segmented
              value={basis}
              onChange={setBasis}
              size="sm"
              options={[
                { value: "100g", label: "Per 100 g" },
                {
                  value: "serving",
                  label: `Per ${fmt.qty(parseNum(servingSize) || 1)} ${servingUnit}`,
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <NumberField
              label="Calories (kcal)"
              value={v.calories}
              onChange={set("calories")}
              placeholder="0"
            />
            <NumberField
              label="Protein"
              value={v.protein}
              onChange={set("protein")}
              unit="g"
              placeholder="0"
            />
            <NumberField
              label="Carbs"
              value={v.carbs}
              onChange={set("carbs")}
              unit="g"
              placeholder="0"
            />
            <NumberField
              label="Fat"
              value={v.fat}
              onChange={set("fat")}
              unit="g"
              placeholder="0"
            />
          </div>

          {/* Calorie helper */}
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="tabular text-fg-3">
              {basis === "serving" ? (
                <>
                  Per 100g: <strong className="text-fg">{fmt.int(per100.calories)}</strong> kcal ·{" "}
                  {fmt.one(per100.protein)}P · {fmt.one(per100.carbs)}C · {fmt.one(per100.fat)}F
                </>
              ) : (
                <>
                  Per serving: <strong className="text-fg">{fmt.int(perServing.calories)}</strong> kcal ·{" "}
                  {fmt.one(perServing.protein)}P · {fmt.one(perServing.carbs)}C · {fmt.one(perServing.fat)}F
                </>
              )}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm text-[11px] h-6 px-1.5 text-accent hover:bg-accent/10"
              onClick={calculateFromMacros}
              title="Estimate calories as 4P + 4C + 9F"
            >
              <Sparkles className="h-3 w-3" />
              Calc from macros
            </button>
          </div>

          {/* Progressive disclosure for micronutrients */}
          <div className="mt-3 border-t border-line/60 pt-2">
            <button
              type="button"
              className="flex w-full items-center justify-between py-1 text-xs text-fg-3 hover:text-fg"
              onClick={() => setShowMicros(!showMicros)}
            >
              <span>More nutrition (Fiber, Sugar, Sodium…)</span>
              {showMicros ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showMicros && (
              <div className="mt-2 grid grid-cols-4 gap-2 pt-1 animate-in fade-in">
                <NumberField
                  label="Fiber"
                  value={v.fiber}
                  onChange={set("fiber")}
                  unit="g"
                  placeholder="0"
                />
                <NumberField
                  label="Sugar"
                  value={v.sugar}
                  onChange={set("sugar")}
                  unit="g"
                  placeholder="—"
                />
                <NumberField
                  label="Sat. Fat"
                  value={v.satFat}
                  onChange={set("satFat")}
                  unit="g"
                  placeholder="—"
                />
                <NumberField
                  label="Sodium"
                  value={v.sodium}
                  onChange={set("sodium")}
                  unit="mg"
                  placeholder="—"
                />
              </div>
            )}
          </div>
        </div>

        {/* Additional Servings definitions */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-3">
              Alternate Servings (Optional)
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm text-xs h-7"
              onClick={() => setServings((s) => [...s, { label: "", grams: "" }])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add serving
            </button>
          </div>
          {servings.length === 0 ? (
            <p className="text-xs text-fg-3">
              Add custom measures like “1 scoop” = 30 g or “1 cup” = 240 g. Grams are always available.
            </p>
          ) : (
            <ul className="space-y-2">
              {servings.map((s, i) => (
                <li key={i} className="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
                  <input
                    className="input"
                    placeholder="1 scoop"
                    aria-label={`Serving ${i + 1} name`}
                    value={s.label}
                    onChange={(e) =>
                      setServings((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                      )
                    }
                    maxLength={60}
                  />
                  <NumberField
                    aria-label={`Serving ${i + 1} grams`}
                    value={s.grams}
                    onChange={(val) =>
                      setServings((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, grams: val } : x))
                      )
                    }
                    unit="g"
                    placeholder="30"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-fg-2 hover:text-negative"
                    onClick={() => setServings((arr) => arr.filter((_, j) => j !== i))}
                    aria-label={`Remove serving ${i + 1}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {err && (
          <div className="rounded-lg bg-negative/10 border border-negative/20 p-2.5 text-xs text-negative" role="alert">
            {err}
          </div>
        )}
      </form>
    </Sheet>
  );
}
