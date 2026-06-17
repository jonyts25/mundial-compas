# STAGING CONNECTION CHECKLIST — Migration 0

> **Fecha:** 2026-06-17  
> **Objetivo:** Conectar app staging a Supabase staging y **confirmar que no apunta a producción**.  
> **Estado:** Pendiente — Railway solo tiene `production` hoy.

---

## Proyectos Supabase

| Entorno | Nombre | `project_ref` | URL API |
|---------|--------|---------------|---------|
| **Producción** | Mundial Compas | `hbcsvpbksuunbhagjqyk` | `https://hbcsvpbksuunbhagjqyk.supabase.co` |
| **Staging** | mundial-compas-staging | `jjzfvzmsfiuwjxdjvnpu` | `https://jjzfvzmsfiuwjxdjvnpu.supabase.co` |

Obtener keys en Dashboard → **Project Settings → API** del proyecto staging (no copiar keys de prod).

---

## Variables obligatorias (Railway staging)

| Variable | Staging | Notas |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jjzfvzmsfiuwjxdjvnpu.supabase.co` | Debe contener `jjzfvzmsfiuwjxdjvnpu` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key **staging** | Nunca reutilizar anon de prod en staging público |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role **staging** | Solo server; rotar si se filtró |
| `NEXT_PUBLIC_APP_URL` | URL Railway staging (ej. `https://mundial-compas-staging.up.railway.app`) | Auth redirects |
| `FOOTBALL_DATA_PROVIDER` | `api-sports` | Igual que prod |
| `API_SPORTS_KEY` | Key api-sports.io | Puede compartir cuota con prod |
| `API_SPORTS_LEAGUE_ID` | `1` | Mundial WC |
| `API_SPORTS_SEASON` | `2026` | |
| `ADMIN_CARGAR_PARTIDOS_SECRET` | **Nuevo** valor solo staging | No igual que prod |
| `PILOT_MODE_ENABLED` | `false` | |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `false` recomendado | Evita contaminar PostHog prod |

### Variables opcionales / crons

| Variable | Recomendación staging |
|----------|----------------------|
| `API_FOOTBALL_WEBHOOK_SECRET` | Secret distinto o **no** registrar URL staging en proveedor |
| `API_FOOTBALL_KEY` / `APIFOOTBALL_*` | Solo si se prueba provider legacy |
| Crons (`sync-live`, `sync-lineups`, `sync-calendar`) | **Pausar** salvo prueba explícita |
| `NEXT_PUBLIC_POSTHOG_KEY` | Omitir o proyecto PostHog staging |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` si se usa |

---

## Cómo validar que staging NO apunta a prod

### 1. Inspección de variables Railway

```powershell
railway environment new staging   # si aún no existe
railway link
railway variables --environment staging
```

**PASS** si `NEXT_PUBLIC_SUPABASE_URL` contiene `jjzfvzmsfiuwjxdjvnpu`.  
**FAIL** si contiene `hbcsvpbksuunbhagjqyk`.

### 2. Build-time check (browser)

Tras deploy staging, abrir DevTools → Network → cualquier request a Supabase:

- Host debe ser `jjzfvzmsfiuwjxdjvnpu.supabase.co`
- No debe aparecer `hbcsvpbksuunbhagjqyk`

### 3. SQL de “huella” por proyecto

Ejecutar en **staging** (SQL Editor o MCP):

```sql
-- Debe devolver exactamente el ref staging
SELECT current_database() AS db_name;

SELECT count(*) AS partidos FROM partidos;
-- Staging clone (2026-06-17): esperado 73 partidos

SELECT count(*) AS pronosticos FROM pronosticos;
-- Staging clone: ~739 (prod live puede ser mayor por actividad post-backup)
```

Ejecutar en **prod** solo para comparar (lectura):

```sql
SELECT count(*) FROM partidos;      -- prod: 73
SELECT count(*) FROM pronosticos;   -- prod live: puede diferir del clone
```

Si la app staging muestra conteos idénticos al clone **y** la URL Supabase es staging → conexión correcta.

### 4. Local `.env.local`

Hoy el workspace local apunta a **prod** (`hbcsvpbksuunbhagjqyk`). Para pruebas locales contra staging:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jjzfvzmsfiuwjxdjvnpu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role>
```

**No** commitear `.env.local`.

---

## SQL de conteo (verificación rápida)

```sql
SELECT
  (SELECT count(*) FROM partidos)           AS partidos,
  (SELECT count(*) FROM pronosticos)        AS pronosticos,
  (SELECT count(*) FROM ligas_privadas)     AS ligas_privadas,
  (SELECT count(*) FROM auth.users)         AS usuarios;
```

**Staging (2026-06-17):** `73` / `739` / `12` / `24`

---

## Supabase Auth (staging)

En proyecto **staging** → Authentication → URL Configuration:

| Campo | Valor |
|-------|--------|
| Site URL | URL Railway staging |
| Redirect URLs | `https://<staging-app>/callback`, etc. |

No reutilizar Site URL de prod en el proyecto staging.

---

## Checklist pre-Migration 0

- [ ] Environment `staging` creado en Railway
- [ ] Variables Supabase apuntan a `jjzfvzmsfiuwjxdjvnpu`
- [ ] Deploy staging responde HTTP 200
- [ ] Network tab confirma host Supabase staging
- [ ] Crons/webhooks de prod **no** disparan contra staging
- [ ] `STAGING_RESTORE_VERIFY.md` en PASS
- [ ] Listo para FASE 4 (`STAGING_MIGRATION_0_RESULTS.md`)

---

## Bloqueador actual

| Item | Estado |
|------|--------|
| Supabase staging | ✅ Existe (`mundial-compas-staging`) |
| Railway `staging` environment | ❌ Solo `production` |
| App desplegada contra staging | ❌ Prod usa `hbcsvpbksuunbhagjqyk` |
| Variables staging en Railway | ❌ No configuradas |

**Siguiente paso humano:** crear Railway environment `staging`, copiar variables reemplazando refs Supabase, deploy, validar checklist arriba.
