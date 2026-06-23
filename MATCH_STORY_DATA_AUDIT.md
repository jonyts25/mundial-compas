# Match Story Data Audit — WORLD-CUP-LIVE-STORYTELLING-DESIGN-1

**Fecha:** 2026-06-23  
**Fuentes:** schema Supabase, sync api-sports.io, `SPORTS_DATA_ENRICHMENT_SPIKE_REPORT.md`, `scripts/inspect-api-football-match-data.mjs`

---

## 1. Campos exactos en DB hoy

### Tabla `partidos` (columnas)

| Campo | Tipo | Uso storytelling |
|-------|------|------------------|
| `id` | UUID | Referencia interna |
| `api_football_fixture_id` | int | Correlación API |
| `fase` | enum | grupos / dieciseisavos / … |
| `grupo` | char | A–L |
| `jornada` | smallint | Agrupar resumen de jornada |
| `equipo_local_codigo/nombre` | text | Narrativa |
| `equipo_visitante_codigo/nombre` | text | Narrativa |
| `sede` | text | Previa / crónica |
| `fecha_kickoff` | timestamptz | Orden cronológico |
| `estatus` | enum | programado / en_vivo / finalizado |
| `marcador_local/visitante` | smallint | Resultado, tabla live |
| `minuto_actual` | smallint | Contexto en vivo |
| `metadata` | JSONB | Eventos, alineaciones, reloj |

### `partidos.metadata` (claves usadas en prod)

| Clave | Estructura | Storytelling |
|-------|------------|--------------|
| `eventos_clave` | `[{ id, tipo, jugador, equipo, minuto, extra, detail, es_local }]` | Timeline gol/roja |
| `alineaciones` | `{ home, away, fetchedAt }` — XI, banca, formación, DT | Previa / post |
| `reloj` | `{ period, anchorMinute, anchoredAt, ticking }` | Minuto confiable |
| `api_football` | league, round, team ids, status | Contexto fixture |
| `gol_notify_score` | marcador dedup push | No narrativa |
| `announced_phases` | fases ya anunciadas | No narrativa |
| `notified_red_cards` | ids eventos | No narrativa |

**No persistido hoy:** `statistics`, `players/ratings`, injuries, xG snapshot, VAR explícito, amarillas, sustituciones en metadata.

### Tablas derivadas (sin partido)

| Fuente | Campos | Storytelling |
|--------|--------|--------------|
| `pronosticos` | goles, puntos, usuario, liga, partido | Impacto quiniela agregado |
| Standings calculados | pts, PJ, GF, GC, DG | Tabla live, previa |
| `plantillas_narracion` | plantillas por evento | Chat live (no IA) |

---

## 2. Campos exactos API-Sports (api-sports.io)

### `GET /fixtures` / `live=all`

`fixture.id`, `date`, `status.short/long/elapsed/extra`, `venue.name/city`, `referee`, `teams.home/away` (id, name, code, logo), `goals`, `score` (halftime, fulltime, extratime, penalty), `league.round`, `league.season`

### `GET /fixtures/events`

| Campo API | Descripción |
|-----------|-------------|
| `time.elapsed`, `time.extra` | Minuto |
| `team.id`, `team.name` | Equipo |
| `player.id`, `player.name` | Jugador |
| `assist.id`, `assist.name` | Asistencia (si API la trae) |
| `type` | Goal, Card, subst, Var, … |
| `detail` | Normal Goal, Own Goal, Penalty, Yellow Card, Red Card, … |
| `comments` | Texto libre ocasional |

### `GET /fixtures/lineups`

`formation`, `startXI[].player`, `substitutes[]`, `coach.name`, colores opcionales

### `GET /fixtures/statistics`

Por equipo, array `{ type, value }`: Ball Possession, Total Shots, Shots on Goal, Corner Kicks, Fouls, **expected_goals** (si proveedor lo incluye), Offsides, …

### `GET /fixtures/players`

`players[].statistics[].games` (rating, minutes), `goals`, `cards`, etc.

### `GET /standings`

12 grupos × 4 equipos: rank, points, goalsDiff, form, …

### `GET /teams/statistics`

GF/GC torneo, form string, partidos jugados

### Vacíos en WC 2026 (spike)

- `/injuries` — 0 resultados en muestra
- `/fixtures/headtohead` — casi vacío entre selecciones nuevas

---

## 3. Representación de eventos

| Evento | API-Sports | DB `eventos_clave` | Push/chat |
|--------|------------|-------------------|-----------|
| **Gol** | `type: Goal`, `detail: Normal Goal` | `tipo: gol`, `detail` preservado | ✅ `on-goal.ts` |
| **Gol en propia** | `detail: Own Goal` | `tipo: gol` + `detail` | ✅ narración `isOwnGoalFromDetail` |
| **Penal anotado** | `detail: Penalty` | `tipo: gol` + `detail: Penalty` | ✅ push `isPenalty` |
| **Gol anulado** | No tipo estándar fiable; a veces `Var` + comentario | ❌ no persistido | Tipo push `gol_anulado` declarado, **sin handler prod** |
| **VAR** | `type: Var` (cuando existe) | ❌ filtrado en `mapFixtureEventsToMomentos` | Plantilla chat "VAR Compas", no facts |
| **Tarjeta roja** | `type: Card`, `detail` contiene `red` | `tipo: tarjeta_roja` | ✅ |
| **Tarjeta amarilla** | `type: Card`, yellow | ❌ no persistido | ❌ |
| **Penal fallado** | Inconsistente; a veces `Goal` missed no existe | ❌ | Tipo `penal_fallado` en enum, **sin sync** |
| **Sustitución** | `type: subst` | ❌ no persistido | ❌ |

**Regla diseño IA:** solo mencionar eventos presentes en input JSON; para VAR/gol anulado exigir persistencia futura o flag `unverified`.

---

## 4. Campos para resumen de partido (post-FT)

| Prioridad | Campo | Fuente |
|-----------|-------|--------|
| Obligatorio | Marcador, equipos, fase, grupo | DB columnas |
| Obligatorio | Goles (minuto, autor, detail) | `eventos_clave` o `/fixtures/events` |
| Alto | Posesión, tiros, tiros a puerta | `/fixtures/statistics` (futuro metadata) |
| Alto | Tarjetas rojas | `eventos_clave` |
| Medio | Formación / DT | `alineaciones` |
| Medio | Sede, árbitro | fixture API / `sede` |
| Medio | Jugador destacado (rating) | `/fixtures/players` on-demand |
| Bajo | Corners, faltas | statistics |
| Bajo | xG | statistics si no null |
| Evitar | Odds | lab only |

---

## 5. Campos para resumen de jornada

| Campo | Fuente |
|-------|--------|
| Lista partidos FT del día/jornada | DB `partidos` filtro `jornada` + `fecha_kickoff` |
| Marcadores | DB |
| Movimientos de tabla por grupo | `calculateGroupStandingsFromPartidos` |
| Mejores terceros | `buildBestThirdPlacesRanking` |
| Goleador jornada | Agregar `eventos_clave` o players API |
| Sorpresa (upset) | Lógica: favorito FIFA ranking vs resultado |
| Partido destacado | Heurística: más goles / impacto tabla |
| Impacto quiniela | Agregados `pronosticos` por partido (sin PII) |

---

## 6. Campos para previa de jornada

| Campo | Fuente |
|-------|--------|
| Partidos programados | DB `estatus=programado` |
| Tabla previa | Standings calculados |
| Necesidad de puntos / escenarios | `live-group-scenarios.ts` (helpers) |
| Mini forma GF/GC | DB partidos grupo o `/teams/statistics` |
| Alineaciones probables | `alineaciones` si cron corrió (−4h) |
| Lesiones | ❌ no confiable hoy |
| H2H | ❌ ignorar WC |

---

## 7. Campos NO confiables

| Campo | Motivo |
|-------|--------|
| Injuries API | Vacío en spike WC 2026 |
| H2H api-sports | Casi sin historial entre selecciones |
| VAR / gol anulado | Sin modelo persistido; API irregular |
| Penal fallado | Sin mapeo estable a DB |
| xG | No siempre en statistics; proveedor-dependiente |
| Amarillas acumuladas | No en DB |
| Sustituciones | API sí; app no guarda |
| `marcador_penales_*` metadata | Documentado, no escrito en sync prod |
| Odds | Solo investigación |
| Pronósticos individuales | PII / estrategia usuario — solo agregados |

---

## 8. Costo API por partido

| Escenario | Calls/partido | Notas |
|-----------|---------------|-------|
| **Prod live sync** | ~1 (batch live) + 0–1 events | Por ciclo cron |
| **Detalle partido (cache miss)** | 0–1 lineups + 0–1 events | Ventana −4h |
| **Post-FT enriquecido (propuesto)** | 1 statistics + 0–1 players | 1× al finalizar |
| **Spike completo** | 13 | Incluye standings/odds redundantes |
| **Resumen jornada (tabla)** | 0 | DB calc |
| **Resumen jornada (crónicas 4 FT)** | 0–8 | statistics/players on-demand |
| **Pitoniso / previa** | 0–3 | DB first |

**Recomendación:** no poll statistics en vivo; 1 write al FT; jornada desde DB.

---

## Referencias código

- `src/lib/api-football/match-events.ts` — filtro gol/roja
- `src/lib/partidos/sync-live-scores-api-sports.ts` — live path
- `src/lib/standings/calculate-group-standings.ts` — tabla
- `src/lib/standings/world-cup-third-place-scenarios.ts` — Annex C (495 combos)
- `SPORTS_DATA_ENRICHMENT_SPIKE_REPORT.md`
