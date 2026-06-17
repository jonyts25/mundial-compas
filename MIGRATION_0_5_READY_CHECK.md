# MIGRATION 0.5 — Ready Check

> **Fecha:** 2026-06-17  
> **Estado:** Planificación — **NO implementar** en esta fase.  
> **Prerequisito:** Migration 0 + 0b en prod (**cerrado** — `MIGRATION_0_PROD_CLOSEOUT.md`).  
> **Fuente:** `MIGRATION_0_5_SEASON_INGESTION_PLAN.md`

---

## Problema

Tras M0, el backfill asignó `season_id` a los 72 partidos existentes. Los **insert/upsert** de ingest (cron, admin, scripts) **no incluyen** `season_id` hoy → nuevas filas quedarían `NULL`.

**Evidencia código:** búsqueda `season_id` en `src/` y `scripts/` → **0 referencias** (solo BD).

---

## Archivos exactos a modificar

### Constantes (nuevo)

| Archivo | Cambio |
|---------|--------|
| `src/lib/constants.ts` | Añadir `DEFAULT_SEASON_ID`, `DEFAULT_COMPETITION_ID` (UUIDs seed M0) |

*Alternativa aceptable:* `src/lib/sports-core/adapters/mundial-compas/constants.ts` si se prefiere aislar Sports Core.

### Helper compartido (recomendado, nuevo)

| Archivo | Cambio |
|---------|--------|
| `src/lib/partidos/with-season-id.ts` *(nuevo)* | `withSeasonId(row, isPilot)` — pseudocódigo del plan §5 |

Centraliza lógica para route + upsert; evita duplicar en 3 mappers.

### Ingest API (punto único crítico)

| Archivo | Cambio |
|---------|--------|
| `src/app/api/admin/cargar-partidos/route.ts` | Aplicar `withSeasonId` a rows **antes** de `upsertPartidoRows` (no-pilot) |
| `src/lib/partidos/upsert-partido-rows.ts` | Extender `PartidoUpsertRow` con `season_id?`; opcional: backfill NULL en `enrichRow` como red de seguridad |

`sync-calendar-cron.mjs` **delega** en esta route → no necesita `season_id` propio si la route lo inyecta.

### Mappers

| Archivo | Cambio |
|---------|--------|
| `src/lib/api-football/map-fixture-row.ts` | Añadir `season_id?: string` a `PartidoUpsertRow` + set en `mapFixtureToPartidoRow` (no-pilot) |
| `src/lib/apifootball/map-event-to-partido.ts` | Idem para provider apifootball.com |

### Script standalone

| Archivo | Cambio |
|---------|--------|
| `scripts/recargar-mundial.mjs` | `season_id: DEFAULT_SEASON_ID` en cada row del upsert directo a Supabase |

### Types

| Archivo | Cambio |
|---------|--------|
| `src/types/database.ts` | `season_id?: string \| null` en `Partido` |

### Generados (post-cambio)

| Archivo | Cambio |
|---------|--------|
| `src/types/database.ts` o tipos Supabase generados | Regenerar si usáis `supabase gen types` tras confirmar columna en tipos cliente |

### NO modificar (plan explícito)

| Archivo | Razón |
|---------|--------|
| `scripts/sync-calendar-cron.mjs` | Solo llama `POST /api/admin/cargar-partidos` — fix en route basta |
| `scripts/cargar-pilot-*.mjs` | Pilot debe quedar sin season o no ejecutarse en prod |
| `src/lib/partidos/sync-live-scores-api-sports.ts` | UPDATE marcador/estatus |
| `src/lib/apifootball/webhook/process.ts` | UPDATE / partido existente |
| `scripts/sync-lineups-cron.mjs` | Metadata lineups |

---

## Orden de implementación recomendado

```
1. src/lib/constants.ts          → DEFAULT_SEASON_ID / DEFAULT_COMPETITION_ID
2. src/lib/partidos/with-season-id.ts
3. src/types/database.ts         → season_id en Partido
4. map-fixture-row.ts + map-event-to-partido.ts → campo en PartidoUpsertRow
5. upsert-partido-rows.ts        → tipo + red de seguridad opcional
6. cargar-partidos/route.ts      → withSeasonId en ambos providers
7. scripts/recargar-mundial.mjs  → season_id en upsert manual
8. Verificación + deploy
```

**Opcional fase 2:** trigger BD `BEFORE INSERT` (plan §6) solo si monitoreo sigue mostrando NULLs.

---

## Validaciones (done criteria)

| # | Validación | Cómo |
|---|------------|------|
| V1 | Constantes UUID = seed M0 | Unit / grep |
| V2 | `POST cargar-partidos` (api-sports) en **staging** | Nuevo fixture test → `season_id` no NULL |
| V3 | Tras `sync-calendar-cron` cycle | Query G4 = 0 |
| V4 | `recargar-mundial.mjs` dry-run / staging | Rows incluyen season |
| V5 | Pilot `?modo=pilot` | **No** setea season (o no inserta) |
| V6 | Upsert partido existente | No borra `season_id` existente |
| V7 | App smoke | Quiniela, partido, leaderboard sin regresión |
| V8 | Prod monitoreo 48h post-deploy | Query §7 plan = 0 |

```sql
-- Post-deploy
SELECT COUNT(*) FROM partidos WHERE season_id IS NULL
  AND NOT (COALESCE(metadata->>'competencia','')='pilot'
    OR COALESCE((metadata->'pilot')::boolean,FALSE));
```

---

## Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Upsert sobrescribe `season_id` con null | Media | `withSeasonId`; nunca pasar `season_id: null` explícito en payload |
| Pilot recibe season WC por error | Media | Guard `isPilot` en route + metadata check |
| `recargar-mundial` olvidado vs route | Baja | Script + route ambos; monitoreo G4 |
| Tipos desincronizados | Baja | Actualizar `database.ts` + regen types |
| Trigger BD prematuro | Baja | App-first; trigger solo si alertas persisten |
| Multi-competición futura | Info | Resolver por `league_id` en `competitions.provider_config` (SC-4+) |

---

## ¿Sin downtime?

**Sí — deploy sin ventana de mantenimiento.**

| Aspecto | Notas |
|---------|-------|
| Cambios | Solo código app/scripts; **sin DDL** |
| BD prod | Ya tiene columna `season_id` nullable |
| Deploy | Railway rolling deploy estándar |
| Crons | Tras deploy, próximo `sync-calendar-cron` empieza a setear season en **nuevos** inserts |
| Partidos existentes | Ya backfilled (72/72); no migración adicional |
| Riesgo en deploy | Bajo; peor caso = un ciclo cron antes del deploy deja NULL → monitoreo lo detecta |

**No requiere:** parar sync-live, pausar prod, ni segunda ventana SQL.

---

## Decisión

| Pregunta | Respuesta |
|----------|-----------|
| ¿Listo para implementar M0.5? | **Sí** — prod M0 cerrado; plan claro |
| ¿Bloqueadores? | Ninguno técnico |
| ¿Iniciar SC-4? | **No** — M0.5 primero |
| ¿Tocar crons Railway ahora? | **No** — solo código; cron existente llama route |

---

## Siguiente paso exacto

1. Rama `feat/migration-0-5-season-ingest` (o similar).  
2. Implementar pasos 1–7 del orden arriba.  
3. Probar en **staging** (`jjzfvzmsfiuwjxdjvnpu`) con `POST cargar-partidos` + query G4.  
4. Deploy prod + monitoreo 48h.  
5. Evaluar Migration 0c (`NOT NULL` + índice) solo con G4 estable.
