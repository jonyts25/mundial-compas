-- Auditoría de pronósticos eliminados al fusionar partidos duplicados.
-- Permite comparar marcadores conservados vs descartados y notificar usuarios.

ALTER TYPE public.tipo_notificacion ADD VALUE IF NOT EXISTS 'pronostico_fusion';

CREATE TYPE public.pronostico_fusion_estado AS ENUM (
  'scores_iguales',
  'conflicto_pendiente',
  'notificado',
  'resuelto_usuario',
  'resuelto_auto'
);

CREATE TABLE public.partido_dedupe_pair_archive (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name        TEXT NOT NULL,
  canonical_partido_id  UUID NOT NULL REFERENCES public.partidos (id) ON DELETE CASCADE,
  legacy_partido_id     UUID NOT NULL,
  equipo_local_nombre   TEXT NOT NULL,
  equipo_visitante_nombre TEXT NOT NULL,
  fecha_kickoff         TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (migration_name, legacy_partido_id)
);

CREATE TABLE public.pronostico_fusion_auditoria (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name             TEXT NOT NULL,
  usuario_id                 UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  liga_id                    UUID NOT NULL REFERENCES public.ligas_privadas (id) ON DELETE CASCADE,
  partido_id                 UUID NOT NULL REFERENCES public.partidos (id) ON DELETE CASCADE,
  legacy_partido_id          UUID,
  kept_goles_local           SMALLINT NOT NULL,
  kept_goles_visitante       SMALLINT NOT NULL,
  discarded_goles_local      SMALLINT NOT NULL,
  discarded_goles_visitante  SMALLINT NOT NULL,
  scores_equal               BOOLEAN NOT NULL,
  estado                     public.pronostico_fusion_estado NOT NULL,
  notificado_at              TIMESTAMPTZ,
  resuelto_at                TIMESTAMPTZ,
  metadata                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (migration_name, usuario_id, liga_id, partido_id)
);

CREATE INDEX idx_pronostico_fusion_auditoria_usuario
  ON public.pronostico_fusion_auditoria (usuario_id, estado);

CREATE INDEX idx_pronostico_fusion_auditoria_pendiente
  ON public.pronostico_fusion_auditoria (estado)
  WHERE estado IN ('conflicto_pendiente', 'notificado');

-- Pares Congo DR (legacy borrado en dedupe_congo_dr_team_name).
INSERT INTO public.partido_dedupe_pair_archive (
  migration_name,
  canonical_partido_id,
  legacy_partido_id,
  equipo_local_nombre,
  equipo_visitante_nombre,
  fecha_kickoff
)
VALUES
  (
    'dedupe_congo_dr_team_name',
    '9e350b10-4df7-4d53-91d5-28ed53733e1d',
    'ae9658dd-5094-4c9a-a107-319af4f39bc7',
    'Portugal',
    'Congo DR',
    '2026-06-17 17:00:00+00'
  ),
  (
    'dedupe_congo_dr_team_name',
    '644bec2a-de40-4032-8895-f601cfdfd2f7',
    'ed280f7d-42b1-4afa-a05c-d3ee0af01275',
    'Colombia',
    'Congo DR',
    '2026-06-24 02:00:00+00'
  ),
  (
    'dedupe_congo_dr_team_name',
    '16142229-9f14-4827-b71e-102e8c91ad72',
    'd2fe8d8b-06aa-4a4c-9b07-74531e84e97b',
    'Congo DR',
    'Uzbekistan',
    '2026-06-27 23:30:00+00'
  )
ON CONFLICT (migration_name, legacy_partido_id) DO NOTHING;

ALTER TABLE public.pronostico_fusion_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY pronostico_fusion_auditoria_select_own
  ON public.pronostico_fusion_auditoria
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY pronostico_fusion_auditoria_update_own
  ON public.pronostico_fusion_auditoria
  FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

COMMENT ON TABLE public.pronostico_fusion_auditoria IS
  'Conflictos al fusionar filas duplicadas de partidos. scores_equal=true → sin acción; false → usuario debe confirmar.';

CREATE OR REPLACE FUNCTION public.import_pronostico_fusion_audit(rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row jsonb;
  inserted int := 0;
  updated int := 0;
  equal_count int := 0;
  pending_count int := 0;
  v_estado public.pronostico_fusion_estado;
BEGIN
  IF rows IS NULL OR jsonb_typeof(rows) <> 'array' THEN
    RAISE EXCEPTION 'rows debe ser un array JSON';
  END IF;

  FOR row IN SELECT * FROM jsonb_array_elements(rows)
  LOOP
    v_estado := CASE
      WHEN (row->>'scores_equal')::boolean THEN 'scores_iguales'::public.pronostico_fusion_estado
      ELSE 'conflicto_pendiente'::public.pronostico_fusion_estado
    END;

    IF (row->>'scores_equal')::boolean THEN
      equal_count := equal_count + 1;
    ELSE
      pending_count := pending_count + 1;
    END IF;

    INSERT INTO public.pronostico_fusion_auditoria (
      migration_name,
      usuario_id,
      liga_id,
      partido_id,
      legacy_partido_id,
      kept_goles_local,
      kept_goles_visitante,
      discarded_goles_local,
      discarded_goles_visitante,
      scores_equal,
      estado
    )
    VALUES (
      row->>'migration_name',
      (row->>'usuario_id')::uuid,
      (row->>'liga_id')::uuid,
      (row->>'partido_id')::uuid,
      NULLIF(row->>'legacy_partido_id', '')::uuid,
      (row->>'kept_goles_local')::smallint,
      (row->>'kept_goles_visitante')::smallint,
      (row->>'discarded_goles_local')::smallint,
      (row->>'discarded_goles_visitante')::smallint,
      (row->>'scores_equal')::boolean,
      v_estado
    )
    ON CONFLICT (migration_name, usuario_id, liga_id, partido_id)
    DO UPDATE SET
      legacy_partido_id = EXCLUDED.legacy_partido_id,
      kept_goles_local = EXCLUDED.kept_goles_local,
      kept_goles_visitante = EXCLUDED.kept_goles_visitante,
      discarded_goles_local = EXCLUDED.discarded_goles_local,
      discarded_goles_visitante = EXCLUDED.discarded_goles_visitante,
      scores_equal = EXCLUDED.scores_equal,
      estado = CASE
        WHEN public.pronostico_fusion_auditoria.estado IN ('resuelto_usuario', 'resuelto_auto')
          THEN public.pronostico_fusion_auditoria.estado
        ELSE EXCLUDED.estado
      END;

    IF FOUND THEN
      inserted := inserted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted_or_updated', inserted,
    'equal', equal_count,
    'pending', pending_count
  );
END;
$$;
