/** Límites de moderación automática para chats de usuario. */

export const CHAT_MAX_MESSAGE_LENGTH = 300;

/** Mínimo entre mensajes del mismo usuario en el mismo chat. */
export const CHAT_MIN_INTERVAL_MS = 2_000;

/** Ventana para contar flood. */
export const CHAT_FLOOD_WINDOW_MS = 30_000;

/** Máximo de mensajes de usuario en la ventana de flood. */
export const CHAT_FLOOD_MAX_MESSAGES = 5;

/** Ventana para detectar texto repetido. */
export const CHAT_REPEAT_WINDOW_MS = 60_000;

/** Repeticiones del mismo texto normalizado antes de bloquear. */
export const CHAT_REPEAT_MAX_COUNT = 3;

export const CHAT_ERRORS = {
  empty: "Escribe un mensaje",
  tooLong: `Máximo ${CHAT_MAX_MESSAGE_LENGTH} caracteres`,
  flood: "Tranqui, compa. Dale chance al chat de respirar.",
  blocked: "Ese mensaje no pasó el filtro de convivencia.",
  repeated:
    "Ya mandaste eso varias veces. Dale chance al chat de respirar.",
} as const;
