import type { SupabaseClient } from "@supabase/supabase-js";
import { metadataPartidoGlobal } from "@/lib/chat/scopes";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { buildPenNotifyMetadata } from "@/lib/api-football/penalty-notify-state";
import { tryClaimLiveEvent } from "@/lib/api-football/push/claim-event";
import { queuePartidoPushNotifications } from "@/lib/api-football/push/notifications";
import { buildGoalPushTitle } from "@/lib/api-football/push/push-score";
import { generarNarracionPenalAnotado } from "@/lib/narracion/comentaristas";
import type { WebhookHandlerResult } from "@/types/api-football";

interface OnPenalAnotadoContext {
  supabase: SupabaseClient;
  partidoId: string;
  localName: string;
  visitanteName: string;
  penHome: number;
  penAway: number;
  goleador: string;
  equipo: string;
  eventKey: string;
}

export async function handlePenalAnotadoEvent(
  ctx: OnPenalAnotadoContext,
): Promise<WebhookHandlerResult> {
  const {
    supabase,
    partidoId,
    localName,
    visitanteName,
    penHome,
    penAway,
    goleador,
    equipo,
    eventKey,
  } = ctx;

  const { data: partido, error: readError } = await supabase
    .from("partidos")
    .select("metadata")
    .eq("id", partidoId)
    .maybeSingle();

  if (readError) {
    return { ok: false, message: readError.message };
  }

  if (!(await tryClaimLiveEvent(supabase, partidoId, eventKey, "penal_anotado"))) {
    return { ok: true, message: "Penal anotado ya notificado (claim)" };
  }

  const narracion = generarNarracionPenalAnotado({
    local: localName,
    visitante: visitanteName,
    penHome,
    penAway,
    goleador,
    equipo,
  });

  const pushTitulo = buildGoalPushTitle({
    localName,
    visitanteName,
    homeScore: penHome,
    awayScore: penAway,
    homePenaltyScore: penHome,
    awayPenaltyScore: penAway,
    period: "PEN",
  });

  const { error: claimError } = await supabase
    .from("partidos")
    .update({
      metadata: buildPenNotifyMetadata(partido?.metadata, penHome, penAway),
      updated_at: new Date().toISOString(),
    })
    .eq("id", partidoId);

  if (claimError) {
    return { ok: false, message: claimError.message };
  }

  const { error: chatError } = await supabase.from("mensajes_chat").insert({
    partido_id: partidoId,
    liga_id: LIGA_GLOBAL_ID,
    tipo: "evento_partido",
    contenido: narracion.texto,
    metadata: metadataPartidoGlobal({
      narrador_estilo: narracion.estilo,
      jugador: goleador,
      equipo,
      tipo_evento: "penal_anotado",
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
    narracion.texto,
    {
      event_key: eventKey,
      skip_claim: true,
      fuente: "api-sports-sync",
      jugador: goleador,
      equipo,
    },
  );

  return { ok: true, message: "Penal anotado procesado" };
}
