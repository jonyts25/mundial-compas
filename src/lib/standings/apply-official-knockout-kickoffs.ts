import type { SupabaseClient } from "@supabase/supabase-js";
import { extractFifaMatchNumber } from "@/lib/standings/knockout-schedule-utils";
import { KNOCKOUT_KICKOFF_UTC_ISO } from "@/lib/standings/world-cup-knockout-kickoffs";
import type { Partido } from "@/types/database";

export type KickoffFixRow = {
  id: string;
  fifaMatchNumber: number;
  from: string;
  to: string;
  label: string;
};

function resolveFifaMatchNumber(row: {
  fase?: string | null;
  fecha_kickoff: string;
  metadata: unknown;
  sede?: string | null;
}): number | null {
  const fromMeta = extractFifaMatchNumber(row as Partido);
  if (fromMeta != null) return fromMeta;
  if (row.fase === "tercer_lugar") return 103;
  if (row.fase === "final") return 104;
  return null;
}

/**
 * Corrige fecha_kickoff de eliminatorias programadas/aplazadas
 * contra el calendario FIFA oficial (UTC).
 */
export async function applyOfficialKnockoutKickoffs(
  supabase: SupabaseClient,
): Promise<{ updated: number; rows: KickoffFixRow[]; errors: string[] }> {
  const { data, error } = await supabase
    .from("partidos")
    .select(
      "id, fase, sede, fecha_kickoff, estatus, metadata, equipo_local_nombre, equipo_visitante_nombre",
    )
    .neq("fase", "grupos")
    .in("estatus", ["programado", "aplazado"]);

  if (error) {
    return { updated: 0, rows: [], errors: [error.message] };
  }

  const rows: KickoffFixRow[] = [];
  const errors: string[] = [];

  for (const row of data ?? []) {
    const n = resolveFifaMatchNumber(row);
    if (n == null) continue;

    const next = KNOCKOUT_KICKOFF_UTC_ISO[n];
    if (!next || row.fecha_kickoff === next) continue;

    const { error: upErr } = await supabase
      .from("partidos")
      .update({ fecha_kickoff: next })
      .eq("id", row.id);

    if (upErr) {
      errors.push(`M${n} ${row.id}: ${upErr.message}`);
      continue;
    }

    rows.push({
      id: row.id as string,
      fifaMatchNumber: n,
      from: String(row.fecha_kickoff),
      to: next,
      label: `${row.equipo_local_nombre} vs ${row.equipo_visitante_nombre}`,
    });
  }

  if (rows.length > 0) {
    console.info(
      `[kickoff-fix] updated=${rows.length} ${rows
        .map((r) => `M${r.fifaMatchNumber}:${r.from}→${r.to}`)
        .join(" ")}`,
    );
  }

  return { updated: rows.length, rows, errors };
}
