/**
 * Partidos de fase de grupos confirmados en TV abierta (Azteca 7).
 * Fuente: TV Azteca / prensa mayo 2026 — 17 de 32 en grupos; eliminatorias TBD.
 * Solo aplica a partidos del Mundial (excluye pilot).
 */

-- Resto del Mundial → ViX (no tocar pilot ni partidos ya marcados manualmente)
UPDATE public.partidos
SET
  canal_transmision = 'vix',
  updated_at = now()
WHERE (metadata->>'competencia' IS NULL OR metadata->>'competencia' <> 'pilot')
  AND fase = 'grupos'
  AND canal_transmision IN ('sin_asignar', 'vix');

-- Helper: coincide si ambos equipos aparecen (local/visitante indistinto)
CREATE OR REPLACE FUNCTION public.partido_tiene_equipos(
  local_n text,
  visit_n text,
  eq_a text,
  eq_b text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    (local_n ILIKE '%' || eq_a || '%' AND visit_n ILIKE '%' || eq_b || '%')
    OR (local_n ILIKE '%' || eq_b || '%' AND visit_n ILIKE '%' || eq_a || '%')
  );
$$;

UPDATE public.partidos p
SET
  canal_transmision = 'azteca_7',
  metadata = jsonb_set(
    COALESCE(p.metadata, '{}'::jsonb),
    '{canal_fuente}',
    '"tv_azteca_grupos_2026"'::jsonb,
    true
  ),
  updated_at = now()
WHERE (p.metadata->>'competencia' IS NULL OR p.metadata->>'competencia' <> 'pilot')
  AND p.fase = 'grupos'
  AND (
    public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Mexico', 'South Africa')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Mexico', 'Sud')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'United States', 'Paraguay')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Estados Unidos', 'Paraguay')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Brazil', 'Morocco')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Brasil', 'Marruecos')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Netherlands', 'Japan')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Países Bajos', 'Jap')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Holanda', 'Jap')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Argentina', 'Algeria')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Argentina', 'Argelia')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'England', 'Croatia')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Inglaterra', 'Croacia')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Mexico', 'Korea')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Mexico', 'Corea')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Brasil', 'Hait')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Brazil', 'Hait')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Netherlands', 'Sweden')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Países Bajos', 'Suecia')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Holanda', 'Suecia')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Spain', 'Saudi')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Espa', 'Arabia')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Norway', 'Senegal')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Noruega', 'Senegal')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Colombia', 'Congo')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Colombia', 'RD Congo')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Czech', 'Mexico')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Chequia', 'Mexico')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Czech', 'México')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Chequia', 'México')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Ecuador', 'Germany')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Ecuador', 'Alemania')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Uruguay', 'Spain')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Uruguay', 'Espa')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Panama', 'England')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Panam', 'Inglaterra')
    OR public.partido_tiene_equipos(p.equipo_local_nombre, p.equipo_visitante_nombre, 'Colombia', 'Portugal')
  );

-- Eliminatorias del Mundial sin canal aún → ViX por defecto (Azteca anunciará 15 más adelante)
UPDATE public.partidos
SET
  canal_transmision = 'vix',
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{canal_nota}',
    '"Eliminatorias: canal Azteca por confirmar; resto exclusivo ViX"'::jsonb,
    true
  ),
  updated_at = now()
WHERE (metadata->>'competencia' IS NULL OR metadata->>'competencia' <> 'pilot')
  AND fase <> 'grupos'
  AND canal_transmision = 'sin_asignar';

DROP FUNCTION IF EXISTS public.partido_tiene_equipos(text, text, text, text);
