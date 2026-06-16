-- Normaliza Congo DR (D.R. Congo / Congo DR) y fusiona duplicados restantes.

CREATE OR REPLACE FUNCTION public.norm_partido_team_name(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text;
BEGIN
  s := lower(trim(t));
  s := translate(s, 'çÇ', 'cC');
  s := regexp_replace(s, ' islands$', '', 'i');
  IF s = 'türkiye' OR s = 'turkiye' THEN
    s := 'turkey';
  END IF;
  IF s = 'czechia' THEN
    s := 'czech republic';
  END IF;
  IF s LIKE '%congo%' THEN
    IF s LIKE '%congo dr%'
      OR s LIKE '%dr congo%'
      OR s LIKE '%d.r. congo%'
      OR s LIKE '%d r congo%'
      OR s LIKE '%democratic republic%'
      OR s LIKE '%rep dem%'
      OR s ~ '^dr\.?\s*congo'
    THEN
      s := 'congo dr';
    END IF;
  END IF;
  s := regexp_replace(s, '\s+', ' ', 'g');
  RETURN s;
END;
$$;

CREATE TEMP TABLE partido_dedupe_map ON COMMIT DROP AS
WITH grouped AS (
  SELECT
    array_agg(id ORDER BY api_football_fixture_id DESC, created_at DESC) AS ids
  FROM public.partidos
  GROUP BY
    public.norm_partido_team_name(equipo_local_nombre),
    public.norm_partido_team_name(equipo_visitante_nombre),
    fecha_kickoff
  HAVING count(*) > 1
)
SELECT
  ids[1] AS canonical_id,
  unnest(ids[2:array_length(ids, 1)]) AS legacy_id
FROM grouped;

DELETE FROM public.pronosticos pr
USING partido_dedupe_map m
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
FROM partido_dedupe_map m
WHERE pr.partido_id = m.legacy_id;

UPDATE public.mensajes_chat mc
SET partido_id = m.canonical_id
FROM partido_dedupe_map m
WHERE mc.partido_id = m.legacy_id;

UPDATE public.push_partidos_silenciados ps
SET partido_id = m.canonical_id
FROM partido_dedupe_map m
WHERE ps.partido_id = m.legacy_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.push_partidos_silenciados ps2
    WHERE ps2.partido_id = m.canonical_id
      AND ps2.usuario_id = ps.usuario_id
  );

DELETE FROM public.push_partidos_silenciados ps
USING partido_dedupe_map m
WHERE ps.partido_id = m.legacy_id;

UPDATE public.notificaciones n
SET partido_id = m.canonical_id
FROM partido_dedupe_map m
WHERE n.partido_id = m.legacy_id;

-- Nombre canónico api-sports para filas que tenían D.R. Congo
UPDATE public.partidos p
SET
  equipo_local_nombre = CASE
    WHEN public.norm_partido_team_name(p.equipo_local_nombre) = 'congo dr'
      AND p.equipo_local_nombre <> 'Congo DR' THEN 'Congo DR'
    ELSE p.equipo_local_nombre
  END,
  equipo_visitante_nombre = CASE
    WHEN public.norm_partido_team_name(p.equipo_visitante_nombre) = 'congo dr'
      AND p.equipo_visitante_nombre <> 'Congo DR' THEN 'Congo DR'
    ELSE p.equipo_visitante_nombre
  END,
  updated_at = now()
WHERE public.norm_partido_team_name(p.equipo_local_nombre) = 'congo dr'
   OR public.norm_partido_team_name(p.equipo_visitante_nombre) = 'congo dr';

DELETE FROM public.partidos p
USING partido_dedupe_map m
WHERE p.id = m.legacy_id;
