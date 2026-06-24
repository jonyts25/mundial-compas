import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/ai/ai-config";
import { buildMatchSummaryInput } from "@/lib/ai/match-summary/build-match-summary-input";
import {
  formatFactMismatchError,
  scanMatchSummaryFactMismatch,
} from "@/lib/ai/match-summary/match-summary-fact-validator";
import { assembleMatchSummaryOutput } from "@/lib/ai/match-summary/match-summary-output-utils";
import {
  buildMatchSummaryPrompt,
  isMatchSummaryLlmOutput,
  isValidPersonaId,
  normalizeMatchSummaryLlmOutput,
  normalizeMatchSummaryOutput,
} from "@/lib/ai/match-summary/match-summary-prompt";
import { ollamaJson } from "@/lib/ai/ollama-client";
import { DEFAULT_NARRATOR_PERSONA_ID } from "@/lib/ai/sports-narrator-personas";
import { getAiLabUserOrNull } from "@/lib/ai/require-ai-lab";

export const runtime = "nodejs";
export const maxDuration = 90;

function parseBody(
  body: unknown,
): { partido_id: string; persona_id: typeof DEFAULT_NARRATOR_PERSONA_ID } | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (typeof o.partido_id !== "string" || !o.partido_id.trim()) return null;
  const persona_id = isValidPersonaId(o.persona_id)
    ? o.persona_id
    : DEFAULT_NARRATOR_PERSONA_ID;
  return { partido_id: o.partido_id.trim(), persona_id };
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

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const built = await buildMatchSummaryInput(parsed.partido_id, {
    persona_id: parsed.persona_id,
  });

  if (!built.ok) {
    const status =
      built.error === "PARTIDO_NOT_FOUND"
        ? 404
        : built.error === "MATCH_NOT_FINISHED" || built.error === "SCORE_UNAVAILABLE"
          ? 422
          : 500;
    return NextResponse.json({ ok: false, error: built.error }, { status });
  }

  const input = built.input;
  const cfg = getAiConfig();
  const model = cfg.modelSpanish;

  const result = await ollamaJson({
    model,
    messages: [
      {
        role: "system",
        content:
          "Eres un redactor deportivo ficticio para quiniela. Solo respondes JSON válido (match-summary-llm-v1). Nunca inventes estadísticas, VAR, sede, árbitro, eventos ni jugadores que no estén en el input. Los eventos del partido los escribe el sistema; no generes facts[] ni event_paragraphs. Nunca imites comentaristas reales.",
      },
      { role: "user", content: buildMatchSummaryPrompt(input) },
    ],
    validate: (value) =>
      isMatchSummaryLlmOutput(value, {
        partido_id: input.partido_id,
        persona_id: input.persona_id,
      }),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        input,
        ...(result.rawPreview ? { rawPreview: result.rawPreview } : {}),
      },
      { status: 502 },
    );
  }

  const llm_output = normalizeMatchSummaryLlmOutput(result.data);

  const factMismatches = scanMatchSummaryFactMismatch(llm_output, input);
  if (factMismatches.length > 0) {
    const partial = normalizeMatchSummaryOutput(
      assembleMatchSummaryOutput(llm_output, input),
    );
    return NextResponse.json(
      {
        ok: false,
        error: formatFactMismatchError(factMismatches),
        fact_mismatches: factMismatches,
        input,
        llm_output,
        match_summary_output: partial,
      },
      { status: 422 },
    );
  }

  const match_summary_output = normalizeMatchSummaryOutput(
    assembleMatchSummaryOutput(llm_output, input),
  );

  return NextResponse.json({
    ok: true,
    provider: "ollama_local" as const,
    model: result.model,
    input,
    llm_output,
    match_summary_output,
  });
}
