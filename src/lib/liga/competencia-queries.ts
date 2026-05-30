import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { createServerDataClient } from "@/lib/supabase/server-data";
import type {
  CompetenciaLigaState,
  GanadorHonorContext,
  LiquidacionPagoRow,
} from "@/lib/liga/competencia-types";
import type { LeaderboardRow } from "@/lib/leaderboard/queries";

function parseCompetencia(config: unknown): CompetenciaLigaState {
  const c =
    config && typeof config === "object"
      ? (config as Record<string, unknown>)
      : {};

  const deposito = c.ganador_deposito;
  let ganadorDeposito: CompetenciaLigaState["ganadorDeposito"] = null;
  if (deposito && typeof deposito === "object") {
    const d = deposito as Record<string, unknown>;
    ganadorDeposito = {
      clabe: String(d.clabe ?? ""),
      banco: String(d.banco ?? ""),
      titular: String(d.titular ?? ""),
    };
  }

  const estadoRaw = String(c.estado_competencia ?? "activa");
  const estado =
    estadoRaw === "finalizada_anticipada" || estadoRaw === "finalizada"
      ? estadoRaw
      : "activa";

  return {
    estado,
    ganadorId: c.ganador_id ? String(c.ganador_id) : null,
    ganadorNombre: c.ganador_nombre ? String(c.ganador_nombre) : null,
    ganadorMoralId: c.ganador_moral_id ? String(c.ganador_moral_id) : null,
    ganadorMoralNombre: c.ganador_moral_nombre
      ? String(c.ganador_moral_nombre)
      : null,
    finalizadaAt: c.finalizada_anticipada_at
      ? String(c.finalizada_anticipada_at)
      : null,
    ganadorDeposito,
  };
}

export async function fetchCompetenciaLiga(): Promise<CompetenciaLigaState> {
  const supabase = createServerDataClient();
  const { data, error } = await supabase
    .from("ligas_privadas")
    .select("configuracion")
    .eq("id", LIGA_GLOBAL_ID)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return parseCompetencia(data?.configuracion);
}

export async function fetchLiquidacionPagos(): Promise<LiquidacionPagoRow[]> {
  const supabase = createServerDataClient();

  const { data: pagos, error } = await supabase
    .from("liquidacion_pagos")
    .select(
      "id, deudor_id, ganador_id, estado, deposito_reportado_at, confirmado_at",
    )
    .eq("liga_id", LIGA_GLOBAL_ID)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.includes("does not exist")) return [];
    throw new Error(error.message);
  }

  if (!pagos?.length) return [];

  const deudorIds = [...new Set(pagos.map((p) => p.deudor_id))];
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nombre_visible, avatar_url")
    .in("id", deudorIds);

  const porId = new Map(
    (usuarios ?? []).map((u) => [
      u.id,
      { nombre: u.nombre_visible as string, avatar: u.avatar_url as string | null },
    ]),
  );

  return pagos.map((p) => {
    const u = porId.get(p.deudor_id);
    return {
      id: p.id,
      deudor_id: p.deudor_id,
      ganador_id: p.ganador_id,
      estado: p.estado as LiquidacionPagoRow["estado"],
      deposito_reportado_at: p.deposito_reportado_at,
      confirmado_at: p.confirmado_at,
      deudor_nombre: u?.nombre ?? "Compa",
      deudor_avatar: u?.avatar ?? null,
    };
  });
}

/**
 * Ganador moral = gratuito #1 global con más puntos que el #1 de paga.
 * Tras finalización usa config; en vivo calcula desde el liderato.
 */
export function resolveGanadorHonorContext(
  userId: string,
  filas: LeaderboardRow[],
  competencia: CompetenciaLigaState,
  quinielaPaga: boolean,
): GanadorHonorContext {
  const vacio: GanadorHonorContext = {
    esGanadorMoral: false,
    modo: "activo",
    ganadorEconomicoNombre: competencia.ganadorNombre,
  };

  if (quinielaPaga) return vacio;

  const finalizada = competencia.estado !== "activa";
  const modo = finalizada ? "final" : "activo";

  if (finalizada && competencia.ganadorMoralId === userId) {
    return {
      esGanadorMoral: true,
      modo,
      ganadorEconomicoNombre: competencia.ganadorNombre,
    };
  }

  const global1 = filas[0];
  const paga1 = filas.find((f) => f.quiniela_paga);

  if (!global1 || global1.usuario_id !== userId) return vacio;
  if (!paga1) {
    return {
      esGanadorMoral: true,
      modo,
      ganadorEconomicoNombre: null,
    };
  }

  if (global1.puntos_totales > paga1.puntos_totales) {
    return {
      esGanadorMoral: true,
      modo,
      ganadorEconomicoNombre: paga1.nombre_visible,
    };
  }

  return vacio;
}

/** Invoca evaluación SQL (idempotente). */
export async function evaluarGanadorInalcanzable(): Promise<Record<string, unknown>> {
  const supabase = createServerDataClient();
  const { data, error } = await supabase.rpc("evaluar_ganador_inalcanzable", {
    p_liga_id: LIGA_GLOBAL_ID,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? {}) as Record<string, unknown>;
}
