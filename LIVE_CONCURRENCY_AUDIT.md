# LIVE-CONCURRENCY-AUDIT-1 — Múltiples partidos simultáneos

**Fecha:** 2026-06-22  
**Alcance:** Auditoría read-only. Sin cambios de código.  
**Contexto:** Comportamiento extraño observado con Francia cuando coincidía otro partido en vivo.

---

## Clasificación final

## **SAFE WITH CHANGES**

La arquitectura **no asume un único partido live** a nivel de datos. Cada partido tiene `id` y `api_football_fixture_id` únicos; sync, UI realtime y push operan **por partido**.  
Los riesgos son **operativos** (latencia del cron secuencial, lock global de sync, presupuesto API, código muerto `pilotOnly`), no un diseño “single-match only”.

No se crea `LIVE_CONCURRENCY_FIX_PLAN.md` (reservado para clasificación NOT SAFE). Las mejoras recomendadas están en §10.

---

## Fase 1 — Inventario live

### Ingest / polling (producción: api-sports)

| Componente | Path / servicio | Rol |
|------------|-----------------|-----|
| **sync-live-cron** | `scripts/sync-live-cron.mjs` → Railway servicio `sync-live-cron` | Cada ~60s: `POST /api/admin/sync-live?pilot=1` |
| **sync-live-loop** | `scripts/sync-live-loop.mjs` | Variante loop continuo (dev/manual) |
| **sync-live API** | `src/app/api/admin/sync-live/route.ts` | Auth Bearer + lock + delega a `syncLiveScoresFromApi` |
| **Motor sync** | `src/lib/partidos/sync-live-scores-api-sports.ts` | `live=all` → loop `syncOneApiSportsFixture` por cada fixture |
| **Ventana live** | `src/lib/partidos/live-sync-window.ts` | Skip sync si no hay partidos en ventana (ahorra API) |
| **Lock concurrente** | `src/lib/api-football/push/claim-event.ts` → `tryClaimSyncLiveRun` | Evita 2 sync-live en paralelo (bucket 90s vía `webhook_eventos`) |
| **livescore-relay** | `scripts/apifootball-livescore-relay.mjs` → servicio `livescore-relay` | **Legacy apifootball** WS → `POST /api/webhooks/football`. Docs indican **pausar** si api-sports activo |

### Otros crons / admin

| Componente | Rol live |
|------------|----------|
| `sync-lineups-cron` | Alineaciones pre-kickoff (por partido, ventana 4h) |
| `sync-calendar-cron` | Calendario diario (no live directo) |
| `POST /api/webhooks/api-football` | Webhook api-sports (opcional) |
| `GET /api/partidos/[id]/alineaciones` | On-demand lineups |

### Queries / UI

| Componente | Multi-live |
|------------|------------|
| **Home** | `fetchHomePageData` → **todos** `en_vivo`/`medio_tiempo`; `LiveMatchesStrip` renderiza lista |
| **Calendario** | `fetchCalendarioPartidosData` → todos los partidos, dedupe por match key |
| **Detalle partido** | `fetchPartidoDetallePageData` por `partidoId` |
| **MarcadorLive / PartidoCard** | Realtime Supabase `partido:{uuid}` — **un canal por partido** |
| **LiveHomeRefresh** | `router.refresh()` cada 45s si hay live o pilot banner |
| **PosicionesLiveRefresh** | Realtime `partidos` fase=grupos + poll 60s opcional |
| **Standings** | `calculateGroupStandingsFromPartidos` incluye partidos `en_vivo` en tabla |
| **Leaderboard** | Puntos quiniela; no depende de “un” partido live |
| **Pitoniso** | Solo `programado` — oculto en vivo (`pitoniso-queries`) |
| **Chat partido** | `ChatRoomPanel` filtra por `partido_id` en realtime |
| **Push** | `handleGoalEvent` / `tryClaimLiveEvent` keyed por `partidoId` + score |
| **Analytics** | Eventos con `partido_id` (no singleton live) |

### Persistencia

| Store | Alcance |
|-------|---------|
| `partidos` (Postgres) | Una fila por partido; updates por `id` o lookup `api_football_fixture_id` |
| `partidos.metadata` | JSONB **por partido** (reloj, eventos, gol_notify_score, etc.) |
| `webhook_eventos` | Idempotencia global sync-lock + eventos por `partido_id:eventKey` |
| `unstable_cache` standings API | **Global** snapshot api-sports (30 min default) — no estado live |

---

## Fase 2 — Suposiciones “un solo partido”

### Búsqueda de patrones peligrosos

| Patrón | ¿Encontrado para live? |
|--------|------------------------|
| `LIMIT 1` en partidos live | **No** (solo `eliminacion-solicitudes.ts`, no live) |
| `.single()` en queries live list | **No** — `.single()` es por `partidoId` o usuario en detalle |
| `partidosEnVivo[0]` / `first live` | **No** |
| `getLiveMatch` / `currentMatch` / `activeMatch` | **No** |
| Variables globales de partido activo | **No** en app logic |

### Respuestas directas

1. **¿Asume un único partido live?** **No** en lectura/escritura de marcadores. Home y sync iteran colecciones.
2. **¿Cache global?** **Sí** — `getCachedGroupStandings()` (fallback tabla API, no marcador). No mezcla partidos entre sí.
3. **¿Singleton?** **Sí operativo** — `tryClaimSyncLiveRun` (un sync-live a la vez **global**, no por partido).
4. **¿Query devuelve solo un partido?** Listas live devuelven **arrays**. Detalle devuelve uno por diseño (página `/partidos/[id]`).

### Hallazgos secundarios (no single-match, pero relevantes)

| Hallazgo | Severidad | Detalle |
|----------|-----------|---------|
| `pilotOnly` no usado | Baja | `sync-live/route.ts` pasa `pilotOnly` pero `syncLiveScoresFromApi` **ignora** el flag — siempre procesa todo `live=all` |
| `datoMamalon` oculto si **cualquier** live | UX | Si hay ≥1 partido live, no se muestra dato mamalón (no es bug de marcador) |
| Dedupe calendario | Media baja | `dedupePartidosByMatchKey` — si hay duplicados del mismo encuentro en BD, UI puede mostrar una fila; scores no se cruzan |
| `filterOutPilotPartidos` | Baja | Partidos pilot no aparecen en home/calendario mundial pero **sí** se sincronizan si están en `live=all` |

---

## Fase 3 — Simulación teórica

**Escenario:** Francia vs X (58') y Noruega vs Y (58') simultáneos.

| Superficie | Comportamiento esperado | ¿Correcto? |
|------------|-------------------------|------------|
| **Home** | `LiveMatchesStrip` con 2 cards; cada una con realtime propio | ✅ |
| **Lista / calendario** | Ambos con estatus live y marcador independiente | ✅ |
| **Detalle Francia** | Canal realtime `partido:{id_francia}`; Pitoniso oculto (no programado) | ✅ |
| **Detalle Noruega** | Canal separado; sin interferencia con Francia | ✅ |
| **Leaderboard** | Puntos acumulados; no depende de cuál partido está live | ✅ |
| **Standings** | Ambos partidos `en_vivo` cuentan en mini-tabla de su grupo | ✅ (puntos en vivo provisional) |
| **Push** | Gol en Francia → claim `partidoId_francia:gol-X-Y` | ✅ |
| **Relay apifootball** | Si **además** corre livescore-relay + api-sports sync → riesgo duplicados | ⚠️ solo si relay no pausado |

**Síntoma plausible “Francia raro” que se autocorrige:**

- Cron sync **saltado** (`sync-live ya en curso`) → marcador/reloj desfasado 30–90s hasta el siguiente ciclo exitoso.
- Procesamiento **secuencial**: partido B actualiza después de A; si el ciclo tarda, B luce más “atrasado”.
- Interpolación de reloj cliente (`useMatchClockDisplay` cada 5s) entre polls — puede mostrar minuto distinto al feed TV brevemente; **por partido**, no cruzado.

---

## Fase 4 — Revisión crons

### sync-live-cron

| Pregunta | Respuesta |
|----------|-----------|
| ¿Procesa todos los LIVE? | **Sí** — `fetchApiSportsLiveFixtures(..., "all")` + loop |
| ¿Solo el primero? | **No** |
| ¿Riesgo overwrite? | **No** entre partidos — `update().eq("id", existing.id)` |
| ¿Condiciones de carrera? | **Sí, acotadas** — lock global; 2 crons → uno skipped; dentro del loop es secuencial |

**API calls por ciclo (N partidos en `live=all`):**

- 1 × `GET /fixtures?live=all`
- Hasta N × `GET /fixtures/events?fixture=…` (por partido en vivo al sincronizar eventos)
- + refetch stale/overdue (partidos en BD `en_vivo` no listados en feed)

### livescore-relay

- Ruta **apifootball** paralela a api-sports polling.
- Si ambos activos en prod → doble ingest posible para mismos partidos legacy.
- **Recomendación operativa:** mantener relay **pausado** con provider api-sports (ya documentado en `setup-railway-api-sports.mjs`).

---

## Fase 5 — Revisión DB

| Aspecto | Estado |
|---------|--------|
| `partidos.id` | UUID PK — único |
| `api_football_fixture_id` | Identificador ingest; lookup `.eq("api_football_fixture_id", fixtureId)` |
| Updates | Por `id` de fila existente — **no** hay UPDATE masivo sin WHERE |
| Estado live global | **No existe** tabla/columna “partido activo” |
| Tablas temporales live | **No** |
| Memoria compartida servidor | Solo lock en `webhook_eventos` (dedup), no cache de marcador |

**Metadata por partido:** `gol_notify_score`, `eventos_clave`, `reloj`, `notified_red_cards` — aislados por fila.

---

## Fase 6 — Riesgos encontrados (lista exacta)

| ID | Riesgo | Severidad | Tipo |
|----|--------|-----------|------|
| R1 | Lock global sync-live: ciclo skipped deja **todos** los partidos sin actualizar temporalmente | Media | Operativo |
| R2 | Sync secuencial: con muchos live, latencia entre partido 1 y N en el mismo ciclo | Media | Latencia |
| R3 | Presupuesto API: N live ⇒ ~1+N calls/min; 4 partidos ≈ 5/min; plan free ~100/día | Alta (fase eliminatoria) | Capacidad |
| R4 | `pilotOnly` ignorado — confusión operativa, no limita a un partido | Baja | Deuda |
| R5 | livescore-relay + api-sports simultáneos — duplicación eventos push/chat | Media | Config |
| R6 | Standings API cache global 30 min — tabla fallback puede desincronizar de DB live | Baja | UX |
| R7 | Múltiples suscripciones Realtime en home (1 por card) — carga cliente con 4+ live | Baja | Performance cliente |
| R8 | Reloj interpolado entre polls — minuto puede “correr” distinto al broadcast | Baja | UX |

**No se encontró:** limitación estructural “solo un partido live”.

---

## Fase 7 — Preparación fase eliminación

### Capacidad razonable actual

| Partidos live simultáneos | Viabilidad | Notas |
|---------------------------|------------|-------|
| **2** | ✅ OK | Escenario Francia + otro; arquitectura soportada |
| **4** (jornada final grupos / inicio octavos) | ⚠️ OK con lag | ~5 API calls/min; sync secuencial; revisar plan api-sports |
| **8+** (día pico Mundial) | ⚠️ Riesgo API + latencia | Ventana live + muchos events; considerar priorización o intervalo adaptativo |

### Refresh UI

| Mecanismo | Intervalo |
|-----------|-----------|
| sync-live-cron | ~60s |
| LiveHomeRefresh | 45s (RSC refresh) |
| PosicionesLiveRefresh poll | 60s (si `pollWhileLive`) |
| Realtime Supabase | Push inmediato en UPDATE `partidos` |

**Cuello de botella principal:** polling API + lock, no la UI ni el modelo de datos.

---

## Fase 8 — Mejoras recomendadas (sin implementar)

1. **Observabilidad:** log/métrica `sync-live` con `live` count, `apiRequests`, duración, `skipped`.
2. **Lock:** reducir ventana o lock por-partido para eventos; o cola de sync.
3. **API:** batch events si api-sports lo permite; o priorizar fixtures en `live=all` con kickoff más reciente.
4. **Eliminar o implementar `pilotOnly`** para evitar confusión.
5. **Confirmar livescore-relay pausado** en Railway prod.
6. **Prueba de carga:** script que simule 4 fixtures en `live=all` y mida tiempo de ciclo sync.
7. **Revalidar standings** en vivo: `router.refresh` posiciones ya escucha updates de grupo.

---

## Archivos clave revisados

```
scripts/sync-live-cron.mjs
scripts/sync-live-loop.mjs
src/app/api/admin/sync-live/route.ts
src/lib/partidos/sync-live-scores.ts
src/lib/partidos/sync-live-scores-api-sports.ts
src/lib/partidos/live-sync-window.ts
src/lib/api-football/push/claim-event.ts
src/lib/partidos/queries.ts
src/components/home/LiveMatchesStrip.tsx
src/components/home/PartidoCard.tsx
src/components/home/MarcadorLive.tsx
src/components/home/LiveHomeRefresh.tsx
src/components/posiciones/PosicionesLiveRefresh.tsx
src/lib/standings/calculate-group-standings.ts
src/lib/partidos/calendario-queries.ts
src/lib/partidos/partido-match-key.ts
```

---

## Siguiente paso recomendado

1. Revisar logs Railway `sync-live-cron` durante el partido de Francia: buscar `"skipped":true,"reason":"sync-live ya en curso"` y `apiRequests` / `live` count.
2. Confirmar **livescore-relay pausado** en producción.
3. Si se acerca fase eliminación con 4+ simultáneos: spike de duración de `syncLiveScoresFromApiSports` con N fixtures y evaluar upgrade plan API o intervalo adaptativo.
4. Opcional: implementar métricas R1–R3 antes de cambiar lógica de negocio.
