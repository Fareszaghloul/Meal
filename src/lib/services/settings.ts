import type { GoalRevision, Prisma, UserSettings } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ageOn, latestLocalDateForUser, todayInTimezone, type DateString } from "@/lib/dates";
import { GOAL_REVISION_FIELDS, type SettingsPatch } from "@/lib/validation";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Defaults for a brand-new account. Targets are the product's starting point;
 * goal weight and timezone stay null until the user sets them (the browser fills timezone once).
 */
export const SETTINGS_DEFAULTS = {
  dailyCalories: 2300,
  dailyProtein: 180,
  dailyCarbs: 220,
  dailyFat: 70,
  goalWeightKg: null,
  timezone: null,
} satisfies Partial<Prisma.UserSettingsUncheckedCreateInput>;

/** The user's settings row, created with defaults (plus a first goal revision) if missing. */
export async function ensureSettings(userId: string, db: Db = prisma): Promise<UserSettings> {
  const existing = await db.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  const created = await db.userSettings.upsert({ where: { userId }, update: {}, create: { userId, ...SETTINGS_DEFAULTS } });
  await ensureGoalAnchor(created, db);
  return created;
}

/** "Today" in the user's tracking timezone (host date until they have one). */
export const todayFor = (s: Pick<UserSettings, "timezone"> | null): DateString => todayInTimezone(s?.timezone);

/** Latest date a measurement may carry: today in the user's timezone, or the UTC+14 envelope if none is stored yet. */
export async function latestAllowedDate(userId: string, db: Db = prisma): Promise<DateString> {
  const s = await db.userSettings.findUnique({ where: { userId }, select: { timezone: true } });
  return latestLocalDateForUser(s?.timezone);
}

function revisionValues(s: UserSettings) {
  return {
    dailyCalories: s.dailyCalories,
    dailyProtein: s.dailyProtein,
    dailyCarbs: s.dailyCarbs,
    dailyFat: s.dailyFat,
    dailyFiber: s.dailyFiber,
    goalWeightKg: s.goalWeightKg,
    goalType: s.goalType,
    goalWeeklyRateKg: s.goalWeeklyRateKg,
  };
}

/**
 * A user with settings but no revisions (accounts from before goal history) gets one anchor:
 * their current targets, effective today. Nothing earlier is invented.
 */
export async function ensureGoalAnchor(s: UserSettings, db: Db = prisma) {
  const count = await db.goalRevision.count({ where: { userId: s.userId } });
  if (count > 0) return;
  // ON CONFLICT DO NOTHING: a concurrent anchor may already exist, and a thrown error would abort an enclosing transaction.
  await db.goalRevision.createMany({ data: [{ userId: s.userId, effectiveDate: todayFor(s), ...revisionValues(s) }], skipDuplicates: true });
}

/**
 * Records the goals now in `s` as effective from today (user's timezone).
 * One revision per date: a second edit the same day replaces that day's values (latest wins).
 * Never earlier than the newest existing revision, so a timezone change westwards can't hide the edit
 * behind a revision dated "tomorrow".
 */
async function recordRevision(s: UserSettings, db: Db) {
  const latest = await db.goalRevision.findFirst({ where: { userId: s.userId }, orderBy: { effectiveDate: "desc" }, select: { effectiveDate: true } });
  const today = todayFor(s);
  const effectiveDate = latest && latest.effectiveDate > today ? latest.effectiveDate : today;
  const values = revisionValues(s);
  await db.goalRevision.upsert({
    where: { userId_effectiveDate: { userId: s.userId, effectiveDate } },
    create: { userId: s.userId, effectiveDate, ...values },
    update: values,
  });
}

/**
 * Applies a validated settings patch. Only supplied fields change.
 * A goal revision is recorded only when a goal field actually changes value,
 * so unit/timezone/display changes never create one.
 */
export async function applySettingsPatch(userId: string, patch: SettingsPatch, db: Db = prisma) {
  const before = await ensureSettings(userId, db);
  const data: Prisma.UserSettingsUpdateInput = { ...patch };
  if (patch.birthDate) data.age = ageOn(patch.birthDate, todayInTimezone(patch.timezone ?? before.timezone));

  const goalChanged = GOAL_REVISION_FIELDS.some((k) => patch[k] !== undefined && patch[k] !== before[k]);
  const after = await db.userSettings.update({ where: { userId }, data });
  if (goalChanged) await recordRevision(after, db);
  return { settings: after, goalChanged };
}

export const listGoalRevisions = (userId: string, db: Db = prisma) =>
  db.goalRevision.findMany({ where: { userId }, orderBy: { effectiveDate: "asc" } });

/** The revision in effect on `date` (sorted ascending input), or null when the date precedes all known goals. */
export function goalOn<T extends Pick<GoalRevision, "effectiveDate">>(revisions: T[], date: DateString): T | null {
  let found: T | null = null;
  for (const r of revisions) {
    if (r.effectiveDate > date) break;
    found = r;
  }
  return found;
}

export const toGoalRevisionDto = (r: GoalRevision) => ({
  effectiveDate: r.effectiveDate,
  dailyCalories: r.dailyCalories,
  dailyProtein: r.dailyProtein,
  dailyCarbs: r.dailyCarbs,
  dailyFat: r.dailyFat,
  dailyFiber: r.dailyFiber,
  goalWeightKg: r.goalWeightKg,
  goalType: r.goalType,
  goalWeeklyRateKg: r.goalWeeklyRateKg,
});
