"use server";

/**
 * @deprecated Acuerdo económico en liga global deshabilitado (quiniela global = honor gratuita).
 * Implementación histórica en git; cooperacha reservada a grupos privados (fase futura).
 */
import { GLOBAL_ECONOMIC_UI_DISABLED } from "@/lib/legacy/global-economic-deprecated";

export type AcuerdoActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function guardarAcuerdoPago(
  _montoPorCompa: number,
  _fechaLimitePago: string,
  _notas?: string,
): Promise<AcuerdoActionResult> {
  return { ok: false, error: GLOBAL_ECONOMIC_UI_DISABLED };
}
