-- CreateTable
CREATE TABLE "FoodServing" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FoodServing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodServing_foodId_idx" ON "FoodServing"("foodId");

-- AddForeignKey
ALTER TABLE "FoodServing" ADD CONSTRAINT "FoodServing_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Built-in food library (shared foods, userId NULL) with household servings
-- Generated from prisma/library/foods.ts (279 foods). Re-run the generator after editing that file.
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chicken_breast_grilled_skinless', NULL, 'Chicken breast, grilled (skinless)', 'Meat', 'unspecified', 165, 31, 0, 3.6, 0, 74, 'g', 172, 1, 'breast', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chicken_breast_grilled_skinless_s0', 'lib_chicken_breast_grilled_skinless', '1 breast (172 g)', 172, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chicken_breast_grilled_skinless_s1', 'lib_chicken_breast_grilled_skinless', '1 oz', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chicken_breast_raw_skinless', NULL, 'Chicken breast, raw (skinless)', 'Meat', 'unspecified', 120, 22.5, 0, 2.6, 0, 45, 'g', 200, 1, 'breast', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chicken_breast_raw_skinless_s0', 'lib_chicken_breast_raw_skinless', '1 breast (200 g)', 200, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chicken_thigh_roasted_skinless', NULL, 'Chicken thigh, roasted (skinless)', 'Meat', 'unspecified', 179, 24.8, 0, 8.2, 0, 95, 'g', 111, 1, 'thigh', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chicken_thigh_roasted_skinless_s0', 'lib_chicken_thigh_roasted_skinless', '1 thigh (111 g)', 111, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chicken_thigh_roasted_with_skin', NULL, 'Chicken thigh, roasted (with skin)', 'Meat', 'unspecified', 232, 23.3, 0, 14.7, 0, 84, 'g', 116, 1, 'thigh', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chicken_thigh_roasted_with_skin_s0', 'lib_chicken_thigh_roasted_with_skin', '1 thigh (116 g)', 116, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chicken_drumstick_roasted_with_skin', NULL, 'Chicken drumstick, roasted (with skin)', 'Meat', 'unspecified', 216, 27, 0, 11.2, 0, 90, 'g', 71, 1, 'drumstick', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chicken_drumstick_roasted_with_skin_s0', 'lib_chicken_drumstick_roasted_with_skin', '1 drumstick (71 g)', 71, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chicken_wing_roasted_with_skin', NULL, 'Chicken wing, roasted (with skin)', 'Meat', 'unspecified', 290, 26.9, 0, 19.5, 0, 82, 'g', 34, 1, 'wing', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chicken_wing_roasted_with_skin_s0', 'lib_chicken_wing_roasted_with_skin', '1 wing (34 g)', 34, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_ground_chicken_cooked', NULL, 'Ground chicken, cooked', 'Meat', 'unspecified', 189, 23.3, 0, 10.9, 0, 75, 'g', 140, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ground_chicken_cooked_s0', 'lib_ground_chicken_cooked', '1 cup (140 g)', 140, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_turkey_breast_roasted_skinless', NULL, 'Turkey breast, roasted (skinless)', 'Meat', 'unspecified', 135, 30.1, 0, 0.7, 0, 55, 'g', 28, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_turkey_breast_roasted_skinless_s0', 'lib_turkey_breast_roasted_skinless', '1 slice (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_ground_turkey_93_lean_cooked', NULL, 'Ground turkey (93% lean), cooked', 'Meat', 'unspecified', 213, 27.1, 0, 11.6, 0, 91, 'g', 113, 1, 'patty', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ground_turkey_93_lean_cooked_s0', 'lib_ground_turkey_93_lean_cooked', '1 patty (113 g)', 113, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_beef_ground_85_lean_pan_browned', NULL, 'Beef, ground 85% lean, pan-browned', 'Meat', 'unspecified', 250, 25.9, 0, 15.6, 0, 80, 'g', 85, 1, 'patty', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beef_ground_85_lean_pan_browned_s0', 'lib_beef_ground_85_lean_pan_browned', '1 patty (85 g)', 85, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_beef_ground_93_lean_pan_browned', NULL, 'Beef, ground 93% lean, pan-browned', 'Meat', 'unspecified', 182, 25.7, 0, 8.1, 0, 78, 'g', 85, 1, 'patty', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beef_ground_93_lean_pan_browned_s0', 'lib_beef_ground_93_lean_pan_browned', '1 patty (85 g)', 85, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_beef_sirloin_steak_grilled_lean', NULL, 'Beef sirloin steak, grilled (lean)', 'Meat', 'unspecified', 183, 29.3, 0, 6.6, 0, 56, 'g', 170, 1, 'steak', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beef_sirloin_steak_grilled_lean_s0', 'lib_beef_sirloin_steak_grilled_lean', '1 steak (170 g)', 170, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beef_sirloin_steak_grilled_lean_s1', 'lib_beef_sirloin_steak_grilled_lean', '1 oz', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_beef_ribeye_steak_grilled', NULL, 'Beef ribeye steak, grilled', 'Meat', 'unspecified', 291, 23.7, 0, 21.8, 0, 54, 'g', 200, 1, 'steak', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beef_ribeye_steak_grilled_s0', 'lib_beef_ribeye_steak_grilled', '1 steak (200 g)', 200, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_beef_tenderloin_roasted', NULL, 'Beef tenderloin, roasted', 'Meat', 'unspecified', 212, 29.1, 0, 9.8, 0, 56, 'g', 150, 1, 'filet', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beef_tenderloin_roasted_s0', 'lib_beef_tenderloin_roasted', '1 filet (150 g)', 150, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_lamb_leg_roasted_lean', NULL, 'Lamb, leg, roasted (lean)', 'Meat', 'unspecified', 191, 28.3, 0, 7.7, 0, 65, 'g', 85, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lamb_leg_roasted_lean_s0', 'lib_lamb_leg_roasted_lean', '1 slice (85 g)', 85, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_lamb_chop_grilled', NULL, 'Lamb chop, grilled', 'Meat', 'unspecified', 294, 24.5, 0, 21, 0, 72, 'g', 90, 1, 'chop', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lamb_chop_grilled_s0', 'lib_lamb_chop_grilled', '1 chop (90 g)', 90, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_lamb_ground_cooked', NULL, 'Lamb, ground, cooked', 'Meat', 'unspecified', 283, 24.8, 0, 19.7, 0, 81, 'g', 140, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lamb_ground_cooked_s0', 'lib_lamb_ground_cooked', '1 cup (140 g)', 140, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_beef_kofta_grilled', NULL, 'Beef kofta, grilled', 'Meat', 'unspecified', 240, 20, 3, 16, 0.5, 380, 'g', 100, 1, 'skewer', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beef_kofta_grilled_s0', 'lib_beef_kofta_grilled', '1 skewer (100 g)', 100, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_shawarma_chicken_meat_only', NULL, 'Shawarma chicken (meat only)', 'Meat', 'unspecified', 190, 24, 3, 9, 0, 520, 'g', 140, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_shawarma_chicken_meat_only_s0', 'lib_shawarma_chicken_meat_only', '1 cup (140 g)', 140, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_beef_liver_pan_fried', NULL, 'Beef liver, pan-fried', 'Meat', 'unspecified', 175, 26.5, 5.1, 4.7, 0, 77, 'g', 81, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beef_liver_pan_fried_s0', 'lib_beef_liver_pan_fried', '1 slice (81 g)', 81, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_bacon_pan_fried', NULL, 'Bacon, pan-fried', 'Meat', 'unspecified', 541, 37, 1.4, 42, 0, 1717, 'g', 8, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_bacon_pan_fried_s0', 'lib_bacon_pan_fried', '1 slice (8 g)', 8, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_turkey_bacon_cooked', NULL, 'Turkey bacon, cooked', 'Meat', 'unspecified', 382, 29.5, 4.2, 28, 0, 2285, 'g', 14, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_turkey_bacon_cooked_s0', 'lib_turkey_bacon_cooked', '1 slice (14 g)', 14, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_beef_hot_dog', NULL, 'Beef hot dog', 'Meat', 'unspecified', 313, 11.7, 2.7, 28.3, 0, 1040, 'g', 57, 1, 'frank', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beef_hot_dog_s0', 'lib_beef_hot_dog', '1 frank (57 g)', 57, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_beef_jerky', NULL, 'Beef jerky', 'Meat', 'unspecified', 410, 33.2, 11, 25.6, 1.8, 2081, 'g', 28, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beef_jerky_s0', 'lib_beef_jerky', '1 oz', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_salmon_atlantic_baked', NULL, 'Salmon, Atlantic, baked', 'Fish', 'unspecified', 206, 22.1, 0, 12.4, 0, 61, 'g', 154, 1, 'fillet', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_salmon_atlantic_baked_s0', 'lib_salmon_atlantic_baked', '1 fillet (154 g)', 154, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_salmon_atlantic_baked_s1', 'lib_salmon_atlantic_baked', '1 oz', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_salmon_canned_pink_drained', NULL, 'Salmon, canned (pink, drained)', 'Fish', 'unspecified', 136, 23.1, 0, 4.8, 0, 423, 'g', 170, 1, 'can', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_salmon_canned_pink_drained_s0', 'lib_salmon_canned_pink_drained', '1 can (170 g)', 170, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tuna_canned_in_water_drained', NULL, 'Tuna, canned in water (drained)', 'Fish', 'unspecified', 116, 25.5, 0, 0.8, 0, 247, 'g', 120, 1, 'can', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tuna_canned_in_water_drained_s0', 'lib_tuna_canned_in_water_drained', '1 can (120 g)', 120, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tuna_canned_in_oil_drained', NULL, 'Tuna, canned in oil (drained)', 'Fish', 'unspecified', 198, 29.1, 0, 8.2, 0, 354, 'g', 120, 1, 'can', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tuna_canned_in_oil_drained_s0', 'lib_tuna_canned_in_oil_drained', '1 can (120 g)', 120, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tuna_steak_grilled_yellowfin', NULL, 'Tuna steak, grilled (yellowfin)', 'Fish', 'unspecified', 130, 29.2, 0, 0.6, 0, 50, 'g', 150, 1, 'steak', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tuna_steak_grilled_yellowfin_s0', 'lib_tuna_steak_grilled_yellowfin', '1 steak (150 g)', 150, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cod_baked', NULL, 'Cod, baked', 'Fish', 'unspecified', 105, 22.8, 0, 0.9, 0, 78, 'g', 180, 1, 'fillet', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cod_baked_s0', 'lib_cod_baked', '1 fillet (180 g)', 180, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tilapia_baked', NULL, 'Tilapia, baked', 'Fish', 'unspecified', 128, 26.2, 0, 2.7, 0, 56, 'g', 87, 1, 'fillet', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tilapia_baked_s0', 'lib_tilapia_baked', '1 fillet (87 g)', 87, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_sea_bass_baked', NULL, 'Sea bass, baked', 'Fish', 'unspecified', 124, 23.6, 0, 2.6, 0, 87, 'g', 129, 1, 'fillet', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sea_bass_baked_s0', 'lib_sea_bass_baked', '1 fillet (129 g)', 129, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_sardines_canned_in_oil_drained', NULL, 'Sardines, canned in oil (drained)', 'Fish', 'unspecified', 208, 24.6, 0, 11.5, 0, 307, 'g', 92, 1, 'can', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sardines_canned_in_oil_drained_s0', 'lib_sardines_canned_in_oil_drained', '1 can (92 g)', 92, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sardines_canned_in_oil_drained_s1', 'lib_sardines_canned_in_oil_drained', '1 sardine (12 g)', 12, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mackerel_baked', NULL, 'Mackerel, baked', 'Fish', 'unspecified', 262, 23.9, 0, 17.8, 0, 83, 'g', 88, 1, 'fillet', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mackerel_baked_s0', 'lib_mackerel_baked', '1 fillet (88 g)', 88, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_shrimp_cooked', NULL, 'Shrimp, cooked', 'Fish', 'unspecified', 99, 24, 0.2, 0.3, 0, 111, 'g', 7, 1, 'shrimp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_shrimp_cooked_s0', 'lib_shrimp_cooked', '1 large shrimp (7 g)', 7, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_shrimp_cooked_s1', 'lib_shrimp_cooked', '3 oz (85 g)', 85, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_calamari_fried', NULL, 'Calamari, fried', 'Fish', 'unspecified', 175, 15.3, 7.8, 7.5, 0, 260, 'g', 110, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_calamari_fried_s0', 'lib_calamari_fried', '1 cup (110 g)', 110, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_crab_meat_cooked', NULL, 'Crab meat, cooked', 'Fish', 'unspecified', 83, 17.9, 0, 0.7, 0, 395, 'g', 85, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_crab_meat_cooked_s0', 'lib_crab_meat_cooked', '3 oz (85 g)', 85, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_smoked_salmon', NULL, 'Smoked salmon', 'Fish', 'unspecified', 117, 18.3, 0, 4.3, 0, 672, 'g', 28, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_smoked_salmon_s0', 'lib_smoked_salmon', '1 oz', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_egg_whole_large', NULL, 'Egg, whole, large', 'Eggs', 'unspecified', 143, 12.6, 0.7, 9.5, 0, 142, 'g', 50, 1, 'egg', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_egg_whole_large_s0', 'lib_egg_whole_large', '1 large egg (50 g)', 50, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_egg_whole_large_s1', 'lib_egg_whole_large', '1 medium egg (44 g)', 44, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_egg_whole_large_s2', 'lib_egg_whole_large', '1 extra-large egg (56 g)', 56, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_egg_white', NULL, 'Egg white', 'Eggs', 'unspecified', 52, 10.9, 0.7, 0.2, 0, 166, 'g', 33, 1, 'egg white', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_egg_white_s0', 'lib_egg_white', '1 large egg white (33 g)', 33, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_egg_white_s1', 'lib_egg_white', '1 cup (243 g)', 243, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_egg_yolk', NULL, 'Egg yolk', 'Eggs', 'unspecified', 322, 15.9, 3.6, 26.5, 0, 48, 'g', 17, 1, 'yolk', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_egg_yolk_s0', 'lib_egg_yolk', '1 large yolk (17 g)', 17, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_egg_boiled', NULL, 'Egg, boiled', 'Eggs', 'unspecified', 155, 12.6, 1.1, 10.6, 0, 124, 'g', 50, 1, 'egg', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_egg_boiled_s0', 'lib_egg_boiled', '1 large egg (50 g)', 50, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_egg_fried', NULL, 'Egg, fried', 'Eggs', 'unspecified', 196, 13.6, 0.8, 15.3, 0, 207, 'g', 46, 1, 'egg', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_egg_fried_s0', 'lib_egg_fried', '1 large egg (46 g)', 46, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_egg_scrambled', NULL, 'Egg, scrambled', 'Eggs', 'unspecified', 149, 10, 1.6, 11, 0, 145, 'g', 61, 1, 'egg', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_egg_scrambled_s0', 'lib_egg_scrambled', '1 large egg (61 g)', 61, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_milk_whole_3_25', NULL, 'Milk, whole (3.25%)', 'Dairy', 'unspecified', 61, 3.2, 4.8, 3.3, 0, 43, 'g', 244, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_milk_whole_3_25_s0', 'lib_milk_whole_3_25', '1 cup (244 g)', 244, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_milk_whole_3_25_s1', 'lib_milk_whole_3_25', '1 glass 200 ml (206 g)', 206, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_milk_whole_3_25_s2', 'lib_milk_whole_3_25', '1 tbsp (15 g)', 15, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_milk_2_reduced_fat', NULL, 'Milk, 2% reduced fat', 'Dairy', 'unspecified', 50, 3.3, 4.8, 2, 0, 47, 'g', 244, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_milk_2_reduced_fat_s0', 'lib_milk_2_reduced_fat', '1 cup (244 g)', 244, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_milk_2_reduced_fat_s1', 'lib_milk_2_reduced_fat', '1 glass 200 ml (206 g)', 206, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_milk_1_low_fat', NULL, 'Milk, 1% low fat', 'Dairy', 'unspecified', 42, 3.4, 5, 1, 0, 44, 'g', 244, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_milk_1_low_fat_s0', 'lib_milk_1_low_fat', '1 cup (244 g)', 244, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_milk_skim', NULL, 'Milk, skim', 'Dairy', 'unspecified', 34, 3.4, 5, 0.1, 0, 42, 'g', 245, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_milk_skim_s0', 'lib_milk_skim', '1 cup (245 g)', 245, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_almond_milk_unsweetened', NULL, 'Almond milk, unsweetened', 'Dairy', 'unspecified', 15, 0.6, 0.6, 1.1, 0.3, 72, 'g', 240, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_almond_milk_unsweetened_s0', 'lib_almond_milk_unsweetened', '1 cup (240 g)', 240, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_oat_milk', NULL, 'Oat milk', 'Dairy', 'unspecified', 48, 1, 7.6, 1.5, 0.8, 42, 'g', 240, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_oat_milk_s0', 'lib_oat_milk', '1 cup (240 g)', 240, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_soy_milk_unsweetened', NULL, 'Soy milk, unsweetened', 'Dairy', 'unspecified', 33, 2.9, 1.7, 1.6, 0.4, 36, 'g', 243, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_soy_milk_unsweetened_s0', 'lib_soy_milk_unsweetened', '1 cup (243 g)', 243, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_greek_yogurt_plain_nonfat', NULL, 'Greek yogurt, plain, nonfat', 'Dairy', 'unspecified', 59, 10.2, 3.6, 0.4, 0, 36, 'g', 170, 1, 'container', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_greek_yogurt_plain_nonfat_s0', 'lib_greek_yogurt_plain_nonfat', '1 container (170 g)', 170, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_greek_yogurt_plain_nonfat_s1', 'lib_greek_yogurt_plain_nonfat', '1 cup (245 g)', 245, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_greek_yogurt_plain_nonfat_s2', 'lib_greek_yogurt_plain_nonfat', '1 tbsp (15 g)', 15, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_greek_yogurt_plain_2', NULL, 'Greek yogurt, plain, 2%', 'Dairy', 'unspecified', 73, 9.9, 3.9, 1.9, 0, 34, 'g', 170, 1, 'container', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_greek_yogurt_plain_2_s0', 'lib_greek_yogurt_plain_2', '1 container (170 g)', 170, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_greek_yogurt_plain_2_s1', 'lib_greek_yogurt_plain_2', '1 cup (245 g)', 245, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_greek_yogurt_plain_whole_milk', NULL, 'Greek yogurt, plain, whole milk', 'Dairy', 'unspecified', 97, 9, 3.9, 5, 0, 35, 'g', 170, 1, 'container', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_greek_yogurt_plain_whole_milk_s0', 'lib_greek_yogurt_plain_whole_milk', '1 container (170 g)', 170, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_greek_yogurt_plain_whole_milk_s1', 'lib_greek_yogurt_plain_whole_milk', '1 cup (245 g)', 245, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_yogurt_plain_whole_milk', NULL, 'Yogurt, plain, whole milk', 'Dairy', 'unspecified', 61, 3.5, 4.7, 3.3, 0, 46, 'g', 245, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_yogurt_plain_whole_milk_s0', 'lib_yogurt_plain_whole_milk', '1 cup (245 g)', 245, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_yogurt_plain_whole_milk_s1', 'lib_yogurt_plain_whole_milk', '1 small pot (125 g)', 125, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_yogurt_plain_low_fat', NULL, 'Yogurt, plain, low fat', 'Dairy', 'unspecified', 63, 5.3, 7, 1.6, 0, 70, 'g', 245, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_yogurt_plain_low_fat_s0', 'lib_yogurt_plain_low_fat', '1 cup (245 g)', 245, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_yogurt_plain_low_fat_s1', 'lib_yogurt_plain_low_fat', '1 small pot (125 g)', 125, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_labneh', NULL, 'Labneh', 'Dairy', 'unspecified', 180, 7, 4, 15, 0, 420, 'g', 20, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_labneh_s0', 'lib_labneh', '1 tbsp (20 g)', 20, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_labneh_s1', 'lib_labneh', '1/4 cup (60 g)', 60, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_laban_drinking_yogurt', NULL, 'Laban (drinking yogurt)', 'Dairy', 'unspecified', 50, 3.3, 4.5, 1.8, 0, 60, 'g', 245, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_laban_drinking_yogurt_s0', 'lib_laban_drinking_yogurt', '1 cup (245 g)', 245, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cottage_cheese_2', NULL, 'Cottage cheese, 2%', 'Dairy', 'unspecified', 84, 11, 4.3, 2.3, 0, 321, 'g', 226, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cottage_cheese_2_s0', 'lib_cottage_cheese_2', '1 cup (226 g)', 226, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cottage_cheese_2_s1', 'lib_cottage_cheese_2', '1/2 cup (113 g)', 113, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cottage_cheese_4', NULL, 'Cottage cheese, 4%', 'Dairy', 'unspecified', 98, 11.1, 3.4, 4.3, 0, 364, 'g', 113, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cottage_cheese_4_s0', 'lib_cottage_cheese_4', '1/2 cup (113 g)', 113, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cheddar_cheese', NULL, 'Cheddar cheese', 'Dairy', 'unspecified', 403, 24.9, 1.3, 33.1, 0, 621, 'g', 28, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cheddar_cheese_s0', 'lib_cheddar_cheese', '1 slice (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cheddar_cheese_s1', 'lib_cheddar_cheese', '1 oz', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cheddar_cheese_s2', 'lib_cheddar_cheese', '1/4 cup shredded (28 g)', 28, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mozzarella_part_skim', NULL, 'Mozzarella, part skim', 'Dairy', 'unspecified', 254, 24.3, 2.8, 15.9, 0, 619, 'g', 28, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mozzarella_part_skim_s0', 'lib_mozzarella_part_skim', '1 oz', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mozzarella_part_skim_s1', 'lib_mozzarella_part_skim', '1/4 cup shredded (28 g)', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mozzarella_fresh_whole_milk', NULL, 'Mozzarella, fresh (whole milk)', 'Dairy', 'unspecified', 280, 27.5, 3.1, 17.1, 0, 486, 'g', 28, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mozzarella_fresh_whole_milk_s0', 'lib_mozzarella_fresh_whole_milk', '1 oz', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mozzarella_fresh_whole_milk_s1', 'lib_mozzarella_fresh_whole_milk', '1 ball (125 g)', 125, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_feta_cheese', NULL, 'Feta cheese', 'Dairy', 'unspecified', 264, 14.2, 4.1, 21.3, 0, 917, 'g', 28, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_feta_cheese_s0', 'lib_feta_cheese', '1 oz', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_feta_cheese_s1', 'lib_feta_cheese', '1/4 cup crumbled (38 g)', 38, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_halloumi_grilled', NULL, 'Halloumi, grilled', 'Dairy', 'unspecified', 321, 22, 2.2, 25, 0, 1200, 'g', 30, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_halloumi_grilled_s0', 'lib_halloumi_grilled', '1 slice (30 g)', 30, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_akkawi_cheese', NULL, 'Akkawi cheese', 'Dairy', 'unspecified', 290, 18, 2, 23, 0, 1100, 'g', 30, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_akkawi_cheese_s0', 'lib_akkawi_cheese', '1 slice (30 g)', 30, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_parmesan_grated', NULL, 'Parmesan, grated', 'Dairy', 'unspecified', 420, 28.4, 13.9, 27.8, 0, 1804, 'g', 5, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_parmesan_grated_s0', 'lib_parmesan_grated', '1 tbsp (5 g)', 5, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_parmesan_grated_s1', 'lib_parmesan_grated', '1 oz', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cream_cheese', NULL, 'Cream cheese', 'Dairy', 'unspecified', 342, 5.9, 5.5, 34.2, 0, 321, 'g', 14.5, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cream_cheese_s0', 'lib_cream_cheese', '1 tbsp (14.5 g)', 14.5, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cream_cheese_s1', 'lib_cream_cheese', '1 oz', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_swiss_cheese', NULL, 'Swiss cheese', 'Dairy', 'unspecified', 393, 27, 1.4, 31, 0, 187, 'g', 28, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_swiss_cheese_s0', 'lib_swiss_cheese', '1 slice (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_american_cheese_slice', NULL, 'American cheese slice', 'Dairy', 'unspecified', 307, 16.4, 8.8, 23.1, 0, 1375, 'g', 21, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_american_cheese_slice_s0', 'lib_american_cheese_slice', '1 slice (21 g)', 21, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_butter_salted', NULL, 'Butter, salted', 'Fats & oils', 'unspecified', 717, 0.9, 0.1, 81.1, 0, 643, 'g', 14.2, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_butter_salted_s0', 'lib_butter_salted', '1 tbsp (14.2 g)', 14.2, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_butter_salted_s1', 'lib_butter_salted', '1 tsp (4.7 g)', 4.7, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_butter_salted_s2', 'lib_butter_salted', '1 pat (5 g)', 5, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_ghee', NULL, 'Ghee', 'Fats & oils', 'unspecified', 900, 0, 0, 100, 0, 0, 'g', 13, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ghee_s0', 'lib_ghee', '1 tbsp (13 g)', 13, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ghee_s1', 'lib_ghee', '1 tsp (4.3 g)', 4.3, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_heavy_cream', NULL, 'Heavy cream', 'Dairy', 'unspecified', 340, 2.8, 2.8, 36.1, 0, 27, 'g', 15, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_heavy_cream_s0', 'lib_heavy_cream', '1 tbsp (15 g)', 15, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_heavy_cream_s1', 'lib_heavy_cream', '1/4 cup (60 g)', 60, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_sour_cream', NULL, 'Sour cream', 'Dairy', 'unspecified', 198, 2.4, 4.6, 19.4, 0, 31, 'g', 12, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sour_cream_s0', 'lib_sour_cream', '1 tbsp (12 g)', 12, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sour_cream_s1', 'lib_sour_cream', '2 tbsp (24 g)', 24, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_whey_protein_powder_generic', NULL, 'Whey protein powder (generic)', 'Supplements', 'unspecified', 400, 80, 8, 5, 0, 300, 'g', 30, 1, 'scoop', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_whey_protein_powder_generic_s0', 'lib_whey_protein_powder_generic', '1 scoop (30 g)', 30, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_casein_protein_powder_generic', NULL, 'Casein protein powder (generic)', 'Supplements', 'unspecified', 370, 75, 8, 2, 0, 350, 'g', 33, 1, 'scoop', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_casein_protein_powder_generic_s0', 'lib_casein_protein_powder_generic', '1 scoop (33 g)', 33, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_oats_rolled_dry', NULL, 'Oats, rolled, dry', 'Grains', 'unspecified', 379, 13.2, 67.7, 6.5, 10.1, 6, 'g', 40, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_oats_rolled_dry_s0', 'lib_oats_rolled_dry', '1/2 cup (40 g)', 40, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_oats_rolled_dry_s1', 'lib_oats_rolled_dry', '1 cup (81 g)', 81, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_oatmeal_cooked_with_water', NULL, 'Oatmeal, cooked with water', 'Grains', 'unspecified', 71, 2.5, 12, 1.5, 1.7, 4, 'g', 234, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_oatmeal_cooked_with_water_s0', 'lib_oatmeal_cooked_with_water', '1 cup (234 g)', 234, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_white_rice_cooked', NULL, 'White rice, cooked', 'Grains', 'unspecified', 130, 2.7, 28.2, 0.3, 0.4, 1, 'g', 158, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_white_rice_cooked_s0', 'lib_white_rice_cooked', '1 cup (158 g)', 158, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_white_rice_cooked_s1', 'lib_white_rice_cooked', '1/2 cup (79 g)', 79, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_white_rice_dry', NULL, 'White rice, dry', 'Grains', 'unspecified', 365, 7.1, 79.9, 0.7, 1.3, 5, 'g', 46, 1, 'cup dry', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_white_rice_dry_s0', 'lib_white_rice_dry', '1/4 cup dry (46 g)', 46, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_brown_rice_cooked', NULL, 'Brown rice, cooked', 'Grains', 'unspecified', 123, 2.7, 25.6, 1, 1.6, 4, 'g', 195, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_brown_rice_cooked_s0', 'lib_brown_rice_cooked', '1 cup (195 g)', 195, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_brown_rice_cooked_s1', 'lib_brown_rice_cooked', '1/2 cup (98 g)', 98, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_basmati_rice_cooked', NULL, 'Basmati rice, cooked', 'Grains', 'unspecified', 121, 3.5, 25.2, 0.4, 0.6, 1, 'g', 163, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_basmati_rice_cooked_s0', 'lib_basmati_rice_cooked', '1 cup (163 g)', 163, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_jasmine_rice_cooked', NULL, 'Jasmine rice, cooked', 'Grains', 'unspecified', 129, 2.7, 28, 0.3, 0.4, 2, 'g', 158, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_jasmine_rice_cooked_s0', 'lib_jasmine_rice_cooked', '1 cup (158 g)', 158, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_quinoa_cooked', NULL, 'Quinoa, cooked', 'Grains', 'unspecified', 120, 4.4, 21.3, 1.9, 2.8, 7, 'g', 185, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_quinoa_cooked_s0', 'lib_quinoa_cooked', '1 cup (185 g)', 185, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_quinoa_cooked_s1', 'lib_quinoa_cooked', '1/2 cup (93 g)', 93, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_bulgur_cooked', NULL, 'Bulgur, cooked', 'Grains', 'unspecified', 83, 3.1, 18.6, 0.2, 4.5, 5, 'g', 182, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_bulgur_cooked_s0', 'lib_bulgur_cooked', '1 cup (182 g)', 182, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_couscous_cooked', NULL, 'Couscous, cooked', 'Grains', 'unspecified', 112, 3.8, 23.2, 0.2, 1.4, 5, 'g', 157, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_couscous_cooked_s0', 'lib_couscous_cooked', '1 cup (157 g)', 157, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_freekeh_cooked', NULL, 'Freekeh, cooked', 'Grains', 'unspecified', 114, 4.5, 22, 0.9, 4, 5, 'g', 180, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_freekeh_cooked_s0', 'lib_freekeh_cooked', '1 cup (180 g)', 180, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pasta_cooked_white', NULL, 'Pasta, cooked (white)', 'Grains', 'unspecified', 158, 5.8, 30.9, 0.9, 1.8, 1, 'g', 140, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pasta_cooked_white_s0', 'lib_pasta_cooked_white', '1 cup (140 g)', 140, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pasta_cooked_white_s1', 'lib_pasta_cooked_white', '2 oz dry (56 g) ≈ 1 cup cooked', 140, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pasta_dry_white', NULL, 'Pasta, dry (white)', 'Grains', 'unspecified', 371, 13, 74.7, 1.5, 3.2, 6, 'g', 56, 1, 'oz dry', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pasta_dry_white_s0', 'lib_pasta_dry_white', '2 oz dry (56 g)', 56, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pasta_dry_white_s1', 'lib_pasta_dry_white', '100 g dry', 100, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_whole_wheat_pasta_cooked', NULL, 'Whole wheat pasta, cooked', 'Grains', 'unspecified', 149, 5.3, 30.4, 1.7, 3.9, 4, 'g', 140, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_whole_wheat_pasta_cooked_s0', 'lib_whole_wheat_pasta_cooked', '1 cup (140 g)', 140, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_spaghetti_cooked', NULL, 'Spaghetti, cooked', 'Grains', 'unspecified', 158, 5.8, 30.9, 0.9, 1.8, 1, 'g', 140, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_spaghetti_cooked_s0', 'lib_spaghetti_cooked', '1 cup (140 g)', 140, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_vermicelli_sha_riya_cooked', NULL, 'Vermicelli (sha''riya), cooked', 'Grains', 'unspecified', 160, 5.5, 32, 0.8, 1.5, 2, 'g', 140, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_vermicelli_sha_riya_cooked_s0', 'lib_vermicelli_sha_riya_cooked', '1 cup (140 g)', 140, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_white_bread', NULL, 'White bread', 'Bread', 'unspecified', 265, 9, 49, 3.2, 2.7, 491, 'g', 28, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_white_bread_s0', 'lib_white_bread', '1 slice (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_whole_wheat_bread', NULL, 'Whole wheat bread', 'Bread', 'unspecified', 247, 13, 41, 3.4, 6, 450, 'g', 32, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_whole_wheat_bread_s0', 'lib_whole_wheat_bread', '1 slice (32 g)', 32, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pita_bread_white', NULL, 'Pita bread, white', 'Bread', 'unspecified', 275, 9.1, 55.7, 1.2, 2.2, 536, 'g', 60, 1, 'pita', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pita_bread_white_s0', 'lib_pita_bread_white', '1 large pita (60 g)', 60, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pita_bread_white_s1', 'lib_pita_bread_white', '1 small pita (28 g)', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pita_bread_white_s2', 'lib_pita_bread_white', '1/2 large pita (30 g)', 30, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pita_bread_whole_wheat', NULL, 'Pita bread, whole wheat', 'Bread', 'unspecified', 262, 9.8, 55, 1.7, 7.4, 486, 'g', 64, 1, 'pita', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pita_bread_whole_wheat_s0', 'lib_pita_bread_whole_wheat', '1 large pita (64 g)', 64, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pita_bread_whole_wheat_s1', 'lib_pita_bread_whole_wheat', '1 small pita (28 g)', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_shrak_saj_bread', NULL, 'Shrak / saj bread', 'Bread', 'unspecified', 290, 9, 58, 2, 2.5, 500, 'g', 90, 1, 'sheet', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_shrak_saj_bread_s0', 'lib_shrak_saj_bread', '1 sheet (90 g)', 90, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_shrak_saj_bread_s1', 'lib_shrak_saj_bread', '1/2 sheet (45 g)', 45, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_taboon_bread', NULL, 'Taboon bread', 'Bread', 'unspecified', 280, 9, 56, 2.5, 2.4, 480, 'g', 120, 1, 'loaf', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_taboon_bread_s0', 'lib_taboon_bread', '1 loaf (120 g)', 120, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_ka_ek_sesame_bread_ring', NULL, 'Ka''ek (sesame bread ring)', 'Bread', 'unspecified', 320, 10, 55, 7, 3, 450, 'g', 120, 1, 'ring', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ka_ek_sesame_bread_ring_s0', 'lib_ka_ek_sesame_bread_ring', '1 ring (120 g)', 120, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_bagel_plain', NULL, 'Bagel, plain', 'Bread', 'unspecified', 257, 10.1, 50.5, 1.4, 2.1, 488, 'g', 105, 1, 'bagel', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_bagel_plain_s0', 'lib_bagel_plain', '1 bagel (105 g)', 105, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tortilla_flour', NULL, 'Tortilla, flour', 'Bread', 'unspecified', 304, 8.3, 50.6, 7.6, 3, 683, 'g', 49, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tortilla_flour_s0', 'lib_tortilla_flour', '1 large (49 g)', 49, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tortilla_flour_s1', 'lib_tortilla_flour', '1 small (30 g)', 30, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tortilla_corn', NULL, 'Tortilla, corn', 'Bread', 'unspecified', 218, 5.7, 44.6, 2.9, 6.3, 45, 'g', 26, 1, 'tortilla', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tortilla_corn_s0', 'lib_tortilla_corn', '1 tortilla (26 g)', 26, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_burger_bun', NULL, 'Burger bun', 'Bread', 'unspecified', 272, 9.5, 48.8, 3.7, 2.3, 467, 'g', 52, 1, 'bun', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_burger_bun_s0', 'lib_burger_bun', '1 bun (52 g)', 52, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_croissant_butter', NULL, 'Croissant, butter', 'Bread', 'unspecified', 406, 8.2, 45.8, 21, 2.6, 467, 'g', 57, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_croissant_butter_s0', 'lib_croissant_butter', '1 medium (57 g)', 57, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_sourdough_bread', NULL, 'Sourdough bread', 'Bread', 'unspecified', 274, 10.8, 51.9, 2.4, 2.3, 513, 'g', 50, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sourdough_bread_s0', 'lib_sourdough_bread', '1 slice (50 g)', 50, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_granola', NULL, 'Granola', 'Grains', 'unspecified', 471, 10, 64, 20, 7, 20, 'g', 55, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_granola_s0', 'lib_granola', '1/2 cup (55 g)', 55, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_corn_flakes', NULL, 'Corn flakes', 'Grains', 'unspecified', 357, 7.5, 84, 0.4, 3.3, 729, 'g', 28, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_corn_flakes_s0', 'lib_corn_flakes', '1 cup (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_muesli', NULL, 'Muesli', 'Grains', 'unspecified', 340, 10, 66, 5, 8, 30, 'g', 45, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_muesli_s0', 'lib_muesli', '1/2 cup (45 g)', 45, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_crackers_saltine', NULL, 'Crackers, saltine', 'Grains', 'unspecified', 421, 9.5, 74, 8.6, 2.8, 1120, 'g', 3, 1, 'cracker', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_crackers_saltine_s0', 'lib_crackers_saltine', '1 cracker (3 g)', 3, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_crackers_saltine_s1', 'lib_crackers_saltine', '5 crackers (15 g)', 15, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_rice_cake_plain', NULL, 'Rice cake, plain', 'Grains', 'unspecified', 387, 8.2, 81.5, 2.8, 4.2, 26, 'g', 9, 1, 'cake', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_rice_cake_plain_s0', 'lib_rice_cake_plain', '1 cake (9 g)', 9, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_flour_all_purpose', NULL, 'Flour, all-purpose', 'Grains', 'unspecified', 364, 10.3, 76.3, 1, 2.7, 2, 'g', 125, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_flour_all_purpose_s0', 'lib_flour_all_purpose', '1 cup (125 g)', 125, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_flour_all_purpose_s1', 'lib_flour_all_purpose', '1 tbsp (8 g)', 8, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cornstarch', NULL, 'Cornstarch', 'Grains', 'unspecified', 381, 0.3, 91.3, 0.1, 0.9, 9, 'g', 8, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cornstarch_s0', 'lib_cornstarch', '1 tbsp (8 g)', 8, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chickpeas_cooked', NULL, 'Chickpeas, cooked', 'Legumes', 'unspecified', 164, 8.9, 27.4, 2.6, 7.6, 7, 'g', 164, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chickpeas_cooked_s0', 'lib_chickpeas_cooked', '1 cup (164 g)', 164, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chickpeas_cooked_s1', 'lib_chickpeas_cooked', '1/2 cup (82 g)', 82, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chickpeas_canned_drained', NULL, 'Chickpeas, canned (drained)', 'Legumes', 'unspecified', 139, 7.1, 22.5, 2.8, 6.4, 246, 'g', 240, 1, 'can', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chickpeas_canned_drained_s0', 'lib_chickpeas_canned_drained', '1 can (240 g)', 240, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chickpeas_canned_drained_s1', 'lib_chickpeas_canned_drained', '1/2 cup (120 g)', 120, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_hummus', NULL, 'Hummus', 'Legumes', 'unspecified', 166, 7.9, 14.3, 9.6, 6, 379, 'g', 30, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_hummus_s0', 'lib_hummus', '2 tbsp (30 g)', 30, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_hummus_s1', 'lib_hummus', '1/4 cup (62 g)', 62, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_hummus_s2', 'lib_hummus', '1 cup (246 g)', 246, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_falafel_fried', NULL, 'Falafel, fried', 'Legumes', 'unspecified', 333, 13.3, 31.8, 17.8, 4.9, 294, 'g', 17, 1, 'patty', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_falafel_fried_s0', 'lib_falafel_fried', '1 patty (17 g)', 17, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_falafel_fried_s1', 'lib_falafel_fried', '1 large patty (40 g)', 40, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_fava_beans_ful_cooked', NULL, 'Fava beans (ful), cooked', 'Legumes', 'unspecified', 110, 7.6, 19.7, 0.4, 5.4, 5, 'g', 170, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_fava_beans_ful_cooked_s0', 'lib_fava_beans_ful_cooked', '1 cup (170 g)', 170, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_ful_medames_prepared', NULL, 'Ful medames (prepared)', 'Legumes', 'unspecified', 125, 6.5, 15, 4.5, 4.5, 350, 'g', 200, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ful_medames_prepared_s0', 'lib_ful_medames_prepared', '1 cup (200 g)', 200, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_lentils_cooked', NULL, 'Lentils, cooked', 'Legumes', 'unspecified', 116, 9, 20.1, 0.4, 7.9, 2, 'g', 198, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lentils_cooked_s0', 'lib_lentils_cooked', '1 cup (198 g)', 198, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lentils_cooked_s1', 'lib_lentils_cooked', '1/2 cup (99 g)', 99, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_lentil_soup', NULL, 'Lentil soup', 'Legumes', 'unspecified', 70, 4, 11, 1.2, 3, 400, 'g', 250, 1, 'bowl', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lentil_soup_s0', 'lib_lentil_soup', '1 bowl (250 g)', 250, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mujaddara_lentils_rice', NULL, 'Mujaddara (lentils & rice)', 'Legumes', 'unspecified', 150, 5, 24, 4, 3.5, 300, 'g', 200, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mujaddara_lentils_rice_s0', 'lib_mujaddara_lentils_rice', '1 cup (200 g)', 200, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_black_beans_cooked', NULL, 'Black beans, cooked', 'Legumes', 'unspecified', 132, 8.9, 23.7, 0.5, 8.7, 1, 'g', 172, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_black_beans_cooked_s0', 'lib_black_beans_cooked', '1 cup (172 g)', 172, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_black_beans_cooked_s1', 'lib_black_beans_cooked', '1/2 cup (86 g)', 86, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_kidney_beans_cooked', NULL, 'Kidney beans, cooked', 'Legumes', 'unspecified', 127, 8.7, 22.8, 0.5, 6.4, 1, 'g', 177, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_kidney_beans_cooked_s0', 'lib_kidney_beans_cooked', '1 cup (177 g)', 177, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_white_beans_cooked', NULL, 'White beans, cooked', 'Legumes', 'unspecified', 139, 9.7, 25.1, 0.4, 6.3, 6, 'g', 179, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_white_beans_cooked_s0', 'lib_white_beans_cooked', '1 cup (179 g)', 179, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_edamame_shelled_cooked', NULL, 'Edamame, shelled, cooked', 'Legumes', 'unspecified', 121, 11.9, 8.9, 5.2, 5.2, 6, 'g', 155, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_edamame_shelled_cooked_s0', 'lib_edamame_shelled_cooked', '1 cup (155 g)', 155, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tofu_firm', NULL, 'Tofu, firm', 'Legumes', 'unspecified', 144, 17.3, 2.8, 8.7, 2.3, 14, 'g', 126, 1, 'block', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tofu_firm_s0', 'lib_tofu_firm', '1/2 block (126 g)', 126, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tofu_firm_s1', 'lib_tofu_firm', '3 oz (85 g)', 85, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_green_peas_cooked', NULL, 'Green peas, cooked', 'Legumes', 'unspecified', 84, 5.4, 15.6, 0.2, 5.5, 3, 'g', 160, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_green_peas_cooked_s0', 'lib_green_peas_cooked', '1 cup (160 g)', 160, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_peanut_butter', NULL, 'Peanut butter', 'Nuts & seeds', 'unspecified', 588, 25.1, 20, 50.4, 6, 426, 'g', 16, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_peanut_butter_s0', 'lib_peanut_butter', '1 tbsp (16 g)', 16, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_peanut_butter_s1', 'lib_peanut_butter', '2 tbsp (32 g)', 32, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_broccoli_raw', NULL, 'Broccoli, raw', 'Vegetables', 'unspecified', 34, 2.8, 6.6, 0.4, 2.6, 33, 'g', 91, 1, 'cup chopped', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_broccoli_raw_s0', 'lib_broccoli_raw', '1 cup chopped (91 g)', 91, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_broccoli_raw_s1', 'lib_broccoli_raw', '1 floret (11 g)', 11, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_broccoli_steamed', NULL, 'Broccoli, steamed', 'Vegetables', 'unspecified', 35, 2.4, 7.2, 0.4, 3.3, 41, 'g', 156, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_broccoli_steamed_s0', 'lib_broccoli_steamed', '1 cup (156 g)', 156, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_spinach_raw', NULL, 'Spinach, raw', 'Vegetables', 'unspecified', 23, 2.9, 3.6, 0.4, 2.2, 79, 'g', 30, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_spinach_raw_s0', 'lib_spinach_raw', '1 cup (30 g)', 30, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_spinach_raw_s1', 'lib_spinach_raw', '1 bag (170 g)', 170, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_spinach_cooked', NULL, 'Spinach, cooked', 'Vegetables', 'unspecified', 23, 3, 3.8, 0.3, 2.4, 70, 'g', 180, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_spinach_cooked_s0', 'lib_spinach_cooked', '1 cup (180 g)', 180, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_lettuce_romaine', NULL, 'Lettuce, romaine', 'Vegetables', 'unspecified', 17, 1.2, 3.3, 0.3, 2.1, 8, 'g', 47, 1, 'cup shredded', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lettuce_romaine_s0', 'lib_lettuce_romaine', '1 cup shredded (47 g)', 47, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lettuce_romaine_s1', 'lib_lettuce_romaine', '1 leaf (28 g)', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_lettuce_iceberg', NULL, 'Lettuce, iceberg', 'Vegetables', 'unspecified', 14, 0.9, 3, 0.1, 1.2, 10, 'g', 72, 1, 'cup shredded', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lettuce_iceberg_s0', 'lib_lettuce_iceberg', '1 cup shredded (72 g)', 72, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_arugula', NULL, 'Arugula', 'Vegetables', 'unspecified', 25, 2.6, 3.7, 0.7, 1.6, 27, 'g', 20, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_arugula_s0', 'lib_arugula', '1 cup (20 g)', 20, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_kale_raw', NULL, 'Kale, raw', 'Vegetables', 'unspecified', 49, 4.3, 8.8, 0.9, 3.6, 38, 'g', 67, 1, 'cup chopped', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_kale_raw_s0', 'lib_kale_raw', '1 cup chopped (67 g)', 67, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tomato_raw', NULL, 'Tomato, raw', 'Vegetables', 'unspecified', 18, 0.9, 3.9, 0.2, 1.2, 5, 'g', 123, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tomato_raw_s0', 'lib_tomato_raw', '1 medium (123 g)', 123, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tomato_raw_s1', 'lib_tomato_raw', '1 cup chopped (180 g)', 180, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tomato_raw_s2', 'lib_tomato_raw', '1 slice (20 g)', 20, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cherry_tomatoes', NULL, 'Cherry tomatoes', 'Vegetables', 'unspecified', 18, 0.9, 3.9, 0.2, 1.2, 5, 'g', 17, 1, 'cherry tomato', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cherry_tomatoes_s0', 'lib_cherry_tomatoes', '1 cherry tomato (17 g)', 17, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cherry_tomatoes_s1', 'lib_cherry_tomatoes', '1 cup (149 g)', 149, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cucumber_with_peel', NULL, 'Cucumber, with peel', 'Vegetables', 'unspecified', 15, 0.7, 3.6, 0.1, 0.5, 2, 'g', 201, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cucumber_with_peel_s0', 'lib_cucumber_with_peel', '1 medium (201 g)', 201, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cucumber_with_peel_s1', 'lib_cucumber_with_peel', '1/2 cup sliced (52 g)', 52, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cucumber_with_peel_s2', 'lib_cucumber_with_peel', '1 small Persian (100 g)', 100, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_bell_pepper_red', NULL, 'Bell pepper, red', 'Vegetables', 'unspecified', 31, 1, 6, 0.3, 2.1, 4, 'g', 119, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_bell_pepper_red_s0', 'lib_bell_pepper_red', '1 medium (119 g)', 119, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_bell_pepper_red_s1', 'lib_bell_pepper_red', '1 cup chopped (149 g)', 149, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_bell_pepper_green', NULL, 'Bell pepper, green', 'Vegetables', 'unspecified', 20, 0.9, 4.6, 0.2, 1.7, 3, 'g', 119, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_bell_pepper_green_s0', 'lib_bell_pepper_green', '1 medium (119 g)', 119, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_onion_raw', NULL, 'Onion, raw', 'Vegetables', 'unspecified', 40, 1.1, 9.3, 0.1, 1.7, 4, 'g', 110, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_onion_raw_s0', 'lib_onion_raw', '1 medium (110 g)', 110, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_onion_raw_s1', 'lib_onion_raw', '1/2 cup chopped (80 g)', 80, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_onion_raw_s2', 'lib_onion_raw', '1 slice (14 g)', 14, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_onion_saute_ed_in_oil', NULL, 'Onion, sautéed in oil', 'Vegetables', 'unspecified', 132, 0.9, 7.9, 10.8, 1.5, 12, 'g', 87, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_onion_saute_ed_in_oil_s0', 'lib_onion_saute_ed_in_oil', '1/2 cup (87 g)', 87, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_garlic_raw', NULL, 'Garlic, raw', 'Vegetables', 'unspecified', 149, 6.4, 33.1, 0.5, 2.1, 17, 'g', 3, 1, 'clove', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_garlic_raw_s0', 'lib_garlic_raw', '1 clove (3 g)', 3, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_garlic_raw_s1', 'lib_garlic_raw', '1 tsp minced (3 g)', 3, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_carrot_raw', NULL, 'Carrot, raw', 'Vegetables', 'unspecified', 41, 0.9, 9.6, 0.2, 2.8, 69, 'g', 61, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_carrot_raw_s0', 'lib_carrot_raw', '1 medium (61 g)', 61, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_carrot_raw_s1', 'lib_carrot_raw', '1 cup chopped (128 g)', 128, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_carrot_raw_s2', 'lib_carrot_raw', '1 baby carrot (10 g)', 10, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_carrot_cooked', NULL, 'Carrot, cooked', 'Vegetables', 'unspecified', 35, 0.8, 8.2, 0.2, 3, 58, 'g', 156, 1, 'cup sliced', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_carrot_cooked_s0', 'lib_carrot_cooked', '1 cup sliced (156 g)', 156, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_potato_boiled_no_skin', NULL, 'Potato, boiled (no skin)', 'Vegetables', 'unspecified', 87, 1.9, 20.1, 0.1, 1.8, 4, 'g', 167, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_potato_boiled_no_skin_s0', 'lib_potato_boiled_no_skin', '1 medium (167 g)', 167, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_potato_boiled_no_skin_s1', 'lib_potato_boiled_no_skin', '1 cup diced (156 g)', 156, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_potato_baked_with_skin', NULL, 'Potato, baked (with skin)', 'Vegetables', 'unspecified', 93, 2.5, 21.2, 0.1, 2.2, 10, 'g', 173, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_potato_baked_with_skin_s0', 'lib_potato_baked_with_skin', '1 medium (173 g)', 173, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_potato_baked_with_skin_s1', 'lib_potato_baked_with_skin', '1 large (299 g)', 299, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_potato_raw', NULL, 'Potato, raw', 'Vegetables', 'unspecified', 77, 2, 17.5, 0.1, 2.2, 6, 'g', 213, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_potato_raw_s0', 'lib_potato_raw', '1 medium (213 g)', 213, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_french_fries_fast_food', NULL, 'French fries, fast-food', 'Vegetables', 'unspecified', 312, 3.4, 41.4, 15, 3.8, 210, 'g', 71, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_french_fries_fast_food_s0', 'lib_french_fries_fast_food', 'small (71 g)', 71, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_french_fries_fast_food_s1', 'lib_french_fries_fast_food', 'medium (117 g)', 117, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_french_fries_fast_food_s2', 'lib_french_fries_fast_food', 'large (154 g)', 154, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_sweet_potato_baked_with_skin', NULL, 'Sweet potato, baked (with skin)', 'Vegetables', 'unspecified', 90, 2, 20.7, 0.2, 3.3, 36, 'g', 114, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sweet_potato_baked_with_skin_s0', 'lib_sweet_potato_baked_with_skin', '1 medium (114 g)', 114, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sweet_potato_baked_with_skin_s1', 'lib_sweet_potato_baked_with_skin', '1 cup cubed (200 g)', 200, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_corn_sweet_cooked', NULL, 'Corn, sweet, cooked', 'Vegetables', 'unspecified', 96, 3.4, 21, 1.5, 2.4, 1, 'g', 103, 1, 'ear', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_corn_sweet_cooked_s0', 'lib_corn_sweet_cooked', '1 ear (103 g)', 103, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_corn_sweet_cooked_s1', 'lib_corn_sweet_cooked', '1 cup kernels (164 g)', 164, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_zucchini_raw', NULL, 'Zucchini, raw', 'Vegetables', 'unspecified', 17, 1.2, 3.1, 0.3, 1, 8, 'g', 196, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_zucchini_raw_s0', 'lib_zucchini_raw', '1 medium (196 g)', 196, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_zucchini_raw_s1', 'lib_zucchini_raw', '1 cup sliced (113 g)', 113, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_zucchini_cooked', NULL, 'Zucchini, cooked', 'Vegetables', 'unspecified', 15, 1.1, 2.7, 0.4, 1, 3, 'g', 180, 1, 'cup sliced', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_zucchini_cooked_s0', 'lib_zucchini_cooked', '1 cup sliced (180 g)', 180, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_eggplant_grilled', NULL, 'Eggplant, grilled', 'Vegetables', 'unspecified', 35, 0.8, 8.7, 0.2, 2.5, 1, 'g', 99, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_eggplant_grilled_s0', 'lib_eggplant_grilled', '1 cup (99 g)', 99, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_eggplant_fried', NULL, 'Eggplant, fried', 'Vegetables', 'unspecified', 132, 1, 8, 11, 2.5, 5, 'g', 40, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_eggplant_fried_s0', 'lib_eggplant_fried', '1 slice (40 g)', 40, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_baba_ghanoush_mutabbal', NULL, 'Baba ghanoush / mutabbal', 'Vegetables', 'unspecified', 150, 3.5, 9, 11.5, 3.5, 320, 'g', 30, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_baba_ghanoush_mutabbal_s0', 'lib_baba_ghanoush_mutabbal', '2 tbsp (30 g)', 30, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_baba_ghanoush_mutabbal_s1', 'lib_baba_ghanoush_mutabbal', '1/4 cup (60 g)', 60, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cauliflower_raw', NULL, 'Cauliflower, raw', 'Vegetables', 'unspecified', 25, 1.9, 5, 0.3, 2, 30, 'g', 107, 1, 'cup chopped', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cauliflower_raw_s0', 'lib_cauliflower_raw', '1 cup chopped (107 g)', 107, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cauliflower_fried', NULL, 'Cauliflower, fried', 'Vegetables', 'unspecified', 180, 3, 9, 15, 2.5, 60, 'g', 120, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cauliflower_fried_s0', 'lib_cauliflower_fried', '1 cup (120 g)', 120, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cabbage_raw', NULL, 'Cabbage, raw', 'Vegetables', 'unspecified', 25, 1.3, 5.8, 0.1, 2.5, 18, 'g', 89, 1, 'cup shredded', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cabbage_raw_s0', 'lib_cabbage_raw', '1 cup shredded (89 g)', 89, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mushrooms_white_raw', NULL, 'Mushrooms, white, raw', 'Vegetables', 'unspecified', 22, 3.1, 3.3, 0.3, 1, 5, 'g', 70, 1, 'cup sliced', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mushrooms_white_raw_s0', 'lib_mushrooms_white_raw', '1 cup sliced (70 g)', 70, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mushrooms_white_raw_s1', 'lib_mushrooms_white_raw', '1 mushroom (18 g)', 18, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mushrooms_saute_ed', NULL, 'Mushrooms, sautéed', 'Vegetables', 'unspecified', 55, 3.6, 4.1, 3.4, 1.8, 10, 'g', 108, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mushrooms_saute_ed_s0', 'lib_mushrooms_saute_ed', '1 cup (108 g)', 108, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_green_beans_cooked', NULL, 'Green beans, cooked', 'Vegetables', 'unspecified', 35, 1.9, 7.9, 0.3, 3.2, 1, 'g', 125, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_green_beans_cooked_s0', 'lib_green_beans_cooked', '1 cup (125 g)', 125, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_asparagus_cooked', NULL, 'Asparagus, cooked', 'Vegetables', 'unspecified', 22, 2.4, 4.1, 0.2, 2, 14, 'g', 75, 1, 'spears', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_asparagus_cooked_s0', 'lib_asparagus_cooked', '5 spears (75 g)', 75, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_asparagus_cooked_s1', 'lib_asparagus_cooked', '1 cup (180 g)', 180, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_avocado', NULL, 'Avocado', 'Fruits', 'unspecified', 160, 2, 8.5, 14.7, 6.7, 7, 'g', 68, 1, 'avocado', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_avocado_s0', 'lib_avocado', '1/2 avocado (68 g)', 68, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_avocado_s1', 'lib_avocado', '1 whole (136 g)', 136, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_avocado_s2', 'lib_avocado', '1 tbsp mashed (14 g)', 14, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_olives_green', NULL, 'Olives, green', 'Vegetables', 'unspecified', 145, 1, 3.8, 15.3, 3.3, 1556, 'g', 20, 1, 'olives', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_olives_green_s0', 'lib_olives_green', '5 olives (20 g)', 20, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_olives_green_s1', 'lib_olives_green', '1 olive (4 g)', 4, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_olives_black', NULL, 'Olives, black', 'Vegetables', 'unspecified', 115, 0.8, 6.3, 10.7, 3.2, 735, 'g', 17, 1, 'olives', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_olives_black_s0', 'lib_olives_black', '5 olives (17 g)', 17, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pickles_dill', NULL, 'Pickles, dill', 'Vegetables', 'unspecified', 11, 0.3, 2.3, 0.2, 1, 1208, 'g', 35, 1, 'spear', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pickles_dill_s0', 'lib_pickles_dill', '1 spear (35 g)', 35, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pickles_dill_s1', 'lib_pickles_dill', '1 slice (6 g)', 6, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_parsley_fresh', NULL, 'Parsley, fresh', 'Vegetables', 'unspecified', 36, 3, 6.3, 0.8, 3.3, 56, 'g', 4, 1, 'tbsp chopped', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_parsley_fresh_s0', 'lib_parsley_fresh', '1 tbsp chopped (4 g)', 4, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_parsley_fresh_s1', 'lib_parsley_fresh', '1 cup chopped (60 g)', 60, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tabbouleh', NULL, 'Tabbouleh', 'Vegetables', 'unspecified', 90, 2, 10, 5, 2.5, 230, 'g', 80, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tabbouleh_s0', 'lib_tabbouleh', '1/2 cup (80 g)', 80, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tabbouleh_s1', 'lib_tabbouleh', '1 cup (160 g)', 160, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_fattoush_with_dressing', NULL, 'Fattoush (with dressing)', 'Vegetables', 'unspecified', 95, 2, 10, 5.5, 2, 260, 'g', 120, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_fattoush_with_dressing_s0', 'lib_fattoush_with_dressing', '1 cup (120 g)', 120, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_fattoush_with_dressing_s1', 'lib_fattoush_with_dressing', '1 bowl (250 g)', 250, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_arabic_salad_tomato_cucumber_lemon_oil', NULL, 'Arabic salad (tomato, cucumber, lemon, oil)', 'Vegetables', 'unspecified', 55, 1, 5, 3.5, 1.5, 150, 'g', 130, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_arabic_salad_tomato_cucumber_lemon_oil_s0', 'lib_arabic_salad_tomato_cucumber_lemon_oil', '1 cup (130 g)', 130, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tomato_paste', NULL, 'Tomato paste', 'Vegetables', 'unspecified', 82, 4.3, 18.9, 0.5, 4.1, 59, 'g', 16, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tomato_paste_s0', 'lib_tomato_paste', '1 tbsp (16 g)', 16, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tomato_sauce_canned', NULL, 'Tomato sauce, canned', 'Vegetables', 'unspecified', 24, 1.2, 5.3, 0.3, 1.5, 474, 'g', 122, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tomato_sauce_canned_s0', 'lib_tomato_sauce_canned', '1/2 cup (122 g)', 122, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_vegetable_soup', NULL, 'Vegetable soup', 'Vegetables', 'unspecified', 40, 1.5, 7, 1, 1.5, 420, 'g', 250, 1, 'bowl', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_vegetable_soup_s0', 'lib_vegetable_soup', '1 bowl (250 g)', 250, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_banana', NULL, 'Banana', 'Fruits', 'unspecified', 89, 1.1, 22.8, 0.3, 2.6, 1, 'g', 118, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_banana_s0', 'lib_banana', '1 medium (118 g)', 118, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_banana_s1', 'lib_banana', '1 small (101 g)', 101, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_banana_s2', 'lib_banana', '1 large (136 g)', 136, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_apple_with_skin', NULL, 'Apple, with skin', 'Fruits', 'unspecified', 52, 0.3, 13.8, 0.2, 2.4, 1, 'g', 182, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_apple_with_skin_s0', 'lib_apple_with_skin', '1 medium (182 g)', 182, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_apple_with_skin_s1', 'lib_apple_with_skin', '1 small (149 g)', 149, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_apple_with_skin_s2', 'lib_apple_with_skin', '1 cup sliced (109 g)', 109, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_orange', NULL, 'Orange', 'Fruits', 'unspecified', 47, 0.9, 11.8, 0.1, 2.4, 0, 'g', 131, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_orange_s0', 'lib_orange', '1 medium (131 g)', 131, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_orange_s1', 'lib_orange', '1 large (184 g)', 184, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mandarin_clementine', NULL, 'Mandarin / clementine', 'Fruits', 'unspecified', 53, 0.8, 13.3, 0.3, 1.8, 2, 'g', 74, 1, 'fruit', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mandarin_clementine_s0', 'lib_mandarin_clementine', '1 fruit (74 g)', 74, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_grapes', NULL, 'Grapes', 'Fruits', 'unspecified', 69, 0.7, 18.1, 0.2, 0.9, 2, 'g', 151, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_grapes_s0', 'lib_grapes', '1 cup (151 g)', 151, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_grapes_s1', 'lib_grapes', '10 grapes (49 g)', 49, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_strawberries', NULL, 'Strawberries', 'Fruits', 'unspecified', 32, 0.7, 7.7, 0.3, 2, 1, 'g', 152, 1, 'cup halves', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_strawberries_s0', 'lib_strawberries', '1 cup halves (152 g)', 152, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_strawberries_s1', 'lib_strawberries', '1 large berry (18 g)', 18, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_blueberries', NULL, 'Blueberries', 'Fruits', 'unspecified', 57, 0.7, 14.5, 0.3, 2.4, 1, 'g', 148, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_blueberries_s0', 'lib_blueberries', '1 cup (148 g)', 148, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_blueberries_s1', 'lib_blueberries', '1/2 cup (74 g)', 74, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_raspberries', NULL, 'Raspberries', 'Fruits', 'unspecified', 52, 1.2, 11.9, 0.7, 6.5, 1, 'g', 123, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_raspberries_s0', 'lib_raspberries', '1 cup (123 g)', 123, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_watermelon', NULL, 'Watermelon', 'Fruits', 'unspecified', 30, 0.6, 7.6, 0.2, 0.4, 1, 'g', 152, 1, 'cup diced', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_watermelon_s0', 'lib_watermelon', '1 cup diced (152 g)', 152, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_watermelon_s1', 'lib_watermelon', '1 wedge (286 g)', 286, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cantaloupe', NULL, 'Cantaloupe', 'Fruits', 'unspecified', 34, 0.8, 8.2, 0.2, 0.9, 16, 'g', 156, 1, 'cup diced', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cantaloupe_s0', 'lib_cantaloupe', '1 cup diced (156 g)', 156, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mango', NULL, 'Mango', 'Fruits', 'unspecified', 60, 0.8, 15, 0.4, 1.6, 1, 'g', 165, 1, 'cup pieces', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mango_s0', 'lib_mango', '1 cup pieces (165 g)', 165, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mango_s1', 'lib_mango', '1 whole (336 g)', 336, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pineapple', NULL, 'Pineapple', 'Fruits', 'unspecified', 50, 0.5, 13.1, 0.1, 1.4, 1, 'g', 165, 1, 'cup chunks', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pineapple_s0', 'lib_pineapple', '1 cup chunks (165 g)', 165, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pineapple_s1', 'lib_pineapple', '1 slice (84 g)', 84, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_peach', NULL, 'Peach', 'Fruits', 'unspecified', 39, 0.9, 9.5, 0.3, 1.5, 0, 'g', 150, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_peach_s0', 'lib_peach', '1 medium (150 g)', 150, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pear', NULL, 'Pear', 'Fruits', 'unspecified', 57, 0.4, 15.2, 0.1, 3.1, 1, 'g', 178, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pear_s0', 'lib_pear', '1 medium (178 g)', 178, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_kiwi', NULL, 'Kiwi', 'Fruits', 'unspecified', 61, 1.1, 14.7, 0.5, 3, 3, 'g', 69, 1, 'fruit', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_kiwi_s0', 'lib_kiwi', '1 fruit (69 g)', 69, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pomegranate_arils', NULL, 'Pomegranate arils', 'Fruits', 'unspecified', 83, 1.7, 18.7, 1.2, 4, 3, 'g', 87, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pomegranate_arils_s0', 'lib_pomegranate_arils', '1/2 cup (87 g)', 87, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pomegranate_arils_s1', 'lib_pomegranate_arils', '1 whole fruit arils (282 g)', 282, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_dates_medjool', NULL, 'Dates, Medjool', 'Fruits', 'unspecified', 277, 1.8, 75, 0.2, 6.7, 1, 'g', 24, 1, 'date', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_dates_medjool_s0', 'lib_dates_medjool', '1 date (24 g)', 24, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_dates_medjool_s1', 'lib_dates_medjool', '3 dates (72 g)', 72, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_dates_deglet_noor', NULL, 'Dates, Deglet Noor', 'Fruits', 'unspecified', 282, 2.5, 75, 0.4, 8, 2, 'g', 7, 1, 'date', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_dates_deglet_noor_s0', 'lib_dates_deglet_noor', '1 date (7 g)', 7, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_dates_deglet_noor_s1', 'lib_dates_deglet_noor', '5 dates (35 g)', 35, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_figs_fresh', NULL, 'Figs, fresh', 'Fruits', 'unspecified', 74, 0.8, 19.2, 0.3, 2.9, 1, 'g', 50, 1, 'serving', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_figs_fresh_s0', 'lib_figs_fresh', '1 medium (50 g)', 50, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_figs_dried', NULL, 'Figs, dried', 'Fruits', 'unspecified', 249, 3.3, 63.9, 0.9, 9.8, 10, 'g', 8, 1, 'fig', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_figs_dried_s0', 'lib_figs_dried', '1 fig (8 g)', 8, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_raisins', NULL, 'Raisins', 'Fruits', 'unspecified', 299, 3.1, 79.2, 0.5, 3.7, 11, 'g', 43, 1, 'box', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_raisins_s0', 'lib_raisins', '1 small box (43 g)', 43, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_raisins_s1', 'lib_raisins', '1 tbsp (9 g)', 9, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_apricots_dried', NULL, 'Apricots, dried', 'Fruits', 'unspecified', 241, 3.4, 62.6, 0.5, 7.3, 10, 'g', 3.5, 1, 'half', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_apricots_dried_s0', 'lib_apricots_dried', '1 half (3.5 g)', 3.5, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_apricots_dried_s1', 'lib_apricots_dried', '1/4 cup (33 g)', 33, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cherries_sweet', NULL, 'Cherries, sweet', 'Fruits', 'unspecified', 63, 1.1, 16, 0.2, 2.1, 0, 'g', 154, 1, 'cup pitted', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cherries_sweet_s0', 'lib_cherries_sweet', '1 cup pitted (154 g)', 154, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cherries_sweet_s1', 'lib_cherries_sweet', '1 cherry (8 g)', 8, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_lemon_juice', NULL, 'Lemon juice', 'Fruits', 'unspecified', 22, 0.4, 6.9, 0.2, 0.3, 1, 'g', 15, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lemon_juice_s0', 'lib_lemon_juice', '1 tbsp (15 g)', 15, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lemon_juice_s1', 'lib_lemon_juice', 'juice of 1 lemon (48 g)', 48, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_orange_juice', NULL, 'Orange juice', 'Drinks', 'unspecified', 45, 0.7, 10.4, 0.2, 0.2, 1, 'g', 248, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_orange_juice_s0', 'lib_orange_juice', '1 cup (248 g)', 248, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_orange_juice_s1', 'lib_orange_juice', '1 glass 200 ml (206 g)', 206, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_apple_juice', NULL, 'Apple juice', 'Drinks', 'unspecified', 46, 0.1, 11.3, 0.1, 0.2, 4, 'g', 248, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_apple_juice_s0', 'lib_apple_juice', '1 cup (248 g)', 248, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_coconut_shredded_unsweetened', NULL, 'Coconut, shredded, unsweetened', 'Nuts & seeds', 'unspecified', 660, 6.9, 23.7, 64.5, 16.3, 37, 'g', 5, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_coconut_shredded_unsweetened_s0', 'lib_coconut_shredded_unsweetened', '1 tbsp (5 g)', 5, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_almonds', NULL, 'Almonds', 'Nuts & seeds', 'unspecified', 579, 21.2, 21.6, 49.9, 12.5, 1, 'g', 28, 1, 'oz ≈ 23 almonds', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_almonds_s0', 'lib_almonds', '1 oz ≈ 23 almonds (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_almonds_s1', 'lib_almonds', '1 almond (1.2 g)', 1.2, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_almonds_s2', 'lib_almonds', '1/4 cup (36 g)', 36, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_walnuts', NULL, 'Walnuts', 'Nuts & seeds', 'unspecified', 654, 15.2, 13.7, 65.2, 6.7, 2, 'g', 28, 1, 'oz ≈ 14 halves', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_walnuts_s0', 'lib_walnuts', '1 oz ≈ 14 halves (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_walnuts_s1', 'lib_walnuts', '1 half (2 g)', 2, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cashews', NULL, 'Cashews', 'Nuts & seeds', 'unspecified', 553, 18.2, 30.2, 43.9, 3.3, 12, 'g', 28, 1, 'oz ≈ 18 cashews', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cashews_s0', 'lib_cashews', '1 oz ≈ 18 cashews (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cashews_s1', 'lib_cashews', '1 cashew (1.6 g)', 1.6, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pistachios_shelled', NULL, 'Pistachios, shelled', 'Nuts & seeds', 'unspecified', 560, 20.2, 27.2, 45.3, 10.6, 1, 'g', 28, 1, 'oz ≈ 49 kernels', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pistachios_shelled_s0', 'lib_pistachios_shelled', '1 oz ≈ 49 kernels (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pistachios_shelled_s1', 'lib_pistachios_shelled', '1 kernel (0.6 g)', 0.6, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_peanuts_roasted', NULL, 'Peanuts, roasted', 'Nuts & seeds', 'unspecified', 585, 23.7, 21.5, 49.7, 8, 6, 'g', 28, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_peanuts_roasted_s0', 'lib_peanuts_roasted', '1 oz (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_peanuts_roasted_s1', 'lib_peanuts_roasted', '1/4 cup (37 g)', 37, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_hazelnuts', NULL, 'Hazelnuts', 'Nuts & seeds', 'unspecified', 628, 15, 16.7, 60.8, 9.7, 0, 'g', 28, 1, 'oz ≈ 21 nuts', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_hazelnuts_s0', 'lib_hazelnuts', '1 oz ≈ 21 nuts (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pecans', NULL, 'Pecans', 'Nuts & seeds', 'unspecified', 691, 9.2, 13.9, 72, 9.6, 0, 'g', 28, 1, 'oz ≈ 19 halves', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pecans_s0', 'lib_pecans', '1 oz ≈ 19 halves (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mixed_nuts_roasted', NULL, 'Mixed nuts, roasted', 'Nuts & seeds', 'unspecified', 607, 19.5, 21.1, 54.1, 7, 5, 'g', 28, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mixed_nuts_roasted_s0', 'lib_mixed_nuts_roasted', '1 oz (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mixed_nuts_roasted_s1', 'lib_mixed_nuts_roasted', '1 handful (30 g)', 30, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pine_nuts', NULL, 'Pine nuts', 'Nuts & seeds', 'unspecified', 673, 13.7, 13.1, 68.4, 3.7, 2, 'g', 8.5, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pine_nuts_s0', 'lib_pine_nuts', '1 tbsp (8.5 g)', 8.5, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chia_seeds', NULL, 'Chia seeds', 'Nuts & seeds', 'unspecified', 486, 16.5, 42.1, 30.7, 34.4, 16, 'g', 12, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chia_seeds_s0', 'lib_chia_seeds', '1 tbsp (12 g)', 12, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chia_seeds_s1', 'lib_chia_seeds', '1 oz (28 g)', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_flaxseed_ground', NULL, 'Flaxseed, ground', 'Nuts & seeds', 'unspecified', 534, 18.3, 28.9, 42.2, 27.3, 30, 'g', 7, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_flaxseed_ground_s0', 'lib_flaxseed_ground', '1 tbsp (7 g)', 7, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pumpkin_seeds_shelled', NULL, 'Pumpkin seeds, shelled', 'Nuts & seeds', 'unspecified', 559, 30.2, 10.7, 49.1, 6, 7, 'g', 28, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pumpkin_seeds_shelled_s0', 'lib_pumpkin_seeds_shelled', '1 oz (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pumpkin_seeds_shelled_s1', 'lib_pumpkin_seeds_shelled', '1 tbsp (8 g)', 8, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_sunflower_seeds_shelled', NULL, 'Sunflower seeds, shelled', 'Nuts & seeds', 'unspecified', 584, 20.8, 20, 51.5, 8.6, 9, 'g', 28, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sunflower_seeds_shelled_s0', 'lib_sunflower_seeds_shelled', '1 oz (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sunflower_seeds_shelled_s1', 'lib_sunflower_seeds_shelled', '1 tbsp (8 g)', 8, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_sesame_seeds', NULL, 'Sesame seeds', 'Nuts & seeds', 'unspecified', 573, 17.7, 23.4, 49.7, 11.8, 11, 'g', 9, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sesame_seeds_s0', 'lib_sesame_seeds', '1 tbsp (9 g)', 9, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tahini', NULL, 'Tahini', 'Nuts & seeds', 'unspecified', 595, 17, 21.2, 53.8, 9.3, 115, 'g', 15, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tahini_s0', 'lib_tahini', '1 tbsp (15 g)', 15, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tahini_s1', 'lib_tahini', '2 tbsp (30 g)', 30, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_almond_butter', NULL, 'Almond butter', 'Nuts & seeds', 'unspecified', 614, 21, 18.8, 55.5, 10.3, 7, 'g', 16, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_almond_butter_s0', 'lib_almond_butter', '1 tbsp (16 g)', 16, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_almond_butter_s1', 'lib_almond_butter', '2 tbsp (32 g)', 32, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_olive_oil', NULL, 'Olive oil', 'Fats & oils', 'unspecified', 884, 0, 0, 100, 0, 2, 'g', 13.5, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_olive_oil_s0', 'lib_olive_oil', '1 tbsp (13.5 g)', 13.5, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_olive_oil_s1', 'lib_olive_oil', '1 tsp (4.5 g)', 4.5, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_vegetable_sunflower_oil', NULL, 'Vegetable / sunflower oil', 'Fats & oils', 'unspecified', 884, 0, 0, 100, 0, 0, 'g', 13.6, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_vegetable_sunflower_oil_s0', 'lib_vegetable_sunflower_oil', '1 tbsp (13.6 g)', 13.6, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_vegetable_sunflower_oil_s1', 'lib_vegetable_sunflower_oil', '1 tsp (4.5 g)', 4.5, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_coconut_oil', NULL, 'Coconut oil', 'Fats & oils', 'unspecified', 892, 0, 0, 99.1, 0, 0, 'g', 13.6, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_coconut_oil_s0', 'lib_coconut_oil', '1 tbsp (13.6 g)', 13.6, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mayonnaise', NULL, 'Mayonnaise', 'Condiments', 'unspecified', 680, 1, 0.6, 75, 0, 635, 'g', 13.8, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mayonnaise_s0', 'lib_mayonnaise', '1 tbsp (13.8 g)', 13.8, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mayonnaise_light', NULL, 'Mayonnaise, light', 'Condiments', 'unspecified', 324, 0.4, 7.5, 33, 0, 740, 'g', 15, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mayonnaise_light_s0', 'lib_mayonnaise_light', '1 tbsp (15 g)', 15, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_ketchup', NULL, 'Ketchup', 'Condiments', 'unspecified', 101, 1, 27.4, 0.1, 0.3, 907, 'g', 17, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ketchup_s0', 'lib_ketchup', '1 tbsp (17 g)', 17, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ketchup_s1', 'lib_ketchup', '1 packet (9 g)', 9, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_mustard_yellow', NULL, 'Mustard, yellow', 'Condiments', 'unspecified', 60, 3.7, 5.8, 3.3, 3.3, 1135, 'g', 5, 1, 'tsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_mustard_yellow_s0', 'lib_mustard_yellow', '1 tsp (5 g)', 5, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_soy_sauce', NULL, 'Soy sauce', 'Condiments', 'unspecified', 53, 8.1, 4.9, 0.6, 0.8, 5493, 'g', 16, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_soy_sauce_s0', 'lib_soy_sauce', '1 tbsp (16 g)', 16, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_hot_sauce', NULL, 'Hot sauce', 'Condiments', 'unspecified', 11, 0.5, 1.8, 0.4, 0.3, 2643, 'g', 5, 1, 'tsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_hot_sauce_s0', 'lib_hot_sauce', '1 tsp (5 g)', 5, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_honey', NULL, 'Honey', 'Sweets', 'unspecified', 304, 0.3, 82.4, 0, 0.2, 4, 'g', 21, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_honey_s0', 'lib_honey', '1 tbsp (21 g)', 21, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_honey_s1', 'lib_honey', '1 tsp (7 g)', 7, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_sugar_white', NULL, 'Sugar, white', 'Sweets', 'unspecified', 387, 0, 100, 0, 0, 1, 'g', 4.2, 1, 'tsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sugar_white_s0', 'lib_sugar_white', '1 tsp (4.2 g)', 4.2, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sugar_white_s1', 'lib_sugar_white', '1 tbsp (12.5 g)', 12.5, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sugar_white_s2', 'lib_sugar_white', '1 cube (4 g)', 4, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_maple_syrup', NULL, 'Maple syrup', 'Sweets', 'unspecified', 260, 0, 67, 0.1, 0, 12, 'g', 20, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_maple_syrup_s0', 'lib_maple_syrup', '1 tbsp (20 g)', 20, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_jam_fruit_preserves', NULL, 'Jam / fruit preserves', 'Sweets', 'unspecified', 278, 0.4, 68.9, 0.1, 1.1, 32, 'g', 20, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_jam_fruit_preserves_s0', 'lib_jam_fruit_preserves', '1 tbsp (20 g)', 20, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chocolate_hazelnut_spread', NULL, 'Chocolate hazelnut spread', 'Sweets', 'unspecified', 539, 6.3, 57.5, 30.9, 3.4, 41, 'g', 18.5, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chocolate_hazelnut_spread_s0', 'lib_chocolate_hazelnut_spread', '1 tbsp (18.5 g)', 18.5, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chocolate_hazelnut_spread_s1', 'lib_chocolate_hazelnut_spread', '2 tbsp (37 g)', 37, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_halva_tahini', NULL, 'Halva (tahini)', 'Sweets', 'unspecified', 500, 12, 55, 27, 3, 50, 'g', 30, 1, 'piece', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_halva_tahini_s0', 'lib_halva_tahini', '1 piece (30 g)', 30, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_ranch_dressing', NULL, 'Ranch dressing', 'Condiments', 'unspecified', 430, 1.3, 7, 44.5, 0.4, 901, 'g', 30, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ranch_dressing_s0', 'lib_ranch_dressing', '2 tbsp (30 g)', 30, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_caesar_dressing', NULL, 'Caesar dressing', 'Condiments', 'unspecified', 452, 2.2, 5.3, 48, 0.4, 1120, 'g', 30, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_caesar_dressing_s0', 'lib_caesar_dressing', '2 tbsp (30 g)', 30, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_balsamic_vinegar', NULL, 'Balsamic vinegar', 'Condiments', 'unspecified', 88, 0.5, 17, 0, 0, 23, 'g', 16, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_balsamic_vinegar_s0', 'lib_balsamic_vinegar', '1 tbsp (16 g)', 16, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_garlic_sauce_toum', NULL, 'Garlic sauce (toum)', 'Condiments', 'unspecified', 570, 1, 6, 62, 0.5, 450, 'g', 15, 1, 'tbsp', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_garlic_sauce_toum_s0', 'lib_garlic_sauce_toum', '1 tbsp (15 g)', 15, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_dark_chocolate_70_85', NULL, 'Dark chocolate (70–85%)', 'Sweets', 'unspecified', 598, 7.8, 45.9, 42.6, 10.9, 20, 'g', 10, 1, 'square', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_dark_chocolate_70_85_s0', 'lib_dark_chocolate_70_85', '1 square (10 g)', 10, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_dark_chocolate_70_85_s1', 'lib_dark_chocolate_70_85', '1 oz (28 g)', 28, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_dark_chocolate_70_85_s2', 'lib_dark_chocolate_70_85', '1 bar (100 g)', 100, false, 2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_milk_chocolate', NULL, 'Milk chocolate', 'Sweets', 'unspecified', 535, 7.7, 59.4, 29.7, 3.4, 79, 'g', 43, 1, 'bar', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_milk_chocolate_s0', 'lib_milk_chocolate', '1 bar (43 g)', 43, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_milk_chocolate_s1', 'lib_milk_chocolate', '1 square (6 g)', 6, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_potato_chips', NULL, 'Potato chips', 'Snacks', 'unspecified', 536, 7, 52.9, 34.6, 4.4, 525, 'g', 28, 1, 'oz ≈ 15 chips', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_potato_chips_s0', 'lib_potato_chips', '1 oz ≈ 15 chips (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_potato_chips_s1', 'lib_potato_chips', '1 small bag (45 g)', 45, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_popcorn_air_popped', NULL, 'Popcorn, air-popped', 'Snacks', 'unspecified', 387, 12.9, 77.8, 4.5, 14.5, 8, 'g', 8, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_popcorn_air_popped_s0', 'lib_popcorn_air_popped', '1 cup (8 g)', 8, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_popcorn_air_popped_s1', 'lib_popcorn_air_popped', '3 cups (24 g)', 24, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_popcorn_microwave_butter', NULL, 'Popcorn, microwave butter', 'Snacks', 'unspecified', 535, 7.3, 56, 30, 10, 760, 'g', 11, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_popcorn_microwave_butter_s0', 'lib_popcorn_microwave_butter', '1 cup (11 g)', 11, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_popcorn_microwave_butter_s1', 'lib_popcorn_microwave_butter', '1 bag (87 g)', 87, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pretzels', NULL, 'Pretzels', 'Snacks', 'unspecified', 380, 10, 80, 2.6, 3, 1240, 'g', 28, 1, 'oz', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pretzels_s0', 'lib_pretzels', '1 oz (28 g)', 28, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_granola_bar', NULL, 'Granola bar', 'Snacks', 'unspecified', 471, 10, 64, 20, 5, 150, 'g', 35, 1, 'bar', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_granola_bar_s0', 'lib_granola_bar', '1 bar (35 g)', 35, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_protein_bar_generic', NULL, 'Protein bar (generic)', 'Snacks', 'unspecified', 380, 33, 38, 12, 8, 300, 'g', 60, 1, 'bar', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_protein_bar_generic_s0', 'lib_protein_bar_generic', '1 bar (60 g)', 60, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_ice_cream_vanilla', NULL, 'Ice cream, vanilla', 'Sweets', 'unspecified', 207, 3.5, 23.6, 11, 0.7, 80, 'g', 66, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ice_cream_vanilla_s0', 'lib_ice_cream_vanilla', '1/2 cup (66 g)', 66, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ice_cream_vanilla_s1', 'lib_ice_cream_vanilla', '1 scoop (72 g)', 72, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cookie_chocolate_chip', NULL, 'Cookie, chocolate chip', 'Sweets', 'unspecified', 488, 5.1, 65.3, 23.5, 2.4, 345, 'g', 16, 1, 'cookie', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cookie_chocolate_chip_s0', 'lib_cookie_chocolate_chip', '1 cookie (16 g)', 16, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cookie_chocolate_chip_s1', 'lib_cookie_chocolate_chip', '1 large cookie (40 g)', 40, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_donut_glazed', NULL, 'Donut, glazed', 'Sweets', 'unspecified', 452, 4.9, 51, 25, 1.7, 326, 'g', 60, 1, 'donut', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_donut_glazed_s0', 'lib_donut_glazed', '1 donut (60 g)', 60, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_muffin_blueberry', NULL, 'Muffin, blueberry', 'Sweets', 'unspecified', 377, 4.5, 54, 16, 1.5, 300, 'g', 113, 1, 'muffin', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_muffin_blueberry_s0', 'lib_muffin_blueberry', '1 muffin (113 g)', 113, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cake_chocolate_with_frosting', NULL, 'Cake, chocolate with frosting', 'Sweets', 'unspecified', 367, 4, 51, 16, 1.8, 299, 'g', 95, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cake_chocolate_with_frosting_s0', 'lib_cake_chocolate_with_frosting', '1 slice (95 g)', 95, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_croissant_chocolate', NULL, 'Croissant, chocolate', 'Sweets', 'unspecified', 420, 7, 46, 23, 2.5, 320, 'g', 70, 1, 'croissant', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_croissant_chocolate_s0', 'lib_croissant_chocolate', '1 croissant (70 g)', 70, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_baklava', NULL, 'Baklava', 'Sweets', 'unspecified', 430, 6, 44, 26, 2, 250, 'g', 40, 1, 'piece', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_baklava_s0', 'lib_baklava', '1 piece (40 g)', 40, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_kunafa', NULL, 'Kunafa', 'Sweets', 'unspecified', 360, 8, 42, 18, 1, 250, 'g', 120, 1, 'piece', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_kunafa_s0', 'lib_kunafa', '1 piece (120 g)', 120, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_ma_amoul_date_cookie', NULL, 'Ma''amoul (date cookie)', 'Sweets', 'unspecified', 420, 5, 60, 18, 2, 150, 'g', 35, 1, 'piece', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ma_amoul_date_cookie_s0', 'lib_ma_amoul_date_cookie', '1 piece (35 g)', 35, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_gummy_candy', NULL, 'Gummy candy', 'Sweets', 'unspecified', 330, 0, 80, 0, 0, 20, 'g', 3, 1, 'piece', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_gummy_candy_s0', 'lib_gummy_candy', '1 piece (3 g)', 3, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_gummy_candy_s1', 'lib_gummy_candy', '1 small bag (40 g)', 40, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pizza_cheese_regular_crust', NULL, 'Pizza, cheese (regular crust)', 'Fast food', 'unspecified', 266, 11.4, 33.3, 9.7, 2.3, 598, 'g', 107, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pizza_cheese_regular_crust_s0', 'lib_pizza_cheese_regular_crust', '1 slice (107 g)', 107, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_pizza_pepperoni', NULL, 'Pizza, pepperoni', 'Fast food', 'unspecified', 298, 12.9, 33.9, 12.3, 2.1, 740, 'g', 111, 1, 'slice', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_pizza_pepperoni_s0', 'lib_pizza_pepperoni', '1 slice (111 g)', 111, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cheeseburger_fast_food', NULL, 'Cheeseburger, fast-food', 'Fast food', 'unspecified', 263, 13, 26, 12, 1.3, 600, 'g', 115, 1, 'burger', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cheeseburger_fast_food_s0', 'lib_cheeseburger_fast_food', '1 burger (115 g)', 115, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chicken_shawarma_wrap', NULL, 'Chicken shawarma wrap', 'Fast food', 'unspecified', 230, 13, 24, 9, 1.5, 520, 'g', 220, 1, 'wrap', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chicken_shawarma_wrap_s0', 'lib_chicken_shawarma_wrap', '1 wrap (220 g)', 220, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_falafel_sandwich', NULL, 'Falafel sandwich', 'Fast food', 'unspecified', 260, 9, 34, 10, 4, 500, 'g', 200, 1, 'sandwich', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_falafel_sandwich_s0', 'lib_falafel_sandwich', '1 sandwich (200 g)', 200, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_manakish_za_atar', NULL, 'Manakish za''atar', 'Fast food', 'unspecified', 310, 8, 40, 13, 2.5, 500, 'g', 120, 1, 'piece', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_manakish_za_atar_s0', 'lib_manakish_za_atar', '1 piece (120 g)', 120, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cheese_manakish', NULL, 'Cheese manakish', 'Fast food', 'unspecified', 330, 13, 36, 15, 1.5, 600, 'g', 130, 1, 'piece', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cheese_manakish_s0', 'lib_cheese_manakish', '1 piece (130 g)', 130, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_chicken_nuggets', NULL, 'Chicken nuggets', 'Fast food', 'unspecified', 296, 15.5, 15.7, 19.3, 1, 557, 'g', 16, 1, 'nugget', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chicken_nuggets_s0', 'lib_chicken_nuggets', '1 nugget (16 g)', 16, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_chicken_nuggets_s1', 'lib_chicken_nuggets', '6 nuggets (96 g)', 96, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_sushi_roll_california', NULL, 'Sushi roll, California', 'Fast food', 'unspecified', 150, 4, 24, 4, 1.5, 300, 'g', 30, 1, 'piece', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sushi_roll_california_s0', 'lib_sushi_roll_california', '1 piece (30 g)', 30, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sushi_roll_california_s1', 'lib_sushi_roll_california', '1 roll 8 pcs (240 g)', 240, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_coffee_black', NULL, 'Coffee, black', 'Drinks', 'unspecified', 1, 0.1, 0, 0, 0, 2, 'g', 240, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_coffee_black_s0', 'lib_coffee_black', '1 cup (240 g)', 240, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_coffee_black_s1', 'lib_coffee_black', '1 espresso shot (30 g)', 30, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_tea_unsweetened', NULL, 'Tea, unsweetened', 'Drinks', 'unspecified', 1, 0, 0.3, 0, 0, 3, 'g', 240, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_tea_unsweetened_s0', 'lib_tea_unsweetened', '1 cup (240 g)', 240, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_latte_whole_milk', NULL, 'Latte, whole milk', 'Drinks', 'unspecified', 56, 3, 4.5, 2.9, 0, 40, 'g', 240, 1, '240 ml', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_latte_whole_milk_s0', 'lib_latte_whole_milk', 'small 240 ml (240 g)', 240, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_latte_whole_milk_s1', 'lib_latte_whole_milk', 'large 475 ml (475 g)', 475, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cappuccino_whole_milk', NULL, 'Cappuccino, whole milk', 'Drinks', 'unspecified', 40, 2.1, 3.2, 2.1, 0, 30, 'g', 180, 1, 'cup 180 ml', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cappuccino_whole_milk_s0', 'lib_cappuccino_whole_milk', '1 cup 180 ml (180 g)', 180, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_cola', NULL, 'Cola', 'Drinks', 'unspecified', 42, 0, 10.6, 0, 0, 4, 'g', 340, 1, 'can 330 ml', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cola_s0', 'lib_cola', '1 can 330 ml (340 g)', 340, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_cola_s1', 'lib_cola', '1 bottle 500 ml (515 g)', 515, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_diet_cola', NULL, 'Diet cola', 'Drinks', 'unspecified', 0, 0, 0, 0, 0, 10, 'g', 340, 1, 'can 330 ml', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_diet_cola_s0', 'lib_diet_cola', '1 can 330 ml (340 g)', 340, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_energy_drink', NULL, 'Energy drink', 'Drinks', 'unspecified', 45, 0, 11, 0, 0, 40, 'g', 250, 1, 'can 250 ml', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_energy_drink_s0', 'lib_energy_drink', '1 can 250 ml (250 g)', 250, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_sports_drink', NULL, 'Sports drink', 'Drinks', 'unspecified', 25, 0, 6, 0, 0, 40, 'g', 500, 1, 'bottle 500 ml', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_sports_drink_s0', 'lib_sports_drink', '1 bottle 500 ml (500 g)', 500, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_beer_regular', NULL, 'Beer, regular', 'Drinks', 'unspecified', 43, 0.5, 3.6, 0, 0, 4, 'g', 330, 1, 'can 330 ml', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beer_regular_s0', 'lib_beer_regular', '1 can 330 ml (330 g)', 330, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_beer_regular_s1', 'lib_beer_regular', '1 pint (568 g)', 568, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_wine_red', NULL, 'Wine, red', 'Drinks', 'unspecified', 85, 0.1, 2.6, 0, 0, 4, 'g', 147, 1, 'glass 150 ml', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_wine_red_s0', 'lib_wine_red', '1 glass 150 ml (147 g)', 147, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_lemonade', NULL, 'Lemonade', 'Drinks', 'unspecified', 40, 0, 10.5, 0, 0, 5, 'g', 248, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_lemonade_s0', 'lib_lemonade', '1 cup (248 g)', 248, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_smoothie_fruit_generic', NULL, 'Smoothie, fruit (generic)', 'Drinks', 'unspecified', 60, 1, 14, 0.3, 1, 10, 'g', 240, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_smoothie_fruit_generic_s0', 'lib_smoothie_fruit_generic', '1 cup (240 g)', 240, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_smoothie_fruit_generic_s1', 'lib_smoothie_fruit_generic', '1 bottle 350 ml (350 g)', 350, false, 1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_protein_shake_whey_water', NULL, 'Protein shake (whey + water)', 'Drinks', 'unspecified', 40, 8, 0.8, 0.5, 0, 30, 'g', 300, 1, 'shake 300 ml', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_protein_shake_whey_water_s0', 'lib_protein_shake_whey_water', '1 shake 300 ml (300 g)', 300, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_coconut_water', NULL, 'Coconut water', 'Drinks', 'unspecified', 19, 0.7, 3.7, 0.2, 1.1, 105, 'g', 240, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_coconut_water_s0', 'lib_coconut_water', '1 cup (240 g)', 240, true, 0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES ('lib_ayran', NULL, 'Ayran', 'Drinks', 'unspecified', 36, 1.7, 2.6, 2, 0, 300, 'g', 250, 1, 'cup', 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES ('lib_ayran_s0', 'lib_ayran', '1 cup (250 g)', 250, true, 0) ON CONFLICT ("id") DO NOTHING;
