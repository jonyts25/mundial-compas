/**
 * @deprecated Usa `@/lib/narracion/comentaristas` (plantillas por región).
 * Re-exporta utilidades por compatibilidad.
 */
export {
  FRASES_GOL_CORTAS as FRASES_GOL,
  fraseCortaAleatoria as fraseAleatoria,
} from "@/lib/narracion/comentaristas";

export const FRASES_ROJA = ["¡El VAR no perdona!"] as const;
export const FRASES_INICIO = ["¡Arranca el partido!"] as const;
export const FRASES_MEDIO_TIEMPO = ["¡Medio tiempo!"] as const;
export const FRASES_FIN = ["¡Final del partido!"] as const;
