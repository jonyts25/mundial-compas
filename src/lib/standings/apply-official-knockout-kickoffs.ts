import type { SupabaseClient } from "@supabase/supabase-js";
import { KNOCKOUT_KICKOFF_UTC_ISO } from "@/lib/standings/world-cup-knockout-kickoffs";

export type KickoffFixRow = {
  id: string;
  fifaMatchNumber: number;
  from: string;
  to: string;
  label: string;
};

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
      "id, fecha_kickoff, estatus, metadata, equipo_local_nombre, equipo_visitante_nombre",
    )
    .neq("fase", "grupos")
    .in("estatus", ["programado", "aplazado"]);

  if (error) {
    return { updated: 0, rows: [], errors: [error.message] };
  }

  const rows: KickoffFixRow[] = [];
  const errors: string[] = [];

  for (const row of data ?? []) {
    const meta = (row.metadata ?? {}) as { fifa_match_number?: unknown };
    const n = meta.fifa_match_number;
    if (typeof n !== "number") continue;

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
