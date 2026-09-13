"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  BookOpen,
  Sparkles,
  Heart,
  Loader2,
} from "lucide-react";
import { RecipeCard, RecipeCardData } from "@/components/recipes/RecipeCard";
import { cn } from "@/lib/utils";

const FILTER_TAGS = [
  "All",
  "Favorites",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "High Protein",
  "Meal Prep",
];

export default function RecipeLibraryPage() {
  const [recipes, setRecipes] = useState<RecipeCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (activeTag === "Favorites") {
        params.set("favorites", "true");
      } else if (activeTag !== "All") {
        params.set("tag", activeTag.toLowerCase().replace(/\s+/g, "-"));
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
  }, [searchQuery, activeTag, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Recipe Library
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} saved in your collection
          </p>
        </div>

        <Link
          href="/recipes/new"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:opacity-90 text-white font-medium text-xs shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Recipe</span>
        </Link>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search recipes, ingredients (e.g. chicken), tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--accent)] shadow-xs"
          />
        </div>

        {/* Sort Select */}
        <div className="flex items-center space-x-2 shrink-0">
          <ArrowUpDown className="w-4 h-4 text-[var(--text-secondary)]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
          >
            <option value="newest">Recently Added</option>
            <option value="protein">Highest Protein</option>
            <option value="calories">Highest Calories</option>
            <option value="name">Alphabetical</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {FILTER_TAGS.map((tag) => {
          const isActive = activeTag === tag;
          return (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition",
                isActive
                  ? "bg-[var(--text-primary)] text-[var(--surface)] font-semibold shadow-xs"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)]"
              )}
            >
              {tag === "Favorites" && <Heart className="w-3 h-3 inline mr-1 fill-current text-[var(--macro-fat)]" />}
              {tag}
            </button>
          );
        })}
      </div>

      {/* Recipe Grid or Empty State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-2" />
          <span className="text-xs">Loading your recipes...</span>
        </div>
      ) : recipes.length === 0 ? (
        /* Empty State (Section 34) */
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-4 max-w-md mx-auto my-12">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Your recipe library is empty
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
              Save your first recipe from an Instagram or TikTok Reel, paste text, or create one manually.
            </p>
          </div>
          <Link
            href="/recipes/new"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Recipe</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onDelete={fetchRecipes}
              onDuplicate={fetchRecipes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
