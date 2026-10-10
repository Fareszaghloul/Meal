"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Heart, Clock, Sparkles } from "lucide-react";
import type { RecipeSummary } from "@/lib/domain";
import { RecipeRow } from "@/components/recipes/RecipeRow";
import { LogRecipeModal } from "@/components/recipes/LogRecipeModal";
import { toast } from "@/components/ui/Toast";
import { invalidateCatalog } from "@/lib/client/catalog";
import { cn } from "@/lib/utils";

type FilterTab = "All" | "Favorites" | "Recent";

export default function RecipeLibraryPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [selectedRecipeToLog, setSelectedRecipeToLog] = useState<RecipeSummary | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchRecipes = async () => {
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) {
        const data = await res.json();
        setRecipes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch recipes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();

    const onInvalidate = () => {
      fetchRecipes();
    };
    window.addEventListener("mealprep:catalog-invalidated", onInvalidate);
    return () => window.removeEventListener("mealprep:catalog-invalidated", onInvalidate);
  }, []);

  // Keyboard shortcuts: '/' to focus search, 'n' or 'N' for new recipe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if ((e.key === "n" || e.key === "N") && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/recipes/new");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Client-side filtering & search
  const filteredRecipes = useMemo(() => {
    let result = [...recipes];

    // Filter tab
    if (activeTab === "Favorites") {
      result = result.filter((r) => r.isFavorite);
    } else if (activeTab === "Recent") {
      // Sort by newest updated or created
      result = result.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    // Text search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => {
        const nameMatch = r.name.toLowerCase().includes(q);
        const descMatch = r.description?.toLowerCase().includes(q) ?? false;
        const tagMatch = r.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        return nameMatch || descMatch || tagMatch;
      });
    }

    return result;
  }, [recipes, activeTab, searchQuery]);

  const handleToggleFavorite = async (id: string, currentFav: boolean) => {
    // Optimistic update
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !currentFav } : r))
    );
    try {
      const res = await fetch(`/api/recipes/${id}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      invalidateCatalog();
    } catch {
      // Revert on error
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isFavorite: currentFav } : r))
      );
      toast("Couldn't update favorite", { kind: "error" });
    }
  };

  const handleDuplicate = async (recipe: RecipeSummary) => {
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const duplicated = await res.json();
        toast(`Duplicated as "${duplicated.name}"`, { kind: "success" });
        invalidateCatalog();
        await fetchRecipes();
      } else {
        toast("Failed to duplicate recipe", { kind: "error" });
      }
    } catch {
      toast("Failed to duplicate recipe", { kind: "error" });
    }
  };

  const handleDelete = async (recipe: RecipeSummary) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${recipe.name}"? Historical logs will remain intact.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      if (res.ok) {
        setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
        toast(`Deleted "${recipe.name}"`, { kind: "success" });
        invalidateCatalog();
      } else {
        toast("Failed to delete recipe", { kind: "error" });
      }
    } catch {
      toast("Failed to delete recipe", { kind: "error" });
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-16">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-fg">
            Recipes
          </h1>
          <p className="text-xs text-fg-3 mt-0.5">
            Composite foods, batch cooking, and serving nutrition
          </p>
        </div>

        <Link
          href="/recipes/new"
          className="btn btn-primary h-10 px-4 text-xs font-semibold shadow-sm self-start sm:self-auto inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Recipe</span>
          <span className="kbd ml-1 hidden sm:inline-block">N</span>
        </Link>
      </div>

      {/* ─── Search Bar ─── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input h-10 w-full pl-10 pr-9 text-xs sm:text-sm"
          aria-label="Search recipes"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:block">
          <span className="kbd">/</span>
        </div>
      </div>

      {/* ─── Filter Tabs (All, Favorites, Recent) ─── */}
      <div className="flex items-center gap-1.5 border-b border-line/40 pb-2">
        {(["All", "Favorites", "Recent"] as FilterTab[]).map((tab) => {
          const isActive = activeTab === tab;
          const count =
            tab === "Favorites"
              ? recipes.filter((r) => r.isFavorite).length
              : tab === "All"
              ? recipes.length
              : null;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "tap-target px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                isActive
                  ? "bg-surface-2 text-fg font-semibold shadow-xs"
                  : "text-fg-3 hover:text-fg hover:bg-surface-2/40"
              )}
            >
              {tab === "Favorites" && (
                <Heart
                  className={cn(
                    "w-3 h-3",
                    isActive ? "fill-[var(--accent)] text-[var(--accent)]" : "text-fg-3"
                  )}
                />
              )}
              {tab === "Recent" && <Clock className="w-3 h-3 text-fg-3" />}
              <span>{tab}</span>
              {count !== null && (
                <span className="text-[11px] tabular text-fg-3 font-normal">
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Dense Recipe Rows List ─── */}
      {isLoading ? (
        <div className="space-y-2 py-2" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-xl border border-line/40 bg-surface-1 p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-fg">
            {searchQuery ? `No recipes found matching "${searchQuery}"` : "No recipes in this view"}
          </p>
          <p className="text-xs text-fg-3 max-w-sm mx-auto">
            {searchQuery
              ? "Check your spelling or try searching for another ingredient."
              : "Create your first recipe to easily calculate nutrition per serving or batch yield."}
          </p>
          <div>
            <Link
              href="/recipes/new"
              className="btn btn-secondary btn-sm text-xs font-semibold inline-flex items-center gap-1.5 mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Recipe</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-line/30 rounded-xl bg-surface-1 border border-line/40 overflow-hidden shadow-xs">
          {filteredRecipes.map((recipe) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              onLog={(r) => setSelectedRecipeToLog(r)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}

      {/* ─── Quick Log Modal ─── */}
      <LogRecipeModal
        recipe={selectedRecipeToLog}
        open={Boolean(selectedRecipeToLog)}
        onClose={() => setSelectedRecipeToLog(null)}
      />
    </div>
  );
}
