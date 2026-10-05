-- Phase 1: Saved meals models, planned meal status and FoodLogEntry link

-- 1. Alter Meal table: add status, foodLogEntryId, loggedAt
ALTER TABLE "Meal" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE "Meal" ADD COLUMN IF NOT EXISTS "foodLogEntryId" TEXT;
ALTER TABLE "Meal" ADD COLUMN IF NOT EXISTS "loggedAt" TIMESTAMPTZ;

-- Backfill status from isCompleted if existing
UPDATE "Meal" SET "status" = 'completed' WHERE "isCompleted" = true AND "status" = 'planned';

-- Create unique index on foodLogEntryId
CREATE UNIQUE INDEX IF NOT EXISTS "Meal_foodLogEntryId_key" ON "Meal"("foodLogEntryId");

-- Add foreign key constraint from Meal.foodLogEntryId to FoodLogEntry.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Meal_foodLogEntryId_fkey'
  ) THEN
    ALTER TABLE "Meal" ADD CONSTRAINT "Meal_foodLogEntryId_fkey"
      FOREIGN KEY ("foodLogEntryId") REFERENCES "FoodLogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. Create SavedMeal table
CREATE TABLE IF NOT EXISTS "SavedMeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealCategory" TEXT,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedMeal_pkey" PRIMARY KEY ("id")
);

-- 3. Create SavedMealItem table
CREATE TABLE IF NOT EXISTS "SavedMealItem" (
    "id" TEXT NOT NULL,
    "savedMealId" TEXT NOT NULL,
    "foodId" TEXT,
    "recipeId" TEXT,
    "customName" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "servingUnit" TEXT NOT NULL DEFAULT 'serving',
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiber" DOUBLE PRECISION,
    "totalSugars" DOUBLE PRECISION,
    "addedSugars" DOUBLE PRECISION,
    "saturatedFat" DOUBLE PRECISION,
    "transFat" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SavedMealItem_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "SavedMeal_userId_idx" ON "SavedMeal"("userId");
CREATE INDEX IF NOT EXISTS "SavedMealItem_savedMealId_idx" ON "SavedMealItem"("savedMealId");
CREATE INDEX IF NOT EXISTS "SavedMealItem_foodId_idx" ON "SavedMealItem"("foodId");
CREATE INDEX IF NOT EXISTS "SavedMealItem_recipeId_idx" ON "SavedMealItem"("recipeId");

-- Foreign keys for SavedMeal and SavedMealItem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SavedMeal_userId_fkey'
  ) THEN
    ALTER TABLE "SavedMeal" ADD CONSTRAINT "SavedMeal_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SavedMealItem_savedMealId_fkey'
  ) THEN
    ALTER TABLE "SavedMealItem" ADD CONSTRAINT "SavedMealItem_savedMealId_fkey"
      FOREIGN KEY ("savedMealId") REFERENCES "SavedMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SavedMealItem_foodId_fkey'
  ) THEN
    ALTER TABLE "SavedMealItem" ADD CONSTRAINT "SavedMealItem_foodId_fkey"
      FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SavedMealItem_recipeId_fkey'
  ) THEN
    ALTER TABLE "SavedMealItem" ADD CONSTRAINT "SavedMealItem_recipeId_fkey"
      FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
