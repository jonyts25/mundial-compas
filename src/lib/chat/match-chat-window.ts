import type { EstatusPartido } from "@/types/database";

/** Minutos antes del pitazo en que se habilita el chat de partido */
export const CHAT_ABRE_MINUTOS_ANTES = 15;

/** Minutos después del fin real del encuentro para cerrar el chat */
export const CHAT_CIERRA_MINUTOS_DESPUES = 30;

const MS_POR_MINUTO = 60_000;

export interface PartidoChatInput {
  fecha_kickoff: string;
  estatus: EstatusPartido;
  metadata?: Record<string, unknown> | null;
  updated_at?: string | null;
}

export function getChatAbreEnMs(fechaKickoff: string): number {
  return (
    new Date(fechaKickoff).getTime() -
    CHAT_ABRE_MINUTOS_ANTES * MS_POR_MINUTO
  );
}

/** Marca de fin real (90'+prórroga+penales) guardada por webhook. */
export function getMatchEndMs(partido: PartidoChatInput): number | null {
  if (partido.estatus !== "finalizado") return null;

  const meta = partido.metadata;
  if (meta && typeof meta === "object") {
    const fin =
      meta.finalizado_at ?? meta.chat_fin_at ?? meta.apifootball_last_sync;
    if (typeof fin === "string") {
      const t = new Date(fin).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }

  if (partido.updated_at) {
    const t = new Date(partido.updated_at).getTime();
    if (!Number.isNaN(t)) return t;
  }

  return Date.now();
}

export function getChatCierraEnMs(partido: PartidoChatInput): number | null {
  const end = getMatchEndMs(partido);
  if (end == null) return null;
  return end + CHAT_CIERRA_MINUTOS_DESPUES * MS_POR_MINUTO;
}

/** Chat de partido global: abierto para enviar mensajes. */
export function isMatchChatOpen(
  partido: PartidoChatInput,
  nowMs = Date.now(),
): boolean {
  if (nowMs < getChatAbreEnMs(partido.fecha_kickoff)) return false;

  const cierra = getChatCierraEnMs(partido);
  if (cierra != null && nowMs > cierra) return false;

  if (
    partido.estatus === "cancelado" ||
    partido.estatus === "suspendido" ||
    partido.estatus === "aplazado"
  ) {
    return false;
  }

  return true;
}

/** Historial visible pero sin nuevos mensajes (post-cierre o pre-apertura con partido ya jugado). */
export function isMatchChatReadonly(
  partido: PartidoChatInput,
  nowMs = Date.now(),
): boolean {
  return !isMatchChatOpen(partido, nowMs);
}

export function isMatchChatClosedAfterFinish(
  partido: PartidoChatInput,
  nowMs = Date.now(),
): boolean {
  const cierra = getChatCierraEnMs(partido);
  return cierra != null && nowMs > cierra;
}

export function isMatchChatBeforeOpen(
  partido: PartidoChatInput,
  nowMs = Date.now(),
): boolean {
  return nowMs < getChatAbreEnMs(partido.fecha_kickoff);
}

export const CHAT_PARTIDO_AVISO_CIERRE =
  "El chat cerrará 30 minutos después de finalizar el encuentro.";

export function matchChatInputPlaceholder(
  partido: PartidoChatInput,
  nowMs = Date.now(),
): string {
  if (isMatchChatBeforeOpen(partido, nowMs)) {
    return `🔒 El chat se abrirá ${CHAT_ABRE_MINUTOS_ANTES} minutos antes del pitazo`;
  }
  if (isMatchChatClosedAfterFinish(partido, nowMs)) {
    return "🔒 Chat cerrado — solo lectura del historial";
  }
  if (!isMatchChatOpen(partido, nowMs)) {
    return "🔒 El chat no está disponible para este partido";
  }
  return "Escribe al grupo…";
}
