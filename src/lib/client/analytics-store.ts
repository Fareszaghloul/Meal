import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/client/api";
import { todayLocal, type DateString } from "@/lib/dates";
import type { NutritionGoals } from "@/lib/domain";
import type {
  PeriodId,
  NutritionAverages,
  AnalyticsDeltas,
  DailyIntakePoint,
  MealDistributionItem,
  FrequentFoodItem,
} from "@/lib/nutrition/analytics";

export interface AnalyticsData {
  period: PeriodId;
  totalDays: number;
  current: { from: DateString; to: DateString };
  previous: { from: DateString; to: DateString };
  stats: NutritionAverages;
  previousStats: NutritionAverages;
  deltas: AnalyticsDeltas;
  dailyIntake: DailyIntakePoint[];
  mealDistribution: MealDistributionItem[];
  frequentFoods: FrequentFoodItem[];
  weight: {
    latestKg: number | null;
    avg7Kg: number | null;
    changePeriodKg: number | null;
    change7Kg: number | null;
    change30Kg: number | null;
    points: { date: DateString; meanKg: number; trendKg: number }[];
  };
  goals: NutritionGoals & {
    measurementSystem: string;
    goalWeightKg: number | null;
  };
  /** First date with a recorded goal revision (null: none yet). */
  goalHistoryFrom: DateString | null;
  from: DateString;
  to: DateString;
}

// In-memory cache keyed by `${to}_${period}`
const cache = new Map<string, { data: AnalyticsData; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function invalidateAnalyticsCache() {
  cache.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mealprep:analytics-invalidated"));
  }
}

export function useAnalytics(period: PeriodId = "30d") {
  const to = todayLocal();
  const cacheKey = `${to}_${period}`;
  const [data, setData] = useState<AnalyticsData | null>(() => {
    const cached = cache.get(cacheKey);
    return cached && Date.now() - cached.timestamp < CACHE_TTL_MS ? cached.data : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!data);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (bypassCache = false) => {
    if (!bypassCache) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setData(cached.data);
        setIsLoading(false);
        return;
      }
    }

    try {
      if (!data) setIsLoading(true);
      setError(null);
      const res = await api<AnalyticsData>(`/api/analytics?to=${to}&period=${period}`);
      cache.set(cacheKey, { data: res, timestamp: Date.now() });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, period, to, data]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Invalidation listeners for real-time synchronization
  useEffect(() => {
    const handleMutation = () => {
      cache.clear();
      fetchAnalytics(true);
    };

    window.addEventListener("mealprep:day-updated", handleMutation);
    window.addEventListener("mealprep:weight-updated", handleMutation);
    window.addEventListener("mealprep:analytics-invalidated", handleMutation);

    return () => {
      window.removeEventListener("mealprep:day-updated", handleMutation);
      window.removeEventListener("mealprep:weight-updated", handleMutation);
      window.removeEventListener("mealprep:analytics-invalidated", handleMutation);
    };
  }, [fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refresh: () => fetchAnalytics(true),
  };
}
