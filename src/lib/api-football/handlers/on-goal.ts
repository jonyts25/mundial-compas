import type { SupabaseClient } from "@supabase/supabase-js";
import { metadataPartidoGlobal } from "@/lib/chat/scopes";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { isOwnGoalFromDetail } from "@/lib/api-football/goal-event-detail";
import { generarFraseAutogol } from "@/lib/api-football/narradores/frases-autogol";
import { generarFraseGol } from "@/lib/api-football/narradores/frases-gol";
import {
  extractScoreFromPayload,
  extractTeamNames,
} from "@/lib/api-football/map-fixture-to-partido";
import {
  buildGolNotifyMetadata,
  goalScoreKey,
  isGoalAlreadyNotified,
} from "@/lib/api-football/goal-notify-state";
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

  const { data: partido, error: readError } = await supabase
    .from("partidos")
    .select("metadata")
    .eq("id", partidoId)
    .maybeSingle();

  if (readError) {
    return { ok: false, message: readError.message };
  }

  const marcadorKey = goalScoreKey(score.local, score.visitante);

  if (isGoalAlreadyNotified(partido?.metadata, score.local, score.visitante)) {
    return { ok: true, message: "Gol ya notificado" };
  }

  const { count: chatDupCount } = await supabase
    .from("mensajes_chat")
    .select("id", { count: "exact", head: true })
    .eq("partido_id", partidoId)
    .eq("tipo", "evento_partido")
    .contains("metadata", { marcador: marcadorKey });

  if (chatDupCount && chatDupCount > 0) {
    await supabase
      .from("partidos")
      .update({
        metadata: buildGolNotifyMetadata(partido?.metadata, score.local, score.visitante),
        updated_at: new Date().toISOString(),
      })
      .eq("id", partidoId);
    return { ok: true, message: "Gol ya notificado (chat)" };
  }

  const teams = extractTeamNames(payload);
  const goleador =
    payload.goal?.player?.name ??
    payload.goal?.team?.name ??
    null;
  const minuto = payload.goal?.time?.elapsed ?? payload.fixture?.status?.elapsed ?? null;
  const esAutogol = isOwnGoalFromDetail(payload.goal?.detail);
  const equipoPropio = payload.goal?.team?.name ?? null;

  const { error: claimError } = await supabase
    .from("partidos")
    .update({
      marcador_local: score.local,
      marcador_visitante: score.visitante,
      minuto_actual: minuto,
      estatus: "en_vivo",
      metadata: buildGolNotifyMetadata(partido?.metadata, score.local, score.visitante),
      updated_at: new Date().toISOString(),
    })
    .eq("id", partidoId);

  if (claimError) {
    return { ok: false, message: claimError.message };
  }

  const fraseParams = {
    local: teams.local,
    visitante: teams.visitante,
    marcadorLocal: score.local,
    marcadorVisitante: score.visitante,
    minuto,
    goleador,
    equipoPropio,
  };

  const frase = esAutogol
    ? generarFraseAutogol(fraseParams)
    : generarFraseGol(fraseParams);

  const pushTitulo = esAutogol
    ? `⚽ Autogol: ${teams.local} ${score.local}-${score.visitante} ${teams.visitante}`
    : `⚽ Gol: ${teams.local} ${score.local}-${score.visitante} ${teams.visitante}`;

  // MVP: mensaje en liga global; ligas privadas reciben el mismo evento vía fan-out futuro
  const { error: chatError } = await supabase.from("mensajes_chat").insert({
    partido_id: partidoId,
    liga_id: LIGA_GLOBAL_ID,
    tipo: "evento_partido",
    contenido: frase.contenido,
    metadata: metadataPartidoGlobal({
      narrador: frase.narrador,
      narrador_display: frase.nombreVisible,
      marcador: marcadorKey,
      minuto,
      goleador,
      es_autogol: esAutogol,
      ...(esAutogol && equipoPropio ? { equipo_autogol: equipoPropio } : {}),
      fuente: "api-sports-sync",
    }),
  });

  if (chatError) {
    return { ok: false, message: chatError.message };
  }

  await queuePartidoPushNotifications(
    supabase,
    partidoId,
    "gol",
    pushTitulo,
    frase.contenido,
    {
      narrador: frase.narrador,
      fuente: "api-sports-sync",
      ...(esAutogol ? { es_autogol: true } : {}),
    },
  );

  return { ok: true, message: "Gol procesado" };
}
