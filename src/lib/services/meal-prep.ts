import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/route";
import { startOfWeek } from "@/lib/dates";
import { aggregateShoppingList, type NeededIngredient } from "@/lib/shopping/aggregator";

export interface PrepRecipeSummary {
  recipeId: string;
  name: string;
  imageUrl?: string | null;
  totalServings: number;
  containerCount: number;
  daysPlanned: string[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface PrepTaskDto {
  id: string;
  prepSessionId: string;
  label: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PrepSessionDto {
  id: string;
  weekStart: string;
  tasks: PrepTaskDto[];
}

export interface WeeklyMealPrepData {
  weekStart: string;
  recipes: PrepRecipeSummary[];
  totalContainers: number;
  totalEstimatedMinutes: number;
  aggregatedIngredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }>;
  prepSession: PrepSessionDto;
}

export async function getWeeklyMealPrepData(
  userId: string,
  weekStartDate?: string
): Promise<WeeklyMealPrepData> {
  const weekStart = weekStartDate ? startOfWeek(weekStartDate) : startOfWeek(new Date().toISOString().slice(0, 10));

  const mealPlan = await prisma.mealPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId,
        weekStartDate: weekStart,
      },
    },
    include: {
      meals: {
        include: {
          recipe: {
            include: {
              ingredients: {
                include: { food: true },
              },
            },
          },
        },
      },
    },
  });

  // Group meals by recipe
  const recipeMap = new Map<string, {
    recipeId: string;
    name: string;
    imageUrl?: string | null;
    totalServings: number;
    containerCount: number;
    daysPlanned: Set<string>;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    calPerServing: number;
    proPerServing: number;
    carbPerServing: number;
    fatPerServing: number;
  }>();

  const neededIngredients: NeededIngredient[] = [];

  if (mealPlan && mealPlan.meals) {
    for (const meal of mealPlan.meals) {
      if (!meal.recipe) continue;
      const r = meal.recipe;
      const servings = meal.servings;

      if (!recipeMap.has(r.id)) {
        recipeMap.set(r.id, {
          recipeId: r.id,
          name: r.name,
          imageUrl: r.imageUrl,
          totalServings: servings,
          containerCount: Math.max(1, Math.round(servings)),
          daysPlanned: new Set([meal.dayOfWeek]),
          prepTimeMinutes: r.prepTimeMinutes || 15,
          cookTimeMinutes: r.cookTimeMinutes || 30,
          calPerServing: r.caloriesPerServing,
          proPerServing: r.proteinPerServing,
          carbPerServing: r.carbsPerServing,
          fatPerServing: r.fatPerServing,
        });
      } else {
        const existing = recipeMap.get(r.id)!;
        existing.totalServings += servings;
        existing.containerCount += Math.max(1, Math.round(servings));
        existing.daysPlanned.add(meal.dayOfWeek);
      }

      // Ingredients scaling
      const recipeDefaultServings = Math.max(1, r.servings);
      const factor = servings / recipeDefaultServings;
      for (const ing of r.ingredients) {
        neededIngredients.push({
          foodId: ing.foodId,
          foodName: ing.food?.name,
          foodCategory: ing.food?.category,
          rawName: ing.rawName,
          quantity: ing.quantity * factor,
          unit: ing.unit,
        });
      }
    }
  }

  const recipes: PrepRecipeSummary[] = Array.from(recipeMap.values()).map((r) => ({
    recipeId: r.recipeId,
    name: r.name,
    imageUrl: r.imageUrl,
    totalServings: Math.round(r.totalServings * 10) / 10,
    containerCount: r.containerCount,
    daysPlanned: Array.from(r.daysPlanned),
    prepTimeMinutes: r.prepTimeMinutes,
    cookTimeMinutes: r.cookTimeMinutes,
    totalCalories: Math.round(r.calPerServing * r.totalServings),
    totalProtein: Math.round(r.proPerServing * r.totalServings * 10) / 10,
    totalCarbs: Math.round(r.carbPerServing * r.totalServings * 10) / 10,
    totalFat: Math.round(r.fatPerServing * r.totalServings * 10) / 10,
  }));

  const totalContainers = recipes.reduce((sum, r) => sum + r.containerCount, 0);
  const totalEstimatedMinutes = recipes.reduce(
    (sum, r) => sum + r.prepTimeMinutes + r.cookTimeMinutes,
    0
  );

  // Aggregated ingredients for the batch cooking
  const aggregatedIngredients = aggregateShoppingList(neededIngredients, [], false).map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
  }));

  // Find or create PrepSession for this week
  let session = await prisma.prepSession.findUnique({
    where: {
      userId_weekStart: {
        userId,
        weekStart,
      },
    },
    include: {
      tasks: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!session) {
    // Generate initial checklist tasks based on planned recipes
    const initialTasks: Array<{ label: string; sortOrder: number }> = [];
    let order = 0;

    for (const r of recipes) {
      initialTasks.push({
        label: `Prep & chop ingredients for ${r.name}`,
        sortOrder: order++,
      });
      initialTasks.push({
        label: `Cook ${r.name} (${r.totalServings} portions)`,
        sortOrder: order++,
      });
      initialTasks.push({
        label: `Portion ${r.name} into ${r.containerCount} containers & label`,
        sortOrder: order++,
      });
    }

    if (recipes.length > 0) {
      initialTasks.push({
        label: "Cool containers completely and store in fridge/freezer",
        sortOrder: order++,
      });
      initialTasks.push({
        label: "Wash pots, pans, cutting boards, and clean prep station",
        sortOrder: order++,
      });
    }

    session = await prisma.prepSession.create({
      data: {
        userId,
        weekStart,
        tasks: {
          create: initialTasks,
        },
      },
      include: {
        tasks: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  return {
    weekStart,
    recipes,
    totalContainers,
    totalEstimatedMinutes,
    aggregatedIngredients,
    prepSession: {
      id: session.id,
      weekStart: session.weekStart,
      tasks: session.tasks.map((t) => ({
        id: t.id,
        prepSessionId: t.prepSessionId,
        label: t.label,
        completed: t.completed,
        sortOrder: t.sortOrder,
        createdAt: t.createdAt.toISOString(),
      })),
    },
  };
}

export async function togglePrepTask(
  userId: string,
  taskId: string,
  completed?: boolean
): Promise<PrepTaskDto> {
  const task = await prisma.prepTask.findFirst({
    where: {
      id: taskId,
      prepSession: { userId },
    },
  });

  if (!task) throw new HttpError(404, "Task not found", "not_found");

  const nextState = completed !== undefined ? completed : !task.completed;
  const updated = await prisma.prepTask.update({
    where: { id: taskId },
    data: { completed: nextState },
  });

  return {
    id: updated.id,
    prepSessionId: updated.prepSessionId,
    label: updated.label,
    completed: updated.completed,
    sortOrder: updated.sortOrder,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function addPrepTask(
  userId: string,
  weekStart: string,
  label: string
): Promise<PrepTaskDto> {
  let session = await prisma.prepSession.findUnique({
    where: {
      userId_weekStart: {
        userId,
        weekStart,
      },
    },
  });

  if (!session) {
    session = await prisma.prepSession.create({
      data: { userId, weekStart },
    });
  }

  const maxOrder = await prisma.prepTask.findFirst({
    where: { prepSessionId: session.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prisma.prepTask.create({
    data: {
      prepSessionId: session.id,
      label: label.trim(),
      completed: false,
      sortOrder: (maxOrder?.sortOrder ?? 0) + 1,
    },
  });

  return {
    id: created.id,
    prepSessionId: created.prepSessionId,
    label: created.label,
    completed: created.completed,
    sortOrder: created.sortOrder,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function deletePrepTask(userId: string, taskId: string): Promise<void> {
  const task = await prisma.prepTask.findFirst({
    where: {
      id: taskId,
      prepSession: { userId },
    },
  });

  if (!task) throw new HttpError(404, "Task not found", "not_found");

  await prisma.prepTask.delete({ where: { id: taskId } });
}

export async function resetPrepSession(
  userId: string,
  weekStart: string
): Promise<WeeklyMealPrepData> {
  const session = await prisma.prepSession.findUnique({
    where: {
      userId_weekStart: {
        userId,
        weekStart,
      },
    },
  });

  if (session) {
    await prisma.prepTask.deleteMany({
      where: { prepSessionId: session.id },
    });
    await prisma.prepSession.delete({
      where: { id: session.id },
    });
  }

  return await getWeeklyMealPrepData(userId, weekStart);
}
