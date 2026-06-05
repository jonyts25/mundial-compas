"use server";

/**
 * @deprecated Tablón de liquidación global retirado (solo `liquidacion_pagos` en BD).
 * Reservado para cooperacha en grupos privados (fase futura).
 */
import { GLOBAL_ECONOMIC_UI_DISABLED } from "@/lib/legacy/global-economic-deprecated";

export type LiquidacionActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function guardarDepositoGanador(
  _clabe: string,
  _banco: string,
  _titular: string,
): Promise<LiquidacionActionResult> {
  return { ok: false, error: GLOBAL_ECONOMIC_UI_DISABLED };
}

export async function reportarDepositoRealizado(
  _pagoId: string,
): Promise<LiquidacionActionResult> {
  return { ok: false, error: GLOBAL_ECONOMIC_UI_DISABLED };
}

export async function confirmarRecepcionPago(
  _pagoId: string,
): Promise<LiquidacionActionResult> {
  return { ok: false, error: GLOBAL_ECONOMIC_UI_DISABLED };
}
