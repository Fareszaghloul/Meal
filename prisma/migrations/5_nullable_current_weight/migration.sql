-- AlterTable: make currentWeightKg nullable and drop the default 78
ALTER TABLE "UserSettings" ALTER COLUMN "currentWeightKg" DROP NOT NULL,
ALTER COLUMN "currentWeightKg" DROP DEFAULT;

-- Clear any fabricated default weights for users who have no daily weight entries
UPDATE "UserSettings"
SET "currentWeightKg" = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "WeightEntry"
  WHERE "WeightEntry"."userId" = "UserSettings"."userId"
    AND "WeightEntry"."entryType" = 'daily'
);
