"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
import { api } from "@/lib/client/api";
import type { FoodSummary } from "@/lib/domain";
import { nutrientsForGrams } from "@/lib/nutrition/core";
import { defaultServing } from "@/lib/nutrition/servings";
import { EmptyState, Menu, Segmented, fmt } from "@/components/ui/primitives";
import { FoodFormSheet } from "@/components/foods/FoodFormSheet";
import { FoodDetailsSheet } from "@/components/foods/FoodDetailsSheet";
import { UnifiedFoodSearchModal } from "@/components/foods/UnifiedFoodSearchModal";
import { invalidateCatalog, rankMatches } from "@/lib/client/catalog";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type View = "all" | "mine" | "favorites" | "recent" | "library";

export default function FoodsPage() {
  const [foods, setFoods] = useState<FoodSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("all");
  const [category, setCategory] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const PAGE = 80;

  // Sheets and modals state
  const [detailsFood, setDetailsFood] = useState<FoodSummary | null>(null);
  const [form, setForm] = useState<{ open: boolean; food: FoodSummary | null }>({
    open: false,
    food: null,
  });
  const [online, setOnline] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load foods once into client state
  const load = useCallback(() => {
    setError(null);
    api<FoodSummary[]>("/api/foods?limit=2000")
      .then(setFoods)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load personal library"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Global keyboard shortcuts: / to search, N for new food
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is inside an input/textarea/select or modal is open
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (e.key === "/" && !isInput && !form.open && !detailsFood && !online) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        (e.key === "n" || e.key === "N") &&
        !isInput &&
        !e.metaKey &&
        !e.ctrlKey &&
        !form.open &&
        !detailsFood &&
        !online
      ) {
        e.preventDefault();
        setForm({ open: true, food: null });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form.open, detailsFood, online]);

  // Derived filtered & ranked food list
  const list = useMemo(() => {
    let l = foods ?? [];
    if (view === "favorites") l = l.filter((f) => f.isFavorite);
    if (view === "mine") l = l.filter((f) => f.userId);
    if (view === "library") l = l.filter((f) => !f.userId);
    if (view === "recent") {
      l = l
        .filter((f) => f.lastUsedAt || f.useCount > 0)
        .sort((a, b) => {
          if (b.lastUsedAt && a.lastUsedAt) return b.lastUsedAt > a.lastUsedAt ? 1 : -1;
          if (b.lastUsedAt) return 1;
          if (a.lastUsedAt) return -1;
          return b.useCount - a.useCount;
        });
    }
    if (category !== "All") l = l.filter((f) => f.category === category);

    // Enhanced search: matching name, brand, category, and barcode
    return rankMatches(l, q, (f) => `${f.name} ${f.brand ?? ""} ${f.barcode ?? ""} ${f.category}`);
  }, [foods, q, view, category]);

  // Dynamic category list
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const f of foods ?? []) {
      if (f.category) set.add(f.category);
    }
    return ["All", ...[...set].sort()];
  }, [foods]);

  // Count summaries
  const myFoodsCount = useMemo(() => (foods ?? []).filter((f) => f.userId).length, [foods]);
  const favoritesCount = useMemo(() => (foods ?? []).filter((f) => f.isFavorite).length, [foods]);

  // Star / favorite toggle with optimistic update & catalog invalidation
  const toggleFavorite = async (f: FoodSummary) => {
    const nextState = !f.isFavorite;
    setFoods((fs) => (fs ? fs.map((x) => (x.id === f.id ? { ...x, isFavorite: nextState } : x)) : fs));
    if (detailsFood && detailsFood.id === f.id) {
      setDetailsFood((prev) => (prev ? { ...prev, isFavorite: nextState } : prev));
    }
    try {
      await api(`/api/foods/${f.id}`, { method: "PATCH", json: { isFavorite: nextState } });
      invalidateCatalog();
    } catch (e) {
      setFoods((fs) => (fs ? fs.map((x) => (x.id === f.id ? { ...x, isFavorite: f.isFavorite } : x)) : fs));
      if (detailsFood && detailsFood.id === f.id) {
        setDetailsFood((prev) => (prev ? { ...prev, isFavorite: f.isFavorite } : prev));
      }
      toast(e instanceof Error ? e.message : "Couldn't update favorite", { kind: "error" });
    }
  };

  // Safe removal / deletion
  const remove = async (f: FoodSummary) => {
    if (!f.userId) return;
    const confirmMessage = f.useCount > 0
      ? `Delete “${f.name}” from your personal library?\n\nNote: All ${f.useCount} logged meals in your history will keep their exact calories and macros.`
      : `Delete “${f.name}” from your personal library?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await api(`/api/foods/${f.id}`, { method: "DELETE" });
      setFoods((fs) => (fs ? fs.filter((x) => x.id !== f.id) : fs));
      if (detailsFood?.id === f.id) setDetailsFood(null);
      invalidateCatalog();
      toast(`Removed “${f.name}” from library`, { kind: "info" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete food", { kind: "error" });
    }
  };

  // Duplicate food into a personal editable copy
  const handleDuplicate = (f: FoodSummary) => {
    if (detailsFood) setDetailsFood(null);
    const duplicated: FoodSummary = {
      ...f,
      id: "", // indicates new record
      userId: "temp",
      name: `${f.name} (Copy)`,
      useCount: 0,
      lastUsedAt: null,
      isFavorite: false,
    };
    setForm({ open: true, food: duplicated });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-fg">My Foods</h1>
            {foods && (
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium tabular text-fg-3">
                {foods.length} {foods.length === 1 ? "food" : "foods"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-fg-3">
            Your personal nutrition database for fast, accurate logging
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setOnline(true)}
            title="Search USDA, OpenFoodFacts, or FatSecret"
          >
            <Globe className="h-3.5 w-3.5 text-fg-2" />
            <span>Import</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setForm({ open: true, food: null })}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Food</span>
          </button>
        </div>
      </header>

      {/* Search Bar & View Segmented Tabs */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" />
            <input
              ref={searchInputRef}
              type="search"
              className="input pl-9 pr-14 text-sm"
              placeholder="Search foods by name, brand, or barcode…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search my foods"
            />
            {q ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  searchInputRef.current?.focus();
                }}
                className="btn btn-ghost btn-icon btn-sm absolute right-1.5 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-fg-3">
                /
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar py-0.5">
            <Segmented
              value={view}
              onChange={setView}
              size="sm"
              options={[
                { value: "all", label: "All" },
                { value: "mine", label: `My Foods ${myFoodsCount > 0 ? `(${myFoodsCount})` : ""}` },
                { value: "favorites", label: `★ ${favoritesCount > 0 ? `(${favoritesCount})` : ""}` },
                { value: "recent", label: "Recent" },
                { value: "library", label: "Library" },
              ]}
            />

            {/* Category dropdown filter */}
            {categories.length > 2 && (
              <div className="relative shrink-0">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input h-8 py-0 pl-2.5 pr-7 text-xs bg-surface-1 border-line cursor-pointer"
                  aria-label="Filter by category"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === "All" ? "All categories" : c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="card flex items-center justify-between border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative" role="alert">
          <span>Failed to load foods: {error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {/* Food List Card */}
      <section className="card overflow-hidden shadow-sm">
        {!foods && !error ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title={
              q
                ? `No foods match “${q}”`
                : view === "favorites"
                  ? "No favorite foods yet"
                  : view === "recent"
                    ? "No recently logged foods"
                    : view === "mine"
                      ? "You haven't created any custom foods yet"
                      : "No foods in library"
            }
            description={
              q
                ? "Add it as a new personal food, or import it from an online database."
                : "Create custom foods or import items from online databases to speed up future logging."
            }
            action={
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOnline(true)}>
                  <Globe className="h-3.5 w-3.5" />
                  Import from database
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setForm({ open: true, food: null })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New food
                </button>
              </div>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {(showAll ? list : list.slice(0, PAGE)).map((f) => {
              const { option, quantity } = defaultServing(f);
              const grams = quantity * option.grams;
              const servingLabel =
                option.id === "g"
                  ? `${fmt.qty(grams)} g`
                  : `${option.label}${/\(/.test(option.label) ? "" : ` (${fmt.qty(grams)} g)`}`;
              const n = nutrientsForGrams(f, grams);
              const isUserCustom = !!f.userId;

              return (
                <li
                  key={f.id}
                  className="group flex items-center gap-1.5 py-2.5 pl-3.5 pr-2 transition-colors hover:bg-surface-2/40"
                >
                  {/* Star Favorite Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleFavorite(f);
                    }}
                    className="btn btn-ghost btn-icon btn-sm -ml-1 text-fg-3 hover:text-fg focus-visible:ring-1"
                    aria-label={f.isFavorite ? `Remove ${f.name} from favorites` : `Add ${f.name} to favorites`}
                    aria-pressed={f.isFavorite}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4 transition-colors",
                        f.isFavorite ? "fill-current text-accent" : "text-fg-3 group-hover:text-fg-2"
                      )}
                    />
                  </button>

                  {/* Food row body: opens details sheet */}
                  <button
                    type="button"
                    onClick={() => setDetailsFood(f)}
                    aria-label={`View details for ${f.name}`}
                    className="min-h-[44px] min-w-0 flex-1 text-left focus:outline-none"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-sm font-medium text-fg group-hover:text-accent transition-colors">
                          {f.name}
                        </span>
                        {f.brand && (
                          <span className="truncate text-xs text-fg-3 font-normal">
                            · {f.brand}
                          </span>
                        )}
                        {!isUserCustom && (
                          <span className="hidden sm:inline-block rounded bg-surface-2 px-1.5 py-0.2 text-[10px] font-medium text-fg-3">
                            library
                          </span>
                        )}
                      </div>

                      {/* Calories */}
                      <span className="shrink-0 text-sm font-semibold tabular text-fg">
                        {fmt.int(n.calories)} <span className="text-xs font-normal text-fg-3">kcal</span>
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-baseline justify-between gap-3 text-xs tabular text-fg-3">
                      <span className="truncate">
                        per {servingLabel}
                        {f.servings.length > 1 && <> · {f.servings.length} servings</>}
                        {f.useCount > 0 && <> · logged {f.useCount}×</>}
                      </span>

                      {/* Scannable Macro Breakdown */}
                      <span className="shrink-0 font-mono text-[11px] space-x-1.5">
                        <span className="text-protein font-medium">{fmt.g(n.protein)}P</span>
                        <span className="text-fg-3">·</span>
                        <span className="text-carbs font-medium">{fmt.g(n.carbs)}C</span>
                        <span className="text-fg-3">·</span>
                        <span className="text-fat font-medium">{fmt.g(n.fat)}F</span>
                      </span>
                    </div>
                  </button>

                  {/* Context Actions Menu */}
                  <Menu
                    items={[
                      {
                        label: "View details",
                        onClick: () => setDetailsFood(f),
                      },
                      ...(isUserCustom
                        ? [
                            {
                              label: "Edit",
                              onClick: () => setForm({ open: true, food: f }),
                            },
                          ]
                        : []),
                      {
                        label: "Duplicate",
                        onClick: () => handleDuplicate(f),
                      },
                      ...(isUserCustom
                        ? [
                            {
                              label: "Delete",
                              danger: true,
                              onClick: () => void remove(f),
                            },
                          ]
                        : []),
                    ]}
                    label={`Actions for ${f.name}`}
                  />
                </li>
              );
            })}

            {!showAll && list.length > PAGE && (
              <li>
                <button
                  type="button"
                  className="min-h-[44px] w-full py-3 text-xs font-medium text-fg-2 hover:bg-surface-2 transition-colors"
                  onClick={() => setShowAll(true)}
                >
                  Show all {list.length} foods
                </button>
              </li>
            )}
          </ul>
        )}
      </section>

      {/* Footer Navigation Link */}
      <footer className="flex items-center justify-between text-xs text-fg-3 px-1 pt-1">
        <span>
          Looking for inventory or barcode scanning? Visit{" "}
          <Link href="/pantry" className="underline hover:text-fg font-medium">
            Pantry
          </Link>
          .
        </span>
        <span className="hidden sm:inline font-mono text-[11px]">
          Press <kbd className="rounded border border-line bg-surface-2 px-1">N</kbd> for new food
        </span>
      </footer>

      {/* Food Details Sheet */}
      <FoodDetailsSheet
        food={detailsFood}
        open={!!detailsFood}
        onClose={() => setDetailsFood(null)}
        onEdit={(food) => {
          setDetailsFood(null);
          setForm({ open: true, food });
        }}
        onDuplicate={handleDuplicate}
        onDelete={(food) => void remove(food)}
        onToggleFavorite={toggleFavorite}
      />

      {/* New / Edit Food Form Sheet */}
      <FoodFormSheet
        open={form.open}
        food={form.food}
        existingFoods={foods ?? []}
        onClose={() => setForm((s) => ({ ...s, open: false }))}
        onSaved={() => {
          invalidateCatalog();
          load();
        }}
        onSelectExisting={(existing) => {
          setForm({ open: false, food: null });
          setDetailsFood(existing);
        }}
      />

      {/* Online Food Search / Import Modal */}
      <UnifiedFoodSearchModal
        isOpen={online}
        onClose={() => setOnline(false)}
        mode="search"
        onFoodImported={() => {
          invalidateCatalog();
          load();
        }}
      />
    </div>
  );
}
