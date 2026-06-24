import type { SupabaseClient } from "@supabase/supabase-js";
import { metadataPartidoGlobal } from "@/lib/chat/scopes";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import type { MomentoClave } from "@/lib/api-football/match-events";
import { formatMomentoMinuto } from "@/lib/api-football/match-events";
import { buildPenalFalladoNotifyMetadata } from "@/lib/api-football/penal-fallado-notify-state";
import { tryClaimLiveEvent } from "@/lib/api-football/push/claim-event";
import { queuePartidoPushNotifications } from "@/lib/api-football/push/notifications";
import { generarNarracionPenalFallado } from "@/lib/narracion/comentaristas";
import type { WebhookHandlerResult } from "@/types/api-football";

interface OnPenalFalladoContext {
  supabase: SupabaseClient;
  partidoId: string;
  momento: MomentoClave;
  localName: string;
  visitanteName: string;
  marcadorLocal: number;
  marcadorVisitante: number;
}

export async function handlePenalFalladoEvent(
  ctx: OnPenalFalladoContext,
): Promise<WebhookHandlerResult> {
  const { supabase, partidoId, momento, localName, visitanteName, marcadorLocal, marcadorVisitante } = ctx;
  const eventKey = `penal-fallado-${momento.id}`;

  const { data: partido, error: readError } = await supabase
    .from("partidos")
    .select("metadata")
    .eq("id", partidoId)
    .maybeSingle();

  if (readError) {
    return { ok: false, message: readError.message };
  }

  if (!(await tryClaimLiveEvent(supabase, partidoId, eventKey, "penal_fallado"))) {
    return { ok: true, message: "Penal fallado ya notificado (claim)" };
  }

  const minutoLabel = formatMomentoMinuto(momento.minuto, momento.extra);
  const narracion = generarNarracionPenalFallado({
    local: localName,
    visitante: visitanteName,
    penHome: marcadorLocal,
    penAway: marcadorVisitante,
    jugador: momento.jugador,
    equipo: momento.equipo,
  });

  const pushTitulo = minutoLabel
    ? `🎯 Penal fallado: ${momento.jugador} (${minutoLabel})`
    : `🎯 Penal fallado: ${momento.jugador}`;

  const { error: claimError } = await supabase
    .from("partidos")
    .update({
      metadata: buildPenalFalladoNotifyMetadata(partido?.metadata, [momento.id]),
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
      minuto: momento.minuto,
      jugador: momento.jugador,
      equipo: momento.equipo,
      tipo_evento: "penal_fallado",
      fuente: "api-sports-sync",
    }),
  });

  if (chatError) {
    return { ok: false, message: chatError.message };
  }

  await queuePartidoPushNotifications(
    supabase,
    partidoId,
    "penal_fallado",
    pushTitulo,
    narracion.texto,
    {
      event_key: eventKey,
      skip_claim: true,
      fuente: "api-sports-sync",
      jugador: momento.jugador,
      equipo: momento.equipo,
    },
  );

  return { ok: true, message: "Penal fallado procesado" };
}
