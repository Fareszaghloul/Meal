import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { RecipeEditForm } from "@/components/recipes/RecipeEditForm";

export default async function RecipeEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?from=/recipes/${id}/edit`);

  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: user.id },
    include: {
      tags: { include: { tag: true } },
      ingredients: {
        include: { food: true },
        orderBy: { sortOrder: "asc" },
      },
      instructions: {
        orderBy: { stepNumber: "asc" },
      },
    },
  });

  if (!recipe) {
    notFound();
  }

  const formattedRecipe = {
    ...recipe,
    tags: recipe.tags.map((t) => t.tag.name),
  };

  return <RecipeEditForm recipe={formattedRecipe} />;
}
