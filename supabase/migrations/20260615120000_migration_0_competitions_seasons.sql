-- =============================================================================
-- Migration 0 — Sports Core spine: competitions + seasons + partidos.season_id
-- =============================================================================
-- Referencia: MIGRATION_0_DESIGN.md, MIGRATION_0_SQL_REVIEW.md
-- Prerequisito recomendado: pilot cleanup (PILOT_CLEANUP_REPORT.md)
--
-- NO toca: RLS, triggers existentes, RPC, pronosticos, ligas_privadas, scoring
-- =============================================================================

-- citext ya existe en 20260518000001_initial_schema.sql; guard idempotente local
CREATE EXTENSION IF NOT EXISTS citext;

-- -----------------------------------------------------------------------------
-- 1. competitions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.competitions (
  id                  UUID PRIMARY KEY,
  slug                CITEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  short_name          TEXT,
  sport               TEXT NOT NULL DEFAULT 'football',
  format              TEXT NOT NULL DEFAULT 'groups_knockout',
  country_scope       TEXT,
  timezone_default    TEXT NOT NULL DEFAULT 'America/Mexico_City',
  provider_config     JSONB NOT NULL DEFAULT '{}'::jsonb,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT competitions_format_check CHECK (
    format IN ('league', 'groups_knockout', 'knockout_only', 'custom')
  )
);

COMMENT ON TABLE public.competitions IS
  'Competición deportiva (Mundial, Liga MX, etc.). Migration 0 — spine Sports Core.';

COMMENT ON COLUMN public.competitions.provider_config IS
  'IDs de proveedores externos: apifootball, api_sports, ventanas sync, etc.';

DROP TRIGGER IF EXISTS competitions_updated_at ON public.competitions;
CREATE TRIGGER competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. seasons
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.seasons (
  id                  UUID PRIMARY KEY,
  competition_id      UUID NOT NULL REFERENCES public.competitions (id) ON DELETE RESTRICT,
  slug                CITEXT NOT NULL UNIQUE,
  year_label          TEXT NOT NULL,
  start_at            TIMESTAMPTZ,
  end_at              TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'scheduled',
  is_current          BOOLEAN NOT NULL DEFAULT FALSE,
  external_ids        JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seasons_status_check CHECK (
    status IN ('scheduled', 'active', 'finished', 'cancelled')
  ),
  CONSTRAINT seasons_dates_order CHECK (
    start_at IS NULL OR end_at IS NULL OR start_at <= end_at
  )
);

COMMENT ON TABLE public.seasons IS
  'Temporada de una competición. partidos.season_id apunta aquí en Migration 0.';

CREATE INDEX IF NOT EXISTS idx_seasons_competition ON public.seasons (competition_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_one_current_per_competition
  ON public.seasons (competition_id)
  WHERE is_current = TRUE;

DROP TRIGGER IF EXISTS seasons_updated_at ON public.seasons;
CREATE TRIGGER seasons_updated_at
  BEFORE UPDATE ON public.seasons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Seed — FIFA World Cup 2026 (UUIDs fijos)
-- -----------------------------------------------------------------------------

INSERT INTO public.competitions (
  id,
  slug,
  name,
  short_name,
  sport,
  format,
  country_scope,
  timezone_default,
  provider_config,
  active,
  metadata
) VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'fifa-world-cup',
  'Copa Mundial de la FIFA',
  'Mundial 2026',
  'football',
  'groups_knockout',
  'international',
  'America/Mexico_City',
  jsonb_build_object(
    'apifootball', jsonb_build_object(
      'league_id', 28,
      'base', 'apifootball.com'
    ),
    'api_sports', jsonb_build_object(
      'league_id', 1,
      'season', 2026
    ),
    'sync', jsonb_build_object(
      'date_from', '2026-06-01',
      'date_to', '2026-07-31',
      'timezone', 'America/Mexico_City'
    )
  ),
  TRUE,
  jsonb_build_object(
    'hosts', jsonb_build_array('USA', 'MEX', 'CAN'),
    'edition', 23
  )
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seasons (
  id,
  competition_id,
  slug,
  year_label,
  start_at,
  end_at,
  status,
  is_current,
  external_ids,
  metadata
) VALUES (
  'b0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000001',
  'fifa-world-cup-2026',
  '2026',
  '2026-06-01T00:00:00+00:00',
  '2026-07-31T23:59:59+00:00',
  'scheduled',
  TRUE,
  jsonb_build_object('api_sports_season', 2026),
  jsonb_build_object('default_for_mundial_compas', TRUE)
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. partidos.season_id (nullable — sin NOT NULL en Migration 0)
-- -----------------------------------------------------------------------------

ALTER TABLE public.partidos
  ADD COLUMN IF NOT EXISTS season_id UUID;

-- -----------------------------------------------------------------------------
-- 5. FK partidos.season_id → seasons(id) ON DELETE RESTRICT
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'partidos_season_id_fkey'
      AND conrelid = 'public.partidos'::regclass
  ) THEN
    ALTER TABLE public.partidos
      ADD CONSTRAINT partidos_season_id_fkey
      FOREIGN KEY (season_id)
      REFERENCES public.seasons (id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Backfill — todos los partidos restantes → World Cup 2026
-- Prerequisito: pilot cleanup completado (sin partidos pilot en BD)
-- -----------------------------------------------------------------------------

UPDATE public.partidos
SET
  season_id = 'b0000000-0000-4000-8000-000000000002',
  updated_at = now()
WHERE season_id IS NULL;

-- -----------------------------------------------------------------------------
-- Fin Migration 0 — verificación manual: MIGRATION_0_READY_REPORT.md §6
-- -----------------------------------------------------------------------------
