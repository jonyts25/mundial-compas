import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractScoreFromPayload,
  mapFixtureToPartidoUpdate,
} from "@/lib/api-football/map-fixture-to-partido";
import type { ApiFootballWebhookPayload, WebhookHandlerResult } from "@/types/api-football";

interface OnStatusContext {
  supabase: SupabaseClient;
  partidoId: string;
  payload: ApiFootballWebhookPayload;
}

export async function handleStatusEvent(
  ctx: OnStatusContext,
): Promise<WebhookHandlerResult> {
  const { supabase, partidoId, payload } = ctx;
  const mapped = mapFixtureToPartidoUpdate(payload);
  if (!mapped) {
    return { ok: false, message: "Fixture inválido en payload" };
  }

  const score = extractScoreFromPayload(payload);
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (mapped.estatus) update.estatus = mapped.estatus;
  if (score) {
    update.marcador_local = score.local;
    update.marcador_visitante = score.visitante;
  }
  if (payload.fixture?.status?.elapsed != null) {
    update.minuto_actual = payload.fixture.status.elapsed;
  }

  const { error } = await supabase.from("partidos").update(update).eq("id", partidoId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Estatus actualizado" };
}
