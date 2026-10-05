import { json, parseBody, withAuth } from "@/lib/api/route";
import { dayTemplateInput } from "@/lib/validation";
import { listDayTemplates, createDayTemplate } from "@/lib/services/day-templates";

export const GET = withAuth(async (_req, user) => {
  const templates = await listDayTemplates(user.id);
  return json(templates);
});

export const POST = withAuth(async (req, user) => {
  const input = await parseBody(req, dayTemplateInput);
  const template = await createDayTemplate(user.id, input);
  return json(template, { status: 201 });
});
