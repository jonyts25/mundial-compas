import type { SupabaseClient } from "@supabase/supabase-js";
import { getApiSportsEnv } from "@/lib/env";
import { mergePartidoCatalogUpdate } from "@/lib/partidos/merge-partido-update";
import { resolveMundialCanalTransmision } from "@/lib/partidos/mundial-canales";
import {
  fetchWorldCupGroupLookup,
  parseJornadaFromRound,
  resolveGrupoFromTeams,
} from "@/lib/partidos/world-cup-group-lookup";
import { getTeamStorageCode } from "@/lib/utils";

export type RepairPartidoCatalogResult = {
  total: number;
  updated: number;
  gruposFilled: number;
  canalesFilled: number;
  codesFixed: number;
  pronosticosChecked: number;
  errors: string[];
};

type PartidoRow = {
  id: string;
  fase: string;
  grupo: string | null;
  jornada: number | null;
  equipo_local_codigo: string;
  equipo_visitante_codigo: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  canal_transmision: string;
  sede: string | null;
  metadata: Record<string, unknown> | null;
  marcador_local: number | null;
  marcador_visitante: number | null;
  estatus: string;
  minuto_actual: number | null;
  api_football_fixture_id: number;
};

function roundFromMetadata(metadata: Record<string, unknown> | null): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const api = metadata.api_football;
  if (api && typeof api === "object") {
    const round = (api as Record<string, unknown>).round;
    if (typeof round === "string") return round;
  }
  const apif = metadata.apifootball;
  if (apif && typeof apif === "object") {
    const round = (apif as Record<string, unknown>).match_round;
    if (typeof round === "string") return round;
  }
  return null;
}

function isPilotPartido(
  metadata: Record<string, unknown> | null,
  fixtureId?: number,
): boolean {
  if (fixtureId === 1528284) return true;
  if (!metadata || typeof metadata !== "object") return false;
  return metadata.competencia === "pilot" || metadata.pilot === true;
}

/**
 * Repara grupo, jornada, códigos de equipo y canal sin cambiar ids de partido
 * (pronósticos siguen apuntando al mismo UUID).
 */
export async function repairPartidoCatalog(
  supabase: SupabaseClient,
): Promise<RepairPartidoCatalogResult> {
  const { apiKey } = getApiSportsEnv();
  const groupLookup = await fetchWorldCupGroupLookup(apiKey);

  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(
      "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, canal_transmision, sede, metadata, marcador_local, marcador_visitante, estatus, minuto_actual, api_football_fixture_id",
    );

  if (error) throw new Error(error.message);

  const { count: pronosticosCount, error: prErr } = await supabase
    .from("pronosticos")
    .select("id", { count: "exact", head: true });
  if (prErr) throw new Error(prErr.message);

  const result: RepairPartidoCatalogResult = {
    total: partidos?.length ?? 0,
    updated: 0,
    gruposFilled: 0,
    canalesFilled: 0,
    codesFixed: 0,
    pronosticosChecked: pronosticosCount ?? 0,
    errors: [],
  };

  for (const raw of (partidos ?? []) as PartidoRow[]) {
    const pilot = isPilotPartido(raw.metadata, raw.api_football_fixture_id);
    const round = roundFromMetadata(raw.metadata);
    const jornadaFromRound = pilot ? null : parseJornadaFromRound(round);
    const grupoFromTeams =
      raw.fase === "grupos" && !pilot
        ? resolveGrupoFromTeams(
            groupLookup,
            raw.equipo_local_nombre,
            raw.equipo_visitante_nombre,
          )
        : null;

    const expectedLocalCode = getTeamStorageCode(raw.equipo_local_nombre);
    const expectedAwayCode = getTeamStorageCode(raw.equipo_visitante_nombre);

    const canalExpected = pilot
      ? raw.canal_transmision
      : resolveMundialCanalTransmision({
          fase: raw.fase,
          equipo_local_nombre: raw.equipo_local_nombre,
          equipo_visitante_nombre: raw.equipo_visitante_nombre,
          competenciaPilot: pilot,
        });

    const patch = mergePartidoCatalogUpdate(
      { ...raw, metadata: raw.metadata ?? undefined },
      {
        ...raw,
        metadata: raw.metadata ?? undefined,
        grupo: pilot ? null : (grupoFromTeams ?? raw.grupo),
        jornada: pilot ? null : (jornadaFromRound ?? raw.jornada),
        equipo_local_codigo: expectedLocalCode,
        equipo_visitante_codigo: expectedAwayCode,
        canal_transmision: canalExpected,
      },
    );

    const needsUpdate =
      patch.grupo !== raw.grupo ||
      patch.jornada !== raw.jornada ||
      patch.equipo_local_codigo !== raw.equipo_local_codigo ||
      patch.equipo_visitante_codigo !== raw.equipo_visitante_codigo ||
      patch.canal_transmision !== raw.canal_transmision;

    if (!needsUpdate) continue;

    const { error: upErr } = await supabase
      .from("partidos")
      .update({
        grupo: patch.grupo,
        jornada: patch.jornada,
        equipo_local_codigo: patch.equipo_local_codigo,
        equipo_visitante_codigo: patch.equipo_visitante_codigo,
        canal_transmision: patch.canal_transmision,
        updated_at: new Date().toISOString(),
      })
      .eq("id", raw.id);

    if (upErr) {
      result.errors.push(`${raw.id}: ${upErr.message}`);
      continue;
    }

    result.updated += 1;
    if (patch.grupo && patch.grupo !== raw.grupo) result.gruposFilled += 1;
    if (patch.canal_transmision !== raw.canal_transmision) result.canalesFilled += 1;
    if (
      patch.equipo_local_codigo !== raw.equipo_local_codigo ||
      patch.equipo_visitante_codigo !== raw.equipo_visitante_codigo
    ) {
      result.codesFixed += 1;
    }
  }

  return result;
}
