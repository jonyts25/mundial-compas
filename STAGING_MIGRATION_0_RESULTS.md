# STAGING MIGRATION 0 — Results

> **Fecha:** 2026-06-17  
> **Estado:** **NO EJECUTADO** — detenido tras FASE 3 por política de seguridad.

---

## Por qué no se ejecutó FASE 4

Instrucción de sesión: *si no hay acceso confirmado a las variables de Supabase staging, detenerse después de FASE 3 y no aplicar migrations.*

| Requisito | Estado |
|-----------|--------|
| Supabase staging existe | ✅ `jjzfvzmsfiuwjxdjvnpu` |
| SELECTs en staging (MCP) | ✅ Completados → `STAGING_RESTORE_VERIFY.md` |
| Variables staging en Railway | ❌ No existe environment `staging` |
| App desplegada contra staging | ❌ Prod Railway → prod Supabase |
| `.env.local` workspace | ❌ Apunta a `hbcsvpbksuunbhagjqyk` (prod) |
| Keys staging confirmadas para deploy | ❌ No configuradas en ningún runtime |

**Acción tomada:** No DELETE friendly, no `apply_migration`, no smoke tests UI.

---

## FASE 4 — Plan (pendiente)

Ejecutar **solo en staging** (`jjzfvzmsfiuwjxdjvnpu`), en orden:

### 4.1 Pilot / friendly cleanup

```sql
DELETE FROM partidos
WHERE id = '4c8abda8-c56f-48e6-ac2e-9f3f950c1d1c'
  AND (SELECT count(*) FROM pronosticos WHERE partido_id = '4c8abda8-c56f-48e6-ac2e-9f3f950c1d1c') = 0;
-- Esperado: DELETE 1 → 72 partidos World Cup
```

### 4.2 Migration 0

```bash
# Con CLI, tras supabase link al staging:
supabase db push
# O MCP apply_migration / SQL Editor, en orden:
# 1. supabase/migrations/20260615120000_migration_0_competitions_seasons.sql
# 2. supabase/migrations/20260615130000_migration_0b_competitions_seasons_rls.sql
```

### 4.3 Smoke tests P0 (`MIGRATION_0_SMOKE_TESTS.md`)

| Área | IDs | Método |
|------|-----|--------|
| Home | A1–A5 | Manual en URL staging |
| Quiniela global/grupo | B1–B5 | Manual |
| Partido + Pitoniso | C1–C4 | Manual |
| Multi-quiniela | C3 | Manual |
| Leaderboard | D2, D4 | Manual |
| SQL `season_id` | G1–G9 | SQL Editor staging |

### 4.4 SQL post-M0 (mínimo)

```sql
SELECT count(*) FROM competitions;  -- esperado ≥ 1
SELECT count(*) FROM seasons;       -- esperado ≥ 1
SELECT count(*) FILTER (WHERE season_id IS NULL) AS sin_season FROM partidos;  -- esperado 0
```

---

## Resultados (vacío hasta FASE 4)

| Paso | Resultado |
|------|-----------|
| DELETE friendly | — |
| Migration `20260615120000` | — |
| Migration `20260615130000` | — |
| Smoke P0 | — |
| SQL G1–G9 | — |

---

## FASE 5 — Decisión producción (preliminar)

# **NO GO** para producción

| Criterio | Estado |
|----------|--------|
| Migration 0 en staging PASS | ❌ No ejecutada |
| Smoke P0 staging PASS | ❌ No ejecutados |
| Friendly eliminado en staging | ❌ |
| Railway staging conectado | ❌ |
| Prod intacto | ✅ Sin cambios |

**Cuando staging pase:** revisar → **GO WITH CHANGES** (eliminar friendly prod + ventana mantenimiento + PITR confirmado), según `PRODUCTION_PREFLIGHT_REPORT.md`.

---

## Siguiente paso exacto

1. **Railway:** `railway environment new staging` → duplicar service → set variables de `STAGING_CONNECTION_CHECKLIST.md`.
2. **Deploy** staging → validar host Supabase `jjzfvzmsfiuwjxdjvnpu` en Network.
3. **Re-ejecutar** FASE 4 (DELETE → M0 → M0b → smoke) y actualizar este archivo con PASS/FAIL.
4. Solo entonces reevaluar GO para prod.
