import type { SupabaseClient } from "@supabase/supabase-js";
import { metadataPartidoGlobal } from "@/lib/chat/scopes";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import {
  formatVarDatoMamalonMessage,
  pickDatoMamalonVariado,
} from "@/lib/datos-mamalones/pick";
import type { MatchPhaseKind } from "@/lib/apifootball/webhook/types";
import { buildPhasePushMessage, isFinalMatch } from "@/lib/apifootball/webhook/phase-push";
import { queuePartidoPushNotifications } from "@/lib/apifootball/webhook/notifications";
import {
  generarNarracionCampeon,
  generarNarracionFase,
  PLANTILLAS_FIN,
  PLANTILLAS_INICIO,
  PLANTILLAS_MEDIO_TIEMPO,
  PLANTILLAS_REGULATION_END,
  PLANTILLAS_SEGUNDO_TIEMPO,
} from "@/lib/narracion/comentaristas";
import {
  baselineAnnouncedPhases,
  getAnnouncedPhases,
} from "@/lib/api-football/phase-notify-state";
import {
  detectPhaseTransitions,
  isEliminatoriaFase,
  parseRelojFromMetadata,
  type MatchPeriod,
} from "@/lib/partidos/match-clock";
import type { EstatusPartido, FaseMundial } from "@/types/database";

export interface PhaseSyncContext {
  supabase: SupabaseClient;
  partidoId: string;
  local: string;
  visitante: string;
  fase: FaseMundial;
  estatus: EstatusPartido;
  roundHint?: string | null;
  homeScore: number;
  awayScore: number;
  prevMetadata: unknown;
  newRelojMetadata: Record<string, unknown>;
  statusShort?: string | null;
}

function periodFromStatusShort(short: string | null | undefined): MatchPeriod | null {
  if (!short) return null;
  const s = short.trim().toUpperCase();
  if (s === "NS" || s === "TBD") return "NS";
  if (s === "1H") return "1H";
  if (s === "HT") return "HT";
  if (s === "2H") return "2H";
  if (s === "ET") return "ET1";
  if (s === "BT") return "HT";
  if (s === "P") return "PEN";
  if (s === "FT") return "FT";
  if (s === "AET") return "AET";
  if (s === "PEN") return "AP";
  return null;
}

/** Fases que debieron avisarse pero el poll llegó tarde (reloj ya en el nuevo periodo). */
function resolvePendingPhases(
  prevPeriod: MatchPeriod,
  nextPeriod: MatchPeriod,
  estatus: EstatusPartido,
  announced: MatchPhaseKind[],
  transitions: MatchPhaseKind[],
): MatchPhaseKind[] {
  const pending = [...transitions];

  const add = (phase: MatchPhaseKind) => {
    if (!announced.includes(phase) && !pending.includes(phase)) {
      pending.push(phase);
    }
  };

  if (nextPeriod === "HT" || estatus === "medio_tiempo") {
    add("halftime");
  }

  if (nextPeriod === "2H") {
    add("halftime");
    add("second_half");
  }

  if (estatus === "en_vivo" && nextPeriod === "2H") {
    add("second_half");
  }

  if (
    (nextPeriod === "FT" || nextPeriod === "AET" || nextPeriod === "AP") &&
    estatus === "finalizado"
  ) {
    add("fulltime");
  }

  return pending;
}

function buildPhaseChat(
  phase: MatchPhaseKind,
  local: string,
  visitante: string,
  homeScore: number,
  awayScore: number,
  esFinal: boolean,
): { contenido: string; narradorEstilo?: string } {
  const marcadorStr = `${homeScore}-${awayScore}`;

  const fromNarracion = (n: { texto: string; estilo: string }) => ({
    contenido: n.texto,
    narradorEstilo: n.estilo,
  });

  switch (phase) {
    case "kickoff":
      return fromNarracion(generarNarracionFase(PLANTILLAS_INICIO, local, visitante));
    case "halftime":
    case "extra_time_halftime":
      return fromNarracion(
        generarNarracionFase(PLANTILLAS_MEDIO_TIEMPO, local, visitante, marcadorStr),
      );
    case "regulation_end":
      return fromNarracion(
        generarNarracionFase(PLANTILLAS_REGULATION_END, local, visitante, marcadorStr),
      );
    case "second_half":
    case "extra_time_1st":
    case "extra_time_2nd":
      return fromNarracion(
        generarNarracionFase(PLANTILLAS_SEGUNDO_TIEMPO, local, visitante, marcadorStr),
      );
    case "penalties":
      return {
        contenido: `¡A penales! ${local} ${marcadorStr} ${visitante}. Nervios a flor de piel.`,
        narradorEstilo: "VAR Compas",
      };
    case "fulltime":
      if (esFinal) {
        const n = generarNarracionCampeon({
          local,
          visitante,
          marcadorLocal: homeScore,
          marcadorVisitante: awayScore,
          penaltyScores: null,
        });
        return { contenido: n.texto, narradorEstilo: n.estilo };
      }
      return fromNarracion(
        generarNarracionFase(PLANTILLAS_FIN, local, visitante, marcadorStr),
      );
    default:
      return { contenido: `${local} ${marcadorStr} ${visitante}` };
  }
}

/** Chat + push de transiciones de fase (reusa mensajes del webhook apifootball). */
export async function notifyPhaseTransitions(
  ctx: PhaseSyncContext,
): Promise<{
  notified: MatchPhaseKind[];
  announcedPhases: MatchPhaseKind[];
  errors: string[];
  debug?: { prevPeriod: string; nextPeriod: string; pending: string[] };
}> {
  const errors: string[] = [];
  const notified: MatchPhaseKind[] = [];

  const prevReloj = parseRelojFromMetadata(ctx.prevMetadata);
  const nextReloj = parseRelojFromMetadata({ reloj: ctx.newRelojMetadata });
  const prevPeriod: MatchPeriod = prevReloj?.period ?? "NS";
  const nextPeriod: MatchPeriod =
    periodFromStatusShort(ctx.statusShort) ??
    nextReloj?.period ??
    "NS";

  let announced = getAnnouncedPhases(ctx.prevMetadata);
  if (announced.length === 0 && nextPeriod !== "NS") {
    announced = baselineAnnouncedPhases(nextPeriod);
  }

  const transitions = detectPhaseTransitions(prevPeriod, nextPeriod, {
    homeScore: ctx.homeScore,
    awayScore: ctx.awayScore,
    isEliminatoria: isEliminatoriaFase(ctx.fase),
  });

  const pending = resolvePendingPhases(
    prevPeriod,
    nextPeriod,
    ctx.estatus,
    announced,
    transitions,
  );

  const esFinal = isFinalMatch(ctx.fase, ctx.roundHint);

  for (const phase of pending) {
    if (announced.includes(phase)) continue;

    let contenido: string;
    let narradorEstilo: string | undefined;
    const meta: Record<string, unknown> = {
      phase,
      fuente: "api-sports-sync",
    };

    if (phase === "halftime") {
      const dato = await pickDatoMamalonVariado(ctx.supabase, {
        ligaId: LIGA_GLOBAL_ID,
        partidoId: ctx.partidoId,
      });
      if (dato) {
        contenido = formatVarDatoMamalonMessage(dato);
        meta.dato_mamalón_id = dato.id;
        meta.fuente_trivia = "datos_mamalones";
      } else {
        const chat = buildPhaseChat(
          phase,
          ctx.local,
          ctx.visitante,
          ctx.homeScore,
          ctx.awayScore,
          esFinal,
        );
        contenido = chat.contenido;
        narradorEstilo = chat.narradorEstilo;
      }
    } else {
      const chat = buildPhaseChat(
        phase,
        ctx.local,
        ctx.visitante,
        ctx.homeScore,
        ctx.awayScore,
        esFinal,
      );
      contenido = chat.contenido;
      narradorEstilo = chat.narradorEstilo;
    }

    const { error: chatError } = await ctx.supabase.from("mensajes_chat").insert({
      partido_id: ctx.partidoId,
      liga_id: LIGA_GLOBAL_ID,
      tipo: "evento_partido",
      contenido,
      metadata: metadataPartidoGlobal({
        ...meta,
        marcador: `${ctx.homeScore}-${ctx.awayScore}`,
        ...(narradorEstilo ? { narrador_estilo: narradorEstilo } : {}),
      }),
    });

    if (chatError) {
      errors.push(`chat ${phase}: ${chatError.message}`);
      continue;
    }

    const push = buildPhasePushMessage(
      phase,
      ctx.local,
      ctx.visitante,
      ctx.homeScore,
      ctx.awayScore,
      null,
      { isFinalMatch: esFinal },
    );

    await queuePartidoPushNotifications(
      ctx.supabase,
      ctx.partidoId,
      push.tipo,
      push.titulo,
      push.cuerpo,
      { fuente: "api-sports-sync", phase },
    );

    announced.push(phase);
    notified.push(phase);
  }

  return {
    notified,
    announcedPhases: announced,
    errors,
    debug: {
      prevPeriod,
      nextPeriod,
      pending,
    },
  };
}

export function mergeAnnouncedPhases(
  metadata: Record<string, unknown>,
  phases: MatchPhaseKind[],
): Record<string, unknown> {
  const existing = getAnnouncedPhases(metadata);
  const merged = [...new Set([...existing, ...phases])];
  return { ...metadata, announced_phases: merged };
}
