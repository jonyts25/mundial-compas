import { NextResponse } from "next/server";
import { ollamaHealth } from "@/lib/ai/ollama-client";
import { getAiLabUserOrNull } from "@/lib/ai/require-ai-lab";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAiLabUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const health = await ollamaHealth();

  if (!health.ok) {
    return NextResponse.json({
      ok: false,
      provider: "ollama_local",
      error: health.error ?? "OLLAMA_UNAVAILABLE",
    });
  }

  return NextResponse.json({
    ok: true,
    provider: "ollama_local",
    baseUrlReachable: health.baseUrlReachable,
    models: health.models ?? [],
  });
}
