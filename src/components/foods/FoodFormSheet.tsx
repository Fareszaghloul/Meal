"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { NumberField, Segmented, TextField, fmt, parseNum } from "@/components/ui/primitives";
import type { FoodSummary } from "@/lib/domain";
import { nutrientsPer100g, roundNutrients, scaleNutrients, toNutrients } from "@/lib/nutrition/core";
import { api } from "@/lib/client/api";
import { toast } from "@/components/ui/Toast";

type Basis = "serving" | "100g";
const UNITS = ["g", "ml", "serving", "piece", "cup", "tbsp", "tsp", "slice", "scoop", "oz"];
const CATEGORIES = ["Custom", "Meat", "Fish", "Dairy", "Eggs", "Grains", "Produce", "Legumes", "Nuts", "Snacks", "Drinks", "Pantry", "Restaurant"];

/** Create or edit a food. Values can be entered per serving or per 100 g; both are stored. */
export function FoodFormSheet({ open, food, onClose, onSaved }: { open: boolean; food: FoodSummary | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Custom");
  const [basis, setBasis] = useState<Basis>("serving");
  const [servingSize, setServingSize] = useState("100");
  const [servingUnit, setServingUnit] = useState("g");
  const [servingGrams, setServingGrams] = useState("");
  const [v, setV] = useState({ calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", satFat: "", sodium: "" });
  const [servings, setServings] = useState<{ label: string; grams: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (food) {
      setName(food.name);
      setBrand(food.brand ?? "");
      setCategory(food.category || "Custom");
      const hasServing = !!(food.servingSize && food.servingUnit);
      setBasis(hasServing ? "serving" : "100g");
      setServingSize(hasServing ? fmt.qty(food.servingSize!) : "100");
      setServingUnit(hasServing ? food.servingUnit! : "g");
      setServingGrams(hasServing && food.servingUnit !== "g" && food.servingUnit !== "ml" ? fmt.qty(food.servingWeightGrams) : "");
      // The label serving is edited through the fields above; list only the extra ones.
      const labelServing = hasServing ? `${fmt.qty(food.servingSize!)} ${food.servingUnit}` : null;
      setServings((food.servings ?? []).filter((s) => s.label !== labelServing).map((s) => ({ label: s.label, grams: fmt.qty(s.grams) })));
      const per = hasServing ? scaleNutrients(nutrientsPer100g(food), food.servingWeightGrams / 100) : nutrientsPer100g(food);
      const r = roundNutrients(per);
      setV({
        calories: String(r.calories),
        protein: String(r.protein),
        carbs: String(r.carbs),
        fat: String(r.fat),
        fiber: r.fiber ? String(r.fiber) : "",
        sugar: r.totalSugars === null ? "" : String(r.totalSugars),
        satFat: r.saturatedFat === null ? "" : String(r.saturatedFat),
        sodium: r.sodium === null ? "" : String(r.sodium),
      });
    } else {
      setName("");
      setBrand("");
      setCategory("Custom");
      setBasis("serving");
      setServingSize("100");
      setServingUnit("g");
      setServingGrams("");
      setServings([]);
      setV({ calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", satFat: "", sodium: "" });
    }
  }, [open, food]);

  const servingsValid = servings.every((s) => s.label.trim() && parseNum(s.grams) > 0);

  const isWeightUnit = servingUnit === "g" || servingUnit === "ml";
  const gramsPerServing = isWeightUnit ? parseNum(servingSize) : parseNum(servingGrams);
  const entered = toNutrients({ calories: v.calories, protein: v.protein, carbs: v.carbs, fat: v.fat, fiber: v.fiber, totalSugars: v.sugar || null, saturatedFat: v.satFat || null, sodium: v.sodium || null });

  const { per100, perServing } = useMemo(() => {
    if (basis === "100g") {
      const ps = gramsPerServing > 0 ? scaleNutrients(entered, gramsPerServing / 100) : entered;
      return { per100: entered, perServing: ps };
    }
    const p100 = gramsPerServing > 0 ? scaleNutrients(entered, 100 / gramsPerServing) : entered;
    return { per100: p100, perServing: entered };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis, gramsPerServing, v]);

  const valid = name.trim().length > 0 && parseNum(servingSize) > 0 && (basis === "100g" || isWeightUnit || gramsPerServing > 0) && servingsValid;

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
      // Named servings; the label serving above is added automatically when the unit isn't g/ml.
      servings: [
        ...(!isWeightUnit && gramsPerServing > 0 ? [{ label: `${fmt.qty(parseNum(servingSize))} ${servingUnit}`, grams: gramsPerServing, isDefault: true }] : []),
        ...servings.filter((s) => s.label.trim() && parseNum(s.grams) > 0).map((s) => ({ label: s.label.trim(), grams: parseNum(s.grams), isDefault: false })),
      ],
    };
    try {
      if (food) await api(`/api/foods/${food.id}`, { method: "PUT", json: payload });
      else await api("/api/foods", { method: "POST", json: payload });
      toast(food ? "Food updated" : "Food added", { kind: "success" });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={food ? "Edit food" : "New food"}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="food-form" className="btn btn-primary" disabled={!valid || busy}>
            {food ? "Save" : "Add food"}
          </button>
        </>
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
        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus maxLength={200} />
          <TextField label="Brand (optional)" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={100} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <NumberField label="Serving size" value={servingSize} onChange={setServingSize} />
          <div>
            <label className="label" htmlFor="ff-unit">
              Unit
            </label>
            <select id="ff-unit" className="input w-24" value={servingUnit} onChange={(e) => setServingUnit(e.target.value)}>
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
            <select id="ff-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {(CATEGORIES.includes(category) ? CATEGORIES : [category, ...CATEGORIES]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!isWeightUnit && <NumberField label="Weight of one serving" value={servingGrams} onChange={setServingGrams} unit="g" error={gramsPerServing > 0 ? undefined : "Needed to scale by grams"} />}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Nutrition</span>
            <Segmented
              value={basis}
              onChange={setBasis}
              size="sm"
              options={[
                { value: "serving", label: `per ${fmt.qty(parseNum(servingSize) || 0)} ${servingUnit}` },
                { value: "100g", label: "per 100 g" },
              ]}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <NumberField label="kcal" value={v.calories} onChange={set("calories")} placeholder="0" />
            <NumberField label="Protein" value={v.protein} onChange={set("protein")} unit="g" placeholder="0" />
            <NumberField label="Carbs" value={v.carbs} onChange={set("carbs")} unit="g" placeholder="0" />
            <NumberField label="Fat" value={v.fat} onChange={set("fat")} unit="g" placeholder="0" />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <NumberField label="Fiber" value={v.fiber} onChange={set("fiber")} unit="g" placeholder="0" />
            <NumberField label="Sugar" value={v.sugar} onChange={set("sugar")} unit="g" placeholder="—" />
            <NumberField label="Sat. fat" value={v.satFat} onChange={set("satFat")} unit="g" placeholder="—" />
            <NumberField label="Sodium" value={v.sodium} onChange={set("sodium")} unit="mg" placeholder="—" />
          </div>
          <p className="mt-2 text-xs tabular text-fg-3">
            {basis === "serving" ? (
              <>
                Per 100 g: {fmt.int(per100.calories)} kcal · {fmt.one(per100.protein)}P · {fmt.one(per100.carbs)}C · {fmt.one(per100.fat)}F
              </>
            ) : (
              <>
                Per serving: {fmt.int(perServing.calories)} kcal · {fmt.one(perServing.protein)}P · {fmt.one(perServing.carbs)}C · {fmt.one(perServing.fat)}F
              </>
            )}
          </p>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">More servings (optional)</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setServings((s) => [...s, { label: "", grams: "" }])}>
              + Add serving
            </button>
          </div>
          {servings.length === 0 ? (
            <p className="text-xs text-fg-3">e.g. “1 cup” = 240 g, “1 slice” = 30 g. Grams are always available.</p>
          ) : (
            <ul className="space-y-2">
              {servings.map((s, i) => (
                <li key={i} className="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
                  <input className="input" placeholder="1 cup" aria-label={`Serving ${i + 1} name`} value={s.label} onChange={(e) => setServings((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} maxLength={60} />
                  <NumberField aria-label={`Serving ${i + 1} grams`} value={s.grams} onChange={(val) => setServings((arr) => arr.map((x, j) => (j === i ? { ...x, grams: val } : x)))} unit="g" placeholder="240" />
                  <button type="button" className="btn btn-ghost btn-sm text-fg-2" onClick={() => setServings((arr) => arr.filter((_, j) => j !== i))} aria-label={`Remove serving ${i + 1}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {err && (
          <p className="text-sm text-negative" role="alert">
            {err}
          </p>
        )}
      </form>
    </Sheet>
  );
}
