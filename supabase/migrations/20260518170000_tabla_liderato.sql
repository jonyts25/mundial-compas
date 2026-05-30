-- Tabla de liderato de quiniela por liga (puntos + desempate)

CREATE OR REPLACE FUNCTION public.tabla_liderato_quiniela(p_liga_id UUID)
RETURNS TABLE (
  posicion BIGINT,
  usuario_id UUID,
  nombre_visible TEXT,
  avatar_url TEXT,
  quiniela_paga BOOLEAN,
  puntos_totales BIGINT,
  exactos BIGINT,
  tendencias BIGINT,
  joined_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH miembros AS (
    SELECT
      lm.usuario_id,
      lm.joined_at,
      u.nombre_visible,
      u.avatar_url,
      u.quiniela_paga,
      u.created_at AS usuario_created_at
    FROM public.liga_miembros lm
    INNER JOIN public.usuarios u ON u.id = lm.usuario_id
    WHERE lm.liga_id = p_liga_id
  ),
  puntos_por_partido AS (
    SELECT
      pr.usuario_id,
      CASE
        WHEN pa.estatus = 'finalizado'
          AND pa.marcador_local IS NOT NULL
          AND pa.marcador_visitante IS NOT NULL
        THEN public.calcular_puntos_pronostico(
          pa.marcador_local,
          pa.marcador_visitante,
          pr.goles_local,
          pr.goles_visitante
        )::BIGINT
        ELSE 0::BIGINT
      END AS pts
    FROM public.pronosticos pr
    INNER JOIN public.partidos pa ON pa.id = pr.partido_id
    WHERE pr.liga_id = p_liga_id
  ),
  agregado AS (
    SELECT
      usuario_id,
      COALESCE(SUM(pts), 0) AS puntos_totales,
      COUNT(*) FILTER (WHERE pts = 3) AS exactos,
      COUNT(*) FILTER (WHERE pts = 1) AS tendencias
    FROM puntos_por_partido
    GROUP BY usuario_id
  ),
  ranking AS (
    SELECT
      m.usuario_id,
      m.nombre_visible,
      m.avatar_url,
      m.quiniela_paga,
      COALESCE(a.puntos_totales, 0) AS puntos_totales,
      COALESCE(a.exactos, 0) AS exactos,
      COALESCE(a.tendencias, 0) AS tendencias,
      m.joined_at,
      ROW_NUMBER() OVER (
        ORDER BY
          COALESCE(a.puntos_totales, 0) DESC,
          COALESCE(a.exactos, 0) DESC,
          COALESCE(a.tendencias, 0) DESC,
          m.joined_at ASC,
          m.usuario_created_at ASC
      ) AS posicion
    FROM miembros m
    LEFT JOIN agregado a ON a.usuario_id = m.usuario_id
  )
  SELECT
    r.posicion,
    r.usuario_id,
    r.nombre_visible,
    r.avatar_url,
    r.quiniela_paga,
    r.puntos_totales,
    r.exactos,
    r.tendencias,
    r.joined_at
  FROM ranking r
  ORDER BY r.posicion;
$$;

REVOKE ALL ON FUNCTION public.tabla_liderato_quiniela(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tabla_liderato_quiniela(UUID) TO authenticated;
