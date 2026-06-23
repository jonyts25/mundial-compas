# LIVE-CONCURRENCY-HARDENING-1 — Telemetría sync-live

**Fecha:** 2026-06-22  
**Objetivo:** Reducir lag percibido con 2–4 partidos simultáneos mediante observabilidad (sin cambiar DB, UI, scoring, Pitoniso ni volumen de API).

---

## Cambios implementados

| # | Requisito | Implementación |
|---|-----------|----------------|
| 1 | Duración total sync-live | `logSyncLiveComplete` → `[sync-live] END duration_ms=…` |
| 2 | Live fixture count | `logSyncLiveStart` → `live_fixture_count=N` (fixtures en `live=all`) |
| 3 | Log por fixture | `logSyncLiveFixture` → `fixture_id`, `partido_id`, `status`, `minuto`, `duration_ms`, `outcome` |
| 4 | Warning si sync > 45s | `SYNC_LIVE_SLOW_THRESHOLD_MS=45000` → `[sync-live] SLOW …` |
| 5 | Warning lock omitido | `warnSyncLiveLockSkipped` en `POST /api/admin/sync-live` cuando `tryClaimSyncLiveRun` falla |
| 6 | Relay vs api-sports | Ver § Operación relay (abajo) |

### Archivos

- `src/lib/partidos/sync-live-telemetry.ts` — helpers de log (nuevo)
- `src/lib/partidos/sync-live-scores-api-sports.ts` — instrumentación del ciclo y de cada fixture
- `src/lib/partidos/sync-live-scores.ts` — `SyncLiveResult.durationMs` / `liveFixtureCount` en JSON de respuesta
- `src/app/api/admin/sync-live/route.ts` — warning en lock skipped

### Formato de logs (Railway)

```
[sync-live] START live_fixture_count=3
[sync-live] FIXTURE fixture_id=123 partido_id=uuid status=en_vivo minuto=58 duration_ms=4200 outcome=updated
[sync-live] END duration_ms=18500 live_fixture_count=3 fetched=3 updated=3 live=3 api_requests=7 errors=0
[sync-live] SLOW duration_ms=52000 threshold_ms=45000 live_fixture_count=4   # solo si > 45s
[sync-live] LOCK_SKIPPED sync-live ya en curso — ciclo omitido (posible lag en partidos simultáneos)
```

La respuesta JSON del cron también incluye `durationMs` y `liveFixtureCount` para correlación sin parsear logs.

---

## Operación: livescore-relay vs sync-live-cron

**Producción actual (api-sports):** usar **solo** `sync-live-cron` → `POST /api/admin/sync-live`.  
**`livescore-relay` debe estar PAUSADO** (servicio Railway detenido o sin deploy).

| Modo | Cuándo | Riesgo si ambos activos |
|------|--------|-------------------------|
| **api-sports polling** (`FOOTBALL_DATA_PROVIDER=api-sports`) | Mundial / prod actual | — |
| **livescore-relay** (WS apifootball → `/api/webhooks/football`) | Legacy pilot apifootball | Doble ingest: mismos goles/fases pueden procesarse dos veces (push, chat, metadata) |

**Regla:** exactamente **un** canal de ingest live en prod — nunca relay + api-sports a la vez.

Referencias: `LIVE_CONCURRENCY_AUDIT.md` §4, `docs/PILOT_MEXICO_SERBIA.md`, `scripts/setup-railway-api-sports.mjs`.

---

## Cómo usar la telemetría (2–4 partidos)

1. Durante ventana con varios live, revisar logs del servicio **`sync-live-cron`**:
   - Frecuencia de `LOCK_SKIPPED` → ciclos perdidos; el partido “atrasado” puede ser el último del loop o el que cayó en un skip.
   - `duration_ms` en `END` vs umbral 45s → si el ciclo supera el intervalo del cron (~60s), el siguiente tick puede chocar con el lock.
   - `FIXTURE … duration_ms` → identificar fixtures lentos (eventos + notificaciones secuenciales).
2. Correlacionar `partido_id` con el partido reportado por usuarios.
3. Confirmar en Railway Dashboard que **`livescore-relay` no está Online** mientras `sync-live-cron` corre.

---

## Validación

```bash
npm run typecheck
npm run build
```

---

## Fuera de alcance (explícito)

- Sin cambios de esquema DB, UI, scoring ni Pitoniso.
- Sin requests API adicionales.
- Sin commit automático de este paquete (pendiente revisión manual).
