-- modo_competencia en configuracion JSONB (honor | cooperacion). Liga global en honor.

UPDATE public.ligas_privadas
SET configuracion = configuracion || '{"modo_competencia":"honor"}'::jsonb
WHERE id = 'a0000000-0000-4000-8000-000000000001'
  AND NOT (configuracion ? 'modo_competencia');

UPDATE public.ligas_privadas
SET configuracion = configuracion || '{"modo_competencia":"honor"}'::jsonb
WHERE es_sistema = FALSE
  AND creador_id IS NOT NULL
  AND NOT (configuracion ? 'modo_competencia');
