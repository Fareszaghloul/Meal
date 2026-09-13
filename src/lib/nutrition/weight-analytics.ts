/**
 * Weight Tracking Analytics, 7-Day Rolling Averages, and Adaptive Recalculation (Section 38c, 38d, 38e)
 */

export interface RawWeightEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  weightKg: number;
  bodyFatPct?: number | null;
  notes?: string | null;
  createdAt?: Date | string;
}

export interface ProcessedWeightPoint {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPct?: number | null;
  rollingAvg7d: number;
  notes?: string | null;
}

export interface WeightAnalyticsSummary {
  currentWeightKg: number;
  latest7dAvgKg: number;
  previousWeek7dAvgKg: number | null;
  weeklyChangeKg: number | null;
  totalChangeKg: number | null;
  startWeightKg: number;
  goalWeightKg: number | null;
  remainingToGoalKg: number | null;
  estimatedWeeksToGoal: number | null;
  entryCount: number;
  adaptiveSuggestion: {
    hasSuggestion: boolean;
    reason?: string;
    predictedWeeklyRateKg: number;
    actualWeeklyRateKg: number;
    currentCalorieTarget: number;
    suggestedCalorieTarget: number;
    differenceKcal: number;
  } | null;
}

/**
 * Calculates 7-day rolling average for every chronological entry
 */
export function processWeightEntries(entries: RawWeightEntry[]): ProcessedWeightPoint[] {
  if (!entries || entries.length === 0) return [];

  // Sort chronologically ascending
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((entry, index) => {
    const entryDate = new Date(entry.date).getTime();
    const sevenDaysAgo = entryDate - 6 * 24 * 60 * 60 * 1000;

    // Filter entries within the 7-day window up to current entry
    const windowEntries = sorted.filter((e) => {
      const d = new Date(e.date).getTime();
      return d >= sevenDaysAgo && d <= entryDate;
    });

    const sum = windowEntries.reduce((acc, curr) => acc + curr.weightKg, 0);
    const avg = Math.round((sum / windowEntries.length) * 10) / 10;

    return {
      id: entry.id,
      date: entry.date,
      weightKg: entry.weightKg,
      bodyFatPct: entry.bodyFatPct ?? null,
      rollingAvg7d: avg,
      notes: entry.notes,
    };
  });
}

/**
 * Generates overall analytics summary and checks for adaptive calorie adjustments
 */
export function calculateWeightAnalytics(
  entries: RawWeightEntry[],
  goalWeightKg?: number | null,
  goalType: string = "lose",
  predictedWeeklyRateKg: number = 0.5,
  currentCalorieTarget: number = 2300
): WeightAnalyticsSummary {
  if (!entries || entries.length === 0) {
    return {
      currentWeightKg: 0,
      latest7dAvgKg: 0,
      previousWeek7dAvgKg: null,
      weeklyChangeKg: null,
      totalChangeKg: null,
      startWeightKg: 0,
      goalWeightKg: goalWeightKg || null,
      remainingToGoalKg: null,
      estimatedWeeksToGoal: null,
      entryCount: 0,
      adaptiveSuggestion: null,
    };
  }

  const processed = processWeightEntries(entries);
  const latest = processed[processed.length - 1];
  const first = processed[0];

  const currentWeightKg = latest.weightKg;
  const latest7dAvgKg = latest.rollingAvg7d;
  const startWeightKg = first.weightKg;
  const totalChangeKg = Math.round((currentWeightKg - startWeightKg) * 10) / 10;

  // Find 7d average from roughly 7 days ago
  const latestTimestamp = new Date(latest.date).getTime();
  const prevWeekTimestamp = latestTimestamp - 7 * 24 * 60 * 60 * 1000;

  // Find closest entry near 7 days ago
  let previousWeek7dAvgKg: number | null = null;
  let weeklyChangeKg: number | null = null;

  const pastEntries = processed.filter(
    (e) => new Date(e.date).getTime() <= prevWeekTimestamp
  );

  if (pastEntries.length > 0) {
    const prevPoint = pastEntries[pastEntries.length - 1];
    previousWeek7dAvgKg = prevPoint.rollingAvg7d;
    weeklyChangeKg = Math.round((latest7dAvgKg - previousWeek7dAvgKg) * 10) / 10;
  }

  // Goal distance & time to reach goal
  let remainingToGoalKg: number | null = null;
  let estimatedWeeksToGoal: number | null = null;

  if (goalWeightKg) {
    remainingToGoalKg = Math.round(Math.abs(latest7dAvgKg - goalWeightKg) * 10) / 10;
    
    // Use actual weekly rate if available, otherwise predicted weekly rate
    const effectiveRate = Math.abs(weeklyChangeKg || predictedWeeklyRateKg);
    if (effectiveRate > 0.05 && remainingToGoalKg > 0) {
      estimatedWeeksToGoal = Math.ceil(remainingToGoalKg / effectiveRate);
    }
  }

  // Adaptive Recalculation Engine (Section 38d)
  let adaptiveSuggestion = null;

  // Only run adaptive check if we have at least 14 days of data or clear 7d trend
  if (weeklyChangeKg !== null && processed.length >= 5 && goalType !== "maintain") {
    const actualWeeklyRateKg = Math.abs(weeklyChangeKg);
    const targetWeeklyRateKg = Math.abs(predictedWeeklyRateKg);
    const rateDiff = actualWeeklyRateKg - targetWeeklyRateKg;

    // Significant discrepancy: difference > 0.2 kg/week
    if (Math.abs(rateDiff) >= 0.2) {
      // 1kg body mass ~ 7700 kcal -> 1kg/week diff ~ 1100 kcal/day
      // Dampen the adjustment to 70% to avoid erratic swings
      const rawKcalDiff = Math.round((rateDiff * 1100) * 0.7);

      let suggestedCalorieTarget = currentCalorieTarget;
      let reason = "";

      if (goalType === "lose") {
        if (weeklyChangeKg > -0.1) {
          // Weight loss stalled or gained
          suggestedCalorieTarget = Math.max(1200, currentCalorieTarget - Math.abs(rawKcalDiff));
          reason = `Weight loss is slower than your target rate of ${targetWeeklyRateKg}kg/week (currently ${actualWeeklyRateKg}kg/week).`;
        } else if (weeklyChangeKg < -targetWeeklyRateKg - 0.25) {
          // Losing too fast (>0.25kg faster than intended)
          suggestedCalorieTarget = currentCalorieTarget + Math.abs(rawKcalDiff);
          reason = `Weight loss is faster than planned (${actualWeeklyRateKg}kg/week vs target ${targetWeeklyRateKg}kg/week).`;
        }
      } else if (goalType === "gain") {
        if (weeklyChangeKg < 0.1) {
          suggestedCalorieTarget = currentCalorieTarget + Math.abs(rawKcalDiff);
          reason = `Weight gain is slower than your target rate of ${targetWeeklyRateKg}kg/week.`;
        }
      }

      if (suggestedCalorieTarget !== currentCalorieTarget) {
        adaptiveSuggestion = {
          hasSuggestion: true,
          reason,
          predictedWeeklyRateKg: targetWeeklyRateKg,
          actualWeeklyRateKg,
          currentCalorieTarget,
          suggestedCalorieTarget,
          differenceKcal: suggestedCalorieTarget - currentCalorieTarget,
        };
      }
    }
  }

  return {
    currentWeightKg,
    latest7dAvgKg,
    previousWeek7dAvgKg,
    weeklyChangeKg,
    totalChangeKg,
    startWeightKg,
    goalWeightKg: goalWeightKg || null,
    remainingToGoalKg,
    estimatedWeeksToGoal,
    entryCount: processed.length,
    adaptiveSuggestion,
  };
}
