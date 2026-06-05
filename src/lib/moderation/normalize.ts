/** Trim y espacios compactos para validación y almacenamiento. */
export function normalizeChatMessage(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Normalización para comparar duplicados (case-insensitive). */
export function normalizeForDuplicateCheck(text: string): string {
  return normalizeChatMessage(text).toLowerCase();
}
