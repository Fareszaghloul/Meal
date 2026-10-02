"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Heart,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import { RecipeCard, RecipeCardData } from "@/components/recipes/RecipeCard";
import { cn } from "@/lib/utils";

const FILTER_CHIPS = [
  "All",
  "Favorites",
  "High protein",
  "Meal prep",
  "Breakfast",
  "Under 20 min",
];

export default function RecipeLibraryPage() {
  const [recipes, setRecipes] = useState<RecipeCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (activeChip === "Favorites") {
        params.set("favorites", "true");
      } else if (activeChip !== "All" && activeChip !== "Under 20 min") {
        params.set("tag", activeChip.toLowerCase().replace(/\s+/g, "-"));
      }
      params.set("sortBy", sortBy);

      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (err) {
      console.error("Failed to fetch recipes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecipes();
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, activeChip, sortBy]);

  // Client-side filter for "Under 20 min" if selected
  const displayedRecipes = useMemo(() => {
    if (activeChip === "Under 20 min") {
      return recipes.filter((r) => {
        const total = (r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0);
        return total > 0 && total <= 20;
      });
    }
    return recipes;
  }, [recipes, activeChip]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal">
            Your collection
          </p>
          <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight text-[var(--text-primary)]">
            Recipes
          </h1>
        </div>

        <Link
          href="/recipes/new"
          className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition shadow-none cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add recipe</span>
        </Link>
      </div>

      {/* ─── Pill Search Bar + Sort Select ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Pill Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search recipes, ingredients, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-full bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] border-none outline-none focus:ring-1 focus:ring-[var(--text-primary)]"
          />
        </div>

        {/* Sort Select Pill */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-5 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-full bg-[var(--surface)] text-[var(--text-primary)] border-none outline-none focus:ring-1 focus:ring-[var(--text-primary)] cursor-pointer pr-9 appearance-none"
            >
              <option value="newest">Recently Added</option>
              <option value="protein">Highest Protein</option>
              <option value="calories">Highest Calories</option>
              <option value="name">Alphabetical</option>
              <option value="oldest">Oldest</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ─── Filter Chips (Pill group on var(--surface)) ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeChip === chip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => setActiveChip(chip)}
              className={cn(
                "px-4 py-2 min-h-[38px] rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5",
                isActive
                  ? "bg-[var(--accent)] text-[var(--on-accent)]"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {chip === "Favorites" && (
                <Heart
                  className={cn(
                    "w-3 h-3 inline",
                    isActive ? "fill-current text-[var(--on-accent)]" : "text-[var(--text-muted)]"
                  )}
                />
              )}
              <span>{chip}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Recipe Grid (Auto-fill grid min 260px) ─── */}
      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-72 w-full rounded-3xl" />
          ))}
        </div>
      ) : displayedRecipes.length === 0 ? (
        <div className="rounded-3xl bg-[var(--surface)] p-12 text-center space-y-4 max-w-md mx-auto my-8">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            No recipes match your criteria
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Try adjusting your search terms or filters, or add a new recipe.
          </p>
          <Link
            href="/recipes/new"
            className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add a recipe</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
          {displayedRecipes.map((recipe, index) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              index={index}
              onDelete={(id) => setRecipes((prev) => prev.filter((r) => r.id !== id))}
              onDuplicate={() => fetchRecipes()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
