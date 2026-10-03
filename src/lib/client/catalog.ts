"use client";

import { api } from "@/lib/client/api";
import type { FoodSummary, MealTemplate, RecipeSummary } from "@/lib/domain";

export interface Catalog {
  foods: FoodSummary[];
  recipes: RecipeSummary[];
  templates: MealTemplate[];
  loadedAt: number;
}

let cached: Catalog | null = null;
let pending: Promise<Catalog> | null = null;
const TTL = 60_000;

/** Foods, recipes and saved meals in one shot; cached briefly so opening the sheet is instant. */
export function loadCatalog(force = false): Promise<Catalog> {
  if (!force && cached && Date.now() - cached.loadedAt < TTL) return Promise.resolve(cached);
  if (pending) return pending;
  pending = Promise.all([
    api<FoodSummary[]>("/api/foods?limit=2000"),
    api<RecipeSummary[]>("/api/recipes").catch(() => [] as RecipeSummary[]),
    api<MealTemplate[]>("/api/templates").catch(() => [] as MealTemplate[]),
  ])
    .then(([foods, recipes, templates]) => {
      cached = { foods, recipes, templates, loadedAt: Date.now() };
      return cached;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function invalidateCatalog() {
  cached = null;
}

export function peekCatalog() {
  return cached;
}

/** Rank by how well `q` matches: prefix > word start > substring. Ties keep input order. */
export function rankMatches<T>(items: T[], q: string, text: (t: T) => string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  const scored: Array<[number, T]> = [];
  for (const it of items) {
    const hay = text(it).toLowerCase();
    let score = -1;
    if (hay.startsWith(needle)) score = 3;
    else if (hay.includes(` ${needle}`)) score = 2;
    else if (hay.includes(needle)) score = 1;
    else if (needle.split(/\s+/).every((w) => hay.includes(w))) score = 0;
    if (score >= 0) scored.push([score, it]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map(([, it]) => it);
}
