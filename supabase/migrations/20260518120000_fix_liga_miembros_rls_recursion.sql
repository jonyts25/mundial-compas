-- Corrige recursión infinita: liga_miembros_select consultaba liga_miembros dentro de sí misma.

DROP POLICY IF EXISTS liga_miembros_select ON public.liga_miembros;

-- Cada usuario solo lee sus propias filas de membresía (suficiente para pronósticos/chat vía EXISTS).
CREATE POLICY liga_miembros_select ON public.liga_miembros
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());

-- Ver compañeros de liga: usar función privilegiada (opcional, para leaderboard futuro)
CREATE OR REPLACE FUNCTION public.es_miembro_de_liga(p_liga_id UUID, p_usuario_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.liga_miembros
    WHERE liga_id = p_liga_id AND usuario_id = p_usuario_id
  );
$$;

REVOKE ALL ON FUNCTION public.es_miembro_de_liga(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_miembro_de_liga(UUID, UUID) TO authenticated;
