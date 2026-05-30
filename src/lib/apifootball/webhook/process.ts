import type { SupabaseClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import {
  formatVarDatoMamalonMessage,
  pickDatoMamalonVariado,
} from "@/lib/datos-mamalones/pick";
import {
  generarNarracionFase,
  generarNarracionGol,
  generarNarracionRoja,
  PLANTILLAS_FIN,
  PLANTILLAS_INICIO,
  PLANTILLAS_MEDIO_TIEMPO,
} from "@/lib/narracion/comentaristas";
import { normalizeLivePayload } from "@/lib/apifootball/webhook/normalize";
import { queuePartidoGoalNotifications } from "@/lib/apifootball/webhook/notifications";
import type { NormalizedLiveEvent } from "@/lib/apifootball/webhook/types";

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
): { texto: string; estilo: string } {
  const marcadorStr = formatMarcador(marcadorLocal, marcadorVisitante);
  switch (event.phase) {
    case "kickoff":
      return generarNarracionFase(PLANTILLAS_INICIO, local, visitante);
    case "halftime":
      return generarNarracionFase(PLANTILLAS_MEDIO_TIEMPO, local, visitante, marcadorStr);
    case "fulltime":
      return generarNarracionFase(PLANTILLAS_FIN, local, visitante, marcadorStr);
    default:
      return { texto: "Actualización del partido.", estilo: "VAR Compas" };
  }
}

async function wasEventProcessed(
  supabase: SupabaseClient,
  eventKey: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("webhook_eventos")
    .select("id, procesado")
    .eq("proveedor", "apifootball")
    .eq("evento_externo_id", eventKey)
    .maybeSingle();

  return Boolean(data?.procesado);
}

async function markEventProcessed(
  supabase: SupabaseClient,
  eventKey: string,
  partidoId: string,
  tipo: string,
  payload: Record<string, unknown>,
  error?: string | null,
): Promise<void> {
  await supabase.from("webhook_eventos").upsert(
    {
      proveedor: "apifootball",
      evento_externo_id: eventKey,
      tipo_evento: tipo,
      payload,
      partido_id: partidoId,
      procesado: !error,
      error: error ?? null,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "proveedor,evento_externo_id" },
  );
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

export async function processFootballWebhook(
  supabase: SupabaseClient,
  rawBody: unknown,
): Promise<ProcessWebhookResult> {
  const snapshot = normalizeLivePayload(rawBody);
  if (!snapshot) {
    return { ok: false, message: "Payload sin match_id / fixture.id válido" };
  }

  const { data: partido, error: partidoError } = await supabase
    .from("partidos")
    .select(
      "id, metadata, estatus, equipo_local_nombre, equipo_visitante_nombre",
    )
    .eq("api_football_fixture_id", snapshot.fixtureId)
    .maybeSingle();

  if (partidoError) {
    return { ok: false, message: partidoError.message };
  }

  if (!partido) {
    return {
      ok: false,
      message: `Partido no registrado para fixture ${snapshot.fixtureId}. Ejecuta POST /api/admin/cargar-partidos`,
    };
  }

  const prevStatus = readPrevApifootballStatus(partido.metadata);
  const snapshotWithPhase = normalizeLivePayload(rawBody, prevStatus);
  if (!snapshotWithPhase) {
    return { ok: false, message: "Error al normalizar payload" };
  }

  const statusRaw = readStatusFromPayload(rawBody);

  const { error: updateError } = await supabase
    .from("partidos")
    .update({
      marcador_local: snapshotWithPhase.homeScore,
      marcador_visitante: snapshotWithPhase.awayScore,
      estatus: snapshotWithPhase.estatus,
      minuto_actual: snapshotWithPhase.minute,
      updated_at: new Date().toISOString(),
      metadata: {
        ...(typeof partido.metadata === "object" && partido.metadata !== null
          ? (partido.metadata as Record<string, unknown>)
          : {}),
        apifootball_status_raw: statusRaw,
        apifootball_last_status: snapshotWithPhase.estatus,
        apifootball_last_sync: new Date().toISOString(),
      },
    })
    .eq("id", partido.id);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  let processed = 0;
  let skipped = 0;

  for (const event of snapshotWithPhase.events) {
    const eventKey = `${snapshotWithPhase.fixtureId}-${event.eventKey}`;

    if (await wasEventProcessed(supabase, eventKey)) {
      skipped += 1;
      continue;
    }

    let contenido = "";
    const meta: Record<string, unknown> = {
      fixture_id: snapshotWithPhase.fixtureId,
      event_kind: event.kind,
    };

    let narradorEstilo: string | undefined;

    if (event.kind === "goal") {
      const narracion = buildGoalMessageFull(
        event,
        snapshotWithPhase.homeName,
        snapshotWithPhase.awayName,
        snapshotWithPhase.homeScore,
        snapshotWithPhase.awayScore,
      );
      contenido = narracion.texto;
      narradorEstilo = narracion.estilo;
      meta.player = event.player;
      meta.team = event.teamName;
      meta.minute = event.minute;
    } else if (event.kind === "red_card") {
      const narracion = buildRedMessage(event);
      contenido = narracion.texto;
      narradorEstilo = narracion.estilo;
      meta.player = event.player;
      meta.team = event.teamName;
    } else if (event.kind === "match_phase") {
      meta.phase = event.phase;
      if (event.phase === "halftime" || event.phase === "fulltime") {
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
            snapshotWithPhase.homeName,
            snapshotWithPhase.awayName,
            snapshotWithPhase.homeScore,
            snapshotWithPhase.awayScore,
          );
          contenido = narracion.texto;
          narradorEstilo = narracion.estilo;
        }
      } else {
        const narracion = buildPhaseMessage(
          event,
          snapshotWithPhase.homeName,
          snapshotWithPhase.awayName,
          snapshotWithPhase.homeScore,
          snapshotWithPhase.awayScore,
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
      partido.id,
      event.kind,
      meta as Record<string, unknown>,
      chatError,
    );

    if (chatError) {
      return { ok: false, message: chatError, processed, skipped };
    }

    if (event.kind === "goal") {
      const local = String(partido.equipo_local_nombre ?? "Local");
      const visitante = String(partido.equipo_visitante_nombre ?? "Visitante");
      await queuePartidoGoalNotifications(
        supabase,
        partido.id,
        `⚽ Gol: ${local} ${snapshotWithPhase.homeScore}-${snapshotWithPhase.awayScore} ${visitante}`,
        contenido,
        { fuente: "apifootball-webhook", fixture_id: snapshotWithPhase.fixtureId },
      );
    }

    processed += 1;
  }

  return {
    ok: true,
    message: `Marcador actualizado. Eventos nuevos: ${processed}, omitidos: ${skipped}`,
    processed,
    skipped,
  };
}
