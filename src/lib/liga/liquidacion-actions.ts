"use server";

import { revalidatePath } from "next/cache";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type LiquidacionActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function guardarDepositoGanador(
  clabe: string,
  banco: string,
  titular: string,
): Promise<LiquidacionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Inicia sesión" };

  const clabeTrim = clabe.replace(/\s/g, "");
  if (clabeTrim.length < 10) {
    return { ok: false, error: "CLABE inválida" };
  }
  if (!banco.trim() || !titular.trim()) {
    return { ok: false, error: "Completa banco y titular" };
  }

  const { data: liga, error: ligaError } = await supabase
    .from("ligas_privadas")
    .select("configuracion")
    .eq("id", LIGA_GLOBAL_ID)
    .single();

  if (ligaError || !liga) {
    return { ok: false, error: "Liga no encontrada" };
  }

  const config = (liga.configuracion ?? {}) as Record<string, unknown>;
  if (config.ganador_id !== user.id) {
    return { ok: false, error: "Solo el ganador puede registrar datos de depósito" };
  }

  const { error } = await supabase
    .from("ligas_privadas")
    .update({
      configuracion: {
        ...config,
        ganador_deposito: {
          clabe: clabeTrim,
          banco: banco.trim(),
          titular: titular.trim(),
          actualizado_at: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", LIGA_GLOBAL_ID);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/quiniela");
  return { ok: true };
}

export async function reportarDepositoRealizado(
  pagoId: string,
): Promise<LiquidacionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Inicia sesión" };

  const { error } = await supabase
    .from("liquidacion_pagos")
    .update({
      estado: "deposito_reportado",
      deposito_reportado_at: new Date().toISOString(),
    })
    .eq("id", pagoId)
    .eq("deudor_id", user.id)
    .eq("estado", "pendiente");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/quiniela");
  return { ok: true };
}

export async function confirmarRecepcionPago(
  pagoId: string,
): Promise<LiquidacionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Inicia sesión" };

  const { error } = await supabase.rpc("confirmar_recepcion_pago_liquidacion", {
    p_pago_id: pagoId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/quiniela");
  return { ok: true };
}
