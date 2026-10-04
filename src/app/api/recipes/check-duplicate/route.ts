import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { checkDuplicateRecipe } from "@/lib/services/recipes";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") || "";
    const excludeId = searchParams.get("excludeId") || undefined;

    const result = await checkDuplicateRecipe(user.id, name, excludeId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to check duplicate" }, { status: 500 });
  }
}
