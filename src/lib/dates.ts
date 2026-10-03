/**
 * Calendar-date helpers. Every "day" in this app is a local calendar date
 * ("YYYY-MM-DD") chosen on the client; the server never guesses "today".
 */

export type DateString = string; // "YYYY-MM-DD"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is DateString {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Local calendar date of a Date instance (NOT the UTC date). */
export function toDateString(d: Date): DateString {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocal(): DateString {
  return toDateString(new Date());
}

/** Parse a date string as local noon, so DST and timezone shifts cannot move the day. */
export function parseDate(date: DateString): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(date: DateString, days: number): DateString {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: DateString, b: DateString): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

/** ISO week start (Monday) for a date. */
export function startOfWeek(date: DateString): DateString {
  const d = parseDate(date);
  const day = d.getDay(); // 0 = Sunday
  return addDays(date, day === 0 ? -6 : 1 - day);
}

export function startOfMonth(date: DateString): DateString {
  return `${date.slice(0, 7)}-01`;
}

export function daysInMonth(date: DateString): number {
  const [y, m] = date.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function formatDate(
  date: DateString,
  options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" },
  locale = "en-US"
): string {
  return parseDate(date).toLocaleDateString(locale, options);
}

/** "Today", "Yesterday", "Tomorrow", else a short formatted date. */
export function relativeDayLabel(date: DateString, today: DateString = todayLocal()): string {
  const diff = diffDays(today, date);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return formatDate(date);
}

export function currentTimeString(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function isToday(date: DateString, today: DateString = todayLocal()): boolean {
  return date === today;
}

export function isYesterday(date: DateString, today: DateString = todayLocal()): boolean {
  return diffDays(today, date) === -1;
}

export function formatDisplayDate(date: DateString): string {
  return relativeDayLabel(date);
}
