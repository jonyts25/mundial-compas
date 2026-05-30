-- Freemium: ganador económico solo entre quiniela_paga; ganador moral aparte

CREATE OR REPLACE FUNCTION public.evaluar_ganador_inalcanzable(p_liga_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado TEXT;
  v_pendientes INT;
  v_max_restantes INT;
  v_top1_paga RECORD;
  v_top2_paga RECORD;
  v_top1_global RECORD;
  v_gap BIGINT;
  v_ganador_paga_id UUID;
  v_ganador_moral_id UUID;
BEGIN
  SELECT COALESCE(configuracion->>'estado_competencia', 'activa')
  INTO v_estado
  FROM public.ligas_privadas
  WHERE id = p_liga_id;

  IF v_estado IN ('finalizada_anticipada', 'finalizada') THEN
    RETURN jsonb_build_object('ok', true, 'ya_finalizada', true, 'estado', v_estado);
  END IF;

  SELECT COUNT(*)::INT
  INTO v_pendientes
  FROM public.partidos
  WHERE estatus IS DISTINCT FROM 'finalizado';

  v_max_restantes := v_pendientes * 3;

  -- 1° y 2° SOLO entre participantes de quiniela de paga
  SELECT * INTO v_top1_paga
  FROM public.tabla_liderato_quiniela(p_liga_id) t
  WHERE t.quiniela_paga = TRUE
  ORDER BY t.posicion
  LIMIT 1;

  IF v_top1_paga IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'finalizada', false,
      'motivo', 'sin_participantes_paga',
      'partidos_pendientes', v_pendientes
    );
  END IF;

  SELECT * INTO v_top2_paga
  FROM public.tabla_liderato_quiniela(p_liga_id) t
  WHERE t.quiniela_paga = TRUE
  ORDER BY t.posicion
  OFFSET 1
  LIMIT 1;

  v_gap := v_top1_paga.puntos_totales - COALESCE(v_top2_paga.puntos_totales, 0);

  -- Líder global (puede ser gratuito) — solo para mensaje moral
  SELECT * INTO v_top1_global
  FROM public.tabla_liderato_quiniela(p_liga_id) t
  ORDER BY t.posicion
  LIMIT 1;

  v_ganador_moral_id := NULL;
  IF v_top1_global IS NOT NULL
     AND (
       v_top1_global.quiniela_paga = FALSE
       OR v_top1_global.usuario_id IS DISTINCT FROM v_top1_paga.usuario_id
     )
     AND v_top1_global.puntos_totales > v_top1_paga.puntos_totales
  THEN
    v_ganador_moral_id := v_top1_global.usuario_id;
  END IF;

  IF v_gap <= v_max_restantes THEN
    RETURN jsonb_build_object(
      'ok', true,
      'finalizada', false,
      'gap_paga', v_gap,
      'max_restantes', v_max_restantes,
      'partidos_pendientes', v_pendientes,
      'ganador_moral_id', v_ganador_moral_id
    );
  END IF;

  v_ganador_paga_id := v_top1_paga.usuario_id;

  UPDATE public.ligas_privadas
  SET
    configuracion = COALESCE(configuracion, '{}'::jsonb)
      || jsonb_build_object(
        'estado_competencia', 'finalizada_anticipada',
        'ganador_id', v_ganador_paga_id::text,
        'ganador_nombre', v_top1_paga.nombre_visible,
        'ganador_moral_id', CASE WHEN v_ganador_moral_id IS NOT NULL THEN v_ganador_moral_id::text ELSE NULL END,
        'ganador_moral_nombre', CASE
          WHEN v_ganador_moral_id IS NOT NULL THEN v_top1_global.nombre_visible
          ELSE NULL
        END,
        'finalizada_anticipada_at', now(),
        'gap_puntos_paga', v_gap,
        'puntos_maximos_restantes', v_max_restantes
      ),
    updated_at = now()
  WHERE id = p_liga_id;

  INSERT INTO public.liquidacion_pagos (liga_id, deudor_id, ganador_id, estado)
  SELECT p_liga_id, u.id, v_ganador_paga_id, 'pendiente'
  FROM public.usuarios u
  INNER JOIN public.liga_miembros lm ON lm.usuario_id = u.id AND lm.liga_id = p_liga_id
  WHERE u.quiniela_paga = TRUE
    AND u.id <> v_ganador_paga_id
  ON CONFLICT (liga_id, deudor_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'finalizada', true,
    'ganador_id', v_ganador_paga_id,
    'ganador_moral_id', v_ganador_moral_id,
    'gap_paga', v_gap,
    'max_restantes', v_max_restantes
  );
END;
$$;
