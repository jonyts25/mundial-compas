# MIGRATION-0 — Audit

> **Archivo auditado:** `supabase/migrations/20260615120000_migration_0_competitions_seasons.sql`  
> **Fecha:** 2026-06-15  
> **Estado:** Revisión estática — **NO aplicada** en ningún entorno durante esta auditoría.

**Referencias:** `MIGRATION_0_DESIGN.md`, `MIGRATION_0_SQL_REVIEW.md`, `MIGRATION_0_READY_REPORT.md`

---

## Resumen ejecutivo

| Aspecto | Veredicto |
|---------|-----------|
| Sintaxis PostgreSQL | ✅ Válida (PG 15 / Supabase) |
| Compatibilidad Supabase | ✅ Compatible con convenciones del repo |
| Idempotencia local | ✅ Mayormente cubierta |
| Seguridad (RLS) | ⚠️ Gap — tablas nuevas sin RLS |
| Prerequisito pilot | ⚠️ Cleanup obligatorio antes de apply |
| Cambios críticos en migration | **Ninguno** — no modificar archivo por esta auditoría |

**Recomendación:** **Aprobar apply en staging** tras pilot cleanup, con cambios menores documentados (no bloqueantes para staging).

---

## 1. Checklist técnico

### 1.1 Sintaxis PostgreSQL válida

| Elemento | Estado | Notas |
|----------|--------|-------|
| `CREATE EXTENSION IF NOT EXISTS citext` | ✅ | Ya en `20260518000001_initial_schema.sql`; redundante pero seguro |
| `CREATE TABLE IF NOT EXISTS` | ✅ | competitions, seasons |
| `CITEXT`, `JSONB`, CHECK constraints | ✅ | Alineado con schema existente |
| `EXECUTE FUNCTION public.set_updated_at()` | ✅ | Mismo patrón que migraciones existentes (PG 15+) |
| `DO $$ ... END $$` para FK condicional | ✅ | Evita error en reintento |
| `ON CONFLICT (id) DO NOTHING` | ✅ | Seeds idempotentes |
| `ADD COLUMN IF NOT EXISTS` | ✅ | |
| `UPDATE ... WHERE season_id IS NULL` | ✅ | Backfill idempotente |

### 1.2 Compatibilidad Supabase

| Tema | Estado |
|------|--------|
| Schema `public` | ✅ |
| Sin extensiones exóticas | ✅ (solo citext, ya habilitada) |
| Sin `SECURITY DEFINER` nuevo | ✅ |
| Sin cambio RLS existente | ✅ (pero ver §2.1) |
| Sin breaking change en triggers/RPC | ✅ |
| Migración versionada en `supabase/migrations/` | ✅ |

### 1.3 CREATE EXTENSION citext

- Presente línea 11: `CREATE EXTENSION IF NOT EXISTS citext;`
- **No-op** en entornos con schema inicial aplicado.
- **Necesario** en reset parcial donde citext no exista (edge case).

### 1.4 Triggers `set_updated_at`

```sql
DROP TRIGGER IF EXISTS competitions_updated_at ON public.competitions;
CREATE TRIGGER competitions_updated_at ... EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS seasons_updated_at ON public.seasons;
CREATE TRIGGER seasons_updated_at ... EXECUTE FUNCTION public.set_updated_at();
```

- Función `public.set_updated_at()` definida en `20260518000001_initial_schema.sql` línea ~334.
- Patrón `DROP IF EXISTS` + `CREATE` soporta reintento local.
- **No** añade trigger en `partidos` (correcto — ya existe `partidos_updated_at`).

### 1.5 FK `season_id`

```sql
ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS season_id UUID;
-- FK ON DELETE RESTRICT → seasons(id)
```

| Check | Estado |
|-------|--------|
| Orden DDL | ✅ seasons + seed antes de FK |
| RESTRICT vs CASCADE | ✅ Correcto — evita borrar season con partidos |
| Nullable en M0 | ✅ Sin NOT NULL |
| Guard `pg_constraint` | ✅ Idempotente |

**Nota:** FK se añade **antes** del backfill. Filas con `season_id NULL` son válidas hasta el UPDATE. No hay violación FK.

### 1.6 Seeds UUID fijos

| Entidad | UUID en migration | Alineado con design |
|---------|-------------------|---------------------|
| `competitions` | `b0000000-0000-4000-8000-000000000001` | ✅ |
| `seasons` | `b0000000-0000-4000-8000-000000000002` | ✅ |

- `provider_config` incluye apifootball 28, api_sports 1/2026, sync window.
- `is_current = TRUE` en season seed — compatible con índice único parcial.

### 1.7 Backfill

```sql
UPDATE public.partidos
SET season_id = 'b0000000-0000-4000-8000-000000000002', updated_at = now()
WHERE season_id IS NULL;
```

| Check | Estado |
|-------|--------|
| Asigna WC 2026 a todos NULL | ✅ |
| No excluye pilot en SQL | ⚠️ **Prerequisito:** pilot cleanup previo |
| Dispara `partidos_updated_at` | ✅ Solo `updated_at` — no recalc puntos |
| Dispara `partidos_after_update_puntos` | ✅ No — trigger solo en estatus/marcador |

### 1.8 Idempotencia

| Operación | Re-ejecución segura |
|-----------|---------------------|
| CREATE EXTENSION citext | ✅ |
| CREATE TABLE IF NOT EXISTS | ⚠️ No altera schema si tabla existe con diferente definición |
| DROP/CREATE triggers | ✅ |
| INSERT ON CONFLICT DO NOTHING | ✅ No actualiza seeds drifted |
| ADD COLUMN IF NOT EXISTS | ✅ |
| FK DO block | ✅ |
| UPDATE backfill | ✅ Solo NULLs |

---

## 2. Riesgos encontrados

| # | Riesgo | Severidad | Bloqueante staging | Bloqueante prod |
|---|--------|-----------|-------------------|-----------------|
| R1 | **Pilot no limpiado** → partidos pilot reciben `season_id` WC 2026 | **Alta** | Sí (orden) | Sí |
| R2 | **Tablas `competitions`/`seasons` sin RLS** — PostgREST puede exponer SELECT a roles con GRANT | Media | No* | Sí (antes prod) |
| R3 | **Upserts post-M0** no setean `season_id` → nuevos partidos NULL | Media | No | Monitorear |
| R4 | `CREATE TABLE IF NOT EXISTS` en retry con schema drift | Baja | No | No |
| R5 | `ON CONFLICT DO NOTHING` no corrige seed desactualizado | Baja | No | No |
| R6 | Backfill masivo UPDATE `partidos` — lock breve en tabla grande | Baja–Media | No | Ventana bajo tráfico |
| R7 | App no lee `season_id` — cero regresión funcional esperada | Info | — | — |
| R8 | Sin índice `(season_id, fecha_kickoff)` — queries futuras lentas | Baja | No | Migration 0c |

\*Staging: riesgo bajo si solo QA accede; datos seed no son secretos.

### 2.1 Detalle RLS (R2)

`partidos` tiene RLS + policy `partidos_select` (authenticated, `USING (true)`).

`competitions` y `seasons` **no** tienen `ENABLE ROW LEVEL SECURITY` en esta migration.

En Supabase, tablas nuevas en `public` reciben GRANTs por defecto. **Sin RLS**, clientes autenticados podrían leer/escribir vía PostgREST si descubren el nombre de tabla.

**Mitigación sugerida (Migration 0b o patch):**

```sql
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY competitions_select ON public.competitions FOR SELECT TO authenticated USING (true);
CREATE POLICY seasons_select ON public.seasons FOR SELECT TO authenticated USING (true);
-- Sin INSERT/UPDATE para authenticated (solo service role)
```

No es crítico para staging interno; **sí recomendado antes de producción**.

---

## 3. Cambios sugeridos (no críticos — no aplicados)

| # | Cambio | Prioridad | Cuándo |
|---|--------|-----------|--------|
| C1 | RLS read-only en `competitions`/`seasons` | Alta | Antes prod |
| C2 | Comentario SQL explícito: `-- REQUIERE pilot cleanup previo` | Baja | Opcional en migration |
| C3 | Post-apply job: alert si `partidos.season_id IS NULL` AND not pilot | Media | Tras M0 en prod |
| C4 | Migration 0.5: scripts ingest setean `season_id` en upsert | Media | SC-6 / post-M0 |
| C5 | Índice `(season_id, fecha_kickoff)` | Baja | Migration 0c |

**No modificar** `20260615120000_migration_0_competitions_seasons.sql` por esta auditoría — ningún error crítico de sintaxis o orden DDL.

---

## 4. ¿Aprobar apply en staging hoy?

### Condiciones

| Condición | ¿Cumplida? |
|-----------|------------|
| Proyecto Supabase staging disponible | ⚠️ Operacional — confirmar humano |
| Pilot cleanup staging ejecutado (§7 PILOT_CLEANUP_EXECUTION_PLAN) | ❌ Pendiente |
| Backup staging | ❌ Pendiente |
| Migration file revisada | ✅ |

### Veredicto staging

**SÍ — con prerequisitos operativos:**

1. Ejecutar pilot cleanup staging primero (o confirmar `partidos_pilot = 0`).
2. Backup staging.
3. Apply vía `supabase db push` / migration up / SQL Editor en staging.
4. Ejecutar verificaciones `MIGRATION_0_SMOKE_TESTS.md` + SQL §G.

**NO aplicar** si staging comparte BD con producción (debe ser proyecto distinto).

---

## 5. ¿Aprobar apply en producción después de staging?

### Condiciones

| Condición | Requerido |
|-----------|-----------|
| Staging cleanup + M0 + smoke PASS | ✅ |
| RLS C1 aplicado o aceptado explícitamente | Recomendado |
| Backup prod + ventana | ✅ |
| GO en `MIGRATION_0_GO_NO_GO.md` | ✅ |
| Monitoreo ingest NULL season_id | ✅ |

### Veredicto producción

**SÍ — solo después de staging completo**, con:

- Pilot cleanup prod.
- Smoke tests PASS en staging.
- RLS en tablas nuevas (C1) **recomendado antes de prod**.
- Plan de monitoreo post-deploy 24–48h.

**NO** aplicar directo en prod sin pasar staging.

---

## 6. Verificación SQL post-apply (referencia)

```sql
SELECT COUNT(*) FROM public.competitions;  -- >= 1
SELECT COUNT(*) FROM public.seasons;      -- >= 1
SELECT COUNT(*) FROM public.partidos WHERE season_id IS NULL;  -- 0 post-cleanup+backfill
SELECT COUNT(*) FROM public.partidos
WHERE season_id = 'b0000000-0000-4000-8000-000000000002';
```

---

*Auditoría estática — migration no modificada.*
