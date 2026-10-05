import { json, parseBody, withAuth } from "@/lib/api/route";
import { applyDayTemplateInput } from "@/lib/validation";
import { applyDayTemplate } from "@/lib/services/day-templates";

export const POST = withAuth<{ id: string }>(async (req, user, { id }) => {
  const input = await parseBody(req, applyDayTemplateInput);
  const result = await applyDayTemplate(user.id, id, input);
  return json(result, { status: 200 });
});
