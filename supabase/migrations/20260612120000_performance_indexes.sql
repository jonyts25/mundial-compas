-- Índices para queries frecuentes en picos del Mundial (sin duplicar existentes).
-- Ya existen: idx_partidos_fecha, idx_pronosticos_usuario, idx_pronosticos_tabla,
-- idx_mensajes_chat_partido, idx_mensajes_chat_liga_general, idx_liga_miembros_usuario.

CREATE INDEX IF NOT EXISTS idx_partidos_fase_grupo
  ON public.partidos (fase, grupo);

CREATE INDEX IF NOT EXISTS idx_partidos_jornada
  ON public.partidos (jornada)
  WHERE jornada IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_created
  ON public.notificaciones (usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_liga_miembros_usuario_liga
  ON public.liga_miembros (usuario_id, liga_id);
