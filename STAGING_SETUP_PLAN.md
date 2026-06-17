# STAGING SETUP PLAN — Migration 0

> **Fecha:** 2026-06-17  
> **Objetivo:** Entorno staging con datos reales de prod para probar pilot cleanup + Migration 0 + 0b sin tocar producción.  
> **Estado:** Plan únicamente — **nada ejecutado**.

---

## Contexto actual

| Item | Estado |
|------|--------|
| Supabase prod | `hbcsvpbksuunbhagjqyk` (Mundial Compas, us-west-1) |
| Supabase staging dedicado | **No existe** |
| Supabase branching | MCP no pudo listar branches (permisos); feature disponible en plan de pago |
| Railway staging | **No existe** — solo `production` |
| Migration 0 en prod | **No aplicada** (`competitions` / `seasons` / `season_id` ausentes) |

---

## 1. Mejor forma de clonar prod → staging

**Recomendado: Supabase Dashboard → Restore to a New Project** (clone PITR/physical backup).

Por qué:

- Copia **schema + datos + auth.users** tal como está prod hoy.
- Permite probar Migration 0 con los mismos 73 partidos y 771 pronósticos.
- Proyecto staging **independiente** — fallos no afectan prod.
- Railway puede apuntar a URLs/keys del proyecto clonado.

**No recomendado como staging de Migration 0:**

| Opción | Motivo |
|--------|--------|
| **Supabase Branch (preview)** | Solo aplica migraciones del repo; **no copia datos de prod**. Sirve para DDL, no para validar cleanup/backfill con datos reales. |
| **Proyecto vacío + `supabase db push`** | Schema al día pero sin pronósticos/partidos reales — no valida impacto cleanup. |
| **`pg_dump` manual sin plan** | Válido pero más frágil (roles, extensions, auth). Clone dashboard es más seguro en Supabase. |

---

## 2. Comparativa de opciones

| Criterio | Restore → nuevo proyecto | Supabase branch | Proyecto nuevo + dump/import |
|----------|--------------------------|-----------------|------------------------------|
| Datos prod | ✅ Completo | ❌ Vacío (seed) | ✅ Si dump completo |
| Auth users | ✅ | ❌ | ⚠️ Parcial |
| Costo extra | ~duplicar compute prod | Branch pricing | Dump storage |
| Tiempo setup | 15–60 min | 5–10 min | 1–3 h manual |
| Aislamiento | ✅ Total | ✅ Total | ✅ Total |
| Valor para M0 | **Alto** | Bajo | Medio-alto |

---

## 3. Comandos exactos (flujo recomendado)

### 3.1 Crear staging Supabase (humano en Dashboard)

1. Abrir [Database → Backups → Restore to a new project](https://supabase.com/dashboard/project/hbcsvpbksuunbhagjqyk/database/backups/restore-to-new-project)
2. Elegir backup más reciente **o** punto PITR justo antes de la ventana de prueba.
3. Nombre sugerido: `Mundial Compas Staging`
4. Anotar nuevo `project_ref`: `________________`
5. **Post-clone obligatorio:**
   - Desactivar extensiones con side-effects externos (`pg_cron`, `pg_net`, wrappers) si estaban activas.
   - Rotar no es necesario para staging, pero **no** reutilizar webhooks de prod apuntando al clone.

### 3.2 Verificar clone

```sql
-- En SQL Editor del proyecto STAGING (solo lectura de verificación)
SELECT count(*) FROM partidos;
SELECT count(*) FROM pronosticos;
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitions');
```

Esperado: mismos conteos que prod pre-M0; `competitions` = false.

### 3.3 Aplicar migrations en staging (después de validar clone)

Con Supabase CLI (desde repo local):

```bash
# Requiere: supabase login, SUPABASE_ACCESS_TOKEN, STAGING_PROJECT_REF
export STAGING_PROJECT_REF="<project-ref-staging>"
export SUPABASE_DB_PASSWORD="<staging-db-password>"

supabase link --project-ref "$STAGING_PROJECT_REF"

# Ver drift
supabase migration list

# Aplicar solo las pendientes (incluye M0 si no están en schema_migrations del clone)
supabase db push
```

**Alternativa sin CLI:** pegar en SQL Editor del staging, en orden:

1. `supabase/migrations/20260615120000_migration_0_competitions_seasons.sql`
2. `supabase/migrations/20260615130000_migration_0b_competitions_seasons_rls.sql`

> El clone hereda el historial de `supabase_migrations.schema_migrations` de prod (hoy solo registra 4 migraciones MCP recientes). Revisar `migration list` antes de push para evitar re-aplicar DDL ya presente manualmente.

### 3.4 Railway staging (servicio separado)

```bash
# Crear environment staging en Railway (Dashboard o CLI)
railway environment new staging

# Nuevo servicio o duplicar "Mundial Compas Service"
railway link
railway variables set \
  NEXT_PUBLIC_SUPABASE_URL="https://<STAGING_REF>.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="<staging-anon>" \
  SUPABASE_SERVICE_ROLE_KEY="<staging-service-role>" \
  FOOTBALL_DATA_PROVIDER="api-sports" \
  PILOT_MODE_ENABLED="false"
# Copiar el resto desde prod EXCEPTO secrets compartidos de webhooks si no quieres eventos duplicados
```

Deploy desde mismo repo/branch `master`; URL distinta (ej. `mundial-compas-staging.up.railway.app`).

### 3.5 Smoke tests staging

Seguir `MIGRATION_0_SMOKE_TESTS.md` secciones A–D + `PRODUCTION_EXECUTION_CHECKLIST.md` fases post-M0.

---

## 4. Variables Railway staging necesarias

Mínimo (copiar de prod y **reemplazar** refs Supabase):

| Variable | Notas |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto staging |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key staging |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role staging |
| `FOOTBALL_DATA_PROVIDER` | `api-sports` (igual que prod) |
| `API_SPORTS_KEY` | Puede ser la misma key (cuota compartida) |
| `ADMIN_CARGAR_PARTIDOS_SECRET` | **Nuevo** valor solo staging |
| `API_FOOTBALL_WEBHOOK_SECRET` | Desactivar webhook a staging o secret distinto |
| `PILOT_MODE_ENABLED` | `false` |
| `NEXT_PUBLIC_APP_URL` | URL Railway staging |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `false` recomendado |
| Crons (`sync-live`, `sync-lineups`, `sync-calendar`) | Opcional en staging; pausar si no se prueba live |

---

## 5. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Costo duplicado (2 proyectos Supabase) | Pausar/eliminar staging tras GO; usar compute pequeño si el clone lo permite |
| Webhooks api-sports apuntando a staging | No registrar URL staging en proveedor; o usar secret distinto |
| Cron staging escribe API/quota | Pausar crons en staging salvo prueba explícita |
| `pg_cron` / jobs del clone disparan en staging | Desactivar post-clone (ver docs Supabase clone) |
| Drift `schema_migrations` incompleto en prod | `migration list` antes de `db push`; no asumir que git = remoto |
| Datos sensibles duplicados | Staging con acceso restringido; no compartir URL públicamente |

---

## 6. Costo y limitaciones

| Concepto | Estimación |
|----------|------------|
| **Restore to new project** | Requiere plan de pago + physical backups habilitados (Pro+) |
| **Proyecto staging adicional** | ~mismo tier que prod (compute + disk); revisar costo en modal pre-restore |
| **PITR add-on** (si activo en prod) | Ya pagado en prod; clone usa ese historial |
| **Supabase Branch** | ~$0.10+/hora según docs; **sin datos prod** — no sustituye este plan |
| **Railway staging** | Servicio adicional según plan Railway |

**Limitaciones restore-to-new-project (Supabase docs):**

- Proyectos creados por restore **no pueden** usarse como fuente de otro clone (por ahora).
- Storage, Edge Functions, Auth settings y API keys requieren reconfiguración manual.
- Tiempo de restore proporcional al tamaño de BD (esta BD es pequeña: <1k pronósticos).

---

## 7. Recomendación final

### Hacer esto antes de tocar prod:

1. **Crear staging vía Restore to a New Project** (mejor opción para Migration 0).
2. **Railway environment `staging`** apuntando al nuevo Supabase.
3. En staging, en orden:
   - Preflight SELECT (copiar de `PRODUCTION_PREFLIGHT_REPORT.md`)
   - Pilot cleanup si aplica (ver reporte: 0 pilot por metadata, 1 friendly residual)
   - Apply `20260615120000` + `20260615130000`
   - Smoke tests
4. Solo con staging PASS → ventana prod siguiendo `PRODUCTION_EXECUTION_CHECKLIST.md`.

### No usar solo Supabase Branch para esta validación

Branch es útil para PR previews de DDL, pero **no reemplaza** un clone con datos reales para backfill `season_id` y verificación de cleanup.

---

## Siguiente paso inmediato (humano)

1. Dashboard Supabase → confirmar **PITR o daily backups** activos en prod.
2. Ejecutar **Restore to a New Project** → anotar `STAGING_PROJECT_REF`.
3. Compartir ref para configurar Railway staging y correr `supabase db push` de M0/M0b.
