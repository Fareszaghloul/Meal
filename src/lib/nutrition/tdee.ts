/**
 * Component-based TDEE & Calorie Deficit Calculator (Section 38b)
 */

export interface WorkoutRoutineInput {
  id?: string;
  workoutType: string;
  customLabel?: string | null;
  durationMinutes: number;
  sessionsPerWeek: number;
}

export interface TDEECalculationParams {
  sex: "male" | "female" | string;
  age: number;
  heightCm: number;
  weightKg: number;
  goalType: "lose" | "maintain" | "gain" | string;
  goalWeeklyRateKg: number; // e.g. 0.25, 0.5, 0.75, 1.0
  avgDailySteps: number;
  workouts: WorkoutRoutineInput[];
  useSimpleActivityMode?: boolean;
  simpleActivityLevel?: string | null; // "sedentary" | "light" | "moderate" | "very" | "extra"
  useThermicEffectAdjustment?: boolean; // default true (1.08x)
}

export interface TDEEBreakdown {
  bmr: number;
  stepCalories: number;
  dailyExerciseCalories: number;
  tefAdjustment: number;
  tdee: number;
  targetCalories: number;
  deficitOrSurplus: number;
  suggestedMacros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const MET_TABLE: Record<string, { label: string; met: number }> = {
  walking_casual: { label: "Walking (casual)", met: 3.0 },
  walking_brisk: { label: "Walking (brisk)", met: 4.3 },
  running_light: { label: "Running (light jog)", met: 7.0 },
  running_moderate: { label: "Running (moderate)", met: 9.8 },
  running_fast: { label: "Running (fast)", met: 11.5 },
  cycling_moderate: { label: "Cycling (moderate)", met: 7.5 },
  cycling_vigorous: { label: "Cycling (vigorous)", met: 10.0 },
  swimming_moderate: { label: "Swimming (moderate)", met: 7.0 },
  weightlifting_moderate: { label: "Weightlifting (moderate)", met: 4.5 },
  weightlifting_vigorous: { label: "Weightlifting (vigorous)", met: 6.0 },
  hiit: { label: "HIIT", met: 8.5 },
  yoga: { label: "Yoga", met: 2.5 },
  pilates: { label: "Pilates", met: 3.5 },
  sports_general: { label: "Sports (general, moderate)", met: 7.0 },
};

export const STEP_RANGES = [
  { label: "<5,000", steps: 3500 },
  { label: "5,000–7,500", steps: 6250 },
  { label: "7,500–10,000", steps: 8750 },
  { label: "10,000–12,500", steps: 11250 },
  { label: "12,500+", steps: 15000 },
];

export const SIMPLE_ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

/**
 * Step 1: BMR using Mifflin-St Jeor formula
 */
export function calculateBMR(
  sex: string,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const isFemale = sex?.toLowerCase() === "female" || sex?.toLowerCase() === "f";
  // Men: 10 * weight + 6.25 * height - 5 * age + 5
  // Women: 10 * weight + 6.25 * height - 5 * age - 161
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return isFemale ? base - 161 : base + 5;
}

/**
 * Step 2: NEAT from daily steps
 */
export function calculateStepCalories(steps: number, weightKg: number): number {
  return steps * weightKg * 0.0005;
}

/**
 * Step 3: Exercise calories from structured workouts
 */
export function calculateWorkoutCalories(
  workouts: WorkoutRoutineInput[],
  weightKg: number
): { totalWeekly: number; dailyAverage: number } {
  let totalWeekly = 0;

  for (const w of workouts) {
    const metInfo = MET_TABLE[w.workoutType] || { met: 5.0 };
    const sessionKcal = metInfo.met * weightKg * (w.durationMinutes / 60);
    totalWeekly += sessionKcal * (w.sessionsPerWeek || 0);
  }

  return {
    totalWeekly: Math.round(totalWeekly),
    dailyAverage: Math.round(totalWeekly / 7),
  };
}

/**
 * Full Component-based TDEE and Deficit Calculator
 */
export function calculateTDEEAndTarget(params: TDEECalculationParams): TDEEBreakdown {
  const {
    sex,
    age,
    heightCm,
    weightKg,
    goalType,
    goalWeeklyRateKg,
    avgDailySteps,
    workouts,
    useSimpleActivityMode = false,
    simpleActivityLevel = "moderate",
    useThermicEffectAdjustment = true,
  } = params;

  const safeWeight = Math.max(30, weightKg || 70);
  const safeHeight = Math.max(100, heightCm || 175);
  const safeAge = Math.max(15, age || 25);

  const bmr = calculateBMR(sex, safeWeight, safeHeight, safeAge);

  let stepKcal = 0;
  let dailyExerciseKcal = 0;
  let tefAdjustment = 0;
  let baseTdee = 0;

  if (useSimpleActivityMode) {
    const multiplier = SIMPLE_ACTIVITY_MULTIPLIERS[simpleActivityLevel || "moderate"] || 1.55;
    baseTdee = bmr * multiplier;
  } else {
    stepKcal = calculateStepCalories(avgDailySteps || 8000, safeWeight);
    const workoutResults = calculateWorkoutCalories(workouts || [], safeWeight);
    dailyExerciseKcal = workoutResults.dailyAverage;

    const subtotal = bmr + stepKcal + dailyExerciseKcal;
    if (useThermicEffectAdjustment) {
      tefAdjustment = subtotal * 0.08; // ~8% TEF adjustment
    }
    baseTdee = subtotal + tefAdjustment;
  }

  const roundedTdee = Math.round(baseTdee);

  // Step 5: Apply goal deficit/surplus (1kg ~ 7700 kcal)
  const safeRate = Math.max(0, goalWeeklyRateKg || 0.5);
  const dailyDelta = Math.round((safeRate * 7700) / 7);

  let targetCalories = roundedTdee;
  let deficitOrSurplus = 0;

  if (goalType === "lose") {
    targetCalories = Math.max(1200, roundedTdee - dailyDelta);
    deficitOrSurplus = -dailyDelta;
  } else if (goalType === "gain") {
    targetCalories = roundedTdee + dailyDelta;
    deficitOrSurplus = dailyDelta;
  }

  // Suggested Macro Splits:
  // Protein: 2.0g per kg of bodyweight
  const proteinGrams = Math.round(safeWeight * 2.0);
  const proteinKcal = proteinGrams * 4;

  // Fat: 25% of target calories (min 0.7g/kg)
  const minFatGrams = Math.round(safeWeight * 0.7);
  const targetFatKcal = targetCalories * 0.25;
  const fatGrams = Math.max(minFatGrams, Math.round(targetFatKcal / 9));
  const fatKcal = fatGrams * 9;

  // Carbs: Remainder of calories
  const remainingKcal = Math.max(0, targetCalories - proteinKcal - fatKcal);
  const carbsGrams = Math.round(remainingKcal / 4);

  return {
    bmr: Math.round(bmr),
    stepCalories: Math.round(stepKcal),
    dailyExerciseCalories: Math.round(dailyExerciseKcal),
    tefAdjustment: Math.round(tefAdjustment),
    tdee: roundedTdee,
    targetCalories: Math.round(targetCalories),
    deficitOrSurplus,
    suggestedMacros: {
      protein: proteinGrams,
      carbs: carbsGrams,
      fat: fatGrams,
    },
  };
}
