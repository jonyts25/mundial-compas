# PILOT-CLEANUP — Execution Plan (Staging → Producción)

> **Estado:** Plan de ejecución. **NO ejecutado.** **NO aplicar en producción** hasta completar staging y GO explícito.

**Referencias:** `PILOT_CLEANUP_REPORT.md`, `PILOT_CLEANUP_SQL_REVIEW.md`  
**Prerequisito Migration 0:** este cleanup debe completarse y verificarse en staging **antes** de `20260615120000_migration_0_competitions_seasons.sql`.

---

## 1. Checklist Staging

### 1.1 Pre-requisitos operativos

- [ ] Proyecto Supabase **staging** identificado (distinto de producción).
- [ ] Acceso SQL Editor o `psql` con rol service/postgres en staging.
- [ ] Backup staging reciente (PITR activo o dump manual).
- [ ] `PILOT_MODE_ENABLED` documentado en env staging (Railway/Vercel staging si existe).
- [ ] Ventana acordada (bajo tráfico; solo QA en staging).

### 1.2 Diagnóstico (solo SELECT)

- [ ] Ejecutar §2.1 — listar partidos pilot.
- [ ] Ejecutar §2.2 — conteos pre-delete.
- [ ] Revisar lista manual: ¿son solo UCL / Concacaf / México-Serbia / pruebas?
- [ ] Confirmar conteo `pronosticos` pilot aceptable para borrar.
- [ ] Confirmar `partidos_no_pilot` > 0 (calendario Mundial intacto).

### 1.3 Backup lógico

- [ ] Export §2.3 — IDs pilot + snapshots dependientes (CSV/JSON).
- [ ] Guardar export con fecha en almacenamiento seguro (fuera del repo).

### 1.4 Ejecución cleanup

- [ ] Ejecutar §2.4 en transacción (staging).
- [ ] `COMMIT` solo si conteos pre-delete coinciden con expectativa.

### 1.5 Verificación post-cleanup

- [ ] Ejecutar §2.5 — cero pilot, cero huérfanos.
- [ ] Smoke app staging: home, quiniela, partido, leaderboard (ver `MIGRATION_0_SMOKE_TESTS.md` sección A–D).

### 1.6 Post-cleanup env

- [ ] `PILOT_MODE_ENABLED=false` en staging.
- [ ] Registrar conteos finales en ticket/nota para auditoría.

---

## 2. Checklist Producción

> **No ejecutar hasta:** staging cleanup OK + Migration 0 staging OK + `MIGRATION_0_GO_NO_GO.md` = GO o GO WITH CHANGES aprobado para prod.

### 2.1 Pre-requisitos

- [ ] Staging cleanup + Migration 0 aplicados y smoke tests PASS.
- [ ] Backup producción confirmado (Supabase backup + export lógico §2.3).
- [ ] Ventana de mantenimiento comunicada (aunque DELETE/DDL es rápido).
- [ ] Rollback documentado y responsable asignado.
- [ ] `PILOT_MODE_ENABLED=false` planificado post-cleanup prod.

### 2.2 Diagnóstico prod

- [ ] Repetir §2.1 y §2.2 en **producción** (SELECT only).
- [ ] Comparar conteos staging vs prod; investigar divergencias.

### 2.3 Backup prod

- [ ] Export §2.3 obligatorio en prod (no opcional).

### 2.4 Ejecución prod

- [ ] §2.4 en transacción.
- [ ] Verificación §2.5 inmediata.

### 2.5 Post-prod

- [ ] Smoke tests prod (subset crítico: home, quiniela save, partido, leaderboard).
- [ ] Monitoreo 24h: errores Railway, logs Supabase, push/cron.

---

## 3. SQL exacto a ejecutar

### 3.1 Predicado pilot (referencia)

```sql
(
  COALESCE(metadata->>'competencia', '') = 'pilot'
  OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
)
```

### 3.2 Pre-flight — listar partidos pilot

```sql
SELECT
  p.id,
  p.api_football_fixture_id,
  p.equipo_local_nombre,
  p.equipo_visitante_nombre,
  p.fecha_kickoff,
  p.estatus,
  p.metadata->>'competencia_label' AS label
FROM public.partidos p
WHERE (
  COALESCE(p.metadata->>'competencia', '') = 'pilot'
  OR COALESCE((p.metadata->'pilot')::boolean, FALSE) = TRUE
)
ORDER BY p.fecha_kickoff DESC;
```

### 3.3 Pre-flight — conteos

```sql
WITH pilot AS (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
)
SELECT 'partidos' AS tabla, COUNT(*)::bigint AS cnt FROM pilot
UNION ALL SELECT 'pronosticos', COUNT(*) FROM public.pronosticos WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'mensajes_chat', COUNT(*) FROM public.mensajes_chat WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'notificaciones', COUNT(*) FROM public.notificaciones WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'webhook_eventos', COUNT(*) FROM public.webhook_eventos WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'push_partidos_silenciados', COUNT(*) FROM public.push_partidos_silenciados WHERE partido_id IN (SELECT id FROM pilot);
```

### 3.4 Backup lógico (SELECT → exportar)

```sql
-- Guardar resultados de cada query como CSV/JSON
SELECT * FROM public.partidos
WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
   OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE;

SELECT pr.* FROM public.pronosticos pr
WHERE pr.partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

SELECT mc.* FROM public.mensajes_chat mc
WHERE mc.partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

SELECT n.* FROM public.notificaciones n
WHERE n.partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

SELECT w.* FROM public.webhook_eventos w
WHERE w.partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

SELECT ps.* FROM public.push_partidos_silenciados ps
WHERE ps.partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);
```

### 3.5 Cleanup — transacción recomendada

```sql
BEGIN;

-- Opcional: evitar filas con partido_id NULL en notificaciones/webhooks
DELETE FROM public.notificaciones
WHERE partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

DELETE FROM public.webhook_eventos
WHERE partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

-- CASCADE: pronosticos, mensajes_chat, push_partidos_silenciados
DELETE FROM public.partidos
WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
   OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE;

COMMIT;
```

**Nota:** Si `partidos = 0` en conteos, **no ejecutar** DELETE; marcar cleanup como N/A.

---

## 4. Verificaciones antes/después

| Momento | Query / acción | Criterio |
|---------|----------------|----------|
| **Antes** | §3.2 lista pilot | Revisión humana OK |
| **Antes** | §3.3 conteos | Documentar números |
| **Antes** | `SELECT COUNT(*) FROM partidos WHERE NOT (pilot pred)` | > 0 |
| **Después** | `SELECT COUNT(*) ... pilot` | **= 0** |
| **Después** | Huérfanos FK | **= 0** (ver §3.6) |
| **Después** | App smoke | PASS (ver smoke tests) |

### 3.6 Post-cleanup — huérfanos

```sql
SELECT
  (SELECT COUNT(*) FROM public.pronosticos pr
   LEFT JOIN public.partidos p ON p.id = pr.partido_id WHERE p.id IS NULL) AS pronosticos_huerfanos,
  (SELECT COUNT(*) FROM public.mensajes_chat mc
   LEFT JOIN public.partidos p ON p.id = mc.partido_id
   WHERE mc.partido_id IS NOT NULL AND p.id IS NULL) AS chat_huerfanos,
  (SELECT COUNT(*) FROM public.push_partidos_silenciados ps
   LEFT JOIN public.partidos p ON p.id = ps.partido_id WHERE p.id IS NULL) AS silenciados_huerfanos;
```

---

## 5. Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|--------|-----------|------------|
| 1 | DELETE partidos reales por predicado incorrecto | **Crítica** | §3.2 revisión manual; backup §3.4 |
| 2 | Pérdida pronósticos pilot en leaderboard | Baja | Datos QA; export backup |
| 3 | Notificaciones huérfanas (SET NULL) | Baja | DELETE explícito §3.5 |
| 4 | Pilot re-insertados por cron/script | Media | `PILOT_MODE_ENABLED=false`; no ejecutar `cargar-pilot-*` |
| 5 | Staging ≠ prod conteos | Media | Diagnóstico separado por entorno |
| 6 | Migration 0 backfill mezcla pilot con WC 2026 | **Alta** | **Cleanup obligatorio antes de Migration 0** |

---

## 6. Rollback

| Escenario | Acción |
|-----------|--------|
| **Sin backup** | Irrecuperable — recrear pilot con scripts (nuevos UUIDs) |
| **Con backup §3.4** | INSERT inverso: `partidos` → dependientes (mismos UUIDs) |
| **Supabase PITR** | Restore snapshot pre-cleanup (afecta todo el proyecto) |

Rollback **no** revierte Migration 0; ver `MIGRATION_0_READY_REPORT.md` §7.

---

## 7. Criterios de aprobación

### Staging cleanup — APROBADO si:

1. §3.3 ejecutado y documentado.
2. §3.4 backup guardado (si `partidos_pilot > 0`).
3. §3.5 ejecutado o N/A (`partidos_pilot = 0`).
4. Post-check §3.6: **0 huérfanos**.
5. Pilot count = **0**.
6. Smoke app staging: home + quiniela + partido sin regresión.
7. Responsable humano firma en ticket.

### Producción cleanup — APROBADO si:

1. Todos los criterios staging cumplidos en staging primero.
2. Migration 0 staging PASS (ver `MIGRATION_0_SMOKE_TESTS.md`).
3. Backup prod §3.4 completado.
4. GO explícito en `MIGRATION_0_GO_NO_GO.md` para prod.

---

## 8. Orden de ejecución completo (staging)

```
1. PILOT_CLEANUP (este plan)     → verificar §7
2. Migration 0 apply             → supabase migration up / SQL Editor
3. MIGRATION_0_SMOKE_TESTS       → todos PASS
4. GO/NO-GO review               → MIGRATION_0_GO_NO_GO.md
5. (Futuro) Repetir 1–4 en prod
```

---

*Plan de ejecución — no ejecutado.*
