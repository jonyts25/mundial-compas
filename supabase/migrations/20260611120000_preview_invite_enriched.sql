-- Preview de invitación: modo de competencia y nombre del owner para UX de compartir.

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
  v_owner_nombre TEXT;
BEGIN
  v_codigo := upper(trim(coalesce(p_codigo, '')));
  IF length(v_codigo) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  END IF;

  SELECT id, slug, nombre, descripcion, activa, configuracion, creador_id
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

  SELECT u.nombre_visible INTO v_owner_nombre
  FROM public.usuarios u
  WHERE u.id = v_liga.creador_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_liga.id,
    'slug', v_liga.slug,
    'nombre', v_liga.nombre,
    'descripcion', v_liga.descripcion,
    'tipo_quiniela', coalesce(v_liga.configuracion->>'tipo_quiniela', 'mundial_completo'),
    'modo_competencia', coalesce(v_liga.configuracion->>'modo_competencia', 'honor'),
    'miembros_count', v_count,
    'owner_nombre', coalesce(v_owner_nombre, 'Un compa')
  );
END;
$$;
