-- Ownership / roles: RLS en inserción de miembros, backfill owners, listar miembros (solo miembros de la liga).

-- 1) Solo el creador puede insertarse como owner al crear el grupo; uniones por código usan RPC (rol miembro).
DROP POLICY IF EXISTS liga_miembros_insert ON public.liga_miembros;

CREATE POLICY liga_miembros_insert ON public.liga_miembros
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      rol = 'miembro'
      OR (
        rol = 'owner'
        AND EXISTS (
          SELECT 1
          FROM public.ligas_privadas l
          WHERE l.id = liga_id
            AND l.creador_id = auth.uid()
            AND l.es_sistema = FALSE
        )
      )
    )
  );

-- 2) Backfill: creador sin fila owner → insertar owner (no tocar si ya tiene otro rol)
INSERT INTO public.liga_miembros (liga_id, usuario_id, rol)
SELECT l.id, l.creador_id, 'owner'::public.rol_liga
FROM public.ligas_privadas l
WHERE l.es_sistema = FALSE
  AND l.creador_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.liga_miembros m
    WHERE m.liga_id = l.id AND m.usuario_id = l.creador_id
  )
ON CONFLICT (liga_id, usuario_id) DO NOTHING;

-- 3) Listar miembros de un grupo (solo si el caller es miembro)
CREATE OR REPLACE FUNCTION public.listar_miembros_grupo(p_liga_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_rows JSONB;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_autenticado');
  END IF;

  IF NOT public.es_miembro_de_liga(p_liga_id, v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_miembro');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ligas_privadas
    WHERE id = p_liga_id AND es_sistema = TRUE
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'liga_sistema');
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'usuario_id', m.usuario_id,
        'rol', m.rol,
        'nombre_visible', coalesce(u.nombre_visible, 'Compa'),
        'joined_at', m.joined_at
      )
      ORDER BY
        CASE m.rol
          WHEN 'owner' THEN 0
          WHEN 'admin' THEN 1
          ELSE 2
        END,
        m.joined_at NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO v_rows
  FROM public.liga_miembros m
  LEFT JOIN public.usuarios u ON u.id = m.usuario_id
  WHERE m.liga_id = p_liga_id;

  RETURN jsonb_build_object('ok', true, 'miembros', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.listar_miembros_grupo(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_miembros_grupo(UUID) TO authenticated;
