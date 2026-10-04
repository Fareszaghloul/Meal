import { PrismaClient } from "@prisma/client";
import fs from "fs";

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync(".env")) {
  const envText = fs.readFileSync(".env", "utf8");
  const m = envText.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (m) dbUrl = m[1];
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  console.log("Connecting to persistent DB:", dbUrl?.replace(/:[^:@]+@/, ":***@"));

  const [
    users,
    userSettings,
    foods,
    recipes,
    recipeIngredients,
    foodLogs,
    waterLogs,
    weightEntries,
    mealTemplates,
    workoutRoutines,
  ] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, displayName: true, role: true } }),
    prisma.userSettings.findMany({ select: { userId: true, currentWeightKg: true, dailyCalories: true } }),
    prisma.food.count(),
    prisma.recipe.count(),
    prisma.recipeIngredient.count(),
    prisma.foodLogEntry.count(),
    prisma.waterLogEntry.count(),
    prisma.weightEntry.findMany({ select: { id: true, userId: true, date: true, weightKg: true, entryType: true } }),
    prisma.mealTemplate.count(),
    prisma.workoutRoutineEntry.count(),
  ]);

  console.log("\n--- PERSISTENT POSTGRES DATABASE SUMMARY ---");
  console.log("Users:", JSON.stringify(users));
  console.log("UserSettings:", JSON.stringify(userSettings));
  console.log("Food count:", foods);
  console.log("Recipe count:", recipes);
  console.log("RecipeIngredient count:", recipeIngredients);
  console.log("FoodLogEntry count:", foodLogs);
  console.log("WaterLogEntry count:", waterLogs);
  console.log("WeightEntry count:", weightEntries.length, JSON.stringify(weightEntries));
  console.log("MealTemplate count:", mealTemplates);
  console.log("WorkoutRoutineEntry count:", workoutRoutines);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
