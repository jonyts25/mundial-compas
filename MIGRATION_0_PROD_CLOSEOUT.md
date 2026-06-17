# MIGRATION 0 — Production Closeout

> **Fecha:** 2026-06-17  
> **Proyecto:** `hbcsvpbksuunbhagjqyk` (Mundial Compas — **producción**)  
> **Método:** Solo `SELECT` (verificación post-rollout).  
> **Estado:** **CERRADO** — Migration 0 + 0b aplicadas; smoke manual OK (operador).

---

## Resumen ejecutivo

| Check | Esperado | Prod | |
|-------|----------|------|---|
| 1. `competitions` existe, 1 fila | ≥ 1 | **1** | PASS |
| 2. `seasons` existe, 1 fila | ≥ 1 | **1** | PASS |
| 3. `partidos.season_id` existe | columna presente | **1** | PASS |
| 4. `season_id IS NULL` | 0 | **0** | PASS |
| 5. Partidos totales | 72 (post-friendly DELETE) | **72** | PASS |
| 6. Pronósticos totales | 805 (live) | **805** | PASS |
| 7. RLS `competitions` / `seasons` | activo | **true / true** | PASS |
| 8. Policies SELECT `authenticated` | 2 policies | **2** | PASS |
| 9. Triggers `partidos` | 2 intactos | **2** | PASS |

**Veredicto:** Migration 0 en producción **completa y consistente** con staging.

---

## Detalle verificación

### Spine Sports Core

| Objeto | Valor |
|--------|-------|
| Competition | `b0000000-0000-4000-8000-000000000001` / `fifa-world-cup` |
| Season | `b0000000-0000-4000-8000-000000000002` / `fifa-world-cup-2026` |
| Partidos con season WC 2026 | **72 / 72** |
| FK `partidos_season_id_fkey` | presente |
| Pilot restantes (predicado oficial) | **0** |
| Friendlies residuales | **0** |

### RLS (Migration 0b)

| Tabla | RLS | Policy | Rol | CMD |
|-------|-----|--------|-----|-----|
| `competitions` | ON | `competitions_select_authenticated` | `authenticated` | SELECT |
| `seasons` | ON | `seasons_select_authenticated` | `authenticated` | SELECT |

### Triggers `partidos`

- `partidos_after_update_puntos` — presente  
- `partidos_updated_at` — presente  

### Migraciones registradas

| version | name |
|---------|------|
| *(timestamps prod)* | `migration_0_competitions_seasons` |
| *(timestamps prod)* | `migration_0b_competitions_seasons_rls` |

Archivos fuente en repo: `supabase/migrations/20260615120000_*.sql`, `20260615130000_*.sql`.

---

## Rollout completado (operador)

| Paso | Prod |
|------|------|
| DELETE friendly México–Serbia (`4c8abda8-…`, 0 pronósticos) | ✅ |
| Migration 0 | ✅ |
| Migration 0b RLS | ✅ |
| Smoke manual UI | ✅ |

Referencia staging: `STAGING_MIGRATION_0_RESULTS.md` (mismos criterios SQL G, 72 partidos).

---

## Riesgos residuales post-M0

| Riesgo | Mitigación |
|--------|------------|
| Nuevos partidos vía cron/ingest sin `season_id` | **Migration 0.5** — ver `MIGRATION_0_5_READY_CHECK.md` |
| `season_id` NULL en inserts futuros | Query monitoreo diaria (plan §7) |
| SC-4 / ingest multi-competición | **No iniciar** hasta M0.5 |

---

## Monitoreo recomendado (hasta M0.5)

```sql
SELECT COUNT(*) AS partidos_sin_season
FROM public.partidos
WHERE season_id IS NULL
  AND NOT (
    COALESCE(metadata->>'competencia', '') = 'pilot'
    OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
  );
-- Alerta si > 0
```

---

## Siguiente paso

Implementar **Migration 0.5** (season en ingest) según `MIGRATION_0_5_READY_CHECK.md`. **No** aplicar NOT NULL en `season_id` hasta validar cron post-M0.5.
