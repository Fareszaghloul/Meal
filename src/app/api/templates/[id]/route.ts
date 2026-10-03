import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, withAuth } from "@/lib/api/route";
import { templateInput, templateLogInput } from "@/lib/validation";
import { toTemplate } from "@/lib/services/templates";
import { createEntry } from "@/lib/services/food-log";

async function owned(userId: string, id: string) {
  const row = await prisma.mealTemplate.findFirst({ where: { id, userId } });
  if (!row) throw new HttpError(404, "Saved meal not found.", "not_found");
  return row;
}

export const PUT = withAuth<{ id: string }>(async (req, user, { id }) => {
  await owned(user.id, id);
  const input = await parseBody(req, templateInput);
  const row = await prisma.mealTemplate.update({ where: { id }, data: { name: input.name, items: input.items } });
  return json(toTemplate(row));
});

export const DELETE = withAuth<{ id: string }>(async (_req, user, { id }) => {
  await owned(user.id, id);
  await prisma.mealTemplate.delete({ where: { id } });
  return json({ success: true });
});

/** Log every item of the saved meal into a date + meal. */
export const POST = withAuth<{ id: string }>(async (req, user, { id }) => {
  const row = await owned(user.id, id);
  const { date, mealCategory } = await parseBody(req, templateLogInput);
  const items = toTemplate(row).items;
  const created = [];
  for (const item of items) {
    const { item: entry } = await createEntry(user.id, { ...item, date, mealCategory });
    created.push(entry);
  }
  await prisma.mealTemplate.update({ where: { id }, data: { useCount: { increment: 1 } } });
  return json(created, { status: 201 });
});
