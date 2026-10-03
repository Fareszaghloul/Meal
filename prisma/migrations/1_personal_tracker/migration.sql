-- AlterTable
ALTER TABLE "Food" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "useCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "dailyFiber" DOUBLE PRECISION,
ADD COLUMN     "dailySodium" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MealTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealTemplate_userId_idx" ON "MealTemplate"("userId");

-- CreateIndex
CREATE INDEX "Food_userId_lastUsedAt_idx" ON "Food"("userId", "lastUsedAt");

-- AddForeignKey
ALTER TABLE "MealTemplate" ADD CONSTRAINT "MealTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data-integrity guards (nutrition values are never negative; quantities are positive)
ALTER TABLE "FoodLogEntry"
  ADD CONSTRAINT "FoodLogEntry_servings_positive" CHECK ("servings" > 0),
  ADD CONSTRAINT "FoodLogEntry_nonnegative" CHECK (
    "calories" >= 0 AND "protein" >= 0 AND "carbs" >= 0 AND "fat" >= 0 AND "fiber" >= 0
  ),
  ADD CONSTRAINT "FoodLogEntry_date_format" CHECK ("date" ~ '^\d{4}-\d{2}-\d{2}$');
ALTER TABLE "WaterLogEntry"
  ADD CONSTRAINT "WaterLogEntry_amount_positive" CHECK ("amountMl" > 0);
ALTER TABLE "WeightEntry"
  ADD CONSTRAINT "WeightEntry_weight_positive" CHECK ("weightKg" > 0 AND "weightKg" < 700),
  ADD CONSTRAINT "WeightEntry_date_format" CHECK ("date" ~ '^\d{4}-\d{2}-\d{2}$');
ALTER TABLE "Food"
  ADD CONSTRAINT "Food_nonnegative" CHECK (
    "caloriesPer100g" >= 0 AND "proteinPer100g" >= 0 AND "carbsPer100g" >= 0 AND "fatPer100g" >= 0 AND "fiberPer100g" >= 0
  );
