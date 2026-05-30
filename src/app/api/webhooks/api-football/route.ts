import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import {
  verifyApiFootballWebhook,
  verifyWebhookSecretHeader,
} from "@/lib/api-football/verify-webhook";
import { dispatchWebhookEvent } from "@/lib/api-football/handlers";
import type { ApiFootballWebhookPayload } from "@/types/api-football";

export const runtime = "nodejs";

function buildEventId(payload: ApiFootballWebhookPayload, rawBody: string): string {
  const fixtureId = payload.fixture?.id;
  const event = payload.event ?? payload.type ?? "event";
  const elapsed = payload.goal?.time?.elapsed ?? payload.fixture?.status?.elapsed ?? "";
  return `${fixtureId ?? "unknown"}-${event}-${elapsed}-${hashBody(rawBody)}`;
}

function hashBody(body: string): string {
  let h = 0;
  for (let i = 0; i < body.length; i++) {
    h = (Math.imul(31, h) + body.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

async function findPartidoByFixtureId(
  supabase: ReturnType<typeof createAdminClient>,
  fixtureId: number,
) {
  const { data, error } = await supabase
    .from("partidos")
    .select("id")
    .eq("api_football_fixture_id", fixtureId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function POST(request: Request) {
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Config error";
    console.error("[webhook] env:", message);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get(env.apiFootballWebhookSignatureHeader);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const validSignature = verifyApiFootballWebhook(
    rawBody,
    signature,
    env.apiFootballWebhookSecret,
  );
  const validBearer = verifyWebhookSecretHeader(
    bearer ?? null,
    env.apiFootballWebhookSecret,
  );

  if (!validSignature && !validBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ApiFootballWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ApiFootballWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fixtureId = payload.fixture?.id;
  if (!fixtureId) {
    return NextResponse.json({ error: "Missing fixture.id" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const eventoExternoId = buildEventId(payload, rawBody);
  const tipoEvento = String(payload.event ?? payload.type ?? "unknown");

  const { data: existing } = await supabase
    .from("webhook_eventos")
    .select("id, procesado")
    .eq("proveedor", "api-football")
    .eq("evento_externo_id", eventoExternoId)
    .maybeSingle();

  if (existing?.procesado) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const partido = await findPartidoByFixtureId(supabase, fixtureId);

  const { data: eventoRow, error: insertEventError } = await supabase
    .from("webhook_eventos")
    .upsert(
      {
        proveedor: "api-football",
        evento_externo_id: eventoExternoId,
        tipo_evento: tipoEvento,
        payload,
        partido_id: partido?.id ?? null,
        procesado: false,
      },
      { onConflict: "proveedor,evento_externo_id" },
    )
    .select("id")
    .single();

  if (insertEventError) {
    console.error("[webhook] insert evento:", insertEventError.message);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }

  if (!partido) {
    await supabase
      .from("webhook_eventos")
      .update({
        error: `Partido no encontrado para fixture ${fixtureId}`,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventoRow.id);

    return NextResponse.json(
      { ok: false, error: "Partido no registrado", fixtureId },
      { status: 404 },
    );
  }

  const result = await dispatchWebhookEvent(supabase, partido.id, payload);

  await supabase
    .from("webhook_eventos")
    .update({
      procesado: result.ok,
      error: result.ok ? null : result.message,
      processed_at: new Date().toISOString(),
      partido_id: partido.id,
    })
    .eq("id", eventoRow.id);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    skipped: result.skipped,
    message: result.message,
  });
}

export async function GET() {
  return NextResponse.json({ status: "api-football webhook ready" });
}
