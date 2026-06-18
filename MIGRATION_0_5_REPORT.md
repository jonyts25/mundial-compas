# MIGRATION 0.5 — Season Ingestion Report

> **Fecha:** 2026-06-17  
> **Estado:** Implementado — **staging QA PASS** (`MIGRATION_0_5_STAGING_QA.md`); sin commit automático  
> **Prerequisito:** Migration 0 + 0b en prod (`MIGRATION_0_PROD_CLOSEOUT.md`)

---

## Objetivo

Todo partido **no-pilot** insertado o actualizado vía ingest debe recibir:

`season_id = b0000000-0000-4000-8000-000000000002` (World Cup 2026)

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `src/lib/constants.ts` | `DEFAULT_COMPETITION_ID`, `DEFAULT_SEASON_ID` |
| `src/lib/partidos/with-season-id.ts` | **Nuevo** — `withSeasonId`, `withSeasonIdRows` |
| `src/app/api/admin/cargar-partidos/route.ts` | `withSeasonIdRows` antes de `upsertPartidoRows` |
| `src/lib/partidos/upsert-partido-rows.ts` | `season_id` en tipo; `withSeasonId` en `enrichRow` |
| `src/lib/api-football/map-fixture-row.ts` | `season_id?` en `PartidoUpsertRow` |
| `src/lib/apifootball/map-event-to-partido.ts` | `season_id?` en `PartidoUpsertRow` |
| `src/types/database.ts` | `season_id?: string \| null` en `Partido` |
| `scripts/recargar-mundial.mjs` | `season_id: DEFAULT_SEASON_ID` en cada row Mundial |

---

## Helper `withSeasonId`

Ubicación: `src/lib/partidos/with-season-id.ts`

| Regla | Comportamiento |
|-------|----------------|
| Pilot (`isPilotPartidoMetadata`) | No asigna `season_id` |
| `season_id` ya presente (no null/vacío) | Se respeta |
| No-pilot sin `season_id` | `DEFAULT_SEASON_ID` |
| Sobrescritura | Nunca reemplaza `season_id` existente |

Detección pilot: reutiliza `isPilotPartidoMetadata` de `src/lib/apifootball/pilot-config.ts` (`metadata.competencia === 'pilot'` o `metadata.pilot === true`).

---

## Rutas de ingest cubiertas

| Ruta | Cobertura |
|------|-----------|
| `POST /api/admin/cargar-partidos` (apifootball) | `withSeasonIdRows` + `upsertPartidoRows.enrichRow` |
| `POST /api/admin/cargar-partidos` (api-sports) | Idem |
| `scripts/sync-calendar-cron.mjs` | Indirecto — llama `cargar-partidos` |
| `scripts/recargar-mundial.mjs` | `season_id` explícito en upsert directo |

---

## Qué NO se tocó

- Supabase schema / migrations SQL  
- Scoring, triggers BD, webhooks, RLS  
- UI, Pitoniso, Sports Core SC-4  
- `scripts/cargar-pilot-*.mjs`, sync-live, webhooks, lineups  
- `merge-partido-update.ts` (patch sin `season_id` no borra columna existente)

---

## Validación local

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | **PASS** |
| eslint archivos TS tocados | **PASS** |
| Prod automático | **No ejecutado** (por diseño) |

---

## QA staging — ejecutado 2026-06-17

Detalle completo: **`MIGRATION_0_5_STAGING_QA.md`**

| Check | Resultado |
|-------|-----------|
| Deploy Railway staging (`7ac838a8…`) | **PASS** |
| Ingest `POST cargar-partidos` (api-sports, 72 upserted) | **PASS** |
| `sin_season` | **0** ✓ |
| `partidos` | **72** ✓ |
| `friendlies` | **0** ✓ |
| `season_id = DEFAULT_SEASON_ID` | **72/72** ✓ |
| Smoke HTTP (home, quiniela, partido, leaderboard) | **PASS** (sin 5xx) |

Pendiente opcional: smoke UI autenticado (Pitoniso expandido, multi-quiniela con grupos).

---

## Riesgo residual

| Riesgo | Severidad | Notas |
|--------|-----------|-------|
| Ingest fuera de rutas cubiertas (script ad-hoc) | Baja | Monitoreo G4; trigger BD opcional (plan §6) |
| Upsert pilot con `season_id` previo en BD | Muy baja | `withSeasonId` no toca pilot |
| Deploy prod antes de QA staging | Media | Probar staging primero |
| Partidos nuevos entre deploy y primer cron | Baja | Ventana corta; query monitoreo |

---

## Siguiente paso

1. ~~QA staging PASS~~ ✓ — **commit + deploy prod** cuando el operador lo pida.  
2. Post-deploy prod: ingest + `sin_season = 0` + smoke.  
3. Monitoreo 48h: query `sin_season` diaria.  
4. Evaluar Migration 0c (`NOT NULL` + índice) solo con G4 estable.  
5. **No** iniciar SC-4 hasta M0.5 validado en prod.
