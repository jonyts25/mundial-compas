/** Alcance de mensajes en `mensajes_chat.metadata.scope`. */
export const CHAT_SCOPE_PARTIDO_GLOBAL = "partido_global" as const;
export const CHAT_SCOPE_GRUPO_PRIVADO = "grupo_privado" as const;

export type ChatScope =
  | typeof CHAT_SCOPE_PARTIDO_GLOBAL
  | typeof CHAT_SCOPE_GRUPO_PRIVADO;

export function metadataPartidoGlobal(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { scope: CHAT_SCOPE_PARTIDO_GLOBAL, ...extra };
}

export function metadataGrupoPrivado(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { scope: CHAT_SCOPE_GRUPO_PRIVADO, sala: "grupo", ...extra };
}

export function isGrupoPrivadoScope(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as Record<string, unknown>).scope === CHAT_SCOPE_GRUPO_PRIVADO;
}
