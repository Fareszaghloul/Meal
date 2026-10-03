import { prisma } from "@/lib/db";
import { json, parseBody, withAuth } from "@/lib/api/route";
import { templateInput } from "@/lib/validation";
import { toTemplate } from "@/lib/services/templates";

export const GET = withAuth(async (_req, user) => {
  const rows = await prisma.mealTemplate.findMany({
    where: { userId: user.id },
    orderBy: [{ useCount: "desc" }, { updatedAt: "desc" }],
  });
  return json(rows.map(toTemplate));
});

export const POST = withAuth(async (req, user) => {
  const input = await parseBody(req, templateInput);
  const row = await prisma.mealTemplate.create({
    data: { userId: user.id, name: input.name, items: input.items },
  });
  return json(toTemplate(row), { status: 201 });
});
