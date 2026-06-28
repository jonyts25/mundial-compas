import type { SupabaseClient } from "@supabase/supabase-js";
import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";
import {
  buildKnockoutParticipantPatches,
  resolveKnockoutParticipants,
} from "@/lib/world-cup/resolve-knockout-participants";
import type { Partido } from "@/types/database";

const PARTIDO_SELECT =
  "id, fase, grupo, jornada, sede, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual, metadata";

export interface ResolveKnockoutParticipantsResult {
  dryRun: boolean;
  knockoutPartidos: number;
  resolved: number;
  patches: number;
  applied: number;
  definedMatches: number;
  tbdMatches: number;
  errors: string[];
}

export async function runResolveKnockoutParticipants(
  supabase: SupabaseClient,
  options: { dryRun?: boolean } = {},
): Promise<ResolveKnockoutParticipantsResult> {
  const dryRun = options.dryRun ?? false;

  const [{ data: gruposRaw, error: gErr }, { data: koRaw, error: koErr }] =
    await Promise.all([
      supabase
        .from("partidos")
        .select(PARTIDO_SELECT)
        .eq("fase", "grupos")
        .order("fecha_kickoff", { ascending: true }),
      supabase
        .from("partidos")
        .select(PARTIDO_SELECT)
        .neq("fase", "grupos")
        .order("fecha_kickoff", { ascending: true }),
    ]);

  if (gErr) throw new Error(gErr.message);
  if (koErr) throw new Error(koErr.message);

  const partidosGrupo: PartidoGrupoRow[] = (gruposRaw ?? []).map((p) => ({
    id: p.id as string,
    grupo: p.grupo as string | null,
    fase: p.fase as string,
    equipo_local_codigo: p.equipo_local_codigo as string,
    equipo_visitante_codigo: p.equipo_visitante_codigo as string,
    equipo_local_nombre: p.equipo_local_nombre as string,
    equipo_visitante_nombre: p.equipo_visitante_nombre as string,
    marcador_local: p.marcador_local as number | null,
    marcador_visitante: p.marcador_visitante as number | null,
    estatus: p.estatus as string,
  }));

  const knockoutPartidos = (koRaw ?? []) as Partido[];
  const resolved = resolveKnockoutParticipants({
    partidosGrupo,
    knockoutPartidos,
  });

  const patches = buildKnockoutParticipantPatches(
    partidosGrupo,
    knockoutPartidos,
  );

  const errors: string[] = [];
  let applied = 0;

  if (!dryRun) {
    for (const patch of patches) {
      const { error } = await supabase
        .from("partidos")
        .update({
          equipo_local_codigo: patch.equipo_local_codigo,
          equipo_visitante_codigo: patch.equipo_visitante_codigo,
          equipo_local_nombre: patch.equipo_local_nombre,
          equipo_visitante_nombre: patch.equipo_visitante_nombre,
          metadata: patch.metadata,
        })
        .eq("id", patch.partidoId)
        .in("estatus", ["programado", "aplazado"]);

      if (error) {
        errors.push(`${patch.partidoId}: ${error.message}`);
      } else {
        applied += 1;
      }
    }
  }

  return {
    dryRun,
    knockoutPartidos: knockoutPartidos.length,
    resolved: resolved.length,
    patches: patches.length,
    applied: dryRun ? 0 : applied,
    definedMatches: resolved.filter((r) => r.isDefined).length,
    tbdMatches: resolved.filter((r) => !r.isDefined).length,
    errors,
  };
}
