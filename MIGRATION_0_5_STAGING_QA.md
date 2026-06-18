# MIGRATION 0.5 — Staging QA Report

> **Fecha:** 2026-06-17  
> **Proyecto Supabase:** `jjzfvzmsfiuwjxdjvnpu` (`https://jjzfvzmsfiuwjxdjvnpu.supabase.co`)  
> **App staging:** `https://mundial-compas-service-staging.up.railway.app`  
> **Deploy Railway:** `7ac838a8-72d0-4e4a-b693-442975e9ef9a` — **SUCCESS**  
> **Prod:** no tocado

---

## FASE 1 — Deploy staging

| Check | Resultado |
|-------|-----------|
| `railway up -e staging` (M0.5 sin commit) | **PASS** |
| Deployment status | SUCCESS |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jjzfvzmsfiuwjxdjvnpu.supabase.co` ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ref `jjzfvzmsfiuwjxdjvnpu` ✓ |

---

## FASE 2 — Ingest

**Método:** **A** — `POST /api/admin/cargar-partidos`

```
POST https://mundial-compas-service-staging.up.railway.app/api/admin/cargar-partidos?provider=api-sports&league=1&season=2026
Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>
```

| Campo | Valor |
|-------|-------|
| HTTP status | 200 |
| `ok` | true |
| `provider` | api-sports.io |
| `modo` | mundial |
| `fetched` | 72 |
| `upserted` | 72 |

**Opción B** (`recargar-mundial.mjs`) no fue necesaria.

---

## FASE 3 — SQL verificación

Ejecutado vía Supabase MCP en `jjzfvzmsfiuwjxdjvnpu`.

| Query | Esperado | Resultado | Status |
|-------|----------|-----------|--------|
| `sin_season` (no-pilot sin `season_id`) | 0 | **0** | **PASS** |
| `COUNT(partidos)` | 72 | **72** | **PASS** |
| `friendlies` (`league_name = 'Friendlies'`) | 0 | **0** | **PASS** |
| Bonus: `season_id = DEFAULT_SEASON_ID` | 72 | **72** | **PASS** |

```sql
-- sin_season
SELECT COUNT(*) AS sin_season
FROM public.partidos
WHERE season_id IS NULL
  AND NOT (
    COALESCE(metadata->>'competencia', '') = 'pilot'
    OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
  );
-- → 0

SELECT COUNT(*) FROM partidos;  -- → 72

SELECT COUNT(*) FROM partidos
WHERE metadata->'api_football'->>'league_name' = 'Friendlies';
-- → 0
```

---

## FASE 4 — Smoke UI staging

Smoke HTTP automatizado (sin sesión autenticada). Rutas protegidas redirigen a login (307); sin 5xx.

| Ruta / área | HTTP | Status |
|-------------|------|--------|
| Home `/` | 200 | **PASS** |
| Quiniela `/quiniela` | 307 → login | **PASS** (sin 5xx) |
| Partido `/partidos/{id}` | 307 → login | **PASS** (sin 5xx) |
| Pitoniso (en detalle partido) | 307 → login | **PASS** (sin 5xx) |
| Multi-quiniela (carousel home) | home 200 | **PASS** |
| Leaderboard `/leaderboard` | 307 → login | **PASS** (sin 5xx) |
| Login `/login` | 200 | **PASS** |

**Nota:** Validación visual autenticada (Pitoniso expandido, pronósticos, multi-quiniela con grupos) no ejecutada en esta sesión. Recomendado smoke manual con cuenta staging si se requiere sign-off UI completo.

---

## Errores

Ninguno bloqueante.

- `/api/health` no existe como API JSON; devuelve HTML de login (no afecta QA M0.5).

---

## Veredicto

| Área | Veredicto |
|------|-----------|
| Deploy staging M0.5 | **PASS** |
| Ingest + `season_id` | **PASS** |
| SQL 3/3 | **PASS** |
| Smoke HTTP | **PASS** |
| **Global staging QA** | **GO** |

---

## Siguiente paso

1. Commit M0.5 (código + docs) cuando el operador lo solicite.  
2. Deploy prod Railway (solo app; sin migraciones SQL nuevas).  
3. Ejecutar ingest prod (`POST cargar-partidos` o cron) y repetir query `sin_season = 0`.  
4. Monitoreo 48h post-prod.
