/** Minutos antes del pitazo en que se habilita el chat */
export const CHAT_ABRE_MINUTOS_ANTES = 10;

const MS_POR_MINUTO = 60_000;

export function getChatAbreEnMs(fechaKickoff: string): number {
  return new Date(fechaKickoff).getTime() - CHAT_ABRE_MINUTOS_ANTES * MS_POR_MINUTO;
}

export function isChatAbierto(fechaKickoff: string, nowMs = Date.now()): boolean {
  return nowMs >= getChatAbreEnMs(fechaKickoff);
}

export const CHAT_CERRADO_PLACEHOLDER =
  "🔒 El chat se abrirá 10 minutos antes del pitazo inicial";
