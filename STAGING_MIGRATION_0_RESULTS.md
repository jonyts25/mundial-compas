# STAGING MIGRATION 0 — Results

> **Fecha:** 2026-06-17  
> **Proyecto:** `jjzfvzmsfiuwjxdjvnpu` (mundial-compas-staging)  
> **App:** `https://mundial-compas-service-staging.up.railway.app`  
> **Runtime:** `STAGING_RUNTIME_VERIFY.md` → **READY_FOR_M0**  
> **Producción:** **NO tocada** (`hbcsvpbksuunbhagjqyk` — sin `competitions`)

---

## Resumen ejecutivo

| Paso | Resultado |
|------|-----------|
| DELETE friendly México–Serbia | **PASS** — 1 fila; 72 partidos WC |
| Migration `20260615120000` | **PASS** |
| Migration `20260615130000` (0b RLS) | **PASS** |
| SQL G1–G9 | **9/9 PASS** |
| Smoke P0 UI (pre-M0, manual) | **PASS** (operador) |
| Smoke HTTP post-M0 (sin sesión) | **PASS** — sin 500; redirects auth normales |
| Prod intacto | **PASS** |

---

## 4.1 DELETE friendly residual

```sql
DELETE FROM public.partidos
WHERE id = '4c8abda8-c56f-48e6-ac2e-9f3f950c1d1c'
  AND NOT EXISTS (
    SELECT 1 FROM public.pronosticos p
    WHERE p.partido_id = '4c8abda8-c56f-48e6-ac2e-9f3f950c1d1c'
  );
```

| Métrica | Antes | Después |
|---------|------:|--------:|
| Partidos totales | 73 | **72** |
| Friendlies | 1 | **0** |
| Pronósticos en friendly | 0 | — |

---

## 4.2–4.3 Migrations aplicadas (solo staging)

| Registro `schema_migrations` | Nombre |
|------------------------------|--------|
| `20260617225943` | `migration_0_competitions_seasons` |
| `20260617225948` | `migration_0b_competitions_seasons_rls` |

Archivos fuente: `supabase/migrations/20260615120000_*.sql`, `20260615130000_*.sql`.

---

## 4.4 SQL G — verificación BD

| ID | Check | Esperado | Obtenido | |
|----|-------|----------|----------|---|
| G1 | `competitions` | ≥ 1 | **1** | PASS |
| G2 | `seasons` | ≥ 1 | **1** | PASS |
| G3 | columna `partidos.season_id` | 1 fila | **1** | PASS |
| G4 | `season_id IS NULL` | 0 | **0** | PASS |
| G5 | partidos WC 2026 season | = total | **72 / 72** | PASS |
| G6 | pilot restantes | 0 | **0** | PASS |
| G7 | FK `partidos_season_id_fkey` | existe | **1** | PASS |
| G8 | triggers `partidos_after_update_puntos`, `partidos_updated_at` | 2 | **2** | PASS |
| G9 | seed `fifa-world-cup` UUID fijo | 1 | **1** | PASS |

**Seed verificado:**

- Competition: `b0000000-0000-4000-8000-000000000001` / `fifa-world-cup`
- Season: `b0000000-0000-4000-8000-000000000002` / `fifa-world-cup-2026`

---

## 4.5 Smoke P0

### UI autenticado (pre-M0, confirmado por operador)

| Flujo | Resultado |
|-------|-----------|
| Login staging | PASS |
| Network solo staging Supabase | PASS |
| Home, quiniela, leaderboard | PASS |
| Partido + Pitoniso | PASS |
| Multi-quiniela, grupo/quiniela | PASS |

### HTTP post-M0 (automated, sin cookie de sesión)

| Ruta | HTTP | Notas |
|------|-----:|-------|
| `/` | 200 | OK |
| `/login` | 200 | OK |
| `/quiniela` | 307 → login | Esperado sin auth |
| `/leaderboard` | 307 → login | Esperado sin auth |
| `/partidos/{id}` | 307 → login | Esperado sin auth |

Sin errores 500 post-migration en rutas probadas.

**Recomendación:** smoke UI post-M0 opcional en ventana corta (mismo checklist operador).

---

## Errores

**Ninguno.** FASE 4 staging completada sin fallos SQL ni migración rechazada.

---

## FASE 5 — Decisión producción

# **GO WITH CHANGES**

| Criterio | Staging | Prod |
|----------|---------|------|
| Migration 0 + 0b | ✅ PASS | ❌ No aplicada |
| Friendly eliminado | ✅ | ⚠️ Pendiente (`4c8abda8-…`, 0 pronósticos) |
| SQL G1–G9 | ✅ 9/9 | — |
| Smoke P0 | ✅ | — |
| PITR / backup confirmado | — | ⚠️ Confirmar en Dashboard |
| Ventana mantenimiento | — | ⚠️ Según `PRODUCTION_EXECUTION_CHECKLIST.md` |

**Cambios requeridos antes de prod:**

1. `DELETE` friendly México–Serbia en **prod** (mismo id, 0 pronósticos).
2. Confirmar **PITR/backup** reciente en prod.
3. Aplicar `20260615120000` + `20260615130000` en ventana acordada.
4. Smoke P0 + SQL G en prod inmediatamente después.
5. **No** iniciar SC-4 hasta cierre post-M0.

**NO GO** solo si falla smoke prod o no hay backup.

---

## Prod — verificación no-touch

```text
hbcsvpbksuunbhagjqyk: competitions table EXISTS = false (post-ejecución staging)
```

---

## Siguiente paso

1. Commit docs staging (opcional): `STAGING_RUNTIME_VERIFY.md`, `STAGING_MIGRATION_0_RESULTS.md`.
2. Planificar ventana prod siguiendo `PRODUCTION_EXECUTION_CHECKLIST.md` + `PRODUCTION_PREFLIGHT_REPORT.md`.
3. Post-M0 prod: monitorear partidos nuevos con `season_id NULL` (cron ingest — ver `MIGRATION_0_SMOKE_TESTS.md` regresiones conocidas).
