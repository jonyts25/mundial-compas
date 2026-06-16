-- Reconstruye auditoría de fusiones usando huellas de migración (updated_at).
-- Sin snapshot PITR no recuperamos el marcador descartado; se documenta y cierra como resuelto_auto.

CREATE OR REPLACE FUNCTION public.rebuild_pronostico_fusion_audit_from_footprints()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_ts timestamptz := '2026-06-16 01:06:45+00';
  congo_ts timestamptz := '2026-06-16 19:40:12+00';
  provider_rows int := 0;
  congo_rows int := 0;
  total_auto int := 0;
  pending int := 0;
BEGIN
  -- Provider dedupe: pronósticos movidos desde fila legacy (updated_at = provider_ts)
  -- o re-migrados en Congo (updated_at = congo_ts pero created_at < batch api-sports).
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
    estado,
    resuelto_at,
    metadata
  )
  SELECT
    'dedupe_partidos_provider_fixture_ids',
    pr.usuario_id,
    pr.liga_id,
    pr.partido_id,
    NULL,
    pr.goles_local,
    pr.goles_visitante,
    pr.goles_local,
    pr.goles_visitante,
    TRUE,
    'resuelto_auto'::public.pronostico_fusion_estado,
    now(),
    jsonb_build_object(
      'source', 'migration_footprint',
      'migration_ts', provider_ts,
      'note', 'Marcador legacy conservado; descartado no recuperable sin PITR'
    )
  FROM public.pronosticos pr
  WHERE date_trunc('second', pr.updated_at) = date_trunc('second', provider_ts)
  ON CONFLICT (migration_name, usuario_id, liga_id, partido_id) DO UPDATE SET
    kept_goles_local = EXCLUDED.kept_goles_local,
    kept_goles_visitante = EXCLUDED.kept_goles_visitante,
    discarded_goles_local = EXCLUDED.discarded_goles_local,
    discarded_goles_visitante = EXCLUDED.discarded_goles_visitante,
    scores_equal = EXCLUDED.scores_equal,
    estado = EXCLUDED.estado,
    resuelto_at = EXCLUDED.resuelto_at,
    metadata = EXCLUDED.metadata;

  GET DIAGNOSTICS provider_rows = ROW_COUNT;

  -- Congo dedupe (pares archivados)
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
    estado,
    resuelto_at,
    metadata
  )
  SELECT
    'dedupe_congo_dr_team_name',
    pr.usuario_id,
    pr.liga_id,
    p.canonical_partido_id,
    p.legacy_partido_id,
    pr.goles_local,
    pr.goles_visitante,
    pr.goles_local,
    pr.goles_visitante,
    TRUE,
    'resuelto_auto'::public.pronostico_fusion_estado,
    now(),
    jsonb_build_object(
      'source', 'migration_footprint',
      'migration_ts', congo_ts,
      'note', 'Marcador legacy conservado; descartado no recuperable sin PITR'
    )
  FROM public.partido_dedupe_pair_archive p
  JOIN public.pronosticos pr ON pr.partido_id = p.canonical_partido_id
  WHERE date_trunc('second', pr.updated_at) = date_trunc('second', congo_ts)
  ON CONFLICT (migration_name, usuario_id, liga_id, partido_id) DO UPDATE SET
    legacy_partido_id = EXCLUDED.legacy_partido_id,
    kept_goles_local = EXCLUDED.kept_goles_local,
    kept_goles_visitante = EXCLUDED.kept_goles_visitante,
    discarded_goles_local = EXCLUDED.discarded_goles_local,
    discarded_goles_visitante = EXCLUDED.discarded_goles_visitante,
    scores_equal = EXCLUDED.scores_equal,
    estado = EXCLUDED.estado,
    resuelto_at = EXCLUDED.resuelto_at,
    metadata = EXCLUDED.metadata;

  GET DIAGNOSTICS congo_rows = ROW_COUNT;

  SELECT count(*) INTO total_auto
  FROM public.pronostico_fusion_auditoria
  WHERE estado = 'resuelto_auto';

  SELECT count(*) INTO pending
  FROM public.pronostico_fusion_auditoria
  WHERE estado IN ('conflicto_pendiente', 'notificado');

  RETURN jsonb_build_object(
    'provider_migrated_rows', provider_rows,
    'congo_migrated_rows', congo_rows,
    'total_resuelto_auto', total_auto,
    'pending_conflicts', pending
  );
END;
$$;

-- Fusión segura para futuros dedupes: compara marcadores antes de borrar.
CREATE OR REPLACE FUNCTION public.merge_pronostico_on_partido_dedupe(
  p_canonical_id uuid,
  p_legacy_id uuid,
  p_migration_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrar conflictos con marcadores distintos antes de decidir cuál borrar.
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
  SELECT
    p_migration_name,
    pr_l.usuario_id,
    pr_l.liga_id,
    p_canonical_id,
    p_legacy_id,
    pr_l.goles_local,
    pr_l.goles_visitante,
    pr_c.goles_local,
    pr_c.goles_visitante,
    (pr_l.goles_local = pr_c.goles_local
      AND pr_l.goles_visitante = pr_c.goles_visitante),
    CASE
      WHEN pr_l.goles_local = pr_c.goles_local
        AND pr_l.goles_visitante = pr_c.goles_visitante
      THEN 'scores_iguales'::public.pronostico_fusion_estado
      ELSE 'conflicto_pendiente'::public.pronostico_fusion_estado
    END
  FROM public.pronosticos pr_l
  JOIN public.pronosticos pr_c
    ON pr_c.partido_id = p_canonical_id
   AND pr_c.usuario_id = pr_l.usuario_id
   AND pr_c.liga_id = pr_l.liga_id
  WHERE pr_l.partido_id = p_legacy_id
  ON CONFLICT (migration_name, usuario_id, liga_id, partido_id) DO NOTHING;

  -- Igual → descartar canonical. Distinto → descartar el más viejo (updated_at).
  DELETE FROM public.pronosticos pr
  WHERE pr.partido_id = p_canonical_id
    AND EXISTS (
      SELECT 1
      FROM public.pronosticos pr_l
      WHERE pr_l.partido_id = p_legacy_id
        AND pr_l.liga_id = pr.liga_id
        AND pr_l.usuario_id = pr.usuario_id
        AND (
          (pr_l.goles_local = pr.goles_local
            AND pr_l.goles_visitante = pr.goles_visitante)
          OR pr_l.updated_at >= pr.updated_at
        )
    );

  DELETE FROM public.pronosticos pr
  WHERE pr.partido_id = p_legacy_id
    AND EXISTS (
      SELECT 1
      FROM public.pronosticos pr_c
      WHERE pr_c.partido_id = p_canonical_id
        AND pr_c.liga_id = pr.liga_id
        AND pr_c.usuario_id = pr.usuario_id
        AND (
          pr_c.goles_local IS DISTINCT FROM pr.goles_local
          OR pr_c.goles_visitante IS DISTINCT FROM pr.goles_visitante
        )
        AND pr_c.updated_at > pr.updated_at
    );

  UPDATE public.pronosticos pr
  SET partido_id = p_canonical_id
  WHERE pr.partido_id = p_legacy_id;
END;
$$;

SELECT public.rebuild_pronostico_fusion_audit_from_footprints();
