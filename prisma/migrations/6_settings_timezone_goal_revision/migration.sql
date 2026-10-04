-- AlterTable: Add timezone column to UserSettings
ALTER TABLE "UserSettings" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateTable: GoalRevision
CREATE TABLE "GoalRevision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "effectiveDate" TEXT NOT NULL,
    "dailyCalories" DOUBLE PRECISION NOT NULL,
    "dailyProtein" DOUBLE PRECISION NOT NULL,
    "dailyCarbs" DOUBLE PRECISION NOT NULL,
    "dailyFat" DOUBLE PRECISION NOT NULL,
    "dailyFiber" DOUBLE PRECISION,
    "goalWeightKg" DOUBLE PRECISION,
    "goalType" TEXT,
    "goalWeeklyRateKg" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalRevision_userId_idx" ON "GoalRevision"("userId");

-- CreateIndex
CREATE INDEX "GoalRevision_userId_effectiveDate_idx" ON "GoalRevision"("userId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoalRevision_userId_effectiveDate_key" ON "GoalRevision"("userId", "effectiveDate");

-- AddForeignKey
ALTER TABLE "GoalRevision" ADD CONSTRAINT "GoalRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
