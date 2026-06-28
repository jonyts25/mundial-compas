-- Reconcilia duplicados KO: placeholder (9xxxxxx) + fixture real api-sports.
-- Canonical = fixture real (< 9_000_000) con estatus más avanzado.

CREATE OR REPLACE FUNCTION public.reconcile_knockout_partido_duplicates()
RETURNS TABLE(canonical_id uuid, legacy_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CREATE TEMP TABLE knockout_dedupe_map ON COMMIT DROP AS
  WITH grouped AS (
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
  )
  SELECT
    ids[1] AS canonical_id,
    unnest(ids[2:array_length(ids, 1)]) AS legacy_id
  FROM grouped;

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

  DELETE FROM public.partidos p
  USING knockout_dedupe_map m
  WHERE p.id = m.legacy_id;

  RETURN QUERY SELECT m.canonical_id, m.legacy_id FROM knockout_dedupe_map m;
END;
$$;
