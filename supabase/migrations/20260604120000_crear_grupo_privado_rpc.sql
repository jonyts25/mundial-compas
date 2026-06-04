-- Crear grupo privado atómico (evita RLS en INSERT+RETURNING y alta de owner).
-- Permite al creador leer su liga antes de aparecer en liga_miembros.

DROP POLICY IF EXISTS ligas_select ON public.ligas_privadas;

CREATE POLICY ligas_select ON public.ligas_privadas
  FOR SELECT TO authenticated
  USING (
    es_publica
    OR es_sistema
    OR creador_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.liga_miembros m
      WHERE m.liga_id = id AND m.usuario_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.crear_grupo_privado(
  p_nombre TEXT,
  p_slug TEXT,
  p_codigo_invitacion TEXT,
  p_descripcion TEXT DEFAULT NULL,
  p_configuracion JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_liga_id UUID;
  v_slug TEXT;
  v_codigo TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_autenticado');
  END IF;

  v_slug := lower(trim(coalesce(p_slug, '')));
  v_codigo := upper(trim(coalesce(p_codigo_invitacion, '')));

  IF length(trim(coalesce(p_nombre, ''))) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nombre_invalido');
  END IF;

  IF length(v_slug) < 2 OR length(v_codigo) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'parametros_invalidos');
  END IF;

  INSERT INTO public.ligas_privadas (
    slug,
    nombre,
    descripcion,
    codigo_invitacion,
    creador_id,
    es_publica,
    es_sistema,
    activa,
    configuracion
  )
  VALUES (
    v_slug,
    trim(p_nombre),
    nullif(trim(coalesce(p_descripcion, '')), ''),
    v_codigo,
    v_uid,
    FALSE,
    FALSE,
    TRUE,
    coalesce(p_configuracion, '{}'::jsonb)
  )
  RETURNING id INTO v_liga_id;

  INSERT INTO public.liga_miembros (liga_id, usuario_id, rol)
  VALUES (v_liga_id, v_uid, 'owner');

  RETURN jsonb_build_object(
    'ok', true,
    'slug', v_slug,
    'liga_id', v_liga_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slug_o_codigo_duplicado');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.crear_grupo_privado(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_grupo_privado(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
