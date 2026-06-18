import type { SupabaseClient } from "@supabase/supabase-js";
import { metadataPartidoGlobal } from "@/lib/chat/scopes";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import type { MomentoClave } from "@/lib/api-football/match-events";
import { formatMomentoMinuto } from "@/lib/api-football/match-events";
import { tryClaimLiveEvent } from "@/lib/api-football/push/claim-event";
import { queuePartidoPushNotifications } from "@/lib/api-football/push/notifications";
import { buildRedCardNotifyMetadata } from "@/lib/api-football/red-card-notify-state";
import { generarNarracionRoja } from "@/lib/narracion/comentaristas";
import type { WebhookHandlerResult } from "@/types/api-football";

interface OnRedCardContext {
  supabase: SupabaseClient;
  partidoId: string;
  momento: MomentoClave;
}

export async function handleRedCardEvent(
  ctx: OnRedCardContext,
): Promise<WebhookHandlerResult> {
  const { supabase, partidoId, momento } = ctx;
  const eventKey = `roja-${momento.id}`;

  const { data: partido, error: readError } = await supabase
    .from("partidos")
    .select("metadata")
    .eq("id", partidoId)
    .maybeSingle();

  if (readError) {
    return { ok: false, message: readError.message };
  }

  if (!(await tryClaimLiveEvent(supabase, partidoId, eventKey, "tarjeta_roja"))) {
    return { ok: true, message: "Tarjeta roja ya notificada (claim)" };
  }

  const minutoLabel = formatMomentoMinuto(momento.minuto, momento.extra);
  const narracion = generarNarracionRoja({
    jugador: momento.jugador,
    equipo: momento.equipo,
    minuto: momento.minuto,
  });

  const pushTitulo = minutoLabel
    ? `🟥 Expulsión: ${momento.jugador} (${minutoLabel})`
    : `🟥 Expulsión: ${momento.jugador}`;

  const { error: claimError } = await supabase
    .from("partidos")
    .update({
      metadata: buildRedCardNotifyMetadata(partido?.metadata, [momento.id]),
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
      tipo_evento: "tarjeta_roja",
      fuente: "api-sports-sync",
    }),
  });

  if (chatError) {
    return { ok: false, message: chatError.message };
  }

  await queuePartidoPushNotifications(
    supabase,
    partidoId,
    "tarjeta_roja",
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

  return { ok: true, message: "Tarjeta roja procesada" };
}
