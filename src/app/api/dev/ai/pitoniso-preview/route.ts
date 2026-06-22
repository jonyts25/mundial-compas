import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/ai/ai-config";
import { ollamaJson } from "@/lib/ai/ollama-client";
import type { PitonisoLabInput } from "@/lib/ai/pitoniso-lab-types";
import {
  buildPitonisoPreviewPrompt,
  isPitonisoLabPreviewResult,
  normalizePitonisoPreview,
} from "@/lib/ai/pitoniso-preview-prompt";
import { getAiLabUserOrNull } from "@/lib/ai/require-ai-lab";

export const runtime = "nodejs";
export const maxDuration = 90;

function parseInput(body: unknown): PitonisoLabInput | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const match = o.match;
  const signals = o.signals;
  if (!match || typeof match !== "object") return null;
  if (!signals || typeof signals !== "object") return null;
  const m = match as Record<string, unknown>;
  const s = signals as Record<string, unknown>;
  if (typeof m.home !== "string" || typeof m.away !== "string") return null;
  const contradictions = Array.isArray(s.contradictions)
    ? s.contradictions.filter((c): c is string => typeof c === "string")
    : undefined;
  return {
    match: {
      home: m.home,
      away: m.away,
      kickoff: typeof m.kickoff === "string" ? m.kickoff : undefined,
    },
    signals: {
      crowd: typeof s.crowd === "string" ? s.crowd : undefined,
      form: typeof s.form === "string" ? s.form : undefined,
      table: typeof s.table === "string" ? s.table : undefined,
      ranking: typeof s.ranking === "string" ? s.ranking : undefined,
      drawSignal: typeof s.drawSignal === "string" ? s.drawSignal : undefined,
      contradictions,
    },
  };
}

export async function POST(request: Request) {
  const user = await getAiLabUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const input = parseInput(body);
  if (!input) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const cfg = getAiConfig();
  const model = cfg.modelSpanish;

  const result = await ollamaJson({
    model,
    messages: [
      {
        role: "system",
        content:
          "Eres un asistente que solo responde JSON válido para explicar señales deportivas de quiniela. Nunca inventes datos.",
      },
      { role: "user", content: buildPitonisoPreviewPrompt(input) },
    ],
    validate: isPitonisoLabPreviewResult,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        ...(result.rawPreview ? { rawPreview: result.rawPreview } : {}),
      },
      { status: 502 },
    );
  }

  const preview = normalizePitonisoPreview(result.data);

  return NextResponse.json({
    ok: true,
    provider: "ollama_local" as const,
    model: result.model,
    ...preview,
  });
}
