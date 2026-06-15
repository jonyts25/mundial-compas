# MIGRATION-0 — GO / NO-GO Decision

> **Fecha:** 2026-06-15  
> **Alcance:** Pilot cleanup + Migration 0 en **staging** (prod pendiente).  
> **Estado ejecución:** Nada aplicado en esta sesión — decisión basada en auditoría estática.

---

## Decisión

# GO WITH CHANGES

---

## 1. ¿Pilot cleanup puede ejecutarse ya?

### **SÍ — en staging, con checklist**

| Factor | Estado |
|--------|--------|
| Criterio pilot documentado | ✅ `PILOT_CLEANUP_REPORT.md` |
| SQL review listo | ✅ `PILOT_CLEANUP_SQL_REVIEW.md` |
| Plan ejecución | ✅ `PILOT_CLEANUP_EXECUTION_PLAN.md` |
| Riesgos identificados | ✅ DELETE reversible solo con backup |
| Blocker técnico | ❌ Ninguno |

**Condiciones antes de ejecutar:**

1. Confirmar proyecto Supabase **staging** (no prod).
2. Ejecutar SELECT pre-flight (§3.2–3.3 del execution plan).
3. Backup lógico si `partidos_pilot > 0`.
4. Transacción DELETE + verificación §3.6.

**Prod:** Mismo procedimiento **después** de staging PASS — no antes.

---

## 2. ¿Migration 0 puede aplicarse ya en staging?

### **SÍ — después de pilot cleanup staging**

| Factor | Estado |
|--------|--------|
| Migration SQL auditada | ✅ `MIGRATION_0_AUDIT.md` |
| Sintaxis / orden DDL | ✅ Válido |
| Idempotencia local | ✅ Aceptable |
| App requiere cambios de código | ❌ No (M0 aditivo) |
| Prerequisito pilot | ⚠️ **Obligatorio** |

**Orden staging:**

```
Pilot cleanup (staging) → Apply 20260615120000_migration_0_competitions_seasons.sql → Smoke tests
```

**No aplicar** si pilot cleanup no verificó `pilot_restantes = 0`.

---

## 3. ¿Hay blockers?

| Blocker | Tipo | Resolución |
|---------|------|------------|
| **B1** Pilot cleanup no ejecutado | Operativo | Ejecutar `PILOT_CLEANUP_EXECUTION_PLAN.md` en staging |
| **B2** Staging Supabase no confirmado | Operativo | Crear/vincular proyecto staging distinto de prod |
| **B3** RLS ausente en `competitions`/`seasons` | Seguridad (prod) | Añadir RLS read-only antes prod — **no bloquea staging QA** |
| **B4** Upserts sin `season_id` post-M0 | Operativo (medio) | Monitoreo G4/G5 en smoke; fix ingest en Migration 0.5 |
| **B5** Archivos sin commit | Proceso | Commitear docs + migration cuando humano apruebe |

**Ningún blocker técnico** impide apply en staging tras B1+B2.

---

## 4. ¿Qué haría después?

### Inmediato (staging)

1. **Commit** docs + migration (humano — no automático).
2. **Pilot cleanup staging** — `PILOT_CLEANUP_EXECUTION_PLAN.md`.
3. **Apply Migration 0 staging** — `supabase migration up` o SQL Editor.
4. **Smoke tests** — `MIGRATION_0_SMOKE_TESTS.md` (P0 + G completo).
5. **Registrar resultados** en plantilla smoke tests.

### Corto plazo (pre-prod)

6. **Migration 0b** (opcional): RLS read-only en `competitions`/`seasons`.
7. **Pilot cleanup prod** + backup prod.
8. **Apply Migration 0 prod** en ventana acordada.
9. **Smoke prod** subset P0.
10. **`PILOT_MODE_ENABLED=false`** prod.

### Medio plazo (Sports Core)

11. **SC-4** — Pick aggregates genérico.
12. **SC-5** — Profiles genérico.
13. **Migration 0.5** — ingest scripts setean `season_id` en upsert.
14. **Constants** — `DEFAULT_SEASON_ID` en adapters.
15. **Expo shell** — post SC-5 (`MOBILE_FIRST_ECOSYSTEM_PLAN.md`).

---

## Justificación GO WITH CHANGES

| Opción | Por qué no |
|--------|------------|
| **GO** puro | Faltan cambios menores recomendados (RLS C1, monitoreo ingest) antes de prod |
| **NO GO** | Migration es aditiva, auditada, sin errores críticos; bloquear staging retrasaría sin causa técnica |

**GO WITH CHANGES** porque:

1. **Staging puede proceder hoy** tras pilot cleanup — migration SQL es sólida.
2. **Cambios requeridos antes de producción:**
   - RLS en tablas nuevas (C1 en `MIGRATION_0_AUDIT.md`).
   - Staging smoke PASS documentado.
   - Monitoreo `season_id NULL` post-cron.
3. **No modificar migration** por auditoría — sin errores críticos.
4. **Prod explícitamente NO** hasta completar ciclo staging.

---

## Matriz de decisión por entorno

| Acción | Staging | Producción |
|--------|---------|------------|
| Pilot cleanup | ✅ GO (con checklist) | ⏸ Después staging PASS |
| Migration 0 apply | ✅ GO (post-cleanup) | ⏸ GO WITH CHANGES (post-staging + RLS) |
| Deploy app | ✅ Sin cambios requeridos | ✅ Sin cambios requeridos |
| Commit docs/migration | ⏸ Humano | — |

---

## Próximo paso exacto

```
1. Revisar y commitear (humano):
   - PILOT_CLEANUP_EXECUTION_PLAN.md
   - MIGRATION_0_AUDIT.md
   - MIGRATION_0_DEPENDENCY_AUDIT.md
   - MIGRATION_0_SMOKE_TESTS.md
   - MIGRATION_0_GO_NO_GO.md
   - supabase/migrations/20260615120000_migration_0_competitions_seasons.sql
   (+ docs previos PILOT_*, MIGRATION_0_READY, MOBILE_FIRST_*)

2. En Supabase STAGING:
   a. Ejecutar PILOT_CLEANUP_EXECUTION_PLAN §3.2–3.5
   b. Apply migration 20260615120000
   c. Ejecutar MIGRATION_0_SMOKE_TESTS (G + P0)

3. Si PASS → planificar prod con RLS patch
   Si FAIL → diagnosticar; NO prod
```

---

*Decisión documentada — sin SQL ejecutado, sin commits.*
