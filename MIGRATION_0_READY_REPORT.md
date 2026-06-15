# MIGRATION-0-READY — Report

> **Estado:** Migration SQL **creada**, **NO aplicada** en Supabase producción ni local (salvo que el equipo la ejecute explícitamente).

**Fecha:** 2026-06-15  
**Prerequisito recomendado:** Pilot cleanup (`PILOT_CLEANUP_REPORT.md`)

---

## 1. Archivo migration creado

| Archivo | Descripción |
|---------|-------------|
| `supabase/migrations/20260615120000_migration_0_competitions_seasons.sql` | DDL + seed + backfill Migration 0 |

**Referencias de diseño:**

- `MIGRATION_0_DESIGN.md`
- `MIGRATION_0_SQL_REVIEW.md`

---

## 2. Resumen tablas/columnas nuevas

### 2.1 `public.competitions` (nueva)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | Sin default — seeds explícitos |
| `slug` | CITEXT UNIQUE | ej. `fifa-world-cup` |
| `name`, `short_name` | TEXT | |
| `sport` | TEXT | default `football` |
| `format` | TEXT | CHECK: league, groups_knockout, knockout_only, custom |
| `country_scope` | TEXT | |
| `timezone_default` | TEXT | default `America/Mexico_City` |
| `provider_config` | JSONB | apifootball, api_sports, sync |
| `active` | BOOLEAN | |
| `metadata` | JSONB | |
| `created_at`, `updated_at` | TIMESTAMPTZ | trigger `set_updated_at()` |

### 2.2 `public.seasons` (nueva)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `competition_id` | UUID FK → competitions | ON DELETE RESTRICT |
| `slug` | CITEXT UNIQUE | |
| `year_label` | TEXT | |
| `start_at`, `end_at` | TIMESTAMPTZ | CHECK start ≤ end |
| `status` | TEXT | scheduled, active, finished, cancelled |
| `is_current` | BOOLEAN | índice único parcial por competition |
| `external_ids`, `metadata` | JSONB | |
| `created_at`, `updated_at` | TIMESTAMPTZ | trigger `set_updated_at()` |

### 2.3 `public.partidos` (columna nueva)

| Columna | Tipo | Notas |
|---------|------|-------|
| `season_id` | UUID NULL | FK → seasons ON DELETE RESTRICT |

**Sin NOT NULL** en Migration 0.  
**Sin índice** `(season_id, fecha_kickoff)` en Migration 0.

---

## 3. Seed UUIDs fijos

| Entidad | UUID |
|---------|------|
| `competitions` — FIFA World Cup | `b0000000-0000-4000-8000-000000000001` |
| `seasons` — World Cup 2026 | `b0000000-0000-4000-8000-000000000002` |

Convención: prefijo `b0000000` = capa Sports Core (vs `a0000000` liga global).

---

## 4. Backfill

```sql
UPDATE public.partidos
SET season_id = 'b0000000-0000-4000-8000-000000000002', updated_at = now()
WHERE season_id IS NULL;
```

**Política:** asigna WC 2026 a **todos** los partidos restantes.  
**Prerequisito:** pilot cleanup completado — no excluye pilot en SQL porque no deben existir filas pilot post-cleanup.

Idempotente: solo filas con `season_id IS NULL`.

---

## 5. Qué NO toca esta migration

| Área | Estado |
|------|--------|
| RLS policies | Sin cambios |
| Triggers existentes (`partidos_after_update_puntos`, pronóstico lock, etc.) | Sin cambios |
| RPC (`tabla_liderato_quiniela`, etc.) | Sin cambios |
| `pronosticos` schema | Sin cambios |
| `ligas_privadas` | Sin cambios |
| Scoring (`calcular_puntos_pronostico`, etc.) | Sin cambios |
| NOT NULL en `season_id` | **No** (Migration 0c futura) |
| Índice `partidos(season_id)` | **No** |
| Tabla `rounds` | **No** (Migration 1) |
| Código app / adapters | **No** |

---

## 6. SQL de verificación post-apply

Ejecutar en SQL Editor **después** de apply local/staging:

```sql
-- 6.1 Seed competitions/seasons
SELECT id, slug, name FROM public.competitions;
SELECT id, slug, year_label, is_current FROM public.seasons;

-- 6.2 Columna season_id existe
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'partidos'
  AND column_name = 'season_id';

-- 6.3 FK existe
SELECT conname, confdeltype
FROM pg_constraint
WHERE conname = 'partidos_season_id_fkey';
-- confdeltype 'r' = RESTRICT

-- 6.4 Backfill completo (esperado: 0 NULL si no hay pilot)
SELECT COUNT(*) AS partidos_sin_season
FROM public.partidos
WHERE season_id IS NULL;

SELECT COUNT(*) AS partidos_wc_2026
FROM public.partidos
WHERE season_id = 'b0000000-0000-4000-8000-000000000002';

-- 6.5 Total coherente
SELECT COUNT(*) AS partidos_total FROM public.partidos;

-- 6.6 Sin partidos pilot (post-cleanup)
SELECT COUNT(*) AS pilot_restantes
FROM public.partidos
WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
   OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE;
-- Esperado: 0

-- 6.7 Triggers intactos (smoke)
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.partidos'::regclass
  AND NOT tgisinternal;
-- Debe incluir partidos_after_update_puntos, partidos_updated_at
```

### Smoke tests app (manual)

- [ ] Home / calendario cargan partidos
- [ ] Quiniela guarda pronóstico
- [ ] Leaderboard global y grupos
- [ ] Partido + Pitoniso + chat
- [ ] Live sync (si aplica)

---

## 7. Rollback manual

Solo válido mientras app **no lee** `season_id` y columna sigue nullable.

```sql
BEGIN;

UPDATE public.partidos
SET season_id = NULL, updated_at = now()
WHERE season_id = 'b0000000-0000-4000-8000-000000000002';

ALTER TABLE public.partidos
  DROP CONSTRAINT IF EXISTS partidos_season_id_fkey;

ALTER TABLE public.partidos
  DROP COLUMN IF EXISTS season_id;

DROP TABLE IF EXISTS public.seasons;
DROP TABLE IF EXISTS public.competitions;

COMMIT;
```

**Advertencia:** si existieran otras seasons o FKs futuras, ajustar antes de DROP.

En Supabase CLI: marcar migration como revertida solo si se usa `supabase migration repair` — preferir rollback SQL explícito en local.

---

## 8. Cómo aplicar localmente

### Prerequisitos

1. Pilot cleanup en BD local (opcional si local nunca tuvo pilot).
2. Supabase CLI instalado y stack local corriendo.

### Pasos

```powershell
cd D:\Proyectos\mundial-compas

# Ver estado migraciones
supabase migration list

# Aplicar pendientes (incluye 20260615120000_migration_0_competitions_seasons.sql)
supabase db reset
# O, sin reset destructivo total:
supabase migration up
```

### Verificación

```powershell
supabase db diff   # debe estar limpio post-apply
```

Ejecutar SQL §6 en Studio local: http://127.0.0.1:54323

---

## 9. Qué revisar antes de producción

| # | Check |
|---|-------|
| 1 | Pilot cleanup ejecutado y verificado (§6.6 = 0) |
| 2 | Backup Supabase (PITR / dump) |
| 3 | Apply en **staging** primero |
| 4 | §6.4 `partidos_sin_season = 0` |
| 5 | Smoke tests app §6 |
| 6 | Ventana de bajo tráfico (`ALTER TABLE partidos ADD COLUMN` es rápido en PG) |
| 7 | Monitorear scripts ingest post-M0 — aún no setean `season_id` en upserts nuevos |
| 8 | Documentar UUIDs en `constants.ts` (fase adapter SC-6, no bloqueante M0) |
| 9 | `PILOT_MODE_ENABLED=false` en Railway |
| 10 | No aplicar Migration 0c (NOT NULL / índice) hasta validar §6 |

---

## 10. Idempotencia local

La migration incluye guards para reintento local:

- `CREATE EXTENSION IF NOT EXISTS citext`
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`
- `INSERT … ON CONFLICT (id) DO NOTHING`
- `ADD COLUMN IF NOT EXISTS`
- FK en bloque `DO $$ … IF NOT EXISTS pg_constraint`
- Backfill `WHERE season_id IS NULL`

---

## 11. Secuencia operativa completa

```
PILOT-CLEANUP (datos) → Migration 0 apply (DDL+backfill) → SC-4 → SC-5 → Mobile shell
```

Ver `MOBILE_FIRST_ECOSYSTEM_PLAN.md` para roadmap producto.

---

*Migration creada para revisión. No aplicada en producción.*
