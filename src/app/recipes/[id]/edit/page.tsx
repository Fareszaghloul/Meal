import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RecipeEditForm } from "@/components/recipes/RecipeEditForm";

export default async function RecipeEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
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
