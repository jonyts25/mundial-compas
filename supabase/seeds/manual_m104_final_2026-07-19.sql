-- M104 Final — España 1-0 Argentina (prórroga), 2026-07-19

UPDATE public.partidos
SET
  estatus = 'finalizado',
  marcador_local = 1,
  marcador_visitante = 0,
  minuto_actual = NULL,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'manual_live_snapshot_id', 'm104-ft-2026-07-19T2318Z',
    'manual_live_updated_at', now(),
    'reloj', jsonb_build_object(
      'period', 'AET',
      'anchorMinute', null,
      'anchoredAt', '2026-07-19T23:18:00.000Z',
      'ticking', false
    ),
    'eventos_clave', jsonb_build_array(
      jsonb_build_object('id','roja:arg:enzo:92:0','tipo','tarjeta_roja','jugador','Enzo Fernández','equipo','Argentina','minuto',92,'extra',null,'detail','Second Yellow','es_local',false),
      jsonb_build_object('id','gol:esp:torres:106:0','tipo','gol','jugador','Ferran Torres','equipo','España','minuto',106,'extra',null,'detail','Normal Goal','es_local',true)
    )
  )
WHERE metadata->>'fifa_match_number' = '104'
   OR api_football_fixture_id = 9000104;

SELECT public.recalcular_puntos_partido(id)
FROM public.partidos
WHERE metadata->>'fifa_match_number' = '104'
   OR api_football_fixture_id = 9000104;
