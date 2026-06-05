-- Impedir nuevos mensajes en chat de quinielas privadas inactivas.

DROP POLICY IF EXISTS mensajes_insert ON public.mensajes_chat;

CREATE POLICY mensajes_insert ON public.mensajes_chat
  FOR INSERT TO authenticated
  WITH CHECK (
    tipo = 'usuario'
    AND usuario_id = auth.uid()
    AND (
      (
        partido_id IS NOT NULL
        AND COALESCE(metadata->>'scope', 'partido_global') = 'partido_global'
      )
      OR (
        partido_id IS NULL
        AND COALESCE(metadata->>'scope', '') = 'grupo_privado'
        AND public.es_miembro_de_liga(liga_id, auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.ligas_privadas l
          WHERE l.id = liga_id
            AND l.activa = TRUE
            AND l.es_sistema = FALSE
        )
      )
    )
  );
