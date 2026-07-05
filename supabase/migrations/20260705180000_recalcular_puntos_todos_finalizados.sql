-- Recalcula puntos en todos los partidos finalizados (corrige pronósticos huérfanos tras dedupe).

DO $$
DECLARE
  v_partido_id uuid;
BEGIN
  FOR v_partido_id IN
    SELECT p.id
    FROM public.partidos p
    WHERE p.estatus = 'finalizado'
      AND p.marcador_local IS NOT NULL
      AND p.marcador_visitante IS NOT NULL
  LOOP
    PERFORM public.recalcular_puntos_partido(v_partido_id);
  END LOOP;
END;
$$;
