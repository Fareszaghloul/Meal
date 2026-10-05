-- CreateTable
CREATE TABLE "NutritionRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataStartDate" TEXT NOT NULL,
    "dataEndDate" TEXT NOT NULL,
    "previousCalories" DOUBLE PRECISION NOT NULL,
    "recommendedCalories" DOUBLE PRECISION NOT NULL,
    "calorieChange" DOUBLE PRECISION NOT NULL,
    "observedWeeklyRate" DOUBLE PRECISION NOT NULL,
    "targetWeeklyRate" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutritionRecommendation_userId_idx" ON "NutritionRecommendation"("userId");

-- CreateIndex
CREATE INDEX "NutritionRecommendation_userId_status_idx" ON "NutritionRecommendation"("userId", "status");

-- AddForeignKey
ALTER TABLE "NutritionRecommendation" ADD CONSTRAINT "NutritionRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
