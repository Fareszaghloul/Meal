-- Phase 2: Convenience, Daily Use, Meal Prep, Pantry and Shopping Workflows

-- 1. Alter SavedMeal table
ALTER TABLE "SavedMeal" ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- 2. Alter PantryItem table
ALTER TABLE "PantryItem" ADD COLUMN IF NOT EXISTS "storageLocation" TEXT NOT NULL DEFAULT 'Pantry';
ALTER TABLE "PantryItem" ADD COLUMN IF NOT EXISTS "expiryDate" TEXT;
ALTER TABLE "PantryItem" ADD COLUMN IF NOT EXISTS "lowStockThreshold" DOUBLE PRECISION;
ALTER TABLE "PantryItem" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3. Alter UserSettings table
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "pantryUsageBehavior" TEXT NOT NULL DEFAULT 'ask';
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "defaultMealCategory" TEXT DEFAULT 'lunch';
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "defaultCopyMode" TEXT DEFAULT 'append';

-- 4. Create DayTemplate table
CREATE TABLE IF NOT EXISTS "DayTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DayTemplate_userId_idx" ON "DayTemplate"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DayTemplate_userId_fkey'
  ) THEN
    ALTER TABLE "DayTemplate" ADD CONSTRAINT "DayTemplate_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 5. Create DayTemplateItem table
CREATE TABLE IF NOT EXISTS "DayTemplateItem" (
    "id" TEXT NOT NULL,
    "dayTemplateId" TEXT NOT NULL,
    "mealCategory" TEXT NOT NULL,
    "foodId" TEXT,
    "recipeId" TEXT,
    "savedMealId" TEXT,
    "customName" TEXT,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
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

    CONSTRAINT "DayTemplateItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DayTemplateItem_dayTemplateId_idx" ON "DayTemplateItem"("dayTemplateId");
CREATE INDEX IF NOT EXISTS "DayTemplateItem_foodId_idx" ON "DayTemplateItem"("foodId");
CREATE INDEX IF NOT EXISTS "DayTemplateItem_recipeId_idx" ON "DayTemplateItem"("recipeId");
CREATE INDEX IF NOT EXISTS "DayTemplateItem_savedMealId_idx" ON "DayTemplateItem"("savedMealId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DayTemplateItem_dayTemplateId_fkey') THEN
    ALTER TABLE "DayTemplateItem" ADD CONSTRAINT "DayTemplateItem_dayTemplateId_fkey"
      FOREIGN KEY ("dayTemplateId") REFERENCES "DayTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DayTemplateItem_foodId_fkey') THEN
    ALTER TABLE "DayTemplateItem" ADD CONSTRAINT "DayTemplateItem_foodId_fkey"
      FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DayTemplateItem_recipeId_fkey') THEN
    ALTER TABLE "DayTemplateItem" ADD CONSTRAINT "DayTemplateItem_recipeId_fkey"
      FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DayTemplateItem_savedMealId_fkey') THEN
    ALTER TABLE "DayTemplateItem" ADD CONSTRAINT "DayTemplateItem_savedMealId_fkey"
      FOREIGN KEY ("savedMealId") REFERENCES "SavedMeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 6. Create PantryTransaction table
CREATE TABLE IF NOT EXISTS "PantryTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pantryItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PantryTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PantryTransaction_userId_idx" ON "PantryTransaction"("userId");
CREATE INDEX IF NOT EXISTS "PantryTransaction_pantryItemId_idx" ON "PantryTransaction"("pantryItemId");
CREATE INDEX IF NOT EXISTS "PantryTransaction_sourceId_idx" ON "PantryTransaction"("sourceId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PantryTransaction_userId_fkey') THEN
    ALTER TABLE "PantryTransaction" ADD CONSTRAINT "PantryTransaction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PantryTransaction_pantryItemId_fkey') THEN
    ALTER TABLE "PantryTransaction" ADD CONSTRAINT "PantryTransaction_pantryItemId_fkey"
      FOREIGN KEY ("pantryItemId") REFERENCES "PantryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 7. Create PrepSession table
CREATE TABLE IF NOT EXISTS "PrepSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PrepSession_userId_weekStart_key" UNIQUE ("userId", "weekStart")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PrepSession_userId_fkey') THEN
    ALTER TABLE "PrepSession" ADD CONSTRAINT "PrepSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 8. Create PrepTask table
CREATE TABLE IF NOT EXISTS "PrepTask" (
    "id" TEXT NOT NULL,
    "prepSessionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PrepTask_prepSessionId_idx" ON "PrepTask"("prepSessionId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PrepTask_prepSessionId_fkey') THEN
    ALTER TABLE "PrepTask" ADD CONSTRAINT "PrepTask_prepSessionId_fkey"
      FOREIGN KEY ("prepSessionId") REFERENCES "PrepSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
