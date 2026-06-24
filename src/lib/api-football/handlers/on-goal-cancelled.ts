import type { SupabaseClient } from "@supabase/supabase-js";
import { metadataPartidoGlobal } from "@/lib/chat/scopes";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import type { MomentoClave } from "@/lib/api-football/match-events";
import { formatMomentoMinuto } from "@/lib/api-football/match-events";
import { buildCancelledGoalNotifyMetadata } from "@/lib/api-football/goal-cancel-notify-state";
import { tryClaimLiveEvent } from "@/lib/api-football/push/claim-event";
import { queuePartidoPushNotifications } from "@/lib/api-football/push/notifications";
import { generarNarracionGolAnulado } from "@/lib/narracion/comentaristas";
import type { WebhookHandlerResult } from "@/types/api-football";

interface OnGoalCancelledContext {
  supabase: SupabaseClient;
  partidoId: string;
  momento: MomentoClave;
  marcadorLocal: number;
  marcadorVisitante: number;
  notifyKey: string;
}

export async function handleGoalCancelledEvent(
  ctx: OnGoalCancelledContext,
): Promise<WebhookHandlerResult> {
  const {
    supabase,
    partidoId,
    momento,
    marcadorLocal,
    marcadorVisitante,
    notifyKey,
  } = ctx;
  const eventKey = `gol-anulado-${notifyKey}`;

  const { data: partido, error: readError } = await supabase
    .from("partidos")
    .select("metadata")
    .eq("id", partidoId)
    .maybeSingle();

  if (readError) {
    return { ok: false, message: readError.message };
  }

  if (!(await tryClaimLiveEvent(supabase, partidoId, eventKey, "gol_anulado"))) {
    return { ok: true, message: "Gol anulado ya notificado (claim)" };
  }

  const minutoLabel = formatMomentoMinuto(momento.minuto, momento.extra);
  const narracion = generarNarracionGolAnulado({
    goleador: momento.jugador,
    marcadorLocal,
    marcadorVisitante,
  });

  const pushTitulo = minutoLabel
    ? `❌ Gol anulado: ${momento.jugador} (${minutoLabel})`
    : `❌ Gol anulado: ${momento.jugador}`;

  const { error: claimError } = await supabase
    .from("partidos")
    .update({
      metadata: buildCancelledGoalNotifyMetadata(partido?.metadata, [notifyKey]),
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
      tipo_evento: "gol_anulado",
      fuente: "api-sports-sync",
    }),
  });

  if (chatError) {
    return { ok: false, message: chatError.message };
  }

  await queuePartidoPushNotifications(
    supabase,
    partidoId,
    "gol_anulado",
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

  return { ok: true, message: "Gol anulado procesado" };
}
