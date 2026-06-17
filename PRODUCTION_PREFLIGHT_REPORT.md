# PRODUCTION PREFLIGHT REPORT — Migration 0

> **Fecha:** 2026-06-17  
> **Proyecto:** `hbcsvpbksuunbhagjqyk` (Mundial Compas)  
> **Método:** Solo `SELECT` vía SQL. **Cero mutaciones.**  
> **Migration 0 / 0b / cleanup:** **NO aplicados** en esta sesión.

---

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| Partidos pilot (predicado metadata) | **0** |
| Partidos no-World-Cup (residual) | **1** (México vs Serbia friendly) |
| Partidos World Cup | **72** |
| Partidos totales | **73** |
| Pronósticos totales | **771** |
| Migration 0 en prod | **No** (`competitions`, `seasons`, `season_id` ausentes) |
| Impacto cleanup por predicado pilot | **Nulo** (0 filas) |
| Riesgo M0 backfill | **Bajo** — 1 friendly quedaría con `season_id` WC 2026 si no se borra antes |

### Decisión preliminar

# GO WITH CHANGES — para Migration 0 en prod

**Cambios requeridos antes de apply:**

1. Eliminar o re-etiquetar el partido **México vs Serbia (Friendly)** — no es pilot por metadata pero no es Mundial.
2. Confirmar **PITR/backup** en Dashboard (no verificable por API desde esta sesión).
3. Preferible: validar en **staging clonado** antes de ventana prod (`STAGING_SETUP_PLAN.md`).

---

## 1. Partidos pilot (predicado oficial)

```sql
COALESCE(metadata->>'competencia', '') = 'pilot'
OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
```

| Métrica | Count |
|---------|------:|
| **Total partidos pilot** | **0** |

### IDs partidos pilot

*Ninguno — conjunto vacío.*

---

## 2. Dependencias pilot (predicado oficial)

| Tabla | Registros asociados a pilot |
|-------|----------------------------:|
| `pronosticos` | **0** |
| `mensajes_chat` | **0** |
| `notificaciones` | **0** |
| `webhook_eventos` | **0** |
| `push_partidos_silenciados` | **0** |

**Conclusión cleanup (predicado):** Fase DELETE pilot sería **no-op** — nada que borrar por el criterio documentado.

---

## 3. Partidos reales (Mundial)

| Métrica | Count |
|---------|------:|
| Partidos con `league_name = 'World Cup'` | **72** |
| Partidos totales | **73** |
| Pronósticos totales | **771** |

---

## 4. Residual no-pilot (atención pre-M0)

Partido **fuera del predicado pilot** pero **no es World Cup**:

| id | fixture_id | Partido | Kickoff | League | Pronósticos |
|----|------------|---------|---------|--------|------------:|
| `4c8abda8-c56f-48e6-ac2e-9f3f950c1d1c` | `1528284` | Mexico vs Serbia | 2026-06-05 | **Friendlies** | **0** |

**Impacto si se aplica Migration 0 sin borrarlo:**

El backfill en `20260615120000_migration_0_competitions_seasons.sql` hace:

```sql
UPDATE partidos SET season_id = '<world-cup-2026-uuid>' WHERE season_id IS NULL;
```

→ Este friendly quedaría etiquetado como temporada Mundial 2026 (incorrecto semánticamente, pero **0 pronósticos** y no aparece en quiniela activa si la UI filtra por fechas/fases).

**Recomendación:** `DELETE` manual de esta fila en ventana de mantenimiento (o marcar `metadata.competencia = 'pilot'` y ejecutar cleanup) **antes** de M0.

---

## 5. Estado Migration 0 en producción

| Objeto | Existe en prod |
|--------|----------------|
| `public.competitions` | ❌ No |
| `public.seasons` | ❌ No |
| `public.partidos.season_id` | ❌ No |

### Migraciones en `supabase_migrations.schema_migrations` (prod)

Solo registran applies recientes vía MCP (no el historial git completo):

| version | name |
|---------|------|
| 20260616010645 | dedupe_partidos_provider_fixture_ids |
| 20260616194012 | dedupe_congo_dr_team_name |
| 20260616194919 | pronostico_fusion_auditoria |
| 20260616195904 | rebuild_pronostico_fusion_audit |

**Pendientes en git, no en prod:**

- `20260615120000_migration_0_competitions_seasons.sql`
- `20260615130000_migration_0b_competitions_seasons_rls.sql`

---

## 6. Estimación de impacto cleanup

| Escenario | Partidos | Pronósticos | Mensajes | Notificaciones | Webhooks |
|-----------|----------|-------------|----------|----------------|----------|
| Cleanup predicado pilot | 0 | 0 | 0 | 0 | 0 |
| + Borrar friendly residual (recomendado) | 1 | 0 | 0 | 0 | 0 |

**Riesgo usuario:** Ninguno para cleanup pilot. Friendly sin pronósticos.

---

## 7. Infraestructura (solo lectura)

| Check | Estado |
|-------|--------|
| Git working tree | Limpio |
| Último commit | `a15fe6990e9538e88d1dc91d834887ec4f1855b0` |
| Railway `Mundial Compas Service` | **Online** |
| Railway `sync-live-cron` | **Online** |
| HTTP prod `/` | **200** |
| Staging Supabase | **No existe** |
| PITR prod | **Confirmar en Dashboard** — [Backups](https://supabase.com/dashboard/project/hbcsvpbksuunbhagjqyk/database/backups) |

---

## 8. Commits Migration 0 en git (referencia)

| Commit | Contenido |
|--------|-----------|
| `ea7a46f` | Migration 0 SQL + pilot cleanup docs + mobile plan |
| `3f8e41d` | Migration 0b RLS + `PRODUCTION_READINESS_REVIEW.md` + execution checklist |

---

## 9. GO / NO-GO

| Criterio | Resultado |
|----------|-----------|
| Pilot cleanup bloqueante | ✅ No — 0 filas por predicado |
| Datos Mundial intactos | ✅ 72 WC + 771 pronósticos |
| Migration 0 aditiva para app actual | ✅ App no lee `season_id` |
| RLS 0b lista en git | ✅ |
| Staging probado | ❌ Pendiente |
| PITR confirmado | ⚠️ Pendiente humano |
| Friendly residual | ⚠️ Borrar antes de M0 |

### Decisión

| Entorno | Veredicto |
|---------|-----------|
| **Prod directo ahora** | **NO-GO** — falta staging + confirmar PITR + limpiar friendly |
| **Prod tras staging PASS** | **GO WITH CHANGES** |
| **Pilot cleanup en prod** | **SKIP** (0 filas) salvo friendly residual opcional |

---

## 10. Queries ejecutadas (reproducibles)

```sql
-- Conteos agregados
WITH pilot AS (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
)
SELECT 'partidos_pilot', COUNT(*) FROM pilot
UNION ALL SELECT 'pronosticos_pilot', COUNT(*) FROM pronosticos WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'mensajes_chat_pilot', COUNT(*) FROM mensajes_chat WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'notificaciones_pilot', COUNT(*) FROM notificaciones WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'webhook_eventos_pilot', COUNT(*) FROM webhook_eventos WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'partidos_reales', COUNT(*) FROM partidos WHERE id NOT IN (SELECT id FROM pilot)
UNION ALL SELECT 'pronosticos_total', COUNT(*) FROM pronosticos
UNION ALL SELECT 'partidos_total', COUNT(*) FROM partidos;

-- Migration 0 presente?
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitions') AS has_competitions,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seasons') AS has_seasons,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partidos' AND column_name = 'season_id') AS has_season_id;

-- Non-WC residual
SELECT p.id, p.api_football_fixture_id, p.equipo_local_nombre, p.equipo_visitante_nombre,
       p.metadata->'api_football'->>'league_name' AS league, COUNT(pr.id) AS pronosticos
FROM partidos p
LEFT JOIN pronosticos pr ON pr.partido_id = p.id
WHERE COALESCE(p.metadata->'api_football'->>'league_name', '') <> 'World Cup'
GROUP BY p.id;
```

---

## Siguiente paso exacto

1. **Dashboard:** confirmar PITR o daily backup en prod (anotar timestamp).
2. **Staging:** seguir `STAGING_SETUP_PLAN.md` → Restore to New Project.
3. **En staging:** DELETE friendly `4c8abda8-...` → apply M0 → M0b → smoke tests.
4. **Prod:** solo tras staging PASS + ventana en `PRODUCTION_EXECUTION_CHECKLIST.md`.
