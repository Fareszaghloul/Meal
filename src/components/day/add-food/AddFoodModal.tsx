"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import type { MealCategory, FoodSummary, RecipeSummary, MealTemplate, MealItem } from "@/lib/domain";
import { MEAL_LABELS } from "@/lib/domain";
import type { DateString } from "@/lib/dates";
import { addDays, todayLocal } from "@/lib/dates";
import { addEntry, copyEntries, logTemplate } from "@/lib/client/day-store";
import { loadCatalog, peekCatalog, invalidateCatalog, rankMatches, type Catalog } from "@/lib/client/catalog";
import { api } from "@/lib/client/api";
import { parseNaturalSearch, type ParsedNaturalSearch } from "@/lib/nutrition/natural-parser";
import { getRestaurantFoods } from "@/lib/nutrition/restaurant-data";
import type { NormalizedFood } from "@/lib/nutrition/providers/types";
import { defaultServing, portionToEntry } from "@/lib/nutrition/servings";
import { nutrientsForGrams, roundNutrients } from "@/lib/nutrition/core";

import type { FoodFilterType, EntryDraft } from "./types";
import { MealDateHeader } from "./MealDateHeader";
import { FoodSearchBar } from "./FoodSearchBar";
import { FoodFilterChips } from "./FoodFilterChips";
import { FoodResultRow, type RowItem } from "./FoodResultRow";
import { FoodPortionEditor } from "./FoodPortionEditor";
import { ManualNutritionForm } from "./ManualNutritionForm";
import { DefaultFoodView } from "./DefaultFoodView";

interface AddFoodModalProps {
  open: boolean;
  onClose: () => void;
  date: DateString;
  initialMeal: MealCategory;
}

export function AddFoodModal({ open, onClose, date: initialDate, initialMeal }: AddFoodModalProps) {
  const [meal, setMeal] = useState<MealCategory>(initialMeal);
  const [date, setDate] = useState<DateString>(initialDate);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FoodFilterType>("all");

  // Selection subview states
  const [selectedItem, setSelectedItem] = useState<RowItem | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  // Catalog and data
  const [catalog, setCatalog] = useState<Catalog | null>(peekCatalog());
  const [restaurantFoods, setRestaurantFoods] = useState<FoodSummary[]>([]);
  const [recentData, setRecentData] = useState<{
    recent: MealItem[];
    frequentByMeal: Record<string, MealItem[]>;
    yesterdayByMeal: Record<string, MealItem[]>;
  } | null>(null);

  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [isRepeatingYesterday, setIsRepeatingYesterday] = useState(false);

  // Online search state
  const [onlineResults, setOnlineResults] = useState<NormalizedFood[]>([]);
  const [searchingOnline, setSearchingOnline] = useState(false);

  // Keyboard navigation index
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset and load on open
  useEffect(() => {
    if (!open) return;
    setMeal(initialMeal);
    setDate(initialDate);
    setSelectedItem(null);
    setManualEntryOpen(false);
    setQuery("");
    setActiveFilter("all");
    setHighlightedIndex(0);

    // Load restaurant foods once
    setRestaurantFoods(getRestaurantFoods());

    // Load catalog
    setLoadingCatalog(!peekCatalog());
    loadCatalog()
      .then(setCatalog)
      .catch((e) => toast(e instanceof Error ? e.message : "Couldn't load foods", { kind: "error" }))
      .finally(() => setLoadingCatalog(false));

    // Load recent / frequent foods for smart default view
    api<{
      recent: MealItem[];
      frequentByMeal: Record<string, MealItem[]>;
      yesterdayByMeal: Record<string, MealItem[]>;
    }>(`/api/food-log/recent?date=${initialDate}`)
      .then(setRecentData)
      .catch(() => undefined);

    const onInvalidate = () => {
      loadCatalog(true).then(setCatalog).catch(() => undefined);
    };
    window.addEventListener("mealprep:catalog-invalidated", onInvalidate);
    return () => window.removeEventListener("mealprep:catalog-invalidated", onInvalidate);
  }, [open, initialMeal, initialDate]);

  // Global keyboard shortcut '/' to focus search
  useEffect(() => {
    if (!open || selectedItem || manualEntryOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, selectedItem, manualEntryOpen]);

  // Handle Escape key to back out of subviews before closing modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedItem) {
          e.stopPropagation();
          e.preventDefault();
          setSelectedItem(null);
        } else if (manualEntryOpen) {
          e.stopPropagation();
          e.preventDefault();
          setManualEntryOpen(false);
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, selectedItem, manualEntryOpen]);

  // Natural quantity parser
  const parsedNatural: ParsedNaturalSearch = useMemo(() => {
    return parseNaturalSearch(query);
  }, [query]);

  // Actual food search term: use foodQuery if natural quantity found, else query
  const effectiveSearchQuery = (parsedNatural.hasNaturalQuantity ? parsedNatural.foodQuery : query).trim();

  // Debounced Online Search when online filter is active or search query is long
  useEffect(() => {
    if (!effectiveSearchQuery || (activeFilter !== "online" && activeFilter !== "all")) {
      setOnlineResults([]);
      setSearchingOnline(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Only search online if query is >= 3 chars or user specifically clicked Online filter
    if (effectiveSearchQuery.length < 3 && activeFilter !== "online") {
      setOnlineResults([]);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setSearchingOnline(true);
      try {
        const res = await api<NormalizedFood[]>(
          `/api/foods/search?q=${encodeURIComponent(effectiveSearchQuery)}&limit=15`,
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          setOnlineResults(res || []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setOnlineResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingOnline(false);
        }
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [effectiveSearchQuery, activeFilter]);

  // Unified results aggregation & ranking
  const searchResults = useMemo<RowItem[]>(() => {
    const foods = catalog?.foods ?? [];
    const recipes = catalog?.recipes ?? [];
    const restaurants = restaurantFoods;

    const allItems: RowItem[] = [];

    // Filter based on active filter chip
    if (activeFilter === "online") {
      return onlineResults.map((food) => ({ kind: "online", food }));
    }

    if (activeFilter === "recipes") {
      const filtered = effectiveSearchQuery ? rankMatches(recipes, effectiveSearchQuery, (r) => r.name) : recipes;
      return filtered.map((recipe) => ({ kind: "recipe", recipe }));
    }

    if (activeFilter === "restaurants") {
      const filtered = effectiveSearchQuery ? rankMatches(restaurants, effectiveSearchQuery, (r) => r.name) : restaurants;
      return filtered.map((food) => ({ kind: "food", food }));
    }

    if (activeFilter === "favorites") {
      const favFoods = foods.filter((f) => f.isFavorite);
      const favRecipes = recipes.filter((r) => r.isFavorite);
      const matchedFoods = effectiveSearchQuery ? rankMatches(favFoods, effectiveSearchQuery, (f) => `${f.name} ${f.brand ?? ""}`) : favFoods;
      const matchedRecipes = effectiveSearchQuery ? rankMatches(favRecipes, effectiveSearchQuery, (r) => r.name) : favRecipes;
      return [
        ...matchedFoods.map((food): RowItem => ({ kind: "food", food })),
        ...matchedRecipes.map((recipe): RowItem => ({ kind: "recipe", recipe })),
      ];
    }

    if (activeFilter === "mine") {
      const myFoods = foods.filter((f) => f.userId);
      const filtered = effectiveSearchQuery ? rankMatches(myFoods, effectiveSearchQuery, (f) => `${f.name} ${f.brand ?? ""}`) : myFoods;
      return filtered.map((food) => ({ kind: "food", food }));
    }

    if (activeFilter === "recent") {
      const recentFoods = foods.filter((f) => f.lastUsedAt).sort((a, b) => (b.lastUsedAt! > a.lastUsedAt! ? 1 : -1));
      const filtered = effectiveSearchQuery ? rankMatches(recentFoods, effectiveSearchQuery, (f) => `${f.name} ${f.brand ?? ""}`) : recentFoods;
      return filtered.map((food) => ({ kind: "food", food }));
    }

    // "All" filter
    if (effectiveSearchQuery) {
      // Prioritize: frequently used > user's foods > library foods > restaurants > recipes
      const combinedFoods = [...foods, ...restaurants];
      const ordered = [...combinedFoods].sort((a, b) => b.useCount - a.useCount || Number(!!a.lastUsedAt) - Number(!!b.lastUsedAt) || Number(!!b.userId) - Number(!!a.userId));
      const matchedFoods = rankMatches(ordered, effectiveSearchQuery, (f) => `${f.name} ${f.brand ?? ""}`).slice(0, 50);
      const matchedRecipes = rankMatches(recipes, effectiveSearchQuery, (r) => r.name).slice(0, 10);

      const items: RowItem[] = [
        ...matchedFoods.map((food): RowItem => ({ kind: "food", food })),
        ...matchedRecipes.map((recipe): RowItem => ({ kind: "recipe", recipe })),
      ];

      // Append online results if available
      if (onlineResults.length > 0) {
        for (const onl of onlineResults) {
          items.push({ kind: "online", food: onl });
        }
      }

      return items;
    }

    return [];
  }, [catalog, restaurantFoods, activeFilter, effectiveSearchQuery, onlineResults]);

  // Favorite toggle handler
  const handleToggleFavorite = async (id: string, currentFav: boolean, kind?: "food" | "recipe") => {
    if (kind === "recipe") {
      setCatalog((c) =>
        c ? { ...c, recipes: c.recipes.map((r) => (r.id === id ? { ...r, isFavorite: !currentFav } : r)) } : null
      );
      try {
        await api(`/api/recipes/${id}/favorite`, { method: "POST" });
        invalidateCatalog();
      } catch {
        toast("Couldn't update recipe favorite", { kind: "error" });
        setCatalog((c) =>
          c ? { ...c, recipes: c.recipes.map((r) => (r.id === id ? { ...r, isFavorite: currentFav } : r)) } : null
        );
      }
      return;
    }

    setCatalog((c) =>
      c ? { ...c, foods: c.foods.map((f) => (f.id === id ? { ...f, isFavorite: !currentFav } : f)) } : null
    );
    try {
      await api(`/api/foods/${id}`, { method: "PATCH", json: { isFavorite: !currentFav } });
      invalidateCatalog();
    } catch {
      toast("Couldn't update favorite", { kind: "error" });
      setCatalog((c) =>
        c ? { ...c, foods: c.foods.map((f) => (f.id === id ? { ...f, isFavorite: currentFav } : f)) } : null
      );
    }
  };

  // Add entry handler (from portion editor or manual form)
  const handleAddEntry = (entry: EntryDraft, keepOpen: boolean) => {
    addEntry({ ...entry, date, mealCategory: meal });
    toast(`Added ${entry.name} to ${MEAL_LABELS[meal]}`, { kind: "success", durationMs: 2000 });
    setSelectedItem(null);
    setManualEntryOpen(false);

    if (keepOpen) {
      setQuery("");
      setTimeout(() => searchInputRef.current?.focus(), 40);
    } else {
      onClose();
    }
  };

  // Quick add at default portion
  const handleQuickAdd = (item: RowItem) => {
    let draft: EntryDraft | null = null;
    if (item.kind === "food") {
      const { option, quantity } = defaultServing(item.food);
      const p = portionToEntry(option, quantity);
      draft = {
        name: item.food.name,
        brand: item.food.brand,
        servings: p.servings,
        servingUnit: p.servingUnit,
        foodId: item.food.id,
        recipeId: null,
        ...roundNutrients(nutrientsForGrams(item.food, p.grams)),
      };
    } else if (item.kind === "recipe") {
      draft = {
        name: item.recipe.name,
        servings: 1,
        servingUnit: "serving",
        foodId: null,
        recipeId: item.recipe.id,
        calories: item.recipe.caloriesPerServing,
        protein: item.recipe.proteinPerServing,
        carbs: item.recipe.carbsPerServing,
        fat: item.recipe.fatPerServing,
        fiber: item.recipe.fiberPerServing,
        totalSugars: item.recipe.totalSugarsPerServing,
        addedSugars: item.recipe.addedSugarsPerServing,
        saturatedFat: item.recipe.saturatedFatPerServing,
        transFat: item.recipe.transFatPerServing,
        sodium: item.recipe.sodiumPerServing,
      };
    } else {
      const o = item.food;
      draft = {
        name: o.name,
        brand: o.brand,
        servings: o.servingWeightGrams || 100,
        servingUnit: "g",
        foodId: null,
        recipeId: null,
        calories: o.calories,
        protein: o.protein,
        carbs: o.carbohydrates,
        fat: o.fat,
        fiber: o.dietaryFiber ?? 0,
        totalSugars: o.totalSugars,
        addedSugars: o.addedSugars,
        saturatedFat: o.saturatedFat,
        transFat: o.transFat,
        sodium: o.sodium,
      };
    }

    if (draft) {
      handleAddEntry(draft, false);
    }
  };

  // Repeat yesterday's meal
  const handleRepeatYesterday = async () => {
    if (isRepeatingYesterday) return;
    const yesterday = addDays(date, -1);
    setIsRepeatingYesterday(true);
    try {
      await copyEntries({
        fromDate: yesterday,
        toDate: date,
        fromMealCategory: meal,
        toMealCategory: meal,
      });
      toast(`Repeated yesterday's ${MEAL_LABELS[meal]}`, { kind: "success" });
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't repeat meal", { kind: "error" });
    } finally {
      setIsRepeatingYesterday(false);
    }
  };

  // Apply saved meal template
  const handleApplyTemplate = async (template: MealTemplate) => {
    try {
      await logTemplate(template.id, date, meal);
      toast(`Added ${template.name} to ${MEAL_LABELS[meal]}`, { kind: "success" });
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't add template", { kind: "error" });
    }
  };

  // Search input keydown handler (Arrow keys, Enter, Esc)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, Math.max(0, searchResults.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = searchResults[highlightedIndex] ?? searchResults[0];
      if (target) {
        setSelectedItem(target);
      } else if (effectiveSearchQuery) {
        // Switch to manual entry prefilled with query
        setManualEntryOpen(true);
      }
    } else if (e.key === "Escape") {
      if (query) {
        e.stopPropagation();
        setQuery("");
      }
    }
  };

  const showDefaultView = !effectiveSearchQuery && activeFilter === "all";

  // Compute counts for filter chips
  const counts = useMemo(() => {
    const foods = catalog?.foods ?? [];
    const recipes = catalog?.recipes ?? [];
    return {
      favorites: foods.filter((f) => f.isFavorite).length + recipes.filter((r) => r.isFavorite).length,
      recent: foods.filter((f) => f.lastUsedAt).length,
      mine: foods.filter((f) => f.userId).length,
      recipes: recipes.length,
      restaurants: restaurantFoods.length,
    };
  }, [catalog, restaurantFoods]);

  // Determine header layout
  const header = (
    <MealDateHeader
      meal={meal}
      onMealChange={setMeal}
      date={date}
      onDateChange={setDate}
      title={
        selectedItem
          ? selectedItem.kind === "food"
            ? selectedItem.food.name
            : selectedItem.kind === "recipe"
            ? selectedItem.recipe.name
            : selectedItem.food.name
          : manualEntryOpen
          ? "Enter nutrition manually"
          : "Add food"
      }
      subTitle={selectedItem ? "Portion" : undefined}
      onBack={
        selectedItem
          ? () => setSelectedItem(null)
          : manualEntryOpen
          ? () => setManualEntryOpen(false)
          : undefined
      }
      onClose={onClose}
    />
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      customHeader={header}
      size="xl"
      initialFocusRef={searchInputRef}
    >
      {selectedItem ? (
        <FoodPortionEditor
          item={selectedItem}
          initialQuantity={parsedNatural.hasNaturalQuantity ? parsedNatural.quantity : null}
          initialUnit={parsedNatural.hasNaturalQuantity ? parsedNatural.unit : null}
          meal={meal}
          onMealChange={setMeal}
          date={date}
          onDateChange={setDate}
          onAdd={handleAddEntry}
          onBack={() => setSelectedItem(null)}
        />
      ) : manualEntryOpen ? (
        <ManualNutritionForm
          initialName={query.trim()}
          meal={meal}
          date={date}
          onAdd={handleAddEntry}
          onBack={() => setManualEntryOpen(false)}
          onFoodCreated={() => {
            invalidateCatalog();
            loadCatalog(true).then(setCatalog).catch(() => undefined);
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Universal Search Bar */}
          <FoodSearchBar
            ref={searchInputRef}
            value={query}
            onChange={setQuery}
            parsedNatural={parsedNatural}
            onKeyDown={handleSearchKeyDown}
            isLoading={searchingOnline}
          />

          {/* Compact Filter Chips */}
          <FoodFilterChips
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />

          {/* Main Content Area */}
          {loadingCatalog ? (
            <div className="space-y-2 py-3" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12 rounded-lg" />
              ))}
            </div>
          ) : showDefaultView ? (
            <DefaultFoodView
              meal={meal}
              yesterdayEntries={recentData?.yesterdayByMeal[meal]}
              frequentFoods={recentData?.frequentByMeal[meal]}
              recentFoods={recentData?.recent}
              catalogFoods={catalog?.foods}
              catalogRecipes={catalog?.recipes}
              catalogTemplates={catalog?.templates}
              onSelect={setSelectedItem}
              onQuickAdd={handleQuickAdd}
              onRepeatYesterday={handleRepeatYesterday}
              onApplyTemplate={handleApplyTemplate}
              onOpenManualEntry={() => setManualEntryOpen(true)}
              onToggleFavorite={handleToggleFavorite}
              isRepeating={isRepeatingYesterday}
            />
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-line/30">
              {searchResults.map((item, idx) => {
                const key =
                  item.kind === "food"
                    ? `food-${item.food.id}`
                    : item.kind === "recipe"
                    ? `recipe-${item.recipe.id}`
                    : `online-${item.food.id}`;
                return (
                  <FoodResultRow
                    key={key}
                    item={item}
                    onSelect={setSelectedItem}
                    onQuickAdd={handleQuickAdd}
                    onToggleFavorite={handleToggleFavorite}
                    isHighlighted={idx === highlightedIndex}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-fg">
                No foods found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-fg-3 mt-1">
                Try a different keyword or enter nutrition manually.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setManualEntryOpen(true)}
                  className="btn btn-primary btn-sm text-xs"
                >
                  Enter &ldquo;{query}&rdquo; manually
                </button>
                {activeFilter !== "online" && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter("online")}
                    className="btn btn-secondary btn-sm text-xs"
                  >
                    Search online databases
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
