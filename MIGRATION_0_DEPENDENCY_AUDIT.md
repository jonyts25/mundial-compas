# MIGRATION-0 — Dependency Audit

> **Objetivo:** Inventariar qué podría romperse tras añadir `partidos.season_id` y tablas `competitions`/`seasons`.  
> **Alcance Migration 0:** columna nullable + backfill; app **no lee** `season_id` aún.

**Fecha:** 2026-06-15  
**Método:** grep + revisión schema (sin apply SQL).

---

## Resumen por nivel de riesgo

| Nivel | Cantidad | Significado |
|-------|----------|-------------|
| **Sin impacto** | 42 | No referencia `season_id`; queries intactas |
| **Impacto bajo** | 18 | Toca `partidos` pero ADD COLUMN nullable no rompe |
| **Impacto medio** | 8 | Upserts/updates post-M0 pueden dejar `season_id` NULL |
| **Impacto alto** | 2 | Orden operativo (pilot + backfill), RLS tablas nuevas |

---

## Tabla de dependencias

### A. Core partidos — queries app

| Archivo | Riesgo | Acción requerida |
|---------|--------|------------------|
| `src/lib/partidos/queries.ts` | Sin impacto | Smoke: home en vivo |
| `src/lib/partidos/detail-queries.ts` | Sin impacto | Smoke: pantalla partido |
| `src/lib/partidos/calendario-queries.ts` | Sin impacto | Smoke: calendario home |
| `src/lib/partidos/live-sync-window.ts` | Sin impacto | — |
| `src/lib/partidos/match-clock.ts` | Sin impacto | — |
| `src/lib/partidos/parse-grupo.ts` | Sin impacto | — |
| `src/lib/partidos/merge-upsert-metadata.ts` | Impacto bajo | Upsert no incluye `season_id`; OK si backfill previo |
| `src/lib/partidos/backfill-grupo.ts` | Sin impacto | Metadata grupo, no season |
| `src/lib/partidos/chat-queries.ts` | Sin impacto | Smoke: chat partido |
| `src/lib/partidos/chat-actions.ts` | Sin impacto | Smoke: enviar mensaje |
| `src/lib/partidos/chat-window.ts` | Sin impacto | — |
| `src/lib/partidos/labels.ts` | Sin impacto | — |
| `src/lib/partidos/escudos.ts` | Sin impacto | — |
| `src/lib/partidos/lineups-types.ts` | Sin impacto | — |
| `src/lib/partidos/sync-lineups.ts` | Impacto bajo | UPDATE partidos sin season_id |
| `src/lib/queries/partido-quiniela-contexts.ts` | Sin impacto | Smoke: multi-quiniela partido |

### B. Pitoniso

| Archivo | Riesgo | Acción requerida |
|---------|--------|------------------|
| `src/lib/partidos/pitoniso-queries.ts` | Sin impacto | Smoke: Pitoniso carga |
| `src/lib/partidos/pitoniso-signals.ts` | Sin impacto | — |
| `src/components/partidos/PitonisoCard.tsx` | Sin impacto | Smoke: agregados por liga |
| `src/lib/prediction-engine/team-competition-form.ts` | Sin impacto | Queries por equipo/fase, no season |
| `src/lib/quiniela/pronosticos-agregados-action.ts` | Sin impacto | Smoke: agregados multitud |

### C. Quiniela / pronósticos

| Archivo | Riesgo | Acción requerida |
|---------|--------|------------------|
| `src/lib/quiniela/queries.ts` | Sin impacto | Smoke: lista quiniela |
| `src/lib/quiniela/actions.ts` | Sin impacto | Smoke: guardar pronóstico |
| `src/lib/quiniela/pronosticos-partido-action.ts` | Sin impacto | — |
| `src/lib/quiniela/next-pending-prediction.ts` | Sin impacto | — |
| `src/lib/quiniela/filter-options.ts` | Sin impacto | — |
| `src/components/partidos/TuPronosticoCard.tsx` | Sin impacto | Smoke: save multi-liga |
| `src/components/quiniela/QuinielaList.tsx` | Sin impacto | — |
| `src/components/quiniela/PronosticosTodosPanel.tsx` | Sin impacto | — |

### D. Leaderboard

| Archivo | Riesgo | Acción requerida |
|---------|--------|------------------|
| `src/lib/leaderboard/queries.ts` | Sin impacto | Smoke: `/leaderboard` |
| `src/lib/leaderboard/segment-stats.ts` | Sin impacto | — |
| `src/lib/leaderboard/filters.ts` | Sin impacto | — |
| `src/components/leaderboard/Leaderboard.tsx` | Sin impacto | — |
| `src/components/leaderboard/LeaderboardSegmentStatus.tsx` | Sin impacto | — |
| `supabase/migrations/*tabla_liderato*.sql` (RPC) | Sin impacto | JOIN por `partido_id`; sin filtro season |

### E. Standings / posiciones

| Archivo | Riesgo | Acción requerida |
|---------|--------|------------------|
| `src/lib/standings/posiciones-queries.ts` | Sin impacto | Smoke: `/posiciones` |
| `src/lib/standings/calculate-group-standings.ts` | Sin impacto | — |
| `src/lib/standings/build-knockout-bracket.ts` | Sin impacto | — |
| `src/lib/standings/cache.ts` | Sin impacto | league 28 hardcoded — futuro SC-6 |
| `src/lib/standings/knockout-schedule-utils.ts` | Sin impacto | — |
| `src/lib/standings/world-cup-*.ts` | Sin impacto | — |
| `src/components/posiciones/*` | Sin impacto | Smoke: bracket + grupos |

### F. Home / engagement

| Archivo | Riesgo | Acción requerida |
|---------|--------|------------------|
| `src/lib/home/home-dashboard-queries.ts` | Sin impacto | Smoke: dashboard + carrusel |
| `src/components/home/*` | Sin impacto | Smoke: home completo |

### G. Pilot

| Archivo | Riesgo | Acción requerida |
|---------|--------|------------------|
| `src/lib/apifootball/pilot-config.ts` | Sin impacto | Sigue filtrando metadata |
| `src/lib/apifootball/pilot-queries.ts` | Sin impacto | Post-cleanup: count = 0 |
| `src/components/pilot/PilotModeBanner.tsx` | Sin impacto | Desactivar env post-cleanup |

### H. API / sync / webhooks / cron

| Archivo | Riesgo | Acción requerida |
|---------|--------|------------------|
| `src/lib/partidos/sync-live-scores-api-sports.ts` | Impacto bajo | UPDATE estatus/marcador — no toca season_id |
| `src/lib/partidos/sync-live-scores.ts` | Impacto bajo | Idem |
| `src/lib/apifootball/webhook/process.ts` | Impacto bajo | UPDATE partido live |
| `src/lib/api-football/handlers/on-goal.ts` | Impacto bajo | — |
| `src/lib/api-football/handlers/on-status.ts` | Impacto bajo | — |
| `src/app/api/admin/sync-live/route.ts` | Impacto bajo | Smoke cron: sync-live-cron |
| `src/app/api/admin/sync-lineups/route.ts` | Impacto bajo | — |
| `src/app/api/admin/cargar-partidos/route.ts` | **Impacto medio** | Upsert nuevos partidos sin `season_id` |
| `src/app/api/webhooks/api-football/route.ts` | Impacto bajo | — |
| `src/app/api/webhooks/football/route.ts` | Impacto bajo | — |
| `src/app/api/partidos/[id]/alineaciones/route.ts` | Sin impacto | — |
| `scripts/sync-live-cron.mjs` | Impacto bajo | Smoke: Railway sync-live-cron |
| `scripts/apifootball-livescore-relay.mjs` | Impacto bajo | Smoke: livescore-relay |
| `scripts/sync-calendar-cron.mjs` | **Impacto medio** | Upsert calendario sin season_id |
| `scripts/recargar-mundial.mjs` | **Impacto medio** | Upsert Mundial sin season_id |
| `scripts/cargar-pilot-*.mjs` | **Impacto alto** | **No ejecutar** post-cleanup; reintroducirían pilot |
| `scripts/sync-lineups-cron.mjs` | Impacto bajo | — |
| `scripts/backfill-partidos-grupo.mjs` | Sin impacto | — |

### I. Sports Core (código TS)

| Archivo | Riesgo | Acción requerida |
|---------|--------|------------------|
| `src/lib/sports-core/matches/types.ts` | Sin impacto | `seasonId?` ya en tipos — sin BD antes |
| `src/lib/sports-core/index.ts` | Sin impacto | — |
| `src/types/database.ts` | Impacto bajo | `Partido` sin `season_id` en TS — OK hasta adapter |

### J. Schema / BD (nuevo)

| Elemento | Riesgo | Acción requerida |
|----------|--------|------------------|
| `competitions` sin RLS | **Impacto alto** (seguridad) | RLS read-only antes prod |
| `seasons` sin RLS | **Impacto alto** (seguridad) | Idem |
| `partidos.season_id` FK RESTRICT | Sin impacto | Impide DELETE season con partidos |
| Triggers scoring existentes | Sin impacto | No modificados |
| `pronosticos` schema | Sin impacto | — |

### K. Analytics

| Archivo | Riesgo | Acción requerida |
|---------|--------|------------------|
| `src/lib/analytics/events.ts` | Sin impacto | Smoke: eventos sin season |
| `src/components/analytics/PageViewTracker.tsx` | Sin impacto | Smoke: page_view |
| `src/components/analytics/AnalyticsViewTracker.tsx` | Sin impacto | Smoke: match_view |

---

## Qué probar después del apply (prioridad)

### P0 — Obligatorio

1. SQL: competitions, seasons, season_id, `partidos_sin_season = 0`
2. Home carga + carrusel
3. Guardar/editar pronóstico (global + grupo)
4. Partido: Pitoniso + multi-quiniela + chat
5. Leaderboard global + grupo

### P1 — Importante

6. `/posiciones` standings + knockout
7. sync-live-cron (1 ciclo manual)
8. livescore-relay health
9. Perfil jugador / insights

### P2 — Monitoreo post-deploy

10. Conteo `partidos WHERE season_id IS NULL` tras cron ingest
11. PostHog: page_view, match_view, pronostico_saved
12. Intentar SELECT `competitions` con cliente autenticado (validar RLS gap)

---

## Conclusión

Migration 0 es **aditiva** — la app actual no depende de `season_id`. El riesgo funcional es **bajo** si:

1. Pilot cleanup precede backfill.
2. Smoke tests P0 pasan.
3. No se re-ejecutan scripts pilot.

Riesgos **operativos** (medio): upserts futuros sin `season_id`; **seguridad** (alto en prod): RLS tablas nuevas.

Ver pruebas detalladas: `MIGRATION_0_SMOKE_TESTS.md`.

---

*Auditoría de dependencias — sin cambios de código.*
