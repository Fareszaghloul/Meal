import { json, parseBody, withAuth } from "@/lib/api/route";
import { mealItemPatch } from "@/lib/validation";
import { deleteEntry, updateEntry } from "@/lib/services/food-log";

export const PUT = withAuth<{ id: string }>(async (req, user, { id }) => {
  const patch = await parseBody(req, mealItemPatch);
  return json(await updateEntry(user.id, id, patch));
});

export const DELETE = withAuth<{ id: string }>(async (_req, user, { id }) => {
  await deleteEntry(user.id, id);
  return json({ success: true });
});
