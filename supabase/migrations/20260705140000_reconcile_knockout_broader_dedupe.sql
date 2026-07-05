-- Reconcilia duplicados KO también por número FIFA y equipos+mismo día CDMX.
-- Incluye auditoría previa en comentarios para ejecutar manualmente si hace falta.

CREATE OR REPLACE FUNCTION public.reconcile_knockout_partido_duplicates()
RETURNS TABLE(canonical_id uuid, legacy_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CREATE TEMP TABLE knockout_dedupe_map (
    canonical_id uuid NOT NULL,
    legacy_id uuid NOT NULL,
    PRIMARY KEY (legacy_id)
  ) ON COMMIT DROP;

  -- 1) Mismo número FIFA en metadata.
  INSERT INTO knockout_dedupe_map (canonical_id, legacy_id)
  SELECT
    ids[1] AS canonical_id,
    unnest(ids[2:array_length(ids, 1)]) AS legacy_id
  FROM (
    SELECT
      array_agg(
        p.id
        ORDER BY
          CASE WHEN p.api_football_fixture_id >= 9000000 THEN 1 ELSE 0 END,
          CASE p.estatus
            WHEN 'en_vivo' THEN 0
            WHEN 'medio_tiempo' THEN 1
            WHEN 'finalizado' THEN 2
            WHEN 'programado' THEN 3
            ELSE 4
          END,
          p.updated_at DESC NULLS LAST
      ) AS ids
    FROM public.partidos p
    WHERE p.fase != 'grupos'
      AND nullif(trim(p.metadata->>'fifa_match_number'), '') IS NOT NULL
    GROUP BY (p.metadata->>'fifa_match_number')::int
    HAVING count(*) > 1
  ) grouped
  ON CONFLICT (legacy_id) DO NOTHING;

  -- 2) Mismo knockout_match_id.
  INSERT INTO knockout_dedupe_map (canonical_id, legacy_id)
  SELECT
    ids[1] AS canonical_id,
    unnest(ids[2:array_length(ids, 1)]) AS legacy_id
  FROM (
    SELECT
      array_agg(
        p.id
        ORDER BY
          CASE WHEN p.api_football_fixture_id >= 9000000 THEN 1 ELSE 0 END,
          CASE p.estatus
            WHEN 'en_vivo' THEN 0
            WHEN 'medio_tiempo' THEN 1
            WHEN 'finalizado' THEN 2
            WHEN 'programado' THEN 3
            ELSE 4
          END,
          p.updated_at DESC NULLS LAST
      ) AS ids
    FROM public.partidos p
    WHERE p.fase != 'grupos'
      AND nullif(trim(p.metadata->>'knockout_match_id'), '') IS NOT NULL
    GROUP BY p.metadata->>'knockout_match_id'
    HAVING count(*) > 1
  ) grouped
  ON CONFLICT (legacy_id) DO NOTHING;

  -- 3) Mismos equipos normalizados + mismo día CDMX (kickoffs distintos).
  INSERT INTO knockout_dedupe_map (canonical_id, legacy_id)
  SELECT
    ids[1] AS canonical_id,
    unnest(ids[2:array_length(ids, 1)]) AS legacy_id
  FROM (
    SELECT
      array_agg(
        p.id
        ORDER BY
          CASE WHEN p.api_football_fixture_id >= 9000000 THEN 1 ELSE 0 END,
          CASE p.estatus
            WHEN 'en_vivo' THEN 0
            WHEN 'medio_tiempo' THEN 1
            WHEN 'finalizado' THEN 2
            WHEN 'programado' THEN 3
            ELSE 4
          END,
          p.updated_at DESC NULLS LAST
      ) AS ids
    FROM public.partidos p
    WHERE p.fase != 'grupos'
    GROUP BY
      public.norm_partido_team_name(p.equipo_local_nombre),
      public.norm_partido_team_name(p.equipo_visitante_nombre),
      (p.fecha_kickoff AT TIME ZONE 'America/Mexico_City')::date
    HAVING count(*) > 1
  ) grouped
  ON CONFLICT (legacy_id) DO NOTHING;

  -- 4) Mismos equipos + mismo kickoff exacto (comportamiento previo).
  INSERT INTO knockout_dedupe_map (canonical_id, legacy_id)
  SELECT
    ids[1] AS canonical_id,
    unnest(ids[2:array_length(ids, 1)]) AS legacy_id
  FROM (
    SELECT
      array_agg(
        p.id
        ORDER BY
          CASE WHEN p.api_football_fixture_id >= 9000000 THEN 1 ELSE 0 END,
          CASE p.estatus
            WHEN 'en_vivo' THEN 0
            WHEN 'medio_tiempo' THEN 1
            WHEN 'finalizado' THEN 2
            WHEN 'programado' THEN 3
            ELSE 4
          END,
          p.updated_at DESC NULLS LAST
      ) AS ids
    FROM public.partidos p
    WHERE p.fase != 'grupos'
    GROUP BY
      public.norm_partido_team_name(p.equipo_local_nombre),
      public.norm_partido_team_name(p.equipo_visitante_nombre),
      p.fecha_kickoff
    HAVING count(*) > 1
  ) grouped
  ON CONFLICT (legacy_id) DO NOTHING;

  UPDATE public.partidos c
  SET metadata = COALESCE(l.metadata, '{}'::jsonb) || COALESCE(c.metadata, '{}'::jsonb)
  FROM public.partidos l
  JOIN knockout_dedupe_map m ON l.id = m.legacy_id
  WHERE c.id = m.canonical_id;

  DELETE FROM public.pronosticos pr
  USING knockout_dedupe_map m
  WHERE pr.partido_id = m.canonical_id
    AND EXISTS (
      SELECT 1
      FROM public.pronosticos pr2
      WHERE pr2.partido_id = m.legacy_id
        AND pr2.liga_id = pr.liga_id
        AND pr2.usuario_id = pr.usuario_id
    );

  UPDATE public.pronosticos pr
  SET partido_id = m.canonical_id
  FROM knockout_dedupe_map m
  WHERE pr.partido_id = m.legacy_id;

  UPDATE public.mensajes_chat mc
  SET partido_id = m.canonical_id
  FROM knockout_dedupe_map m
  WHERE mc.partido_id = m.legacy_id;

  UPDATE public.push_partidos_silenciados ps
  SET partido_id = m.canonical_id
  FROM knockout_dedupe_map m
  WHERE ps.partido_id = m.legacy_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.push_partidos_silenciados ps2
      WHERE ps2.partido_id = m.canonical_id
        AND ps2.usuario_id = ps.usuario_id
    );

  DELETE FROM public.push_partidos_silenciados ps
  USING knockout_dedupe_map m
  WHERE ps.partido_id = m.legacy_id;

  UPDATE public.notificaciones n
  SET partido_id = m.canonical_id
  FROM knockout_dedupe_map m
  WHERE n.partido_id = m.legacy_id;

  PERFORM public.recalcular_puntos_partido(m.canonical_id)
  FROM knockout_dedupe_map m
  JOIN public.partidos p ON p.id = m.canonical_id
  WHERE p.estatus = 'finalizado'
    AND p.marcador_local IS NOT NULL
    AND p.marcador_visitante IS NOT NULL;

  DELETE FROM public.partidos p
  USING knockout_dedupe_map m
  WHERE p.id = m.legacy_id;

  RETURN QUERY SELECT m.canonical_id, m.legacy_id FROM knockout_dedupe_map m;
END;
$$;

-- Auditoría: duplicados KO restantes (ejecutar antes/después del reconcile).
-- SELECT
--   coalesce(p.metadata->>'fifa_match_number', p.metadata->>'knockout_match_id', 'sin-slot') AS slot,
--   public.norm_partido_team_name(p.equipo_local_nombre) AS home,
--   public.norm_partido_team_name(p.equipo_visitante_nombre) AS away,
--   (p.fecha_kickoff AT TIME ZONE 'America/Mexico_City')::date AS dia_cdmx,
--   count(*) AS filas,
--   array_agg(p.id ORDER BY p.api_football_fixture_id) AS ids,
--   array_agg(p.api_football_fixture_id ORDER BY p.api_football_fixture_id) AS fixtures,
--   array_agg((SELECT count(*) FROM public.pronosticos pr WHERE pr.partido_id = p.id)) AS pronosticos_por_fila
-- FROM public.partidos p
-- WHERE p.fase != 'grupos' AND p.estatus != 'cancelado'
-- GROUP BY 1, 2, 3, 4
-- HAVING count(*) > 1
-- ORDER BY dia_cdmx, home;
