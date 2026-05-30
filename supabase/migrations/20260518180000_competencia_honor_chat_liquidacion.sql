-- Competencia: chat liga general, ganador inalcanzable, tablón de liquidación

-- -----------------------------------------------------------------------------
-- Chat liga general (partido_id opcional)
-- -----------------------------------------------------------------------------

ALTER TABLE public.mensajes_chat
  ALTER COLUMN partido_id DROP NOT NULL;

ALTER TABLE public.mensajes_chat
  ADD CONSTRAINT mensajes_partido_o_sala_liga CHECK (
    partido_id IS NOT NULL
    OR COALESCE(metadata->>'sala', '') = 'liga_general'
  );

CREATE INDEX idx_mensajes_chat_liga_general
  ON public.mensajes_chat (liga_id, created_at DESC)
  WHERE partido_id IS NULL;

-- -----------------------------------------------------------------------------
-- Tablón de liquidación de pagos
-- -----------------------------------------------------------------------------

CREATE TABLE public.liquidacion_pagos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id               UUID NOT NULL REFERENCES public.ligas_privadas (id) ON DELETE CASCADE,
  deudor_id             UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ganador_id            UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  estado                TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'deposito_reportado', 'confirmado')),
  deposito_reportado_at TIMESTAMPTZ,
  confirmado_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (liga_id, deudor_id)
);

CREATE INDEX idx_liquidacion_pagos_liga ON public.liquidacion_pagos (liga_id, estado);

CREATE TRIGGER liquidacion_pagos_updated_at
  BEFORE UPDATE ON public.liquidacion_pagos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.liquidacion_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY liquidacion_select_miembros ON public.liquidacion_pagos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.liga_miembros m
      WHERE m.liga_id = liquidacion_pagos.liga_id AND m.usuario_id = auth.uid()
    )
  );

CREATE POLICY liquidacion_update_deudor ON public.liquidacion_pagos
  FOR UPDATE TO authenticated
  USING (deudor_id = auth.uid())
  WITH CHECK (deudor_id = auth.uid());

-- Ganador confirma recepción (solo su fila como ganador vía RPC)

-- -----------------------------------------------------------------------------
-- Evaluar líder inalcanzable
-- -----------------------------------------------------------------------------

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
  v_top1 RECORD;
  v_top2 RECORD;
  v_gap BIGINT;
  v_ganador_id UUID;
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

  SELECT * INTO v_top1
  FROM public.tabla_liderato_quiniela(p_liga_id)
  ORDER BY posicion
  LIMIT 1;

  IF v_top1 IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sin_participantes');
  END IF;

  SELECT * INTO v_top2
  FROM public.tabla_liderato_quiniela(p_liga_id)
  ORDER BY posicion
  OFFSET 1
  LIMIT 1;

  v_gap := v_top1.puntos_totales - COALESCE(v_top2.puntos_totales, 0);

  IF v_gap <= v_max_restantes THEN
    RETURN jsonb_build_object(
      'ok', true,
      'finalizada', false,
      'gap', v_gap,
      'max_restantes', v_max_restantes,
      'partidos_pendientes', v_pendientes
    );
  END IF;

  v_ganador_id := v_top1.usuario_id;

  UPDATE public.ligas_privadas
  SET
    configuracion = COALESCE(configuracion, '{}'::jsonb)
      || jsonb_build_object(
        'estado_competencia', 'finalizada_anticipada',
        'ganador_id', v_ganador_id::text,
        'ganador_nombre', v_top1.nombre_visible,
        'finalizada_anticipada_at', now(),
        'gap_puntos', v_gap,
        'puntos_maximos_restantes', v_max_restantes
      ),
    updated_at = now()
  WHERE id = p_liga_id;

  INSERT INTO public.liquidacion_pagos (liga_id, deudor_id, ganador_id, estado)
  SELECT p_liga_id, u.id, v_ganador_id, 'pendiente'
  FROM public.usuarios u
  INNER JOIN public.liga_miembros lm ON lm.usuario_id = u.id AND lm.liga_id = p_liga_id
  WHERE u.quiniela_paga = TRUE
    AND u.id <> v_ganador_id
  ON CONFLICT (liga_id, deudor_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'finalizada', true,
    'ganador_id', v_ganador_id,
    'gap', v_gap,
    'max_restantes', v_max_restantes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluar_ganador_inalcanzable(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluar_ganador_inalcanzable(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluar_ganador_inalcanzable(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_evaluar_ganador_tras_partido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estatus = 'finalizado'
     AND (OLD.estatus IS DISTINCT FROM 'finalizado'
          OR OLD.marcador_local IS DISTINCT FROM NEW.marcador_local
          OR OLD.marcador_visitante IS DISTINCT FROM NEW.marcador_visitante)
  THEN
    PERFORM public.evaluar_ganador_inalcanzable('a0000000-0000-4000-8000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER partidos_after_evaluar_ganador
  AFTER UPDATE ON public.partidos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_evaluar_ganador_tras_partido();

-- -----------------------------------------------------------------------------
-- RPC: ganador confirma recepción de pago
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirmar_recepcion_pago_liquidacion(p_pago_id UUID)
RETURNS public.liquidacion_pagos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.liquidacion_pagos%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.liquidacion_pagos WHERE id = p_pago_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado';
  END IF;

  IF v_row.ganador_id <> auth.uid() THEN
    RAISE EXCEPTION 'Solo el ganador puede confirmar recepción';
  END IF;

  IF v_row.estado <> 'deposito_reportado' THEN
    RAISE EXCEPTION 'El deudor debe reportar el depósito primero';
  END IF;

  UPDATE public.liquidacion_pagos
  SET estado = 'confirmado', confirmado_at = now(), updated_at = now()
  WHERE id = p_pago_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmar_recepcion_pago_liquidacion(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- Pronóstico: bloqueo T-5 min (alineado con app)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_bloquear_pronostico_kickoff()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_kickoff TIMESTAMPTZ;
BEGIN
  SELECT fecha_kickoff INTO v_kickoff
  FROM public.partidos WHERE id = NEW.partido_id;

  IF now() >= v_kickoff - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'El pronóstico ya no se puede modificar: quedan menos de 5 minutos para el pitazo';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
