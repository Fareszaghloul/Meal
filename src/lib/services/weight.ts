import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, latestPossibleLocalDate, type DateString } from "@/lib/dates";
import type { WeightEntry, WeightPageData, WeightSummary } from "@/lib/domain";
import { summarize } from "@/lib/nutrition/weight-trend";
import { weightUnitFor } from "@/lib/weight-units";
import type { WeightInput, WeightPatch } from "@/lib/validation";

type Db = Prisma.TransactionClient | typeof prisma;

/** Latest first: date, then time, then createdAt. A missing time sorts as the earliest of its day. */
const LATEST_FIRST: Prisma.WeightEntryOrderByWithRelationInput[] = [{ date: "desc" }, { time: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
const EARLIEST_FIRST: Prisma.WeightEntryOrderByWithRelationInput[] = [{ date: "asc" }, { time: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }];

export function toWeightEntry(r: {
  id: string;
  date: string;
  time: string | null;
  entryType: string;
  weightKg: number;
  bodyFatPct: number | null;
  smmKg: number | null;
  bmi: number | null;
  notes: string | null;
  createdAt: Date;
}): WeightEntry {
  return {
    id: r.id,
    date: r.date,
    time: r.time,
    entryType: r.entryType === "inbody" ? "inbody" : "daily",
    weightKg: r.weightKg,
    bodyFatPct: r.bodyFatPct,
    smmKg: r.smmKg,
    bmi: r.bmi,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * The one place UserSettings' "current" body numbers are derived from weight rows.
 * Current weight = the latest DAILY reading that isn't in the future. Never an InBody row, never "most recently edited".
 * With no daily reading left it resets to null rather than keeping a deleted value or inventing a default.
 * InBody metrics follow the latest scan that has them.
 * Call inside the same transaction as the write so the two can't diverge.
 */
export async function syncCurrentWeight(userId: string, db: Db = prisma) {
  const notFuture = { lte: latestPossibleLocalDate() };
  const [daily, scan] = await Promise.all([
    db.weightEntry.findFirst({ where: { userId, entryType: "daily", date: notFuture }, orderBy: LATEST_FIRST, select: { weightKg: true } }),
    db.weightEntry.findFirst({ where: { userId, entryType: "inbody", date: notFuture }, orderBy: LATEST_FIRST, select: { bodyFatPct: true, smmKg: true, bmi: true } }),
  ]);
  const data: Prisma.UserSettingsUpdateManyMutationInput = { currentWeightKg: daily?.weightKg ?? null };
  if (scan?.bodyFatPct != null) data.currentBodyFatPct = scan.bodyFatPct;
  if (scan?.smmKg != null) data.currentSmmKg = scan.smmKg;
  if (scan?.bmi != null) data.currentBmi = scan.bmi;
  await db.userSettings.updateMany({ where: { userId }, data });
}

export async function createWeight(userId: string, input: WeightInput): Promise<WeightEntry> {
  const isDaily = input.entryType === "daily";
  return prisma.$transaction(async (tx) => {
    const row = await tx.weightEntry.create({
      data: {
        userId,
        date: input.date,
        time: input.time ?? null,
        entryType: input.entryType,
        weightKg: input.weightKg,
        bodyFatPct: isDaily ? null : (input.bodyFatPct ?? null),
        smmKg: isDaily ? null : (input.smmKg ?? null),
        bmi: isDaily ? null : (input.bmi ?? null),
        notes: input.notes || null,
      },
    });
    await syncCurrentWeight(userId, tx);
    return toWeightEntry(row);
  });
}

/** Returns null when the entry doesn't exist or isn't the user's. Absent fields are left untouched. */
export async function updateWeight(userId: string, id: string, patch: WeightPatch): Promise<WeightEntry | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.weightEntry.findFirst({ where: { id, userId } });
    if (!existing) return null;
    const entryType = patch.entryType ?? existing.entryType;
    const isDaily = entryType === "daily";
    const row = await tx.weightEntry.update({
      where: { id },
      data: {
        date: patch.date,
        time: patch.time,
        entryType,
        weightKg: patch.weightKg,
        bodyFatPct: isDaily ? null : patch.bodyFatPct,
        smmKg: isDaily ? null : patch.smmKg,
        bmi: isDaily ? null : patch.bmi,
        notes: patch.notes === undefined ? undefined : patch.notes || null,
      },
    });
    await syncCurrentWeight(userId, tx);
    return toWeightEntry(row);
  });
}

/** Returns false when the entry doesn't exist or isn't the user's. */
export async function deleteWeight(userId: string, id: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.weightEntry.deleteMany({ where: { id, userId } });
    if (count === 0) return false;
    await syncCurrentWeight(userId, tx);
    return true;
  });
}

const emptySummary = { latestKg: null, latestDate: null, avg7Kg: null, change7Kg: null, change30Kg: null, startKg: null };

/**
 * Daily-weigh-in summary from two small indexed reads instead of the whole history:
 * the latest reading on/before `asOf` (default: now), plus the 37 days ending there for the 7/30-day averages.
 * `startKg` is the very first daily reading.
 */
export async function weightSummary(userId: string, asOf?: DateString) {
  const where = { userId, entryType: "daily" };
  const latest = await prisma.weightEntry.findFirst({
    where: { ...where, date: { lte: asOf ?? latestPossibleLocalDate() } },
    orderBy: LATEST_FIRST,
    select: { date: true },
  });
  if (!latest) return emptySummary;
  const [window, first] = await Promise.all([
    prisma.weightEntry.findMany({
      where: { ...where, date: { gte: addDays(latest.date, -36), lte: latest.date } },
      select: { date: true, weightKg: true, time: true, createdAt: true },
    }),
    prisma.weightEntry.findFirst({ where, orderBy: EARLIEST_FIRST, select: { weightKg: true } }),
  ]);
  return { ...summarize(window), startKg: first?.weightKg ?? null };
}

/** Weight page payload. `from` bounds the daily list (plus a 6-day lead-in); omit for the full history. */
export async function weightPage(userId: string, from?: DateString): Promise<WeightPageData> {
  const [daily, inbody, settings, summary] = await Promise.all([
    prisma.weightEntry.findMany({
      where: { userId, entryType: "daily", ...(from ? { date: { gte: addDays(from, -6) } } : {}) },
      orderBy: EARLIEST_FIRST,
    }),
    prisma.weightEntry.findMany({ where: { userId, entryType: "inbody" }, orderBy: LATEST_FIRST }),
    prisma.userSettings.findUnique({ where: { userId }, select: { measurementSystem: true, heightCm: true, goalWeightKg: true } }),
    weightSummary(userId),
  ]);
  const measurementSystem = settings?.measurementSystem ?? "metric";
  const full: WeightSummary = { ...summary, goalKg: settings?.goalWeightKg ?? null, unit: weightUnitFor(measurementSystem) };
  return {
    entries: daily.map(toWeightEntry),
    inbody: inbody.map(toWeightEntry),
    summary: full,
    measurementSystem,
    heightCm: settings?.heightCm ?? null,
  };
}
