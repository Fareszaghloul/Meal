import type { GoalRevision, UserSettings, WorkoutRoutineEntry } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, json, withAuth } from "@/lib/api/route";
import type { SafeUser } from "@/lib/auth/session";
import { ADMIN_SETTINGS_FIELDS, settingsPatch } from "@/lib/validation";
import { applySettingsPatch, ensureSettings, toGoalRevisionDto } from "@/lib/services/settings";

/** Shown in Settings; older revisions stay in the database and in backups. */
const GOAL_HISTORY_LIMIT = 24;

/** Secrets and server configuration never leave the server; the client only learns whether a key is set. */
function publicSettings(
  s: UserSettings,
  user: SafeUser,
  extra: { workouts: WorkoutRoutineEntry[]; currentWeightFromLog: boolean; goalHistory: GoalRevision[]; firstGoalDate: string | null }
) {
  const { cloudApiKey, usdaApiKey, ollamaUrl, ollamaModel, screenshotMethod, id, userId, ...safe } = s;
  void id;
  void userId;
  return {
    ...safe,
    workouts: extra.workouts,
    /** currentWeightKg is derived from the latest daily weigh-in and is read-only here. */
    currentWeightFromLog: extra.currentWeightFromLog,
    goalHistory: extra.goalHistory.map(toGoalRevisionDto),
    /** Earliest date with a known target; Analytics treats earlier dates as "target unknown". */
    firstGoalDate: extra.firstGoalDate,
    ...(user.role === "admin"
      ? { ollamaUrl, ollamaModel, screenshotMethod, hasCloudApiKey: Boolean(cloudApiKey), hasUsdaApiKey: Boolean(usdaApiKey) }
      : {}),
  };
}

async function respond(s: UserSettings, user: SafeUser) {
  const [workouts, dailyWeights, goalHistory, first] = await Promise.all([
    prisma.workoutRoutineEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.weightEntry.count({ where: { userId: user.id, entryType: "daily" } }),
    prisma.goalRevision.findMany({ where: { userId: user.id }, orderBy: { effectiveDate: "desc" }, take: GOAL_HISTORY_LIMIT }),
    prisma.goalRevision.findFirst({ where: { userId: user.id }, orderBy: { effectiveDate: "asc" }, select: { effectiveDate: true } }),
  ]);
  return json(publicSettings(s, user, { workouts, currentWeightFromLog: dailyWeights > 0, goalHistory, firstGoalDate: first?.effectiveDate ?? null }));
}

export const GET = withAuth(async (_req, user) => respond(await ensureSettings(user.id), user));

/** Partial update: only supplied fields change. Unknown fields (including currentWeightKg) are rejected. */
async function patch(req: Request, user: SafeUser) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON.", "bad_json");
  }
  if (raw && typeof raw === "object" && "currentWeightKg" in raw) {
    throw new HttpError(400, "Current weight comes from your weight log. Log a weigh-in to change it.", "derived_field");
  }
  const input = settingsPatch.parse(raw);
  if (user.role !== "admin" && ADMIN_SETTINGS_FIELDS.some((k) => input[k] !== undefined)) {
    throw new HttpError(403, "Only an admin can change server settings.", "forbidden");
  }
  // Settings row + goal revision change together or not at all.
  const { settings } = await prisma.$transaction((tx) => applySettingsPatch(user.id, input, tx));
  return respond(settings, user);
}

export const PATCH = withAuth(patch);
/** Same partial semantics as PATCH, kept for existing callers. */
export const PUT = withAuth(patch);
