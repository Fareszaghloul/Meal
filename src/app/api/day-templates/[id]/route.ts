import { json, parseBody, withAuth } from "@/lib/api/route";
import { updateDayTemplateInput } from "@/lib/validation";
import { getDayTemplate, updateDayTemplate, deleteDayTemplate } from "@/lib/services/day-templates";

export const GET = withAuth<{ id: string }>(async (_req, user, { id }) => {
  const template = await getDayTemplate(user.id, id);
  return json(template);
});

export const PATCH = withAuth<{ id: string }>(async (req, user, { id }) => {
  const input = await parseBody(req, updateDayTemplateInput);
  const updated = await updateDayTemplate(user.id, id, input);
  return json(updated);
});

export const PUT = PATCH;

export const DELETE = withAuth<{ id: string }>(async (_req, user, { id }) => {
  await deleteDayTemplate(user.id, id);
  return json({ success: true });
});
