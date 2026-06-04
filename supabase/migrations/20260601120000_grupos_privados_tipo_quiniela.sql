-- Grupos privados: tipo_quiniela en configuracion + RPC unirse por codigo (RLS no expone ligas privadas a no miembros)

UPDATE public.ligas_privadas
SET configuracion = configuracion || '{"tipo_quiniela":"mundial_completo"}'::jsonb
WHERE id = 'a0000000-0000-4000-8000-000000000001'
  AND NOT (configuracion ? 'tipo_quiniela');

CREATE OR REPLACE FUNCTION public.preview_grupo_por_codigo(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liga RECORD;
  v_count INT;
  v_codigo TEXT;
BEGIN
  v_codigo := upper(trim(coalesce(p_codigo, '')));
  IF length(v_codigo) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  END IF;

  SELECT id, slug, nombre, descripcion, activa, configuracion
  INTO v_liga
  FROM public.ligas_privadas
  WHERE upper(codigo_invitacion) = v_codigo
    AND es_sistema = FALSE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  END IF;

  IF v_liga.activa IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'grupo_inactivo');
  END IF;

  SELECT count(*)::INT INTO v_count
  FROM public.liga_miembros
  WHERE liga_id = v_liga.id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_liga.id,
    'slug', v_liga.slug,
    'nombre', v_liga.nombre,
    'descripcion', v_liga.descripcion,
    'tipo_quiniela', coalesce(v_liga.configuracion->>'tipo_quiniela', 'mundial_completo'),
    'miembros_count', v_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.unirse_grupo_por_codigo(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_liga RECORD;
  v_codigo TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_autenticado');
  END IF;

  v_codigo := upper(trim(coalesce(p_codigo, '')));
  IF length(v_codigo) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  END IF;

  SELECT id, slug, nombre, activa, configuracion
  INTO v_liga
  FROM public.ligas_privadas
  WHERE upper(codigo_invitacion) = v_codigo
    AND es_sistema = FALSE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  END IF;

  IF v_liga.activa IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'grupo_inactivo');
  END IF;

  IF public.es_miembro_de_liga(v_liga.id, v_uid) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_member', true,
      'slug', v_liga.slug,
      'liga_id', v_liga.id
    );
  END IF;

  INSERT INTO public.liga_miembros (liga_id, usuario_id, rol)
  VALUES (v_liga.id, v_uid, 'miembro');

  RETURN jsonb_build_object(
    'ok', true,
    'already_member', false,
    'slug', v_liga.slug,
    'liga_id', v_liga.id,
    'tipo_quiniela', coalesce(v_liga.configuracion->>'tipo_quiniela', 'mundial_completo')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.contar_miembros_liga(p_liga_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::INT FROM public.liga_miembros WHERE liga_id = p_liga_id;
$$;

REVOKE ALL ON FUNCTION public.contar_miembros_liga(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contar_miembros_liga(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.preview_grupo_por_codigo(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unirse_grupo_por_codigo(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_grupo_por_codigo(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unirse_grupo_por_codigo(TEXT) TO authenticated;
