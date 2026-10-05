import { json, withAuth } from "@/lib/api/route";
import { duplicateSavedMeal } from "@/lib/services/saved-meals";

export const POST = withAuth<{ id: string }>(async (_req, user, { id }) => {
  const meal = await duplicateSavedMeal(user.id, id);
  return json(meal, { status: 201 });
});
