import type { SupabaseClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { generarFraseGol } from "@/lib/api-football/narradores/frases-gol";
import {
  extractScoreFromPayload,
  extractTeamNames,
} from "@/lib/api-football/map-fixture-to-partido";
import { queuePartidoPushNotifications } from "@/lib/apifootball/webhook/notifications";
import type { ApiFootballWebhookPayload, WebhookHandlerResult } from "@/types/api-football";

interface OnGoalContext {
  supabase: SupabaseClient;
  partidoId: string;
  payload: ApiFootballWebhookPayload;
}

/**
 * Actualiza marcador, inyecta mensaje de cronista (evento_partido) en todas las ligas
 * activas del partido vía chat de la liga global + notificaciones pendientes.
 */
export async function handleGoalEvent(
  ctx: OnGoalContext,
): Promise<WebhookHandlerResult> {
  const { supabase, partidoId, payload } = ctx;
  const score = extractScoreFromPayload(payload);
  if (!score) {
    return { ok: false, message: "Payload sin marcador válido" };
  }

  const teams = extractTeamNames(payload);
  const goleador =
    payload.goal?.player?.name ??
    payload.goal?.team?.name ??
    null;
  const minuto = payload.goal?.time?.elapsed ?? payload.fixture?.status?.elapsed ?? null;

  const { error: updateError } = await supabase
    .from("partidos")
    .update({
      marcador_local: score.local,
      marcador_visitante: score.visitante,
      minuto_actual: minuto,
      estatus: "en_vivo",
      updated_at: new Date().toISOString(),
    })
    .eq("id", partidoId);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  const frase = generarFraseGol({
    local: teams.local,
    visitante: teams.visitante,
    marcadorLocal: score.local,
    marcadorVisitante: score.visitante,
    minuto,
    goleador,
  });

  // MVP: mensaje en liga global; ligas privadas reciben el mismo evento vía fan-out futuro
  const { error: chatError } = await supabase.from("mensajes_chat").insert({
    partido_id: partidoId,
    liga_id: LIGA_GLOBAL_ID,
    tipo: "evento_partido",
    contenido: frase.contenido,
    metadata: {
      narrador: frase.narrador,
      narrador_display: frase.nombreVisible,
      marcador: `${score.local}-${score.visitante}`,
      minuto,
      goleador,
      fuente: "api-football-webhook",
    },
  });

  if (chatError) {
    return { ok: false, message: chatError.message };
  }

  await queuePartidoPushNotifications(
    supabase,
    partidoId,
    "gol",
    `⚽ Gol: ${teams.local} ${score.local}-${score.visitante} ${teams.visitante}`,
    frase.contenido,
    { narrador: frase.narrador, fuente: "api-football-webhook" },
  );

  return { ok: true, message: "Gol procesado" };
}
