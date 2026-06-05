-- Solicitudes de eliminación de quiniela privada (sin borrado automático en esta fase).

CREATE TABLE public.grupo_eliminacion_solicitudes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id         UUID NOT NULL REFERENCES public.ligas_privadas (id) ON DELETE CASCADE,
  solicitado_por  UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  motivo          TEXT NOT NULL,
  estatus         TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estatus IN ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
  revisado_por    UUID REFERENCES public.usuarios (id) ON DELETE SET NULL,
  revisado_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT grupo_eliminacion_motivo_minimo CHECK (char_length(trim(motivo)) >= 10)
);

CREATE INDEX idx_grupo_eliminacion_liga
  ON public.grupo_eliminacion_solicitudes (liga_id, created_at DESC);

CREATE UNIQUE INDEX idx_grupo_eliminacion_pendiente_por_liga
  ON public.grupo_eliminacion_solicitudes (liga_id)
  WHERE estatus = 'pendiente';

CREATE TRIGGER grupo_eliminacion_solicitudes_updated_at
  BEFORE UPDATE ON public.grupo_eliminacion_solicitudes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.grupo_eliminacion_solicitudes ENABLE ROW LEVEL SECURITY;

CREATE POLICY grupo_eliminacion_select_miembros ON public.grupo_eliminacion_solicitudes
  FOR SELECT TO authenticated
  USING (
    public.es_miembro_de_liga(liga_id, auth.uid())
  );

CREATE OR REPLACE FUNCTION public.solicitar_eliminacion_grupo(
  p_liga_id UUID,
  p_motivo TEXT
)
RETURNS public.grupo_eliminacion_solicitudes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.grupo_eliminacion_solicitudes%ROWTYPE;
  v_motivo TEXT := trim(p_motivo);
BEGIN
  IF v_motivo IS NULL OR char_length(v_motivo) < 10 THEN
    RAISE EXCEPTION 'El motivo debe tener al menos 10 caracteres';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ligas_privadas
    WHERE id = p_liga_id AND es_sistema = TRUE
  ) THEN
    RAISE EXCEPTION 'No se puede solicitar eliminación de la liga global';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.liga_miembros
    WHERE liga_id = p_liga_id
      AND usuario_id = auth.uid()
      AND rol IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Solo owner o admin pueden solicitar eliminación';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.grupo_eliminacion_solicitudes
    WHERE liga_id = p_liga_id AND estatus = 'pendiente'
  ) THEN
    RAISE EXCEPTION 'Ya hay una solicitud pendiente para esta quiniela';
  END IF;

  INSERT INTO public.grupo_eliminacion_solicitudes (
    liga_id,
    solicitado_por,
    motivo,
    estatus
  )
  VALUES (p_liga_id, auth.uid(), v_motivo, 'pendiente')
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_eliminacion_grupo(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_eliminacion_grupo(UUID, TEXT) TO authenticated;

COMMENT ON TABLE public.grupo_eliminacion_solicitudes IS
  'Solicitudes de baja de quinielas privadas; revisión manual por operadores de la app.';
