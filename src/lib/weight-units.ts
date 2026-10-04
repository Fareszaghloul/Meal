/**
 * The single place that converts body weight between the stored unit (kg) and the
 * displayed unit. Database values are always kg; the preference only changes presentation.
 */
export const KG_TO_LB = 2.2046226218;

export type WeightUnit = "kg" | "lbs";

export const weightUnitFor = (measurementSystem?: string | null): WeightUnit => (measurementSystem === "imperial" ? "lbs" : "kg");

export const kgToLb = (kg: number) => kg * KG_TO_LB;
export const lbToKg = (lb: number) => lb / KG_TO_LB;

export const fromKg = (kg: number, unit: WeightUnit) => (unit === "lbs" ? kgToLb(kg) : kg);

/** Display value → kg to store. Rounded to the gram so a 1-decimal lb entry survives a round trip. */
export const toKg = (value: number, unit: WeightUnit) => Math.round((unit === "lbs" ? lbToKg(value) : value) * 1000) / 1000;

/** "82.4" in the chosen unit, no unit suffix. */
export const formatWeight = (kg: number, unit: WeightUnit, digits = 1) => fromKg(kg, unit).toFixed(digits);

/** Inputs shown in an edit field: one decimal, trailing zeros trimmed. */
export const weightInputValue = (kg: number, unit: WeightUnit) => String(Math.round(fromKg(kg, unit) * 10) / 10);
