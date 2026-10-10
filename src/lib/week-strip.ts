import { addDays, startOfWeek, type DateString } from "@/lib/dates";

export interface WeekStripDay {
  date: DateString;
  /** Single-letter weekday, Monday first. */
  label: string;
  /** null when nothing is known for the day (future days, or a month that hasn't loaded). */
  calories: number | null;
  protein: number | null;
  /** Percent of the calorie goal, 0 when there is no goal or no data. Not capped. */
  percent: number;
  isSelected: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface DayFigures {
  calories: number;
  protein: number;
}

const LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/** The seven dates (Mon..Sun) of the week containing `date`. */
export function weekDates(date: DateString): DateString[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Distinct "YYYY-MM" months a week touches (one, or two across a month boundary). */
export function weekMonths(date: DateString): string[] {
  return [...new Set(weekDates(date).map((d) => d.slice(0, 7)))];
}

/**
 * Builds the strip. `figures` holds per-day totals from the month history; `live` overrides the
 * selected day with the freshly edited Today data so the strip never lags behind the summary above it.
 * Days with no logged entries stay at 0 kcal; days after today stay null.
 */
export function buildWeekStrip(
  date: DateString,
  today: DateString,
  goalCalories: number,
  figures: Record<DateString, DayFigures | undefined>,
  live?: DayFigures | null
): WeekStripDay[] {
  return weekDates(date).map((d, i) => {
    const isFuture = d > today;
    const known = d === date && live ? live : figures[d];
    const calories = isFuture ? null : known ? known.calories : null;
    const protein = isFuture ? null : known ? known.protein : null;
    return {
      date: d,
      label: LABELS[i],
      calories,
      protein,
      percent: calories !== null && goalCalories > 0 ? (calories / goalCalories) * 100 : 0,
      isSelected: d === date,
      isToday: d === today,
      isFuture,
    };
  });
}

/** Average over days that actually have logged calories (a day at 0 kcal was not tracked). */
export function weekAverages(days: WeekStripDay[]): { calories: number; protein: number; loggedDays: number } {
  const logged = days.filter((d) => d.calories !== null && d.calories > 0);
  if (logged.length === 0) return { calories: 0, protein: 0, loggedDays: 0 };
  const sum = (pick: (d: WeekStripDay) => number | null) => logged.reduce((acc, d) => acc + (pick(d) ?? 0), 0);
  return {
    calories: sum((d) => d.calories) / logged.length,
    protein: sum((d) => d.protein) / logged.length,
    loggedDays: logged.length,
  };
}
