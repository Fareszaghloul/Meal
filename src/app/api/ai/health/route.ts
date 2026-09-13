import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiProvider } from "@/lib/ai/provider";
import { requireAuth, AuthError } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });
    const defaultUrl = process.env.OLLAMA_BASE_URL || (process.env.VERCEL ? "https://ollama.1234567.website" : "http://localhost:11434");
    const baseUrl = settings?.ollamaUrl && settings.ollamaUrl !== "http://localhost:11434" ? settings.ollamaUrl : (settings?.ollamaUrl || defaultUrl);
    const health = await aiProvider.checkHealth(baseUrl);
    return NextResponse.json({
      ...health,
      baseUrl,
      configuredModel: settings?.ollamaModel || "qwen2.5:7b",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({
      isRunning: false,
      models: [],
      error: error instanceof Error ? error.message : "Health check failed",
    });
  }
}

