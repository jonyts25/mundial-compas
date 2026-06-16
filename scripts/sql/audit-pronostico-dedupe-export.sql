-- Ejecutar en un proyecto clonado vía Supabase Dashboard:
-- Database → Backups → Restore to a new project
-- Punto de restauración: ANTES del 15-jun-2026 (antes del primer dedupe).
--
-- Guarda el array JSON del resultado en conflicts.json e importa:
--   node scripts/audit-pronostico-dedupe.mjs --file=conflicts.json --notify

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
SELECT jsonb_agg(row_to_json(t)::jsonb) AS conflicts
FROM (
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
    AND pr_c.liga_id = pr_l.liga_id
) t;
