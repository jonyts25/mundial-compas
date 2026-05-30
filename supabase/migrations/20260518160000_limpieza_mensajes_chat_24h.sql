-- Limpieza automática de mensajes de chat con más de 24 horas

CREATE OR REPLACE FUNCTION public.limpiar_mensajes_chat_antiguos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_borrados INTEGER;
BEGIN
  DELETE FROM public.mensajes_chat
  WHERE created_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_borrados = ROW_COUNT;
  RETURN v_borrados;
END;
$$;

REVOKE ALL ON FUNCTION public.limpiar_mensajes_chat_antiguos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.limpiar_mensajes_chat_antiguos() TO service_role;

COMMENT ON FUNCTION public.limpiar_mensajes_chat_antiguos() IS
  'Elimina mensajes_chat con más de 24 h. Invocar vía pg_cron o Edge Function programada.';

-- pg_cron (Supabase): habilitar extensión en Dashboard → Database → Extensions → pg_cron
-- Luego ejecutar una sola vez:
--
-- SELECT cron.schedule(
--   'limpiar-mensajes-chat-24h',
--   '15 * * * *',
--   $$ SELECT public.limpiar_mensajes_chat_antiguos(); $$
-- );
--
-- Ver jobs: SELECT * FROM cron.job;
-- Quitar: SELECT cron.unschedule('limpiar-mensajes-chat-24h');
