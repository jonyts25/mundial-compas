import type { SupabaseClient } from "@supabase/supabase-js";
import { metadataPartidoGlobal } from "@/lib/chat/scopes";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { isOwnGoalFromDetail } from "@/lib/api-football/goal-event-detail";
import {
  extractScoreFromPayload,
  extractTeamNames,
} from "@/lib/api-football/map-fixture-to-partido";
import {
  buildGolNotifyMetadata,
  goalScoreKey,
  isGoalAlreadyNotified,
} from "@/lib/api-football/goal-notify-state";
import { tryClaimLiveEvent } from "@/lib/api-football/push/claim-event";
import { queuePartidoPushNotifications } from "@/lib/api-football/push/notifications";
import { buildGoalPushTitle } from "@/lib/api-football/push/push-score";
import { generarNarracionGol } from "@/lib/narracion/comentaristas";
import { displayTeamPair } from "@/lib/teams/display-names";
import type { ApiFootballWebhookPayload, WebhookHandlerResult } from "@/types/api-football";

interface OnGoalContext {
  supabase: SupabaseClient;
  partidoId: string;
  payload: ApiFootballWebhookPayload;
  period?: import("@/lib/partidos/match-clock").MatchPeriod;
}

export async function handleGoalEvent(
  ctx: OnGoalContext,
): Promise<WebhookHandlerResult> {
  const { supabase, partidoId, payload } = ctx;
  const score = extractScoreFromPayload(payload);
  if (!score) {
    return { ok: false, message: "Payload sin marcador válido" };
  }

  const marcadorKey = goalScoreKey(score.local, score.visitante);
  const eventKey = `gol-${marcadorKey}`;

  const { data: partido, error: readError } = await supabase
    .from("partidos")
    .select("metadata, equipo_local_nombre, equipo_visitante_nombre")
    .eq("id", partidoId)
    .maybeSingle();

  if (readError) {
    return { ok: false, message: readError.message };
  }

  if (isGoalAlreadyNotified(partido?.metadata, score.local, score.visitante)) {
    return { ok: true, message: "Gol ya notificado" };
  }

  if (!(await tryClaimLiveEvent(supabase, partidoId, eventKey, "gol"))) {
    return { ok: true, message: "Gol ya notificado (claim)" };
  }

  const teamsRaw = extractTeamNames(payload);
  const dbLocal = String(partido?.equipo_local_nombre ?? teamsRaw.local);
  const dbVisitante = String(partido?.equipo_visitante_nombre ?? teamsRaw.visitante);
  const teams = displayTeamPair(dbLocal, dbVisitante);

  const goleador =
    payload.goal?.player?.name ??
    payload.goal?.team?.name ??
    null;
  const minuto = payload.goal?.time?.elapsed ?? payload.fixture?.status?.elapsed ?? null;
  const esAutogol = isOwnGoalFromDetail(payload.goal?.detail);
  const equipoPropio = payload.goal?.team?.name ?? null;

  const narracion = generarNarracionGol({
    local: teams.local,
    visitante: teams.visitante,
    marcadorLocal: score.local,
    marcadorVisitante: score.visitante,
    goleador: goleador ?? "el delantero",
    equipo: equipoPropio ?? teams.local,
    minuto,
    isOwnGoal: esAutogol,
    isPenalty: (payload.goal?.detail ?? "").toLowerCase().includes("penalty"),
  });

  const pushTitulo = esAutogol
    ? `⚽ Autogol: ${teams.local} ${score.local}-${score.visitante} ${teams.visitante}`
    : buildGoalPushTitle({
        localName: dbLocal,
        visitanteName: dbVisitante,
        homeScore: score.local,
        awayScore: score.visitante,
        homePenaltyScore: null,
        awayPenaltyScore: null,
        period: ctx.period ?? "1H",
      });

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

  const { error: chatError } = await supabase.from("mensajes_chat").insert({
    partido_id: partidoId,
    liga_id: LIGA_GLOBAL_ID,
    tipo: "evento_partido",
    contenido: narracion.texto,
    metadata: metadataPartidoGlobal({
      narrador_estilo: narracion.estilo,
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
    narracion.texto,
    {
      event_key: eventKey,
      skip_claim: true,
      fuente: "api-sports-sync",
      ...(esAutogol ? { es_autogol: true } : {}),
    },
  );

  return { ok: true, message: "Gol procesado" };
}
