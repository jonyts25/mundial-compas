# STAGING RESTORE VERIFY — Migration 0

> **Fecha:** 2026-06-17  
> **Proyecto staging:** `jjzfvzmsfiuwjxdjvnpu` (`mundial-compas-staging`)  
> **Proyecto prod (referencia):** `hbcsvpbksuunbhagjqyk` (`Mundial Compas`)  
> **Método:** Solo `SELECT` vía Supabase MCP. **Cero mutaciones.**

---

## Resumen

| Verificación | Resultado |
|--------------|-----------|
| Proyecto staging activo | ✅ `ACTIVE_HEALTHY` (us-west-1) |
| Restore con datos | ✅ PASS |
| Migration 0 **no** aplicada | ✅ PASS (esperado pre-M0) |
| Friendly residual México–Serbia | ✅ Presente, 0 pronósticos |
| Partidos World Cup | ✅ 72 + 1 friendly = 73 |

**Veredicto restore:** **PASS** — clone usable para FASE 4 (tras conectar app staging).

---

## Conteos principales (staging)

| Métrica | Staging | Prod (live, misma fecha) | Notas |
|---------|--------:|-------------------------:|-------|
| `partidos` | **73** | **73** | Alineado |
| `pronosticos` | **739** | **805** | Clone anterior a actividad reciente en prod |
| `ligas_privadas` | **12** | *(no re-consultado)* | |
| `auth.users` | **24** | *(no re-consultado)* | Auth incluido en restore |

La diferencia de pronósticos (739 vs 805) es **esperable** si el backup/restore es de un punto anterior al tráfico actual en prod. No invalida el clone para probar DDL Migration 0.

---

## Migration 0 — objetos ausentes (esperado)

| Objeto | Existe en staging |
|--------|-------------------|
| Tabla `competitions` | **No** |
| Tabla `seasons` | **No** |
| Columna `partidos.season_id` | **No** |

```sql
-- Ejecutado en staging
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'competitions') AS has_competitions,
  EXISTS (SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'seasons') AS has_seasons,
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'partidos'
            AND column_name = 'season_id') AS has_season_id;
-- Resultado: false / false / false
```

---

## Migraciones registradas en staging (heredadas del clone)

| version | name |
|---------|------|
| `20260616010645` | dedupe_partidos_provider_fixture_ids |
| `20260616194012` | dedupe_congo_dr_team_name |
| `20260616194919` | pronostico_fusion_auditoria |
| `20260616195904` | rebuild_pronostico_fusion_audit |

**Pendientes en repo (no en `schema_migrations`):**

- `20260615120000_migration_0_competitions_seasons.sql`
- `20260615130000_migration_0b_competitions_seasons_rls.sql`

---

## Composición partidos (metadata `api_football`)

| `league_name` (metadata) | Count |
|--------------------------|------:|
| World Cup | **72** |
| Friendlies | **1** |
| **Total** | **73** |

---

## Friendly residual — México vs Serbia

| Campo | Valor |
|-------|-------|
| `id` | `4c8abda8-c56f-48e6-ac2e-9f3f950c1d1c` |
| `api_football_fixture_id` | `1528284` |
| Partido | Mexico vs Serbia |
| Kickoff | `2026-06-05 02:00:00+00` |
| Liga (metadata) | **Friendlies** / Friendly International |
| `pronosticos_count` | **0** |

**Acción FASE 4:** `DELETE` esta fila antes de Migration 0 (backfill asignaría `season_id` WC 2026 incorrectamente).

```sql
-- Solo en STAGING, después de conectar app — NO ejecutado aún
DELETE FROM partidos
WHERE id = '4c8abda8-c56f-48e6-ac2e-9f3f950c1d1c'
  AND NOT EXISTS (
    SELECT 1 FROM pronosticos p WHERE p.partido_id = '4c8abda8-c56f-48e6-ac2e-9f3f950c1d1c'
  );
```

---

## Pilot cleanup (predicado oficial)

No re-ejecutado en esta sesión; preflight prod documentó **0 partidos pilot**. Staging hereda el mismo estado (73 partidos, 1 friendly no-WC).

---

## Conclusión

El restore de **mundial-compas-staging** replica la estructura y datos pre-M0 necesarios para validar Migration 0. Listo para FASE 4 **después** de:

1. Railway environment `staging` con variables Supabase staging.
2. DELETE friendly residual (0 pronósticos).
3. Apply `20260615120000` + `20260615130000` solo en staging.
