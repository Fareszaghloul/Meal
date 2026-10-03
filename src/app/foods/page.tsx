"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Globe, Plus, Search, Star } from "lucide-react";
import { api } from "@/lib/client/api";
import type { FoodSummary } from "@/lib/domain";
import { nutrientsForGrams } from "@/lib/nutrition/core";
import { defaultServing } from "@/lib/nutrition/servings";
import { EmptyState, Menu, Segmented, fmt } from "@/components/ui/primitives";
import { FoodFormSheet } from "@/components/foods/FoodFormSheet";
import { UnifiedFoodSearchModal } from "@/components/foods/UnifiedFoodSearchModal";
import { invalidateCatalog, rankMatches } from "@/lib/client/catalog";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type View = "all" | "recent" | "favorites" | "mine" | "library";

export default function FoodsPage() {
  const [foods, setFoods] = useState<FoodSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("all");
  const [category, setCategory] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const PAGE = 60;
  const [form, setForm] = useState<{ open: boolean; food: FoodSummary | null }>({ open: false, food: null });
  const [online, setOnline] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api<FoodSummary[]>("/api/foods?limit=2000")
      .then(setFoods)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);
  useEffect(load, [load]);

  const list = useMemo(() => {
    let l = foods ?? [];
    if (view === "favorites") l = l.filter((f) => f.isFavorite);
    if (view === "mine") l = l.filter((f) => f.userId);
    if (view === "library") l = l.filter((f) => !f.userId);
    if (view === "recent") l = l.filter((f) => f.lastUsedAt).sort((a, b) => (b.lastUsedAt! > a.lastUsedAt! ? 1 : -1));
    if (category !== "All") l = l.filter((f) => f.category === category);
    return rankMatches(l, q, (f) => `${f.name} ${f.brand ?? ""}`);
  }, [foods, q, view, category]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const f of foods ?? []) if (view !== "mine" || f.userId) set.add(f.category);
    return ["All", ...[...set].sort()];
  }, [foods, view]);

  const toggleFavorite = async (f: FoodSummary) => {
    setFoods((fs) => fs && fs.map((x) => (x.id === f.id ? { ...x, isFavorite: !x.isFavorite } : x)));
    try {
      await api(`/api/foods/${f.id}`, { method: "PATCH", json: { isFavorite: !f.isFavorite } });
      invalidateCatalog();
    } catch (e) {
      setFoods((fs) => fs && fs.map((x) => (x.id === f.id ? { ...x, isFavorite: f.isFavorite } : x)));
      toast(e instanceof Error ? e.message : "Couldn't update", { kind: "error" });
    }
  };

  const remove = async (f: FoodSummary) => {
    if (!window.confirm(`Delete “${f.name}” from your foods? Logged entries keep their values.`)) return;
    try {
      await api(`/api/foods/${f.id}`, { method: "DELETE" });
      setFoods((fs) => fs && fs.filter((x) => x.id !== f.id));
      invalidateCatalog();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete", { kind: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Foods</h1>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOnline(true)}>
            <Globe className="h-3.5 w-3.5" /> Import from database
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setForm({ open: true, food: null })}>
            <Plus className="h-4 w-4" /> New food
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" />
          <input type="search" className="input pl-9" placeholder="Search foods…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search foods" />
        </div>
        <Segmented
          value={view}
          onChange={setView}
          size="sm"
          options={[
            { value: "all", label: "All" },
            { value: "recent", label: "Recent" },
            { value: "favorites", label: "Favorites" },
            { value: "mine", label: "My foods" },
            { value: "library", label: "Library" },
          ]}
        />
      </div>
      {categories.length > 2 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={cn("btn btn-sm whitespace-nowrap", category === c ? "btn-primary" : "btn-secondary")} aria-pressed={category === c}>
              {c}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="card flex items-center justify-between px-4 py-3 text-sm text-fg-2" role="alert">
          Couldn't load foods: {error}
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      <section className="card overflow-hidden">
        {!foods && !error ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-10" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title={q ? `No foods match “${q}”` : view === "favorites" ? "No favorites yet" : view === "recent" ? "Nothing logged yet" : "No foods yet"}
            description={q ? "Add it as a new food or import it from an online database." : "Foods you add or import become one-tap entries when logging."}
            action={
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOnline(true)}>
                  Import
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({ open: true, food: null })}>
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
              const servingLabel = option.id === "g" ? `${fmt.qty(grams)} g` : `${option.label}${/\(/.test(option.label) ? "" : ` (${fmt.qty(grams)} g)`}`;
              const n = nutrientsForGrams(f, grams);
              return (
                <li key={f.id} className="flex items-center gap-1 py-2 pl-4 pr-1">
                  <button type="button" onClick={() => toggleFavorite(f)} className="btn btn-ghost btn-icon btn-sm -ml-2" aria-label={f.isFavorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={f.isFavorite}>
                    <Star className={cn("h-4 w-4", f.isFavorite ? "fill-current text-fg" : "text-fg-3")} />
                  </button>
                  <button type="button" onClick={() => setForm({ open: true, food: f })} className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-fg">
                        {f.name}
                        {f.brand && <span className="text-fg-3"> · {f.brand}</span>}
                      </span>
                      <span className="shrink-0 text-sm tabular text-fg">{fmt.int(n.calories)}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 text-xs tabular text-fg-3">
                      <span className="truncate">
                        per {servingLabel}
                        {f.servings.length > 1 && <> · {f.servings.length} servings</>}
                        {!f.userId && <> · library</>}
                        {f.useCount > 0 && <> · logged {f.useCount}×</>}
                      </span>
                      <span className="shrink-0">
                        {fmt.g(n.protein)}P · {fmt.g(n.carbs)}C · {fmt.g(n.fat)}F
                      </span>
                    </div>
                  </button>
                  <Menu
                    items={[
                      { label: "Edit", onClick: () => setForm({ open: true, food: f }) },
                      { label: "Delete", danger: true, onClick: () => void remove(f), disabled: !f.userId },
                    ]}
                    label={`Actions for ${f.name}`}
                  />
                </li>
              );
            })}
            {!showAll && list.length > PAGE && (
              <li>
                <button type="button" className="w-full py-2.5 text-xs text-fg-2 hover:bg-surface-2" onClick={() => setShowAll(true)}>
                  Show all {list.length} foods
                </button>
              </li>
            )}
          </ul>
        )}
      </section>

      <p className="text-xs text-fg-3">
        Looking for your pantry, barcode scanner or the McDonald's calculator? They live under{" "}
        <Link href="/pantry" className="underline hover:text-fg">
          Pantry
        </Link>
        .
      </p>

      <FoodFormSheet
        open={form.open}
        food={form.food}
        onClose={() => setForm((s) => ({ ...s, open: false }))}
        onSaved={() => {
          invalidateCatalog();
          load();
        }}
      />
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
