import { json, withAuth } from "@/lib/api/route";
import { duplicateDayTemplate } from "@/lib/services/day-templates";

export const POST = withAuth<{ id: string }>(async (_req, user, { id }) => {
  const template = await duplicateDayTemplate(user.id, id);
  return json(template, { status: 201 });
});
