"use server";

import { revalidatePath } from "next/cache";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { resolveIsModerator } from "@/lib/auth/moderator";
import { acuerdoPagoResumen } from "@/lib/liga/acuerdo-pago";
import { createClient } from "@/lib/supabase/server";
import { createServerDataClient } from "@/lib/supabase/server-data";

export type AcuerdoActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function guardarAcuerdoPago(
  montoPorCompa: number,
  fechaLimitePago: string,
  notas?: string,
): Promise<AcuerdoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Inicia sesión" };

  const esModerador = await resolveIsModerator(supabase, user.id);
  if (!esModerador) {
    return { ok: false, error: "Solo moderadores pueden definir el acuerdo de paga" };
  }

  if (!Number.isFinite(montoPorCompa) || montoPorCompa <= 0) {
    return { ok: false, error: "Monto inválido" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaLimitePago.trim())) {
    return { ok: false, error: "Fecha inválida (usa formato AAAA-MM-DD)" };
  }

  const admin = createServerDataClient();
  const { data: liga, error: ligaError } = await admin
    .from("ligas_privadas")
    .select("configuracion")
    .eq("id", LIGA_GLOBAL_ID)
    .single();

  if (ligaError || !liga) {
    return { ok: false, error: "Liga no encontrada" };
  }

  const config = (liga.configuracion ?? {}) as Record<string, unknown>;
  const acuerdo = {
    monto_por_compa: Math.round(montoPorCompa),
    moneda: "MXN",
    fecha_limite_pago: fechaLimitePago.trim(),
    notas: notas?.trim() || null,
    acordado_at: new Date().toISOString(),
    acordado_por: user.id,
  };

  const { error: updateError } = await admin
    .from("ligas_privadas")
    .update({
      configuracion: { ...config, acuerdo_pago: acuerdo },
      updated_at: new Date().toISOString(),
    })
    .eq("id", LIGA_GLOBAL_ID);

  if (updateError) return { ok: false, error: updateError.message };

  const resumen = acuerdoPagoResumen({
    montoPorCompa: acuerdo.monto_por_compa,
    moneda: "MXN",
    fechaLimitePago: acuerdo.fecha_limite_pago,
    notas: acuerdo.notas,
    acordadoAt: acuerdo.acordado_at,
  });

  await admin.from("mensajes_chat").insert({
    partido_id: null,
    liga_id: LIGA_GLOBAL_ID,
    usuario_id: null,
    tipo: "sistema",
    contenido: `📋 Acuerdo de quiniela de paga: ${resumen}`,
    metadata: { sala: "liga_general", fuente: "acuerdo-pago" },
  });

  revalidatePath("/quiniela");
  revalidatePath("/leaderboard");

  return { ok: true };
}
