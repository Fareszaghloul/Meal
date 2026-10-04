/**
 * Calendar-date helpers. Every "day" in this app is a local calendar date
 * ("YYYY-MM-DD") chosen on the client. When the server needs "today" (future-date
 * checks, defaults) it uses the user's stored tracking timezone, never its own clock's zone.
 * Date strings are never shifted when the timezone changes.
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

/** Pure integer arithmetic to add/subtract months without Date object DST or leap issues. */
export function shiftMonth(monthStr: string, by: number): string {
  const [y, m] = monthStr.slice(0, 7).split("-").map(Number);
  const total = y * 12 + (m - 1) + by;
  const newYear = Math.floor(total / 12);
  const newMonth = ((total % 12) + 12) % 12 + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/** Format "YYYY-MM" to readable "October 2026". */
export function formatMonth(monthStr: string, locale = "en-US"): string {
  const [y, m] = monthStr.slice(0, 7).split("-").map(Number);
  const d = new Date(y, m - 1, 15, 12, 0, 0, 0);
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

/** Returns the first day, last day, and day count of a given month string "YYYY-MM". */
export function monthRange(monthStr: string): { from: DateString; to: DateString; daysCount: number } {
  const m = monthStr.slice(0, 7);
  const count = daysInMonth(`${m}-01`);
  return {
    from: `${m}-01`,
    to: `${m}-${String(count).padStart(2, "0")}`,
    daysCount: count,
  };
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

let knownZones: Set<string> | null = null;

/**
 * Canonical IANA name for a timezone ("asia/amman" -> "Asia/Amman", "US/Eastern" -> "America/New_York"),
 * or null when it isn't a real IANA zone. Offsets like "+03:00" and free text like "GMT+3" are rejected.
 */
export function canonicalTimezone(tz: unknown): string | null {
  if (typeof tz !== "string" || !tz.trim() || tz.length > 64) return null;
  let resolved: string;
  try {
    resolved = new Intl.DateTimeFormat("en-US", { timeZone: tz.trim() }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
  knownZones ??= new Set(Intl.supportedValuesOf("timeZone"));
  return resolved === "UTC" || knownZones.has(resolved) ? resolved : null;
}

export function isValidTimezone(tz: unknown): tz is string {
  return canonicalTimezone(tz) !== null;
}

/** Calendar date ("YYYY-MM-DD") at `now` in an IANA timezone. Invalid or missing zone: the host's local date. */
export function todayInTimezone(tz?: string | null, now: Date = new Date()): DateString {
  const zone = canonicalTimezone(tz);
  if (!zone) return toDateString(now);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * The latest calendar date that can be "today" anywhere on Earth right now (UTC+14).
 * Only a fallback for users who have no timezone stored yet.
 */
export function latestPossibleLocalDate(now: Date = new Date()): DateString {
  return new Date(now.getTime() + 14 * 3_600_000).toISOString().slice(0, 10);
}

/** "Today" for a user: in their tracking timezone when set, else the global UTC+14 envelope (never rejects a real today). */
export function latestLocalDateForUser(tz?: string | null, now: Date = new Date()): DateString {
  return canonicalTimezone(tz) ? todayInTimezone(tz, now) : latestPossibleLocalDate(now);
}

/** Whole years between a birth date and a reference date, both "YYYY-MM-DD". */
export function ageOn(birthDate: DateString, on: DateString): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}
