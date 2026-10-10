import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding MealPrep database...");

  // 1. Initial Admin User
  const adminPasswordHash = await hash("AdminPassword123!");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mealprep.local" },
    update: {},
    create: {
      email: "admin@mealprep.local",
      displayName: "Administrator",
      passwordHash: adminPasswordHash,
      role: "admin",
      status: "active",
      settings: {
        create: {
          dailyCalories: 2300,
          dailyProtein: 180,
          dailyCarbs: 220,
          dailyFat: 70,
          defaultServings: 4,
          measurementSystem: "metric",
          theme: "system",
          ollamaUrl: "http://localhost:11434",
          ollamaModel: "qwen2.5:7b",
          screenshotMethod: "ocr_local",
        },
      },
    },
  });
  console.log(`Seeded admin user: ${adminUser.email}`);

  // 2. Initial Standard Test User
  const userPasswordHash = await hash("UserPassword123!");
  const standardUser = await prisma.user.upsert({
    where: { email: "user@mealprep.local" },
    update: {},
    create: {
      email: "user@mealprep.local",
      displayName: "Test User",
      passwordHash: userPasswordHash,
      role: "user",
      status: "active",
      settings: {
        create: {
          dailyCalories: 2000,
          dailyProtein: 150,
          dailyCarbs: 200,
          dailyFat: 65,
          defaultServings: 2,
          measurementSystem: "metric",
          theme: "system",
          ollamaUrl: "http://localhost:11434",
          ollamaModel: "qwen2.5:7b",
          screenshotMethod: "ocr_local",
        },
      },
    },
  });
  console.log(`Seeded standard user: ${standardUser.email}`);

  // 2. Standard Foods (Official USDA FoodData Central Foundation & SR Legacy)
  const foodsData = [
    {
      name: "Chicken Breast (Raw)",
      category: "Meat",
      rawOrCooked: "raw",
      caloriesPer100g: 120,
      proteinPer100g: 22.5,
      carbsPer100g: 0,
      fatPer100g: 2.6,
      fiberPer100g: 0,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Chicken Breast (Cooked)",
      category: "Meat",
      rawOrCooked: "cooked",
      caloriesPer100g: 165,
      proteinPer100g: 31.0,
      carbsPer100g: 0,
      fatPer100g: 3.6,
      fiberPer100g: 0,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "White Rice (Dry)",
      category: "Grains",
      rawOrCooked: "dry",
      caloriesPer100g: 365,
      proteinPer100g: 7.1,
      carbsPer100g: 80.0,
      fatPer100g: 0.7,
      fiberPer100g: 1.3,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "White Rice (Cooked)",
      category: "Grains",
      rawOrCooked: "cooked",
      caloriesPer100g: 130,
      proteinPer100g: 2.7,
      carbsPer100g: 28.2,
      fatPer100g: 0.3,
      fiberPer100g: 0.4,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Large Egg",
      category: "Dairy & Eggs",
      rawOrCooked: "raw",
      caloriesPer100g: 143,
      proteinPer100g: 12.6,
      carbsPer100g: 0.7,
      fatPer100g: 9.5,
      fiberPer100g: 0,
      defaultUnit: "piece",
      servingWeightGrams: 50,
    },
    {
      name: "Greek Yogurt (0% Fat)",
      category: "Dairy & Eggs",
      rawOrCooked: "cooked",
      caloriesPer100g: 59,
      proteinPer100g: 10.2,
      carbsPer100g: 3.6,
      fatPer100g: 0.4,
      fiberPer100g: 0,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Canned Tuna (in Water)",
      category: "Seafood",
      rawOrCooked: "cooked",
      caloriesPer100g: 116,
      proteinPer100g: 25.5,
      carbsPer100g: 0,
      fatPer100g: 0.8,
      fiberPer100g: 0,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Salmon (Atlantic, Raw)",
      category: "Seafood",
      rawOrCooked: "raw",
      caloriesPer100g: 208,
      proteinPer100g: 20.4,
      carbsPer100g: 0,
      fatPer100g: 13.4,
      fiberPer100g: 0,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Potato (Raw)",
      category: "Produce",
      rawOrCooked: "raw",
      caloriesPer100g: 77,
      proteinPer100g: 2.0,
      carbsPer100g: 17.5,
      fatPer100g: 0.1,
      fiberPer100g: 2.1,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Sweet Potato (Raw)",
      category: "Produce",
      rawOrCooked: "raw",
      caloriesPer100g: 86,
      proteinPer100g: 1.6,
      carbsPer100g: 20.1,
      fatPer100g: 0.1,
      fiberPer100g: 3.0,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Rolled Oats",
      category: "Grains",
      rawOrCooked: "dry",
      caloriesPer100g: 379,
      proteinPer100g: 13.2,
      carbsPer100g: 67.7,
      fatPer100g: 6.5,
      fiberPer100g: 10.1,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Whole Milk",
      category: "Dairy & Eggs",
      rawOrCooked: "unspecified",
      caloriesPer100g: 61,
      proteinPer100g: 3.2,
      carbsPer100g: 4.8,
      fatPer100g: 3.3,
      fiberPer100g: 0,
      defaultUnit: "ml",
      servingWeightGrams: 100,
    },
    {
      name: "Olive Oil",
      category: "Pantry",
      rawOrCooked: "unspecified",
      caloriesPer100g: 884,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 100,
      fiberPer100g: 0,
      defaultUnit: "tbsp",
      servingWeightGrams: 14,
    },
    {
      name: "Dry Pasta",
      category: "Grains",
      rawOrCooked: "dry",
      caloriesPer100g: 371,
      proteinPer100g: 13.0,
      carbsPer100g: 74.7,
      fatPer100g: 1.5,
      fiberPer100g: 3.2,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Lean Ground Beef (90/10)",
      category: "Meat",
      rawOrCooked: "raw",
      caloriesPer100g: 176,
      proteinPer100g: 20.0,
      carbsPer100g: 0,
      fatPer100g: 10.0,
      fiberPer100g: 0,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Whey Protein Powder",
      category: "Supplements",
      rawOrCooked: "unspecified",
      caloriesPer100g: 390,
      proteinPer100g: 80.0,
      carbsPer100g: 7.0,
      fatPer100g: 4.0,
      fiberPer100g: 1.0,
      defaultUnit: "scoop",
      servingWeightGrams: 30,
    },
    {
      name: "Parmesan Cheese",
      category: "Dairy & Eggs",
      rawOrCooked: "unspecified",
      caloriesPer100g: 431,
      proteinPer100g: 38.5,
      carbsPer100g: 4.1,
      fatPer100g: 28.6,
      fiberPer100g: 0,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
    {
      name: "Garlic",
      category: "Produce",
      rawOrCooked: "raw",
      caloriesPer100g: 149,
      proteinPer100g: 6.4,
      carbsPer100g: 33.1,
      fatPer100g: 0.5,
      fiberPer100g: 2.1,
      defaultUnit: "clove",
      servingWeightGrams: 3,
    },
    {
      name: "Broccoli",
      category: "Produce",
      rawOrCooked: "raw",
      caloriesPer100g: 34,
      proteinPer100g: 2.8,
      carbsPer100g: 6.6,
      fatPer100g: 0.4,
      fiberPer100g: 2.6,
      defaultUnit: "g",
      servingWeightGrams: 100,
    },
  ];

  const createdFoods = new Map();
  for (const food of foodsData) {
    const existing = await prisma.food.findFirst({
      where: { name: food.name, userId: null },
    });
    let record;
    if (existing) {
      record = await prisma.food.update({
        where: { id: existing.id },
        data: food,
      });
    } else {
      record = await prisma.food.create({
        data: { ...food, userId: null },
      });
    }
    createdFoods.set(food.name, record);
  }

  // 3. Tags
  const tagNames = ["high-protein", "meal-prep", "lunch", "dinner", "breakfast", "easy", "quick"];
  const createdTags = new Map();
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    createdTags.set(name, tag);
  }

  console.log("Seeding completed successfully (UserSettings, USDA standard foods, and Tags seeded without placeholder recipes/items)!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
