/** @deprecated Usar `isMatchChatOpen` y constantes en `@/lib/chat/match-chat-window`. */
export {
  CHAT_ABRE_MINUTOS_ANTES,
  CHAT_PARTIDO_AVISO_CIERRE,
  getChatAbreEnMs,
  isMatchChatOpen as isChatAbierto,
  matchChatInputPlaceholder,
} from "@/lib/chat/match-chat-window";

export const CHAT_CERRADO_PLACEHOLDER =
  "🔒 El chat se abrirá 15 minutos antes del pitazo inicial";
