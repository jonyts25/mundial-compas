# SPORTS-DATA-AI-AUDIT-1 — Auditoría de datos deportivos para IA

**Fecha:** 2026-06-22  
**Alcance:** Código actual de Mundial Compas — ingest, sync, persistencia, Pitoniso, AI Lab.  
**Restricción:** Solo investigación; sin features públicas ni cambios de scoring.

---

## 1. Provider y arquitectura actual

| Aspecto | Estado |
|---------|--------|
| **Provider producción** | [api-sports.io](https://v3.football.api-sports.io) (API-Football v3) |
| **Auth** | Header `x-apisports-key` (`API_SPORTS_KEY`) |
| **Provider legacy** | apifootball.com — scripts, webhook relay; **no** ingest principal |
| **Selector** | `getFootballDataProvider()` → siempre `"api-sports"` (`src/lib/env.ts`) |
| **Liga/temporada** | League `1`, season `2026` (`src/lib/api-football/constants.ts`) |

### Endpoints api-sports **en uso hoy**

| Endpoint | Cliente | Uso |
|----------|---------|-----|
| `GET /fixtures` | `fetch-fixtures.ts`, `sync-live-scores-api-sports.ts` | Calendario, live poll, refetch por id |
| `GET /fixtures/events` | `fetch-events.ts` | Goles, tarjetas, fases en live sync |
| `GET /fixtures/lineups` | `fetch-lineups.ts` | Alineaciones pre-partido |
| `GET /standings` | `fetch-standings.ts`, `cache.ts`, `world-cup-group-lookup.ts` | Fallback tabla cuando DB incompleta |
| `GET /status` | `discover-api-sports.mjs` | Spike / plan discovery |

### Endpoints api-sports **disponibles pero NO usados**

| Endpoint | Utilidad potencial | Prioridad investigativa |
|----------|-------------------|-------------------------|
| `GET /fixtures/statistics` | Posesión, tiros, corners — post-partido, preview avanzado | Media |
| `GET /fixtures/headtohead` | H2H oficial API — complemento a tiebreakers locales | Media |
| `GET /fixtures/players` | Stats individuales del partido | Baja-media |
| `GET /injuries` | Bajas pre-partido | Media |
| `GET /players` + `/players/squads` | Plantel, jugadores a seguir | Media |
| `GET /teams/statistics` | Stats de torneo por equipo | Media |
| `GET /odds` | Solo lab interno / correlación; **no producto** | Baja (investigación) |
| `GET /predictions` (si plan lo incluye) | Baseline externo para evaluar Pitoniso | Baja |

### Scripts de sync

| Script / ruta | Frecuencia típica | API calls aprox. |
|---------------|-------------------|------------------|
| `sync-live-cron` → `POST /api/admin/sync-live` | ~1/min en ventana live | 1× `live=all` + N× refetch ids + M× events |
| `sync-lineups-cron` → `POST /api/admin/sync-lineups` | Pre-kickoff (4h ventana) | 1× lineups **por partido** en ventana |
| `sync-calendar-cron` → `POST /api/admin/cargar-partidos` | Diario | 1× fixtures por rango fecha |
| `GET /api/partidos/[id]/alineaciones` | On-demand UI | 0–1× lineups si no cacheado |
| Webhook api-football | Event-driven (si configurado) | 0 polling extra |

---

## 2. Qué datos ya tenemos por partido

### Columnas `partidos` (Supabase)

`api_football_fixture_id`, `fase`, `grupo`, `jornada`, equipos (código/nombre), `sede`, `fecha_kickoff`, `estatus`, marcadores, `minuto_actual`, `canal_transmision`, `metadata` (JSONB), `season_id`.

### `metadata` JSONB (api-sports path)

| Clave | Contenido | Fuente |
|-------|-----------|--------|
| `reloj` | Reloj/minuto display | Fixture status |
| `escudo_local`, `escudo_visitante` | URLs logos | Teams |
| `api_football` | provider, league_id, round, team ids, logos, status | Fixture |
| `alineaciones` | Formación + titulares/suplentes | `/fixtures/lineups` |
| `eventos_clave` | Goles + rojas timeline | `/fixtures/events` |
| `gol_notify_score`, `announced_phases`, `notified_red_cards` | Estado push (no IA) | Live sync |
| `marcador_penales_*`, `finalizado_at`, `chat_fin_at` | Fases finales | Live/webhook |

### Datos derivados en app (no API directa)

| Dato | Origen | Uso |
|------|--------|-----|
| Mini-tabla de grupo | `partidos` finalizados en grupo | Pitoniso `table`, posiciones UI |
| Forma normalizada | Resultados previos en DB | Pitoniso `form` |
| Ranking FIFA | Snapshot estático `fifa-ranking-2026-06.ts` | Pitoniso `ranking` |
| Multitud / crowd | Agregados `pronosticos` | Pitoniso `crowd`, drawSignal |
| H2H tiebreak | Cálculo local entre partidos de grupo | Desempates, no Pitoniso copy |

### Pitoniso — señales actuales (`src/lib/sports-core/predictions/preview/`)

- **crowd** — % local/empate/visitante (mín. muestra 5 pronósticos)
- **table** — posición en mini-tabla de grupo
- **form** — forma normalizada últimos partidos del torneo
- **ranking** — gap FIFA estático
- **drawSignal** — heurística empate (multitud + tabla + forma)
- **contradictions** — conflictos entre familias de señal
- **intuition / confidence** — `presentimiento`, `indeciso`, etc. (rule-based)

Pesonos internos (`matchPreviewWeights`): crowd 0.4, table 0.2, form 0.25, context 0.15, ranking ~0.1.

---

## 3. Qué datos NO guardamos pero la API puede dar

| Dato API | Endpoint | Valor para IA |
|----------|----------|---------------|
| Estadísticas de partido | `/fixtures/statistics` | Post-partido, narrativa “dominio” |
| H2H histórico API | `/fixtures/headtohead` | Preview si no hay suficientes partidos en DB |
| Lesiones/bajas | `/injuries` | Preview pre-partido, jugadores a seguir |
| Stats jugador en partido | `/fixtures/players` | Post-partido, “jugador del partido” |
| Plantel completo | `/players/squads` | Jugadores a seguir (pre-torneo) |
| Stats equipo en torneo | `/teams/statistics` | GF/GC, clean sheets — señales Pitoniso v3 |
| Odds | `/odds` | Investigación interna, baseline mercado |
| Venue detallado | Ya en fixture → `sede` columna | **Importante para evitar alucinaciones IA** — hoy `sede` existe en DB pero **no** se pasa al AI Lab input |

---

## 4. Utilidad por caso de uso

| Caso | Datos actuales suficientes | Datos a agregar (fase futura) |
|------|---------------------------|-------------------------------|
| **Preview pre-partido** | crowd, form, table, ranking, fase/grupo/jornada, sede (DB) | injuries, lineups confirmadas, H2H API, presión clasificación |
| **Análisis post-partido** | marcador, `eventos_clave`, estatus | `/fixtures/statistics`, `/fixtures/players` |
| **Resumen jornada** | todos los partidos de jornada en DB + resultados | stats agregadas por jornada (código, no API extra si ya persistido) |
| **Resumen de grupo** | mini-tablas calculadas, partidos grupo | standings API como fallback; escenarios eliminación (ya hay lógica knockout) |
| **Jugadores a seguir** | goleadores en `eventos_clave` (parcial) | squads, injuries, top scorers API |
| **Crónica automática** | eventos + marcador + equipos | statistics + lineups + venue explícito en input IA |

---

## 5. Costo aproximado en API calls

**Plan free api-sports:** ~100 requests/día (verificar en dashboard; el código asume polling conservador).

| Escenario | Calls estimadas | Notas |
|-----------|---------------|-------|
| **1 partido (preview completo)** | 0–3 | 0 si todo en DB; +1 lineups, +1 injuries, +1 h2h si on-demand |
| **1 partido (post-partido)** | 0–2 | events ya en metadata; +1 statistics si no cacheado |
| **Jornada (4 partidos grupo)** | 0–8 | Mayoría desde DB; lineups/injuries on-demand |
| **Grupo completo (resumen)** | 0–1 | standings cacheado 30 min (`getCachedGroupStandings`) |
| **Día completo Mundial** | 1–20+ | sync-live 1440 req/día si 1/min **excede free** — ya mitigado con ventana live |
| **Calendario diario** | 1–3 | `cargar-partidos` por fecha |

**Recomendación:** Mantener ingest batch + metadata; reservar calls on-demand para preview/post solo en ventanas pre-kickoff y post-final.

---

## 6. Qué endpoints conviene cachear

| Endpoint | TTL sugerido | Dónde |
|----------|--------------|-------|
| `/standings` | 30–60 min | Ya: `getCachedGroupStandings` (Next cache) |
| `/fixtures/lineups` | Hasta kickoff + invalidar al inicio | `metadata.alineaciones` |
| `/fixtures/events` | Durante live + snapshot final | `metadata.eventos_clave` |
| `/fixtures/statistics` | Post-partido, inmutable | `metadata.statistics` (futuro) |
| `/injuries` | 6–12 h pre-partido | `metadata.injuries` o tabla futura |
| `/fixtures/headtohead` | 7 días pre-partido | `metadata.h2h` (futuro) |
| `/odds` | 1–4 h | Solo lab; nunca UI pública |

---

## 7. Metadata vs tablas nuevas (futuro)

| Dato | Recomendación corto plazo | Tabla futura si… |
|------|---------------------------|------------------|
| Lineups, eventos, reloj | `metadata` ✅ ya | — |
| Statistics, injuries, h2h | `metadata` keys nuevas | Muchos partidos + queries analíticas |
| Snapshots Pitoniso pre-partido | — | `pitoniso_snapshots` (evaluación modelo) |
| Odds lab | No persistir en prod users | Tabla interna `odds_lab` |
| FIFA ranking | Snapshot TS file ✅ | API FIFA o tabla versionada |

---

## 8. Qué NO conviene pedir todavía

- **Odds en producto** — fuera de scope quiniela honor.
- **`/predictions` comercial** — sustituye Pitoniso; solo benchmark offline.
- **Polling statistics en live** — costo alto, poco valor vs eventos.
- **Players/squads para todos los partidos** — explosión de calls; solo highlights o partidos con `canUseAiLab`.
- **Migraciones / RLS** — explícitamente fuera de scope.

---

## 9. Recomendación por fases

### Fase A — Sin API nueva (1–2 semanas)
- Pasar `sede` + `fase/grupo/jornada` al input AI Lab desde DB.
- Enriquecer `pitonisoStaticContextToLabInput` con crowd/drawSignal del cliente.
- Prompts anti-alucinación (hecho en AI Lab prompt fix).

### Fase B — Metadata extendida (2–4 semanas)
- Persistir `/fixtures/statistics` al finalizar partido (1 call/post).
- Opcional: `/injuries` en ventana −24h (cron acotado).
- Resúmenes post-partido y jornada en AI Lab solo.

### Fase C — Investigación Pitoniso v3 (paralelo)
- Snapshots pre-partido en tabla futura.
- Evaluación offline vs resultados reales (ver `PITONISO_MODEL_RESEARCH_PLAN.md`).

### Fase D — Jugadores a seguir (después)
- Top scorers desde `eventos_clave` agregados + squads API selectiva.

---

## 10. Archivos clave revisados

| Área | Path |
|------|------|
| Cliente API | `src/lib/api-football/client.ts` |
| Fixtures | `src/lib/api-football/fetch-fixtures.ts` |
| Live sync | `src/lib/partidos/sync-live-scores-api-sports.ts` |
| Lineups | `src/lib/api-football/fetch-lineups.ts` |
| Mapper ingest | `src/lib/api-football/map-fixture-row.ts` |
| Pitoniso queries | `src/lib/partidos/pitoniso-queries.ts` |
| Match preview | `src/lib/sports-core/predictions/preview/match-preview.ts` |
| Standings | `src/lib/standings/posiciones-queries.ts` |
| AI Lab | `src/lib/ai/pitoniso-signals-format.ts` |
