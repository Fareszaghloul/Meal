-- Phase 9 follow-up to 6_settings_timezone_goal_revision.
-- 1. A timezone the user never chose must be distinguishable from one they did.
--    Migration 6 defaulted every row to 'UTC' (no UI had saved a choice yet), so those rows become NULL:
--    the Settings page then initialises it once from the browser, and never silently afterwards.
ALTER TABLE "UserSettings" ALTER COLUMN "timezone" DROP NOT NULL;
ALTER TABLE "UserSettings" ALTER COLUMN "timezone" DROP DEFAULT;
UPDATE "UserSettings" SET "timezone" = NULL WHERE "timezone" = 'UTC';

-- 2. No goal weight means NULL, never an invented 72 kg default for new accounts (existing values are kept).
ALTER TABLE "UserSettings" ALTER COLUMN "goalWeightKg" DROP DEFAULT;

-- 3. The unique (userId, effectiveDate) index already covers lookups by user; drop the redundant ones.
DROP INDEX IF EXISTS "GoalRevision_userId_idx";
DROP INDEX IF EXISTS "GoalRevision_userId_effectiveDate_idx";

-- 4. First known goal revision for existing users = their current targets, effective on the migration date.
--    Nothing earlier is invented: Analytics treats dates before this as "historical target unknown".
INSERT INTO "GoalRevision" ("id", "userId", "effectiveDate", "dailyCalories", "dailyProtein", "dailyCarbs", "dailyFat",
                            "dailyFiber", "goalWeightKg", "goalType", "goalWeeklyRateKg", "createdAt")
SELECT 'gr_' || md5(s."userId" || clock_timestamp()::text), s."userId", to_char(CURRENT_DATE, 'YYYY-MM-DD'),
       s."dailyCalories", s."dailyProtein", s."dailyCarbs", s."dailyFat", s."dailyFiber", s."goalWeightKg", s."goalType",
       s."goalWeeklyRateKg", CURRENT_TIMESTAMP
FROM "UserSettings" s
WHERE NOT EXISTS (SELECT 1 FROM "GoalRevision" g WHERE g."userId" = s."userId");
