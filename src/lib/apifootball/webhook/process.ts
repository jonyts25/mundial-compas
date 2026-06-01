import type { SupabaseClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import {
  formatVarDatoMamalonMessage,
  pickDatoMamalonVariado,
} from "@/lib/datos-mamalones/pick";
import {
  generarNarracionFase,
  generarNarracionCampeon,
  generarNarracionGol,
  generarNarracionGolAnulado,
  generarNarracionPenalAnotado,
  generarNarracionPenalFallado,
  generarNarracionRoja,
  PLANTILLAS_FIN,
  PLANTILLAS_INICIO,
  PLANTILLAS_MEDIO_TIEMPO,
  PLANTILLAS_REGULATION_END,
  PLANTILLAS_SEGUNDO_TIEMPO,
} from "@/lib/narracion/comentaristas";
import {
  announcedGoalsToMetadata,
  fingerprintRegulationGoals,
  readAnnouncedGoals,
  type AnnouncedGoal,
} from "@/lib/apifootball/webhook/goal-sync";
import {
  buildClockState,
  parseRelojFromMetadata,
  relojToMetadata,
} from "@/lib/partidos/match-clock";
import { normalizeLivePayload } from "@/lib/apifootball/webhook/normalize";
import { queuePartidoPushNotifications } from "@/lib/apifootball/webhook/notifications";
import { buildPhasePushMessage, isFinalMatch } from "@/lib/apifootball/webhook/phase-push";
import {
  buildGoalPushTitle,
  buildPenaltyMissedPushTitle,
  buildPenaltyScoredPushTitle,
  resolveMatchWinner,
  resolvePenaltyScores,
  scoresForLiveDisplay,
} from "@/lib/apifootball/webhook/push-score";
import type { NormalizedLiveEvent } from "@/lib/apifootball/webhook/types";
import type { PenaltyScorePair } from "@/lib/apifootball/webhook/push-score";
import type { FaseMundial } from "@/types/database";

export const VAR_DISPLAY_NAME = "🤖 VAR";

export interface ProcessWebhookResult {
  ok: boolean;
  message?: string;
  processed?: number;
  skipped?: number;
}

function formatMarcador(local: number, visitante: number): string {
  return `${local}-${visitante}`;
}

function buildGoalMessageFull(
  event: Extract<NormalizedLiveEvent, { kind: "goal" }>,
  localName: string,
  visitanteName: string,
  local: number,
  visitante: number,
): { texto: string; estilo: string } {
  const narracion = generarNarracionGol({
    local: localName,
    visitante: visitanteName,
    marcadorLocal: local,
    marcadorVisitante: visitante,
    goleador: event.player,
    equipo: event.teamName,
    minuto: event.minute,
    isPenalty: event.isPenalty,
    isOwnGoal: event.isOwnGoal,
  });
  return { texto: narracion.texto, estilo: narracion.estilo };
}

function buildRedMessage(
  event: Extract<NormalizedLiveEvent, { kind: "red_card" }>,
): { texto: string; estilo: string } {
  return generarNarracionRoja({
    jugador: event.player,
    equipo: event.teamName,
    minuto: event.minute,
  });
}

function buildPhaseMessage(
  event: Extract<NormalizedLiveEvent, { kind: "match_phase" }>,
  local: string,
  visitante: string,
  marcadorLocal: number,
  marcadorVisitante: number,
  penaltyScores: PenaltyScorePair | null,
): { texto: string; estilo: string } {
  const marcadorStr = formatMarcador(marcadorLocal, marcadorVisitante);
  switch (event.phase) {
    case "kickoff":
      return generarNarracionFase(PLANTILLAS_INICIO, local, visitante);
    case "halftime":
    case "extra_time_halftime":
      return generarNarracionFase(PLANTILLAS_MEDIO_TIEMPO, local, visitante, marcadorStr);
    case "regulation_end":
      return generarNarracionFase(
        PLANTILLAS_REGULATION_END,
        local,
        visitante,
        marcadorStr,
      );
    case "second_half":
    case "extra_time_1st":
    case "extra_time_2nd":
      return generarNarracionFase(PLANTILLAS_SEGUNDO_TIEMPO, local, visitante, marcadorStr);
    case "penalties":
      return {
        texto: `¡A penales! ${local} ${marcadorStr} ${visitante}. Nervios a flor de piel.`,
        estilo: "VAR Compas",
      };
    case "fulltime": {
      const winner = resolveMatchWinner({
        localName: local,
        visitanteName: visitante,
        homeScore: marcadorLocal,
        awayScore: marcadorVisitante,
        penaltyScores,
      });
      if (winner.wonOnPenalties && penaltyScores) {
        const { home, away } = penaltyScores;
        return {
          texto: `Final. ${local} ${marcadorStr} ${visitante} (${winner.winner} gana ${home}-${away} en penales).`,
          estilo: "VAR Compas",
        };
      }
      if (!winner.isDraw) {
        return {
          texto: `¡Final! ${local} ${marcadorStr} ${visitante}. Gana ${winner.winner}.`,
          estilo: "VAR Compas",
        };
      }
      return generarNarracionFase(PLANTILLAS_FIN, local, visitante, marcadorStr);
    }
    default:
      return { texto: "Actualización del partido.", estilo: "VAR Compas" };
  }
}

/** Reserva el evento antes de procesarlo (evita duplicados por relays concurrentes). */
async function tryClaimWebhookEvent(
  supabase: SupabaseClient,
  eventKey: string,
  partidoId: string,
  tipo: string,
): Promise<boolean> {
  const { error } = await supabase.from("webhook_eventos").insert({
    proveedor: "apifootball",
    evento_externo_id: eventKey,
    tipo_evento: tipo,
    payload: {},
    partido_id: partidoId,
    procesado: false,
  });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}

async function markEventProcessed(
  supabase: SupabaseClient,
  eventKey: string,
  payload: Record<string, unknown>,
  error?: string | null,
): Promise<void> {
  await supabase
    .from("webhook_eventos")
    .update({
      payload,
      procesado: !error,
      error: error ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("proveedor", "apifootball")
    .eq("evento_externo_id", eventKey);
}

async function insertVarChatMessage(
  supabase: SupabaseClient,
  partidoId: string,
  contenido: string,
  metadata: Record<string, unknown>,
): Promise<string | null> {
  const tipo =
    metadata.dato_mamalón_id != null ? "dato_mamalón" : "evento_partido";

  const { error } = await supabase.from("mensajes_chat").insert({
    partido_id: partidoId,
    liga_id: LIGA_GLOBAL_ID,
    usuario_id: null,
    tipo,
    contenido:
      tipo === "dato_mamalón" ? contenido : `${VAR_DISPLAY_NAME} · ${contenido}`,
    dato_mamalón_id:
      typeof metadata.dato_mamalón_id === "string"
        ? metadata.dato_mamalón_id
        : null,
    metadata: {
      ...metadata,
      autor_display: VAR_DISPLAY_NAME,
      fuente: "apifootball-webhook",
    },
  });

  return error?.message ?? null;
}

function readPrevApifootballStatus(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const raw = (metadata as Record<string, unknown>).apifootball_status_raw;
  return raw != null ? String(raw) : undefined;
}

function readStatusFromPayload(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const p = body as Record<string, unknown>;
  const match =
    (p.match as Record<string, unknown> | undefined) ??
    (Array.isArray(p) ? (p[0] as Record<string, unknown>) : p);
  return String(
    match?.match_status ??
      (match?.fixture as Record<string, unknown> | undefined)?.status ??
      "",
  );
}

function readMatchRound(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const p = body as Record<string, unknown>;
  const match =
    (p.match as Record<string, unknown> | undefined) ??
    (Array.isArray(p) ? (p[0] as Record<string, unknown>) : p);
  if (match.match_round != null) return String(match.match_round);
  if (match.league_round != null) return String(match.league_round);
  return undefined;
}

export async function processFootballWebhook(
  supabase: SupabaseClient,
  rawBody: unknown,
): Promise<ProcessWebhookResult> {
  const preview = normalizeLivePayload(rawBody, {});
  if (!preview) {
    return { ok: false, message: "Payload sin match_id / fixture.id válido" };
  }

  const { data: partido, error: partidoError } = await supabase
    .from("partidos")
    .select(
      "id, fase, metadata, estatus, marcador_local, marcador_visitante, equipo_local_nombre, equipo_visitante_nombre",
    )
    .eq("api_football_fixture_id", preview.fixtureId)
    .maybeSingle();

  const snapshot = normalizeLivePayload(rawBody, {
    prevMetadata: partido?.metadata,
    prevHomeScore: partido?.marcador_local ?? preview.homeScore,
    prevAwayScore: partido?.marcador_visitante ?? preview.awayScore,
    fase: partido?.fase ?? null,
  });
  if (!snapshot) {
    return { ok: false, message: "Error al normalizar payload" };
  }

  if (partidoError) {
    return { ok: false, message: partidoError.message };
  }

  if (!partido) {
    return {
      ok: false,
      message: `Partido no registrado para fixture ${snapshot.fixtureId}. Ejecuta POST /api/admin/cargar-partidos`,
    };
  }

  const prevReloj = parseRelojFromMetadata(partido.metadata);
  const reloj = buildClockState(
    snapshot.statusRaw,
    snapshot.estatus,
    snapshot.minute,
    prevReloj,
    {
      hasPenaltyScores:
        snapshot.period === "PEN" ||
        snapshot.homePenaltyScore != null ||
        snapshot.awayPenaltyScore != null,
    },
  );
  const displayMinute = reloj.ticking ? reloj.anchorMinute : null;

  const metadataAfterSync: Record<string, unknown> = {
    ...(typeof partido.metadata === "object" && partido.metadata !== null
      ? (partido.metadata as Record<string, unknown>)
      : {}),
    apifootball_status_raw: snapshot.statusRaw,
    apifootball_last_status: snapshot.estatus,
    apifootball_last_sync: new Date().toISOString(),
    reloj: relojToMetadata(reloj),
    ...(snapshot.homePenaltyScore != null
      ? { marcador_penales_local: snapshot.homePenaltyScore }
      : {}),
    ...(snapshot.awayPenaltyScore != null
      ? { marcador_penales_visitante: snapshot.awayPenaltyScore }
      : {}),
    ...(snapshot.penaltyKeysToPersist.length > 0
      ? { penales_kicks_vistos: snapshot.penaltyKeysToPersist }
      : {}),
  };

  const { error: updateError } = await supabase
    .from("partidos")
    .update({
      marcador_local: snapshot.homeScore,
      marcador_visitante: snapshot.awayScore,
      estatus: snapshot.estatus,
      minuto_actual: displayMinute,
      updated_at: new Date().toISOString(),
      metadata: metadataAfterSync,
    })
    .eq("id", partido.id);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  let processed = 0;
  let skipped = 0;

  const penaltyScores = resolvePenaltyScores(
    snapshot.homePenaltyScore,
    snapshot.awayPenaltyScore,
  );
  const matchRound = readMatchRound(rawBody);
  const esFinal = isFinalMatch(partido.fase as FaseMundial, matchRound);
  let golesAnunciados: AnnouncedGoal[] = readAnnouncedGoals(partido.metadata);

  for (const event of snapshot.events) {
    const eventKey = `${snapshot.fixtureId}-${event.eventKey}`;

    if (!(await tryClaimWebhookEvent(supabase, eventKey, partido.id, event.kind))) {
      skipped += 1;
      continue;
    }

    let contenido = "";
    const meta: Record<string, unknown> = {
      fixture_id: snapshot.fixtureId,
      event_kind: event.kind,
    };

    let narradorEstilo: string | undefined;

    if (event.kind === "goal_cancelled") {
      const narracion = generarNarracionGolAnulado({
        goleador: event.player,
        marcadorLocal: event.newHome,
        marcadorVisitante: event.newAway,
      });
      contenido = narracion.texto;
      narradorEstilo = narracion.estilo;
      meta.var_reversal = true;
      meta.player = event.player;
      meta.team = event.teamName;
      meta.marcador_anterior = `${event.prevHome}-${event.prevAway}`;
      meta.marcador_nuevo = `${event.newHome}-${event.newAway}`;
      if (event.player) {
        const idx = golesAnunciados.findLastIndex(
          (g) =>
            g.isHome === event.isHome &&
            g.player.toLowerCase() === event.player!.toLowerCase(),
        );
        if (idx >= 0) golesAnunciados.splice(idx, 1);
      } else {
        const idx = golesAnunciados.findLastIndex((g) => g.isHome === event.isHome);
        if (idx >= 0) golesAnunciados.splice(idx, 1);
      }
    } else if (event.kind === "goal") {
      const liveScore = scoresForLiveDisplay({
        period: snapshot.period,
        homeScore: snapshot.homeScore,
        awayScore: snapshot.awayScore,
        homePenaltyScore: snapshot.homePenaltyScore,
        awayPenaltyScore: snapshot.awayPenaltyScore,
      });
      const narracion = buildGoalMessageFull(
        event,
        snapshot.homeName,
        snapshot.awayName,
        liveScore.local,
        liveScore.visitante,
      );
      contenido = narracion.texto;
      narradorEstilo = narracion.estilo;
      meta.player = event.player;
      meta.team = event.teamName;
      meta.minute = event.minute;
      if (!golesAnunciados.some((g) => g.key === event.eventKey)) {
        golesAnunciados.push({
          key: event.eventKey,
          player: event.player,
          teamName: event.teamName,
          isHome: event.isHome,
          minute: event.minute,
        });
      }
    } else if (event.kind === "penalty_scored") {
      const narracion = generarNarracionPenalAnotado({
        local: snapshot.homeName,
        visitante: snapshot.awayName,
        penHome: event.penHome,
        penAway: event.penAway,
        goleador: event.player,
        equipo: event.teamName,
      });
      contenido = narracion.texto;
      narradorEstilo = narracion.estilo;
      meta.player = event.player;
      meta.team = event.teamName;
      meta.pen_home = event.penHome;
      meta.pen_away = event.penAway;
    } else if (event.kind === "penalty_missed") {
      const narracion = generarNarracionPenalFallado({
        local: snapshot.homeName,
        visitante: snapshot.awayName,
        penHome: event.penHome,
        penAway: event.penAway,
        jugador: event.player,
        equipo: event.teamName,
      });
      contenido = narracion.texto;
      narradorEstilo = narracion.estilo;
      meta.player = event.player;
      meta.team = event.teamName;
      meta.pen_home = event.penHome;
      meta.pen_away = event.penAway;
    } else if (event.kind === "red_card") {
      const narracion = buildRedMessage(event);
      contenido = narracion.texto;
      narradorEstilo = narracion.estilo;
      meta.player = event.player;
      meta.team = event.teamName;
    } else if (event.kind === "match_phase") {
      meta.phase = event.phase;
      if (event.phase === "halftime") {
        const dato = await pickDatoMamalonVariado(supabase, {
          ligaId: LIGA_GLOBAL_ID,
          partidoId: partido.id,
        });
        if (dato) {
          contenido = formatVarDatoMamalonMessage(dato);
          meta.dato_mamalón_id = dato.id;
          meta.fuente_trivia = "datos_mamalones";
        } else {
          const narracion = buildPhaseMessage(
            event,
            snapshot.homeName,
            snapshot.awayName,
            snapshot.homeScore,
            snapshot.awayScore,
            penaltyScores,
          );
          contenido = narracion.texto;
          narradorEstilo = narracion.estilo;
        }
      } else if (event.phase === "fulltime") {
        if (esFinal) {
          const narracion = generarNarracionCampeon({
            local: snapshot.homeName,
            visitante: snapshot.awayName,
            marcadorLocal: snapshot.homeScore,
            marcadorVisitante: snapshot.awayScore,
            penaltyScores,
          });
          contenido = narracion.texto;
          narradorEstilo = narracion.estilo;
        } else {
          const narracion = buildPhaseMessage(
            event,
            snapshot.homeName,
            snapshot.awayName,
            snapshot.homeScore,
            snapshot.awayScore,
            penaltyScores,
          );
          contenido = narracion.texto;
          narradorEstilo = narracion.estilo;
        }
      } else {
        const narracion = buildPhaseMessage(
          event,
          snapshot.homeName,
          snapshot.awayName,
          snapshot.homeScore,
          snapshot.awayScore,
          penaltyScores,
        );
        contenido = narracion.texto;
        narradorEstilo = narracion.estilo;
      }
    }

    if (narradorEstilo) {
      meta.narrador_estilo = narradorEstilo;
    }

    const chatError = await insertVarChatMessage(
      supabase,
      partido.id,
      contenido,
      meta,
    );

    await markEventProcessed(
      supabase,
      eventKey,
      meta as Record<string, unknown>,
      chatError,
    );

    if (chatError) {
      return { ok: false, message: chatError, processed, skipped };
    }

    if (event.kind === "goal_cancelled") {
      const local = String(partido.equipo_local_nombre ?? "Local");
      const visitante = String(partido.equipo_visitante_nombre ?? "Visitante");
      await queuePartidoPushNotifications(
        supabase,
        partido.id,
        "gol_anulado",
        `🤖 VAR: gol anulado · ${local} ${event.newHome}-${event.newAway} ${visitante}`,
        contenido,
        { fuente: "apifootball-webhook", fixture_id: snapshot.fixtureId },
      );
    } else if (event.kind === "goal") {
      const local = String(partido.equipo_local_nombre ?? "Local");
      const visitante = String(partido.equipo_visitante_nombre ?? "Visitante");
      await queuePartidoPushNotifications(
        supabase,
        partido.id,
        "gol",
        buildGoalPushTitle({
          localName: local,
          visitanteName: visitante,
          homeScore: snapshot.homeScore,
          awayScore: snapshot.awayScore,
          homePenaltyScore: snapshot.homePenaltyScore,
          awayPenaltyScore: snapshot.awayPenaltyScore,
          period: snapshot.period,
        }),
        contenido,
        { fuente: "apifootball-webhook", fixture_id: snapshot.fixtureId },
      );
    } else if (event.kind === "penalty_scored") {
      const local = String(partido.equipo_local_nombre ?? snapshot.homeName);
      const visitante = String(
        partido.equipo_visitante_nombre ?? snapshot.awayName,
      );
      await queuePartidoPushNotifications(
        supabase,
        partido.id,
        "gol",
        buildPenaltyScoredPushTitle({
          localName: local,
          visitanteName: visitante,
          penHome: event.penHome,
          penAway: event.penAway,
        }),
        contenido,
        { fuente: "apifootball-webhook", fixture_id: snapshot.fixtureId },
      );
    } else if (event.kind === "penalty_missed") {
      const local = String(partido.equipo_local_nombre ?? snapshot.homeName);
      const visitante = String(
        partido.equipo_visitante_nombre ?? snapshot.awayName,
      );
      await queuePartidoPushNotifications(
        supabase,
        partido.id,
        "penal_fallado",
        buildPenaltyMissedPushTitle({
          localName: local,
          visitanteName: visitante,
          penHome: event.penHome,
          penAway: event.penAway,
        }),
        contenido,
        { fuente: "apifootball-webhook", fixture_id: snapshot.fixtureId },
      );
    } else if (event.kind === "red_card") {
      const local = String(partido.equipo_local_nombre ?? "Local");
      const visitante = String(partido.equipo_visitante_nombre ?? "Visitante");
      await queuePartidoPushNotifications(
        supabase,
        partido.id,
        "tarjeta_roja",
        `🟥 Tarjeta roja: ${local} vs ${visitante}`,
        contenido,
        { fuente: "apifootball-webhook", fixture_id: snapshot.fixtureId },
      );
    } else if (event.kind === "match_phase") {
      const local = String(partido.equipo_local_nombre ?? snapshot.homeName);
      const visitante = String(
        partido.equipo_visitante_nombre ?? snapshot.awayName,
      );
      const push = buildPhasePushMessage(
        event.phase,
        local,
        visitante,
        snapshot.homeScore,
        snapshot.awayScore,
        penaltyScores,
        { isFinalMatch: esFinal },
      );
      await queuePartidoPushNotifications(
        supabase,
        partido.id,
        push.tipo,
        push.titulo,
        push.cuerpo,
        {
          fuente: "apifootball-webhook",
          fixture_id: snapshot.fixtureId,
          phase: event.phase,
        },
      );
    }

    processed += 1;
  }

  await supabase
    .from("partidos")
    .update({
      metadata: {
        ...metadataAfterSync,
        goles_anunciados: announcedGoalsToMetadata(golesAnunciados),
      },
    })
    .eq("id", partido.id);

  return {
    ok: true,
    message: `Marcador actualizado. Eventos nuevos: ${processed}, omitidos: ${skipped}`,
    processed,
    skipped,
  };
}
