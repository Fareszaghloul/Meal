import { NextResponse } from "next/server";
import menuData from "@/data/mcdonalds-jordan-menu.json";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.trim();
    const query = searchParams.get("q")?.trim().toLowerCase();

    let items = menuData.items;

    if (category && category !== "All") {
      items = items.filter((item) => item.category.toLowerCase() === category.toLowerCase());
    }

    if (query) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.cleanName.toLowerCase().includes(query) ||
          item.brief.toLowerCase().includes(query) ||
          item.ingredients.some((ing: string) => ing.toLowerCase().includes(query))
      );
    }

    return NextResponse.json({
      source: menuData.source,
      sourceUrl: menuData.sourceUrl,
      lastScraped: menuData.lastScraped,
      categories: menuData.categories,
      totalItems: menuData.totalItems,
      filteredCount: items.length,
      items,
    });
  } catch (err: any) {
    console.error("GET /api/mcdonalds-jordan error:", err);
    return NextResponse.json({ error: "Failed to load McDonald's Jordan menu" }, { status: 500 });
  }
}
