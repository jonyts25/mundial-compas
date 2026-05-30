-- Partidos de ejemplo para probar el Home (ajusta fechas al día actual en CDMX)
-- Ejecutar manualmente en SQL Editor si la lista del día aparece vacía.

INSERT INTO public.partidos (
  api_football_fixture_id,
  fase,
  grupo,
  equipo_local_codigo,
  equipo_visitante_codigo,
  equipo_local_nombre,
  equipo_visitante_nombre,
  sede,
  fecha_kickoff,
  estatus,
  marcador_local,
  marcador_visitante,
  canal_transmision,
  minuto_actual
) VALUES
(
  900001,
  'grupos',
  'A',
  'MEX',
  'ARG',
  'México',
  'Argentina',
  'Estadio Azteca',
  (date_trunc('day', now() AT TIME ZONE 'America/Mexico_City') + interval '14 hours')
    AT TIME ZONE 'America/Mexico_City',
  'programado',
  NULL,
  NULL,
  'azteca_7',
  NULL
),
(
  900002,
  'grupos',
  'B',
  'BRA',
  'ESP',
  'Brasil',
  'España',
  'Akron',
  (date_trunc('day', now() AT TIME ZONE 'America/Mexico_City') + interval '20 hours')
    AT TIME ZONE 'America/Mexico_City',
  'programado',
  NULL,
  NULL,
  'vix',
  NULL
)
ON CONFLICT (api_football_fixture_id) DO NOTHING;
