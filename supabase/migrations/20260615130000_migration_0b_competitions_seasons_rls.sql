-- =============================================================================
-- Migration 0b — RLS read-only en competitions + seasons
-- =============================================================================
-- Referencia: MIGRATION_0_AUDIT.md (R2), MIGRATION_0B_RLS_PATCH.md
-- Prerequisito: 20260615120000_migration_0_competitions_seasons.sql aplicada
--
-- Política: authenticated puede SELECT; mutaciones solo service role / postgres
-- NO aplicar hasta revisión PRODUCTION_READINESS_REVIEW.md
-- =============================================================================

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS competitions_select_authenticated ON public.competitions;
CREATE POLICY competitions_select_authenticated
  ON public.competitions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS seasons_select_authenticated ON public.seasons;
CREATE POLICY seasons_select_authenticated
  ON public.seasons
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY competitions_select_authenticated ON public.competitions IS
  'Migration 0b: lectura pública autenticada; escritura vía service role.';

COMMENT ON POLICY seasons_select_authenticated ON public.seasons IS
  'Migration 0b: lectura pública autenticada; escritura vía service role.';
