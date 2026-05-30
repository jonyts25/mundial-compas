-- Habilita Realtime para marcador en vivo y chat del partido.
-- Si ya están en la publicación, ignorar el error en SQL Editor.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.partidos;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_chat;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
