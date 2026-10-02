import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limiter";
import { unifiedFoodSearch } from "@/lib/nutrition/providers/unified-search";

export async function GET(
  request: Request,
  props: { params: Promise<{ barcode: string }> }
) {
  try {
    const rateLimitRes = enforceRateLimit(request, "API");
    if (rateLimitRes) return rateLimitRes;

    const user = await requireAuth(request);
    const { barcode } = await props.params;

    const cleanBarcode = barcode ? decodeURIComponent(barcode).trim() : "";
    if (!cleanBarcode) {
      return NextResponse.json({ error: "Barcode is required" }, { status: 400 });
    }

    const food = await unifiedFoodSearch.lookupBarcode(cleanBarcode, {
      userId: user.id,
    });

    if (!food) {
      return NextResponse.json(
        {
          found: false,
          barcode: cleanBarcode,
          message: "Product not found in local or external food databases.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      food,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/foods/barcode/[barcode] error:", error);
    return NextResponse.json(
      { error: "Failed to look up barcode" },
      { status: 500 }
    );
  }
}
