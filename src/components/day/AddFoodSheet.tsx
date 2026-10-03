"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Globe, Search, Star } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState, NumberField, Segmented, Spinner, TextField, fmt, parseNum } from "@/components/ui/primitives";
import { MEAL_CATEGORIES, MEAL_LABELS, type FoodSummary, type MealCategory, type MealTemplate, type RecipeSummary } from "@/lib/domain";
import { nutrientsForGrams, roundNutrients, scaleNutrients, toNutrients, type Nutrients } from "@/lib/nutrition/core";
import { defaultServing, portionToEntry, servingOptions, type ServingOption } from "@/lib/nutrition/servings";
import { addEntry, logTemplate } from "@/lib/client/day-store";
import { invalidateCatalog, loadCatalog, peekCatalog, rankMatches, type Catalog } from "@/lib/client/catalog";
import { api, ApiError } from "@/lib/client/api";
import { toast } from "@/components/ui/Toast";
import type { DateString } from "@/lib/dates";
import { UnifiedFoodSearchModal } from "@/components/foods/UnifiedFoodSearchModal";
import type { NormalizedFood } from "@/lib/nutrition/providers/types";
import { cn } from "@/lib/utils";

type Tab = "recent" | "favorites" | "mine" | "library" | "recipes" | "saved" | "quick";
type Selection = { kind: "food"; food: FoodSummary } | { kind: "recipe"; recipe: RecipeSummary };

interface Props {
  open: boolean;
  onClose: () => void;
  date: DateString;
  initialMeal: MealCategory;
}

const TABS: { value: Tab; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "favorites", label: "Favorites" },
  { value: "mine", label: "My foods" },
  { value: "library", label: "Library" },
  { value: "recipes", label: "Recipes" },
  { value: "saved", label: "Saved meals" },
  { value: "quick", label: "Quick add" },
];

type EntryDraft = Nutrients & { name: string; servings: number; servingUnit: string; foodId: string | null; recipeId: string | null };

function recipeNutrients(r: RecipeSummary, qty: number): Nutrients {
  return roundNutrients(
    scaleNutrients(
      toNutrients({
        calories: r.caloriesPerServing,
        protein: r.proteinPerServing,
        carbs: r.carbsPerServing,
        fat: r.fatPerServing,
        fiber: r.fiberPerServing,
        totalSugars: r.totalSugarsPerServing,
        addedSugars: r.addedSugarsPerServing,
        saturatedFat: r.saturatedFatPerServing,
        transFat: r.transFatPerServing,
        sodium: r.sodiumPerServing,
      }),
      qty
    )
  );
}

/** One-tap draft for a food at its default serving × 1. */
function quickDraft(food: FoodSummary): EntryDraft {
  const { option, quantity } = defaultServing(food);
  const p = portionToEntry(option, quantity);
  return { name: food.name, servings: p.servings, servingUnit: p.servingUnit, foodId: food.id, recipeId: null, ...roundNutrients(nutrientsForGrams(food, p.grams)) };
}

export function AddFoodSheet({ open, onClose, date, initialMeal }: Props) {
  const [meal, setMeal] = useState<MealCategory>(initialMeal);
  const [tab, setTab] = useState<Tab>("recent");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [catalog, setCatalog] = useState<Catalog | null>(peekCatalog());
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [picked, setPicked] = useState<Map<string, EntryDraft>>(new Map()); // multi-select basket
  const [onlineOpen, setOnlineOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMeal(initialMeal);
    setSelection(null);
    setPicked(new Map());
    setQuery("");
    setCategory("All");
    setTab((t) => (t === "quick" ? "quick" : "recent"));
    setLoading(!peekCatalog());
    loadCatalog()
      .then((c) => {
        setCatalog(c);
        // Nothing logged yet → start in the library instead of an empty Recent tab.
        setTab((t) => (t === "recent" && !c.foods.some((f) => f.lastUsedAt) ? "library" : t));
      })
      .catch((e) => toast(e instanceof Error ? e.message : "Couldn't load your foods", { kind: "error" }))
      .finally(() => setLoading(false));
  }, [open, initialMeal]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const refreshCatalog = useCallback(() => {
    invalidateCatalog();
    loadCatalog(true).then(setCatalog).catch(() => undefined);
  }, []);

  const q = query.trim();
  const templates = catalog?.templates ?? [];
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const f of catalog?.foods ?? []) if (!f.userId) set.add(f.category);
    return ["All", ...[...set].sort()];
  }, [catalog]);

  const list = useMemo(() => {
    const foods = catalog?.foods ?? [];
    const recipes = catalog?.recipes ?? [];
    if (q) {
      // Most-used first among equally good matches; your own foods ahead of library foods.
      const ordered = [...foods].sort((a, b) => b.useCount - a.useCount || Number(!!b.userId) - Number(!!a.userId));
      return { foods: rankMatches(ordered, q, (x) => `${x.name} ${x.brand ?? ""}`).slice(0, 60), recipes: rankMatches(recipes, q, (x) => x.name) };
    }
    switch (tab) {
      case "recent":
        return { foods: foods.filter((f) => f.lastUsedAt).sort((a, b) => (b.lastUsedAt! > a.lastUsedAt! ? 1 : -1)).slice(0, 40), recipes: [] };
      case "favorites":
        return { foods: foods.filter((f) => f.isFavorite), recipes: recipes.filter((r) => r.isFavorite) };
      case "mine":
        return { foods: foods.filter((f) => f.userId), recipes: [] };
      case "library":
        return { foods: foods.filter((f) => !f.userId && (category === "All" || f.category === category)), recipes: [] };
      case "recipes":
        return { foods: [], recipes };
      default:
        return { foods: [], recipes: [] };
    }
  }, [q, tab, category, catalog]);

  const toggleFavorite = async (food: FoodSummary) => {
    setCatalog((c) => c && { ...c, foods: c.foods.map((f) => (f.id === food.id ? { ...f, isFavorite: !f.isFavorite } : f)) });
    try {
      await api(`/api/foods/${food.id}`, { method: "PATCH", json: { isFavorite: !food.isFavorite } });
      invalidateCatalog();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update favorite", { kind: "error" });
      setCatalog((c) => c && { ...c, foods: c.foods.map((f) => (f.id === food.id ? { ...f, isFavorite: food.isFavorite } : f)) });
    }
  };

  const togglePick = (key: string, draft: EntryDraft) =>
    setPicked((m) => {
      const next = new Map(m);
      if (next.has(key)) next.delete(key);
      else next.set(key, draft);
      return next;
    });

  const applyTemplate = async (t: MealTemplate) => {
    try {
      await logTemplate(t.id, date, meal);
      toast(`Added ${t.name} to ${MEAL_LABELS[meal]}`, { kind: "success" });
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't add meal", { kind: "error" });
    }
  };

  const added = (label: string, keepOpen: boolean) => {
    toast(`Added ${label} to ${MEAL_LABELS[meal]}`, { kind: "success", durationMs: 1800 });
    setSelection(null);
    if (keepOpen) {
      setQuery("");
      setTimeout(() => searchRef.current?.focus(), 30);
    } else onClose();
  };

  const addPicked = () => {
    for (const d of picked.values()) addEntry({ ...d, date, mealCategory: meal });
    const n = picked.size;
    setPicked(new Map());
    added(`${n} item${n === 1 ? "" : "s"}`, false);
  };

  const onlineLog = async (food: NormalizedFood, grams: number) => {
    let foodId: string | null = food.isLocal && food.providerId ? food.providerId : null;
    let name = food.name;
    if (!foodId) {
      try {
        const imported = await api<{ id: string; name: string }>("/api/foods/external/import", { method: "POST", json: food });
        foodId = imported.id;
        name = imported.name;
        invalidateCatalog();
      } catch {
        /* still log it, unlinked */
      }
    }
    const base = toNutrients({
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbohydrates,
      fat: food.fat,
      fiber: food.dietaryFiber ?? 0,
      totalSugars: food.totalSugars,
      addedSugars: food.addedSugars,
      saturatedFat: food.saturatedFat,
      transFat: food.transFat,
      sodium: food.sodium,
    });
    const per100 = food.nutritionBasis === "PER_100G" || food.nutritionBasis === "PER_100ML" ? base : scaleNutrients(base, 100 / (food.servingWeightGrams || 100));
    addEntry({ date, mealCategory: meal, name, servings: grams, servingUnit: "g", foodId, ...roundNutrients(scaleNutrients(per100, grams / 100)) });
    setOnlineOpen(false);
    added(name, false);
  };

  const pickedTotal = useMemo(() => roundNutrients(toNutrients([...picked.values()].reduce((a, d) => ({ calories: a.calories + d.calories, protein: a.protein + d.protein }), { calories: 0, protein: 0 }))), [picked]);

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={selection ? (selection.kind === "food" ? selection.food.name : selection.recipe.name) : "Add food"}
        size="lg"
        initialFocusRef={searchRef}
        footer={
          !selection && picked.size > 0 ? (
            <>
              <span className="mr-auto text-sm tabular text-fg-2">
                {picked.size} selected · {fmt.int(pickedTotal.calories)} kcal · {fmt.g(pickedTotal.protein)}P
              </span>
              <button type="button" className="btn btn-secondary" onClick={() => setPicked(new Map())}>
                Clear
              </button>
              <button type="button" className="btn btn-primary" onClick={addPicked}>
                Add {picked.size} to {MEAL_LABELS[meal]}
              </button>
            </>
          ) : undefined
        }
      >
        <div className="mb-3">
          <Segmented value={meal} onChange={setMeal} options={MEAL_CATEGORIES.map((c) => ({ value: c, label: MEAL_LABELS[c] }))} className="w-full" size="sm" ariaLabel="Meal" />
        </div>

        {selection ? (
          <PortionStep
            selection={selection}
            onBack={() => setSelection(null)}
            onAdd={(entry, keepOpen) => {
              addEntry({ ...entry, date, mealCategory: meal });
              added(entry.name, keepOpen);
            }}
          />
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" />
              <input
                ref={searchRef}
                type="search"
                className="input pl-9 pr-24"
                placeholder="Search foods, library and recipes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const first = list.foods[0] ?? null;
                    if (first) setSelection({ kind: "food", food: first });
                    else if (list.recipes[0]) setSelection({ kind: "recipe", recipe: list.recipes[0] });
                    else if (q) setOnlineOpen(true);
                  }
                }}
                aria-label="Search foods"
                autoComplete="off"
              />
              <button type="button" onClick={() => setOnlineOpen(true)} className="btn btn-ghost btn-sm absolute right-1.5 top-1/2 -translate-y-1/2 text-fg-2">
                <Globe className="h-3.5 w-3.5" /> Online
              </button>
            </div>

            {!q && (
              <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1">
                <Segmented value={tab} onChange={setTab} options={TABS} size="sm" ariaLabel="Source" className="min-w-max" />
              </div>
            )}
            {!q && tab === "library" && categories.length > 2 && (
              <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {categories.map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)} className={cn("btn btn-sm whitespace-nowrap", category === c ? "btn-primary" : "btn-secondary")} aria-pressed={category === c}>
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3">
              {loading ? (
                <div className="space-y-2 py-2" aria-busy="true">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-10" />
                  ))}
                </div>
              ) : tab === "quick" && !q ? (
                <QuickAddForm
                  onAdd={(entry, keepOpen) => {
                    addEntry({ ...entry, date, mealCategory: meal });
                    added(entry.name, keepOpen);
                  }}
                  onFoodCreated={refreshCatalog}
                />
              ) : tab === "saved" && !q ? (
                templates.length === 0 ? (
                  <EmptyState title="No saved meals" description="Use “Save as meal” on any meal section to reuse it in one tap." compact />
                ) : (
                  <ul className="divide-y divide-line">
                    {templates.map((t) => {
                      const total = roundNutrients(toNutrients(t.items.reduce((acc, i) => ({ calories: acc.calories + i.calories, protein: acc.protein + i.protein, carbs: acc.carbs + i.carbs, fat: acc.fat + i.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 })));
                      return (
                        <li key={t.id}>
                          <button type="button" onClick={() => applyTemplate(t)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-surface-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm text-fg">{t.name}</div>
                              <div className="truncate text-xs text-fg-3">{t.items.map((i) => i.name).join(", ")}</div>
                            </div>
                            <div className="shrink-0 text-right text-xs tabular text-fg-2">
                              <div className="text-sm text-fg">{fmt.int(total.calories)}</div>
                              {fmt.g(total.protein)}P · {fmt.g(total.carbs)}C · {fmt.g(total.fat)}F
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : list.foods.length === 0 && list.recipes.length === 0 ? (
                <EmptyState
                  title={q ? `No matches for “${q}”` : tab === "recent" ? "Nothing logged yet" : tab === "favorites" ? "No favorites yet" : tab === "mine" ? "No foods yet" : tab === "library" ? "Nothing in this category" : "No recipes yet"}
                  description={q ? "Try the online databases or add it with Quick add." : tab === "recent" ? "Foods you log will show up here for one-tap reuse." : tab === "favorites" ? "Star a food to pin it here." : undefined}
                  compact
                  action={
                    q ? (
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOnlineOpen(true)}>
                          <Globe className="h-3.5 w-3.5" /> Search online
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setTab("quick");
                            setQuery("");
                          }}
                        >
                          Quick add “{q}”
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="divide-y divide-line">
                  {list.foods.map((f) => {
                    const draft = quickDraft(f);
                    const key = `food:${f.id}`;
                    const isPicked = picked.has(key);
                    return (
                      <li key={f.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isPicked}
                          aria-label={`Select ${f.name}`}
                          onClick={() => togglePick(key, draft)}
                          className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border", isPicked ? "border-fg bg-fg text-bg" : "border-line-strong text-transparent hover:border-fg-3")}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setSelection({ kind: "food", food: f })} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2.5 text-left">
                          <div className="min-w-0">
                            <div className="truncate text-sm text-fg">
                              {f.name}
                              {f.brand && <span className="text-fg-3"> · {f.brand}</span>}
                            </div>
                            <div className="text-xs tabular text-fg-3">
                              {draft.servingUnit === "g" || draft.servingUnit === "ml" ? `${fmt.qty(draft.servings)} ${draft.servingUnit}` : `${fmt.qty(draft.servings)} ${draft.servingUnit}`} · {fmt.g(draft.protein)}P · {fmt.g(draft.carbs)}C · {fmt.g(draft.fat)}F
                            </div>
                          </div>
                          <span className="shrink-0 text-sm tabular text-fg">{fmt.int(draft.calories)}</span>
                        </button>
                        <button type="button" onClick={() => toggleFavorite(f)} className="btn btn-ghost btn-icon btn-sm" aria-label={f.isFavorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={f.isFavorite}>
                          <Star className={cn("h-4 w-4", f.isFavorite ? "fill-current text-fg" : "text-fg-3")} />
                        </button>
                      </li>
                    );
                  })}
                  {list.recipes.map((r) => {
                    const key = `recipe:${r.id}`;
                    const isPicked = picked.has(key);
                    const draft: EntryDraft = { name: r.name, servings: 1, servingUnit: "serving", foodId: null, recipeId: r.id, ...recipeNutrients(r, 1) };
                    return (
                      <li key={r.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isPicked}
                          aria-label={`Select ${r.name}`}
                          onClick={() => togglePick(key, draft)}
                          className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border", isPicked ? "border-fg bg-fg text-bg" : "border-line-strong text-transparent hover:border-fg-3")}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setSelection({ kind: "recipe", recipe: r })} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2.5 text-left">
                          <div className="min-w-0">
                            <div className="truncate text-sm text-fg">
                              {r.name} <span className="text-xs text-fg-3">recipe</span>
                            </div>
                            <div className="text-xs tabular text-fg-3">
                              1 serving · {fmt.g(r.proteinPerServing)}P · {fmt.g(r.carbsPerServing)}C · {fmt.g(r.fatPerServing)}F
                            </div>
                          </div>
                          <span className="shrink-0 text-sm tabular text-fg">{fmt.int(r.caloriesPerServing)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </Sheet>

      <UnifiedFoodSearchModal isOpen={onlineOpen} onClose={() => setOnlineOpen(false)} mode="log" initialQuery={q} onSaveAndLog={onlineLog} />
    </>
  );
}

/* ───────────── portion step ───────────── */

function PortionStep({ selection, onBack, onAdd }: { selection: Selection; onBack: () => void; onAdd: (e: EntryDraft, keepOpen: boolean) => void }) {
  const options = useMemo<ServingOption[]>(() => (selection.kind === "food" ? servingOptions(selection.food) : [{ id: "serving", label: "serving", grams: 0 }]), [selection]);
  const initial = useMemo(() => (selection.kind === "food" ? defaultServing(selection.food) : { option: options[0], quantity: 1 }), [selection, options]);
  const [optionId, setOptionId] = useState(initial.option.id);
  const [qty, setQty] = useState(fmt.qty(initial.quantity));
  const qtyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    qtyRef.current?.focus();
  }, []);

  const option = options.find((o) => o.id === optionId) ?? options[0];
  const n = parseNum(qty);
  const isGrams = option.id === "g";

  const nutrients = useMemo<Nutrients>(() => {
    if (!(n > 0)) return toNutrients({});
    if (selection.kind === "recipe") return recipeNutrients(selection.recipe, n);
    return roundNutrients(nutrientsForGrams(selection.food, n * option.grams));
  }, [selection, option, n]);

  const draft = (): EntryDraft => {
    if (selection.kind === "recipe") return { name: selection.recipe.name, servings: n, servingUnit: "serving", foodId: null, recipeId: selection.recipe.id, ...nutrients };
    const p = portionToEntry(option, n);
    return { name: selection.food.name, servings: p.servings, servingUnit: p.servingUnit, foodId: selection.food.id, recipeId: null, ...nutrients };
  };

  const switchOption = (id: string) => {
    const next = options.find((o) => o.id === id);
    if (!next) return;
    // Keep the same physical amount when switching units.
    const grams = n * option.grams;
    setOptionId(id);
    setQty(next.id === "g" ? fmt.qty(Math.round(grams)) : fmt.qty(Math.round((grams / next.grams) * 100) / 100 || 1));
  };

  const step = isGrams ? 10 : option.grams >= 100 ? 0.5 : 1;
  const bump = (d: number) => setQty(fmt.qty(Math.max(0, Math.round((n + d) * 100) / 100)));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (n > 0) onAdd(draft(), false);
      }}
    >
      <button type="button" onClick={onBack} className="btn btn-ghost btn-sm -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid grid-cols-[auto_1fr] items-end gap-3">
        <div className="flex items-end gap-1">
          <button type="button" className="btn btn-secondary btn-icon" onClick={() => bump(-step)} aria-label="Decrease">
            −
          </button>
          <NumberField ref={qtyRef} label="Quantity" value={qty} onChange={setQty} className="w-24" />
          <button type="button" className="btn btn-secondary btn-icon" onClick={() => bump(step)} aria-label="Increase">
            +
          </button>
        </div>
        <div>
          <label className="label" htmlFor="serving-select">
            Serving
          </label>
          {selection.kind === "recipe" ? (
            <div className="input flex items-center text-fg-2">serving</div>
          ) : (
            <select id="serving-select" className="input" value={option.id} onChange={(e) => switchOption(e.target.value)}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id === "g" ? o.label : `${o.label}${/\(/.test(o.label) ? "" : ` (${fmt.qty(o.grams)} g)`}`}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {selection.kind === "food" && isGrams && (
        <div className="flex flex-wrap gap-1">
          {[50, 100, 150, 200, 250].map((g) => (
            <button key={g} type="button" className={cn("btn btn-secondary btn-sm tabular", n === g && "border-fg")} onClick={() => setQty(String(g))}>
              {g} g
            </button>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-md border border-line bg-line text-center">
        {[
          ["Calories", fmt.int(nutrients.calories), "kcal"],
          ["Protein", fmt.one(nutrients.protein), "g"],
          ["Carbs", fmt.one(nutrients.carbs), "g"],
          ["Fat", fmt.one(nutrients.fat), "g"],
        ].map(([l, v, u]) => (
          <div key={l} className="bg-surface px-2 py-2">
            <dt className="text-[11px] text-fg-3">{l}</dt>
            <dd className="text-sm font-medium tabular text-fg">
              {v}
              <span className="text-xs font-normal text-fg-3"> {u}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs tabular text-fg-3">
        {selection.kind === "food" && !isGrams && <>= {fmt.qty(Math.round(n * option.grams))} g · </>}
        {nutrients.fiber > 0 && <>Fiber {fmt.one(nutrients.fiber)} g · </>}
        {nutrients.sodium ? <>Sodium {fmt.int(nutrients.sodium)} mg</> : null}
      </p>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" disabled={!(n > 0)} onClick={() => onAdd(draft(), true)}>
          Add & continue
        </button>
        <button type="submit" className="btn btn-primary" disabled={!(n > 0)}>
          Add to meal <span className="kbd ml-1 hidden sm:inline">↵</span>
        </button>
      </div>
    </form>
  );
}

/* ───────────── quick add ───────────── */

function QuickAddForm({ onAdd, onFoodCreated }: { onAdd: (e: EntryDraft, keepOpen: boolean) => void; onFoodCreated: () => void }) {
  const [name, setName] = useState("");
  const [servingAmount, setServingAmount] = useState("100");
  const [servingUnit, setServingUnit] = useState("g");
  const [servingGrams, setServingGrams] = useState("");
  const [qty, setQty] = useState("1");
  const [v, setV] = useState({ calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", sodium: "" });
  const [more, setMore] = useState(false);
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const quantity = parseNum(qty);
  const perServ = toNutrients({ calories: v.calories, protein: v.protein, carbs: v.carbs, fat: v.fat, fiber: v.fiber, totalSugars: v.sugar || null, sodium: v.sodium || null });
  const total = roundNutrients(scaleNutrients(perServ, quantity));
  const isWeight = servingUnit === "g" || servingUnit === "ml";
  const valid = name.trim().length > 0 && quantity > 0 && parseNum(servingAmount) > 0;
  const gramsPerServing = isWeight ? parseNum(servingAmount) : parseNum(servingGrams) || 0;

  const submit = async (keepOpen: boolean) => {
    if (!valid || busy) return;
    setBusy(true);
    let foodId: string | null = null;
    if (save) {
      try {
        const created = await api<{ id: string }>("/api/foods", {
          method: "POST",
          json: {
            name: name.trim(),
            category: "Custom",
            nutritionBasis: "PER_SERVING",
            servingSize: parseNum(servingAmount),
            servingUnit,
            servingWeightGrams: gramsPerServing || 100,
            defaultUnit: isWeight ? servingUnit : "g",
            calories: perServ.calories,
            protein: perServ.protein,
            carbs: perServ.carbs,
            fat: perServ.fat,
            fiber: perServ.fiber,
            totalSugars: perServ.totalSugars,
            sodium: perServ.sodium,
            servings: isWeight ? [] : [{ label: `${fmt.qty(parseNum(servingAmount))} ${servingUnit}`, grams: gramsPerServing || 100, isDefault: true }],
          },
        });
        foodId = created.id;
        onFoodCreated();
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          try {
            const found = await api<FoodSummary[]>(`/api/foods?q=${encodeURIComponent(name.trim())}&limit=5`);
            foodId = found.find((f) => f.name.toLowerCase() === name.trim().toLowerCase())?.id ?? null;
          } catch {
            /* ignore */
          }
        } else {
          toast(`Saved the entry, but couldn't add it to My Foods: ${e instanceof Error ? e.message : "unknown error"}`, { kind: "error" });
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
        ...total,
      },
      keepOpen
    );
    setBusy(false);
    setName("");
    setV({ calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", sodium: "" });
    setQty("1");
  };

  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
    >
      <TextField ref={nameRef} label="Food" placeholder="e.g. Chicken breast" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <NumberField label="Serving size" value={servingAmount} onChange={setServingAmount} />
        <div>
          <label className="label" htmlFor="qa-unit">
            Unit
          </label>
          <select id="qa-unit" className="input w-24" value={servingUnit} onChange={(e) => setServingUnit(e.target.value)}>
            {["g", "ml", "serving", "piece", "cup", "tbsp", "tsp", "slice", "scoop", "oz"].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <NumberField label="Quantity" value={qty} onChange={setQty} />
      </div>
      {!isWeight && <NumberField label="Weight of one serving (optional)" value={servingGrams} onChange={setServingGrams} unit="g" />}

      <fieldset>
        <legend className="label">
          Per {fmt.qty(parseNum(servingAmount) || 0)} {servingUnit}
        </legend>
        <div className="grid grid-cols-4 gap-2">
          <NumberField label="kcal" value={v.calories} onChange={set("calories")} placeholder="0" />
          <NumberField label="Protein" value={v.protein} onChange={set("protein")} unit="g" placeholder="0" />
          <NumberField label="Carbs" value={v.carbs} onChange={set("carbs")} unit="g" placeholder="0" />
          <NumberField label="Fat" value={v.fat} onChange={set("fat")} unit="g" placeholder="0" />
        </div>
        {more ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumberField label="Fiber" value={v.fiber} onChange={set("fiber")} unit="g" placeholder="0" />
            <NumberField label="Sugar" value={v.sugar} onChange={set("sugar")} unit="g" placeholder="0" />
            <NumberField label="Sodium" value={v.sodium} onChange={set("sodium")} unit="mg" placeholder="0" />
          </div>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="mt-1.5 text-xs text-fg-2 hover:text-fg hover:underline">
            + fiber, sugar, sodium
          </button>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div className="text-sm tabular text-fg-2">
          Total: <span className="font-medium text-fg">{fmt.int(total.calories)} kcal</span> · {fmt.one(total.protein)}P · {fmt.one(total.carbs)}C · {fmt.one(total.fat)}F
        </div>
        <label className="flex items-center gap-2 text-xs text-fg-2">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          Save to My foods
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" disabled={!valid || busy} onClick={() => void submit(true)}>
          Add & continue
        </button>
        <button type="submit" className="btn btn-primary" disabled={!valid || busy}>
          {busy ? <Spinner /> : null} Add
        </button>
      </div>
    </form>
  );
}
