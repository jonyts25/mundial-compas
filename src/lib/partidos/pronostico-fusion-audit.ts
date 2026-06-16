import type { SupabaseClient } from "@supabase/supabase-js";

export type PronosticoFusionEstado =
  | "scores_iguales"
  | "conflicto_pendiente"
  | "notificado"
  | "resuelto_usuario"
  | "resuelto_auto";

export interface PronosticoFusionConflictRow {
  migration_name: string;
  usuario_id: string;
  liga_id: string;
  partido_id: string;
  legacy_partido_id: string | null;
  kept_goles_local: number;
  kept_goles_visitante: number;
  discarded_goles_local: number;
  discarded_goles_visitante: number;
  scores_equal: boolean;
}

export interface AuditImportResult {
  inserted: number;
  updated: number;
  equal: number;
  pending: number;
  errors: string[];
}

function estadoFromRow(row: PronosticoFusionConflictRow): PronosticoFusionEstado {
  return row.scores_equal ? "scores_iguales" : "conflicto_pendiente";
}

/** Inserta o actualiza filas de auditoría a partir de un snapshot pre-fusión. */
export async function importPronosticoFusionAuditRows(
  supabase: SupabaseClient,
  rows: PronosticoFusionConflictRow[],
): Promise<AuditImportResult> {
  const result: AuditImportResult = {
    inserted: 0,
    updated: 0,
    equal: 0,
    pending: 0,
    errors: [],
  };

  for (const row of rows) {
    const estado = estadoFromRow(row);
    if (row.scores_equal) result.equal += 1;
    else result.pending += 1;

    const { data: existing, error: fetchError } = await supabase
      .from("pronostico_fusion_auditoria")
      .select("id, estado")
      .eq("migration_name", row.migration_name)
      .eq("usuario_id", row.usuario_id)
      .eq("liga_id", row.liga_id)
      .eq("partido_id", row.partido_id)
      .maybeSingle();

    if (fetchError) {
      result.errors.push(fetchError.message);
      continue;
    }

    const payload = {
      migration_name: row.migration_name,
      usuario_id: row.usuario_id,
      liga_id: row.liga_id,
      partido_id: row.partido_id,
      legacy_partido_id: row.legacy_partido_id,
      kept_goles_local: row.kept_goles_local,
      kept_goles_visitante: row.kept_goles_visitante,
      discarded_goles_local: row.discarded_goles_local,
      discarded_goles_visitante: row.discarded_goles_visitante,
      scores_equal: row.scores_equal,
      estado:
        existing?.estado === "resuelto_usuario" ||
        existing?.estado === "resuelto_auto"
          ? existing.estado
          : estado,
    };

    if (existing) {
      const { error } = await supabase
        .from("pronostico_fusion_auditoria")
        .update(payload)
        .eq("id", existing.id);
      if (error) result.errors.push(error.message);
      else result.updated += 1;
    } else {
      const { error } = await supabase
        .from("pronostico_fusion_auditoria")
        .insert(payload);
      if (error) result.errors.push(error.message);
      else result.inserted += 1;
    }
  }

  return result;
}

/** SQL para ejecutar en un snapshot PITR anterior a las migraciones de dedupe. */
export const PRONOSTICO_DEDUPE_CONFLICT_AUDIT_SQL = `
WITH congo_pairs AS (
  SELECT *
  FROM (
    VALUES
      (
        'dedupe_congo_dr_team_name'::text,
        '9e350b10-4df7-4d53-91d5-28ed53733e1d'::uuid,
        'ae9658dd-5094-4c9a-a107-319af4f39bc7'::uuid
      ),
      (
        'dedupe_congo_dr_team_name'::text,
        '644bec2a-de40-4032-8895-f601cfdfd2f7'::uuid,
        'ed280f7d-42b1-4afa-a05c-d3ee0af01275'::uuid
      ),
      (
        'dedupe_congo_dr_team_name'::text,
        '16142229-9f14-4827-b71e-102e8c91ad72'::uuid,
        'd2fe8d8b-06aa-4a4c-9b07-74531e84e97b'::uuid
      )
  ) AS t(migration_name, canonical_id, legacy_id)
),
provider_pairs AS (
  SELECT
    'dedupe_partidos_provider_fixture_ids'::text AS migration_name,
    ids[1] AS canonical_id,
    ids[2] AS legacy_id
  FROM (
    SELECT array_agg(id ORDER BY api_football_fixture_id DESC, created_at DESC) AS ids
    FROM public.partidos
    GROUP BY
      public.norm_partido_team_name(equipo_local_nombre),
      public.norm_partido_team_name(equipo_visitante_nombre),
      fecha_kickoff
    HAVING count(*) > 1
  ) grouped
  WHERE array_length(ids, 1) >= 2
),
all_pairs AS (
  SELECT * FROM congo_pairs
  UNION
  SELECT * FROM provider_pairs
)
SELECT
  p.migration_name,
  pr_l.usuario_id,
  pr_l.liga_id,
  p.canonical_id AS partido_id,
  p.legacy_id AS legacy_partido_id,
  pr_l.goles_local AS kept_goles_local,
  pr_l.goles_visitante AS kept_goles_visitante,
  pr_c.goles_local AS discarded_goles_local,
  pr_c.goles_visitante AS discarded_goles_visitante,
  (pr_l.goles_local = pr_c.goles_local
    AND pr_l.goles_visitante = pr_c.goles_visitante) AS scores_equal
FROM all_pairs p
JOIN public.pronosticos pr_l ON pr_l.partido_id = p.legacy_id
JOIN public.pronosticos pr_c ON pr_c.partido_id = p.canonical_id
  AND pr_c.usuario_id = pr_l.usuario_id
  AND pr_c.liga_id = pr_l.liga_id;
`.trim();

export interface NotifyFusionResult {
  notified: number;
  skipped: number;
  errors: string[];
}

/** Encola notificaciones in-app para conflictos pendientes no notificados. */
export async function notifyPronosticoFusionConflicts(
  supabase: SupabaseClient,
): Promise<NotifyFusionResult> {
  const result: NotifyFusionResult = {
    notified: 0,
    skipped: 0,
    errors: [],
  };

  const { data: pending, error } = await supabase
    .from("pronostico_fusion_auditoria")
    .select(
      `
      id,
      usuario_id,
      liga_id,
      partido_id,
      kept_goles_local,
      kept_goles_visitante,
      discarded_goles_local,
      discarded_goles_visitante,
      partidos!inner (
        equipo_local_nombre,
        equipo_visitante_nombre
      )
    `,
    )
    .eq("scores_equal", false)
    .in("estado", ["conflicto_pendiente", "notificado"])
    .is("notificado_at", null);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const row of pending ?? []) {
    const partidoRaw = row.partidos as unknown;
    const partido = (Array.isArray(partidoRaw) ? partidoRaw[0] : partidoRaw) as {
      equipo_local_nombre: string;
      equipo_visitante_nombre: string;
    };
    const titulo = "Confirma tu pronóstico";
    const cuerpo =
      `Al unificar partidos duplicados de ${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre}, ` +
      `conservamos ${row.kept_goles_local}-${row.kept_goles_visitante} ` +
      `y descartamos ${row.discarded_goles_local}-${row.discarded_goles_visitante}. ` +
      `Abre la quiniela para confirmar cuál es el correcto.`;

    const { error: insertError } = await supabase.from("notificaciones").insert({
      usuario_id: row.usuario_id,
      tipo: "pronostico_fusion",
      titulo,
      cuerpo,
      partido_id: row.partido_id,
      liga_id: row.liga_id,
      metadata: {
        fusion_auditoria_id: row.id,
        kept: {
          local: row.kept_goles_local,
          visitante: row.kept_goles_visitante,
        },
        discarded: {
          local: row.discarded_goles_local,
          visitante: row.discarded_goles_visitante,
        },
      },
    });

    if (insertError) {
      result.errors.push(insertError.message);
      continue;
    }

    const { error: updateError } = await supabase
      .from("pronostico_fusion_auditoria")
      .update({
        estado: "notificado",
        notificado_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) result.errors.push(updateError.message);
    else result.notified += 1;
  }

  return result;
}
