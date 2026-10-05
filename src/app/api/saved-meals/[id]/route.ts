import { json, parseBody, withAuth } from "@/lib/api/route";
import { updateSavedMealInput } from "@/lib/validation";
import { getSavedMeal, updateSavedMeal, deleteSavedMeal } from "@/lib/services/saved-meals";

export const GET = withAuth<{ id: string }>(async (_req, user, { id }) => {
  const meal = await getSavedMeal(user.id, id);
  return json(meal);
});

export const PATCH = withAuth<{ id: string }>(async (req, user, { id }) => {
  const input = await parseBody(req, updateSavedMealInput);
  const updated = await updateSavedMeal(user.id, id, input);
  return json(updated);
});

export const PUT = PATCH;

export const DELETE = withAuth<{ id: string }>(async (_req, user, { id }) => {
  await deleteSavedMeal(user.id, id);
  return json({ success: true });
});
