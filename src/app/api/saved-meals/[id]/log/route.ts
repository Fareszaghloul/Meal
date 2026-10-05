import { json, parseBody, withAuth } from "@/lib/api/route";
import { logSavedMealInput } from "@/lib/validation";
import { logSavedMeal } from "@/lib/services/saved-meals";

export const POST = withAuth<{ id: string }>(async (req, user, { id }) => {
  const { date, mealCategory, multiplier } = await parseBody(req, logSavedMealInput);
  const created = await logSavedMeal(user.id, id, { date, mealCategory, multiplier });
  return json(created, { status: 201 });
});
