-- Asegura RPC es_miembro_de_liga (migración 20260518120000 a veces no aplicada en proyectos existentes).
-- Requerida por unirse_grupo_por_codigo y listar_miembros_grupo.

CREATE OR REPLACE FUNCTION public.es_miembro_de_liga(
  p_liga_id UUID,
  p_usuario_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.liga_miembros
    WHERE liga_id = p_liga_id
      AND usuario_id = p_usuario_id
  );
$$;

REVOKE ALL ON FUNCTION public.es_miembro_de_liga(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_miembro_de_liga(UUID, UUID) TO authenticated;
