-- Permite recalcular puntos al finalizar partido sin chocar con el candado T-5 de pronósticos.

CREATE OR REPLACE FUNCTION public.trg_bloquear_pronostico_kickoff()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_kickoff TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.goles_local IS NOT DISTINCT FROM OLD.goles_local
     AND NEW.goles_visitante IS NOT DISTINCT FROM OLD.goles_visitante THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  SELECT fecha_kickoff INTO v_kickoff
  FROM public.partidos WHERE id = NEW.partido_id;

  IF now() >= v_kickoff - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'El pronóstico ya no se puede modificar: quedan menos de 5 minutos para el pitazo';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
