-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "servingLabel" TEXT,
ADD COLUMN     "yieldWeightGrams" DOUBLE PRECISION,
ALTER COLUMN "servings" SET DEFAULT 4,
ALTER COLUMN "servings" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "RecipeIngredient" ADD COLUMN     "addedSugars" DOUBLE PRECISION,
ADD COLUMN     "calories" DOUBLE PRECISION,
ADD COLUMN     "carbs" DOUBLE PRECISION,
ADD COLUMN     "fat" DOUBLE PRECISION,
ADD COLUMN     "fiber" DOUBLE PRECISION,
ADD COLUMN     "grams" DOUBLE PRECISION,
ADD COLUMN     "protein" DOUBLE PRECISION,
ADD COLUMN     "saturatedFat" DOUBLE PRECISION,
ADD COLUMN     "sodium" DOUBLE PRECISION,
ADD COLUMN     "totalSugars" DOUBLE PRECISION,
ADD COLUMN     "transFat" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_foodId_idx" ON "RecipeIngredient"("foodId");
