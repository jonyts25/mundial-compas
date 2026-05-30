-- Silenciar push de un partido concreto (opt-out puntual; default = recibir todo).

CREATE TABLE public.push_partidos_silenciados (
  usuario_id  UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  partido_id  UUID NOT NULL REFERENCES public.partidos (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, partido_id)
);

CREATE INDEX idx_push_partidos_silenciados_partido
  ON public.push_partidos_silenciados (partido_id);

ALTER TABLE public.push_partidos_silenciados ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_partidos_silenciados_select_own ON public.push_partidos_silenciados
  FOR SELECT TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY push_partidos_silenciados_insert_own ON public.push_partidos_silenciados
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY push_partidos_silenciados_delete_own ON public.push_partidos_silenciados
  FOR DELETE TO authenticated
  USING (auth.uid() = usuario_id);
