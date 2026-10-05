import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import {
  listPantryItems,
  createPantryItem,
  updatePantryItem,
  deletePantryItem,
} from "@/lib/services/pantry";
import { pantryItemInput, pantryItemPatch } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const items = await listPantryItems(user.id);
    return NextResponse.json(items);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/pantry error:", error);
    return NextResponse.json({ error: "Failed to fetch pantry" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = pantryItemInput.parse(body);

    const item = await createPantryItem(user.id, parsed);
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }
    console.error("POST /api/pantry error:", error);
    return NextResponse.json({ error: error.message || "Failed to add pantry item" }, { status: error.status || 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const parsed = pantryItemPatch.parse(rest);
    const updated = await updatePantryItem(user.id, id, parsed);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }
    console.error("PUT /api/pantry error:", error);
    return NextResponse.json({ error: error.message || "Failed to update pantry item" }, { status: error.status || 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await deletePantryItem(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/pantry error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete pantry item" }, { status: error.status || 500 });
  }
}
