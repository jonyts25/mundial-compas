-- =============================================================================
-- Mundial Compas — Schema inicial (v1)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- IDs fijos para seed del sistema (no dependen de auth.users)
-- Liga global por defecto
-- Usuario sistema (solo referencia para ligas es_sistema; sin login real)

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------

CREATE TYPE estatus_partido AS ENUM (
  'programado',
  'en_vivo',
  'medio_tiempo',
  'finalizado',
  'suspendido',
  'aplazado',
  'cancelado'
);

CREATE TYPE canal_transmision AS ENUM (
  'azteca_7',
  'vix',
  'azteca_7_y_vix',
  'sin_asignar'
);

CREATE TYPE fase_mundial AS ENUM (
  'grupos',
  'dieciseisavos',
  'octavos',
  'cuartos',
  'semifinal',
  'tercer_lugar',
  'final'
);

CREATE TYPE rol_liga AS ENUM ('owner', 'admin', 'miembro');

CREATE TYPE tipo_dato_mamalón AS ENUM (
  'trivia',
  'hito',
  'curiosidad',
  'record',
  'meme_historico'
);

CREATE TYPE tipo_mensaje_chat AS ENUM (
  'usuario',
  'sistema',
  'dato_mamalón',
  'evento_partido'
);

CREATE TYPE tipo_notificacion AS ENUM (
  'dato_mamalón',
  'inicio_partido',
  'gol',
  'fin_partido',
  'recordatorio_pronostico',
  'liga',
  'quiniela_honor'
);

-- -----------------------------------------------------------------------------
-- Usuarios (perfil de app)
-- -----------------------------------------------------------------------------

CREATE TABLE public.usuarios (
  id                        UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username                  CITEXT UNIQUE,
  nombre_visible            TEXT NOT NULL,
  avatar_url                TEXT,
  -- Badge visual en leaderboard; NO bloquea chat ni pronósticos
  quiniela_paga             BOOLEAN NOT NULL DEFAULT FALSE,
  quiniela_paga_at          TIMESTAMPTZ,
  terminos_honor_aceptados_at TIMESTAMPTZ,
  terminos_honor_version    TEXT,
  equipos_favoritos         TEXT[] NOT NULL DEFAULT '{}',
  push_habilitado           BOOLEAN NOT NULL DEFAULT TRUE,
  metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_equipos_favoritos_max
    CHECK (cardinality(equipos_favoritos) <= 3),
  CONSTRAINT usuarios_quiniela_paga_requiere_terminos CHECK (
    quiniela_paga = FALSE
    OR (terminos_honor_aceptados_at IS NOT NULL AND terminos_honor_version IS NOT NULL)
  )
);

COMMENT ON COLUMN public.usuarios.metadata IS
  'JSON extensible. Tablón post-mundial: metadata.tablon_confirmacion { estado, confirmaciones[], notas }';

CREATE INDEX idx_usuarios_quiniela_paga ON public.usuarios (quiniela_paga)
  WHERE quiniela_paga = TRUE;

-- -----------------------------------------------------------------------------
-- Ligas privadas + liga global del sistema
-- -----------------------------------------------------------------------------

CREATE TABLE public.ligas_privadas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              CITEXT NOT NULL UNIQUE,
  nombre            TEXT NOT NULL,
  descripcion       TEXT,
  codigo_invitacion TEXT NOT NULL UNIQUE,
  creador_id        UUID REFERENCES public.usuarios (id) ON DELETE SET NULL,
  es_publica        BOOLEAN NOT NULL DEFAULT FALSE,
  es_sistema        BOOLEAN NOT NULL DEFAULT FALSE,
  configuracion     JSONB NOT NULL DEFAULT '{}'::jsonb,
  activa            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ligas_creador_si_no_sistema CHECK (
    es_sistema = TRUE OR creador_id IS NOT NULL
  )
);

CREATE TABLE public.liga_miembros (
  liga_id    UUID NOT NULL REFERENCES public.ligas_privadas (id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  rol        rol_liga NOT NULL DEFAULT 'miembro',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (liga_id, usuario_id)
);

CREATE INDEX idx_liga_miembros_usuario ON public.liga_miembros (usuario_id);

-- -----------------------------------------------------------------------------
-- Partidos
-- -----------------------------------------------------------------------------

CREATE TABLE public.partidos (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_football_fixture_id    INTEGER UNIQUE,
  fase                       fase_mundial NOT NULL DEFAULT 'grupos',
  grupo                      CHAR(1),
  jornada                    SMALLINT,
  equipo_local_codigo        TEXT NOT NULL,
  equipo_visitante_codigo    TEXT NOT NULL,
  equipo_local_nombre        TEXT NOT NULL,
  equipo_visitante_nombre    TEXT NOT NULL,
  sede                       TEXT,
  fecha_kickoff              TIMESTAMPTZ NOT NULL,
  estatus                    estatus_partido NOT NULL DEFAULT 'programado',
  marcador_local             SMALLINT,
  marcador_visitante         SMALLINT,
  canal_transmision          canal_transmision NOT NULL DEFAULT 'sin_asignar',
  minuto_actual              SMALLINT,
  metadata                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  puntos_calculados          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT partidos_marcador_no_negativo CHECK (
    (marcador_local IS NULL OR marcador_local >= 0)
    AND (marcador_visitante IS NULL OR marcador_visitante >= 0)
  )
);

CREATE INDEX idx_partidos_fecha ON public.partidos (fecha_kickoff);
CREATE INDEX idx_partidos_estatus ON public.partidos (estatus);
CREATE INDEX idx_partidos_api_football ON public.partidos (api_football_fixture_id)
  WHERE api_football_fixture_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Pronósticos (siempre scoped por liga_id)
-- -----------------------------------------------------------------------------

CREATE TABLE public.pronosticos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id              UUID NOT NULL REFERENCES public.ligas_privadas (id) ON DELETE CASCADE,
  usuario_id           UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  partido_id           UUID NOT NULL REFERENCES public.partidos (id) ON DELETE CASCADE,
  goles_local          SMALLINT NOT NULL CHECK (goles_local >= 0 AND goles_local <= 20),
  goles_visitante      SMALLINT NOT NULL CHECK (goles_visitante >= 0 AND goles_visitante <= 20),
  puntos               SMALLINT NOT NULL DEFAULT 0 CHECK (puntos >= 0 AND puntos <= 3),
  puntos_calculados_at TIMESTAMPTZ,
  locked_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (liga_id, usuario_id, partido_id)
);

CREATE INDEX idx_pronosticos_tabla ON public.pronosticos (liga_id, partido_id, puntos DESC);
CREATE INDEX idx_pronosticos_usuario ON public.pronosticos (usuario_id, liga_id);

-- -----------------------------------------------------------------------------
-- Datos mamalones
-- -----------------------------------------------------------------------------

CREATE TABLE public.datos_mamalones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            tipo_dato_mamalón NOT NULL,
  titulo          TEXT NOT NULL,
  contenido       TEXT NOT NULL,
  mundial_anio    SMALLINT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  contexto        TEXT[] NOT NULL DEFAULT '{cualquiera}',
  prioridad       SMALLINT NOT NULL DEFAULT 0,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_datos_mamalones_activos ON public.datos_mamalones (activo, prioridad DESC)
  WHERE activo = TRUE;

-- -----------------------------------------------------------------------------
-- Chat en tiempo real
-- -----------------------------------------------------------------------------

CREATE TABLE public.mensajes_chat (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id      UUID NOT NULL REFERENCES public.partidos (id) ON DELETE CASCADE,
  liga_id         UUID NOT NULL REFERENCES public.ligas_privadas (id) ON DELETE CASCADE,
  usuario_id      UUID REFERENCES public.usuarios (id) ON DELETE SET NULL,
  tipo            tipo_mensaje_chat NOT NULL DEFAULT 'usuario',
  contenido       TEXT NOT NULL,
  dato_mamalón_id UUID REFERENCES public.datos_mamalones (id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mensajes_usuario_requiere_autor CHECK (
    (tipo = 'usuario' AND usuario_id IS NOT NULL)
    OR (tipo <> 'usuario')
  )
);

CREATE INDEX idx_mensajes_chat_partido ON public.mensajes_chat (partido_id, liga_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Webhooks API-Football
-- -----------------------------------------------------------------------------

CREATE TABLE public.webhook_eventos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor         TEXT NOT NULL DEFAULT 'api-football',
  evento_externo_id TEXT NOT NULL,
  tipo_evento       TEXT NOT NULL,
  payload           JSONB NOT NULL,
  partido_id        UUID REFERENCES public.partidos (id) ON DELETE SET NULL,
  procesado         BOOLEAN NOT NULL DEFAULT FALSE,
  error             TEXT,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,
  UNIQUE (proveedor, evento_externo_id)
);

-- -----------------------------------------------------------------------------
-- Notificaciones push
-- -----------------------------------------------------------------------------

CREATE TABLE public.notificaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  tipo            tipo_notificacion NOT NULL,
  titulo          TEXT NOT NULL,
  cuerpo          TEXT NOT NULL,
  partido_id      UUID REFERENCES public.partidos (id) ON DELETE SET NULL,
  liga_id         UUID REFERENCES public.ligas_privadas (id) ON DELETE SET NULL,
  dato_mamalón_id UUID REFERENCES public.datos_mamalones (id) ON DELETE SET NULL,
  enviada         BOOLEAN NOT NULL DEFAULT FALSE,
  enviada_at      TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_pendientes ON public.notificaciones (enviada, created_at)
  WHERE enviada = FALSE;

-- -----------------------------------------------------------------------------
-- Funciones de dominio
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calcular_puntos_pronostico(
  marcador_local SMALLINT,
  marcador_visitante SMALLINT,
  pred_local SMALLINT,
  pred_visitante SMALLINT
)
RETURNS SMALLINT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN marcador_local = pred_local AND marcador_visitante = pred_visitante THEN 3
    WHEN sign(marcador_local - marcador_visitante) = sign(pred_local - pred_visitante) THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.recalcular_puntos_partido(p_partido_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_local SMALLINT;
  v_visitante SMALLINT;
BEGIN
  SELECT marcador_local, marcador_visitante
  INTO v_local, v_visitante
  FROM public.partidos
  WHERE id = p_partido_id
    AND estatus = 'finalizado'
    AND marcador_local IS NOT NULL
    AND marcador_visitante IS NOT NULL;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.pronosticos pr
  SET
    puntos = public.calcular_puntos_pronostico(
      v_local, v_visitante, pr.goles_local, pr.goles_visitante
    ),
    puntos_calculados_at = now(),
    updated_at = now()
  WHERE pr.partido_id = p_partido_id;

  UPDATE public.partidos
  SET puntos_calculados = TRUE, updated_at = now()
  WHERE id = p_partido_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_partido_finalizado_puntos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estatus = 'finalizado'
     AND (OLD.estatus IS DISTINCT FROM 'finalizado'
          OR OLD.marcador_local IS DISTINCT FROM NEW.marcador_local
          OR OLD.marcador_visitante IS DISTINCT FROM NEW.marcador_visitante)
  THEN
    PERFORM public.recalcular_puntos_partido(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER partidos_after_update_puntos
  AFTER UPDATE ON public.partidos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_partido_finalizado_puntos();

CREATE OR REPLACE FUNCTION public.trg_bloquear_pronostico_kickoff()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_kickoff TIMESTAMPTZ;
BEGIN
  SELECT fecha_kickoff INTO v_kickoff
  FROM public.partidos WHERE id = NEW.partido_id;

  IF now() >= v_kickoff THEN
    RAISE EXCEPTION 'El pronóstico ya no se puede modificar: el partido inició';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pronosticos_before_insert_update_lock
  BEFORE INSERT OR UPDATE ON public.pronosticos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_bloquear_pronostico_kickoff();

CREATE TRIGGER usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER ligas_updated_at
  BEFORE UPDATE ON public.ligas_privadas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER partidos_updated_at
  BEFORE UPDATE ON public.partidos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Perfil + alta automática en liga global "Mundial Compas"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liga_global_id UUID := 'a0000000-0000-4000-8000-000000000001';
BEGIN
  INSERT INTO public.usuarios (id, nombre_visible, metadata)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_visible', split_part(NEW.email, '@', 1)),
    jsonb_build_object(
      'tablon_confirmacion', jsonb_build_object(
        'estado', 'pendiente',
        'confirmaciones', '[]'::jsonb,
        'notas', ''
      )
    )
  );

  INSERT INTO public.liga_miembros (liga_id, usuario_id, rol)
  VALUES (v_liga_global_id, NEW.id, 'miembro')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Seed: liga global del sistema
-- -----------------------------------------------------------------------------

INSERT INTO public.ligas_privadas (
  id,
  slug,
  nombre,
  descripcion,
  codigo_invitacion,
  creador_id,
  es_publica,
  es_sistema,
  configuracion
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'mundial-compas',
  'Mundial Compas',
  'Liga global por defecto. Todos los compas juegan aquí.',
  'MUNDIAL-COMPAS',
  NULL,
  TRUE,
  TRUE,
  jsonb_build_object(
    'es_liga_default', true,
    'permite_union_libre', true
  )
);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ligas_privadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liga_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pronosticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datos_mamalones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY usuarios_update_own ON public.usuarios
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY partidos_select ON public.partidos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ligas_select ON public.ligas_privadas
  FOR SELECT TO authenticated
  USING (
    es_publica
    OR es_sistema
    OR EXISTS (
      SELECT 1 FROM public.liga_miembros m
      WHERE m.liga_id = id AND m.usuario_id = auth.uid()
    )
  );

CREATE POLICY ligas_insert_own ON public.ligas_privadas
  FOR INSERT TO authenticated
  WITH CHECK (creador_id = auth.uid() AND es_sistema = FALSE);

CREATE POLICY liga_miembros_select ON public.liga_miembros
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.liga_miembros m
      WHERE m.liga_id = liga_miembros.liga_id AND m.usuario_id = auth.uid()
    )
  );

CREATE POLICY liga_miembros_insert ON public.liga_miembros
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY pronosticos_select ON public.pronosticos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.liga_miembros m
      WHERE m.liga_id = pronosticos.liga_id AND m.usuario_id = auth.uid()
    )
  );

CREATE POLICY pronosticos_insert_own ON public.pronosticos
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.liga_miembros m
      WHERE m.liga_id = liga_id AND m.usuario_id = auth.uid()
    )
  );

CREATE POLICY pronosticos_update_own ON public.pronosticos
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY datos_mamalones_select ON public.datos_mamalones
  FOR SELECT TO authenticated USING (activo = TRUE);

CREATE POLICY mensajes_select ON public.mensajes_chat
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.liga_miembros m
      WHERE m.liga_id = mensajes_chat.liga_id AND m.usuario_id = auth.uid()
    )
  );

CREATE POLICY mensajes_insert ON public.mensajes_chat
  FOR INSERT TO authenticated
  WITH CHECK (
    tipo = 'usuario'
    AND usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.liga_miembros m
      WHERE m.liga_id = liga_id AND m.usuario_id = auth.uid()
    )
  );

CREATE POLICY notificaciones_own ON public.notificaciones
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Realtime (habilitar en Dashboard o descomentar si la publicación existe):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_chat;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.partidos;
