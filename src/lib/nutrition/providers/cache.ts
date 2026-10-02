interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class NutritionSearchCache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Get a cached entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete entry
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Remove expired entries (garbage collection)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

export const nutritionCache = new NutritionSearchCache();

// Periodic cleanup every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    nutritionCache.cleanup();
  }, 10 * 60 * 1000).unref();
}
