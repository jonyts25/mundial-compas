-- Fase 3: scopes de chat (partido global + grupo privado). Sin chat general nuevo.

ALTER TABLE public.mensajes_chat
  DROP CONSTRAINT IF EXISTS mensajes_partido_o_sala_liga;

ALTER TABLE public.mensajes_chat
  ADD CONSTRAINT mensajes_scope_valido CHECK (
    partido_id IS NOT NULL
    OR COALESCE(metadata->>'scope', '') = 'grupo_privado'
    OR COALESCE(metadata->>'sala', '') = 'liga_general'
  );

DROP POLICY IF EXISTS mensajes_select ON public.mensajes_chat;
DROP POLICY IF EXISTS mensajes_insert ON public.mensajes_chat;

CREATE POLICY mensajes_select ON public.mensajes_chat
  FOR SELECT TO authenticated
  USING (
    (
      partido_id IS NOT NULL
      AND COALESCE(metadata->>'scope', 'partido_global') = 'partido_global'
    )
    OR (
      partido_id IS NULL
      AND COALESCE(metadata->>'scope', '') = 'grupo_privado'
      AND public.es_miembro_de_liga(liga_id, auth.uid())
    )
    OR (
      partido_id IS NULL
      AND COALESCE(metadata->>'sala', '') = 'liga_general'
    )
  );

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
      )
    )
  );

COMMENT ON CONSTRAINT mensajes_scope_valido ON public.mensajes_chat IS
  'partido_global (partido_id), grupo_privado (sin partido), o legado liga_general.';
