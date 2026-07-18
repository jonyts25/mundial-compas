-- M103 Tercer lugar — resultado final 2026-07-18 (Francia 4-6 Inglaterra, tras prórroga)
-- Ejecutar en Supabase SQL Editor si el deploy aún no aplicó el snapshot.

UPDATE public.partidos
SET
  estatus = 'finalizado',
  marcador_local = 4,
  marcador_visitante = 6,
  minuto_actual = NULL,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'manual_live_snapshot_id', 'm103-ft-2026-07-18T2304Z',
    'manual_live_updated_at', now(),
    'reloj', jsonb_build_object(
      'period', 'FT',
      'anchorMinute', null,
      'anchoredAt', '2026-07-18T23:04:00.000Z',
      'ticking', false
    ),
    'eventos_clave', jsonb_build_array(
      jsonb_build_object('id','gol:eng:rice:3:0','tipo','gol','jugador','Declan Rice','equipo','Inglaterra','minuto',3,'extra',null,'detail','Normal Goal','es_local',false),
      jsonb_build_object('id','gol:eng:konsa:18:0','tipo','gol','jugador','Ezri Konsa','equipo','Inglaterra','minuto',18,'extra',null,'detail','Normal Goal','es_local',false),
      jsonb_build_object('id','gol:eng:saka:37:0','tipo','gol','jugador','Bukayo Saka','equipo','Inglaterra','minuto',37,'extra',null,'detail','Normal Goal','es_local',false),
      jsonb_build_object('id','gol:eng:saka:45:1','tipo','gol','jugador','Bukayo Saka','equipo','Inglaterra','minuto',45,'extra',1,'detail','Normal Goal','es_local',false),
      jsonb_build_object('id','gol:fra:mbappe:48:0','tipo','gol','jugador','Kylian Mbappé','equipo','Francia','minuto',48,'extra',null,'detail','Normal Goal','es_local',true),
      jsonb_build_object('id','gol:fra:barcola:54:0','tipo','gol','jugador','Bradley Barcola','equipo','Francia','minuto',54,'extra',null,'detail','Normal Goal','es_local',true),
      jsonb_build_object('id','gol:fra:mbappe:66:0','tipo','gol','jugador','Kylian Mbappé','equipo','Francia','minuto',66,'extra',null,'detail','Normal Goal','es_local',true),
      jsonb_build_object('id','gol:eng:saka:87:0:pen','tipo','gol','jugador','Bukayo Saka','equipo','Inglaterra','minuto',87,'extra',null,'detail','Penalty','es_local',false),
      jsonb_build_object('id','gol:fra:dembele:90:6','tipo','gol','jugador','Ousmane Dembélé','equipo','Francia','minuto',90,'extra',6,'detail','Normal Goal','es_local',true),
      jsonb_build_object('id','gol:eng:bellingham:90:8','tipo','gol','jugador','Jude Bellingham','equipo','Inglaterra','minuto',90,'extra',8,'detail','Normal Goal','es_local',false)
    )
  )
WHERE metadata->>'fifa_match_number' = '103'
   OR api_football_fixture_id = 9000103;

-- Recalcular puntos quiniela (el trigger debería correr al pasar a finalizado)
SELECT public.recalcular_puntos_partido(id)
FROM public.partidos
WHERE metadata->>'fifa_match_number' = '103'
   OR api_football_fixture_id = 9000103;
