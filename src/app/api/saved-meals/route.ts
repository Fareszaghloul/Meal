import { json, parseBody, withAuth } from "@/lib/api/route";
import { savedMealInput } from "@/lib/validation";
import { listSavedMeals, createSavedMeal } from "@/lib/services/saved-meals";

export const GET = withAuth(async (_req, user) => {
  const meals = await listSavedMeals(user.id);
  return json(meals);
});

export const POST = withAuth(async (req, user) => {
  const input = await parseBody(req, savedMealInput);
  const meal = await createSavedMeal(user.id, input);
  return json(meal, { status: 201 });
});
