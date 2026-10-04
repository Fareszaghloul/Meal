import type { WorkoutRoutineInput } from "@/lib/nutrition/tdee";

export interface GoalRevisionDto {
  effectiveDate: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyFiber: number | null;
  goalWeightKg: number | null;
  goalType: string | null;
  goalWeeklyRateKg: number | null;
}

/** GET/PATCH /api/settings response. */
export interface SettingsDto {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyFiber: number | null;
  dailySodium: number | null;
  dailyWaterGoalMl: number;
  defaultServings: number;
  measurementSystem: "metric" | "imperial";
  timezone: string | null;
  sex: "male" | "female";
  birthDate: string | null;
  age: number;
  heightCm: number;
  currentWeightKg: number | null;
  currentWeightFromLog: boolean;
  goalType: "lose" | "maintain" | "gain";
  goalWeeklyRateKg: number;
  goalWeightKg: number | null;
  avgDailySteps: number;
  useSimpleActivityMode: boolean;
  simpleActivityLevel: string | null;
  useThermicEffectAdjustment: boolean;
  workouts: WorkoutRoutineInput[];
  goalHistory: GoalRevisionDto[];
  firstGoalDate: string | null;
  // admin only
  ollamaUrl?: string;
  ollamaModel?: string;
  screenshotMethod?: string;
  hasCloudApiKey?: boolean;
  hasUsdaApiKey?: boolean;
}

/** Saves a partial patch; resolves to the new settings, or null when the save failed (already reported). */
export type SaveSettings = (section: string, patch: Record<string, unknown>) => Promise<SettingsDto | null>;
