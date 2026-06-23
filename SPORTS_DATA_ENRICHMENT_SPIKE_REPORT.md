# SPORTS-DATA-ENRICHMENT-SPIKE-1 — Reporte

**Fecha:** 2026-06-23  
**Script:** `scripts/inspect-api-football-match-data.mjs`  
**Provider:** api-sports.io (plan Ultra, cuenta prod)  
**Modo:** solo lectura — sin writes a DB

---

## Muestras probadas (desde Supabase)

| Rol | Partido | fixture_id | estatus API |
|-----|---------|------------|-------------|
| Programado | Jordan vs Algeria | 1489400 | NS |
| Live / reciente | Norway vs Senegal | 1489401 | 2H (en_vivo en DB) |
| Finalizado | France vs Iraq | 1539017 | FT |

**Total API calls del spike:** 40 (13 por partido × 3 + 1 `/status`)

---

## 1. Endpoints con datos útiles hoy

| Endpoint | Programado | Live | Finalizado | Utilidad |
|----------|------------|------|------------|----------|
| `GET /fixtures?id=` | ✅ venue, round, equipos | ✅ + referee, score, status | ✅ completo | Alta — ya en sync |
| `GET /fixtures/events` | ❌ vacío | ✅ 7 eventos (goles, subs) | ✅ 15 eventos | Alta live/post |
| `GET /fixtures/lineups` | ❌ vacío (pre-kickoff lejos) | ✅ 2 equipos, XI+subs+formación | ✅ completo | Alta pre/live |
| `GET /fixtures/statistics` | ❌ vacío | ✅ posesión, tiros, corners, xG | ✅ completo | Alta post; media live |
| `GET /fixtures/players` | ❌ vacío | ✅ 52 filas, rating/minutos | ✅ completo | Media post/Ollama |
| `GET /standings` | ✅ 12 grupos + 60 filas | ✅ idem | ✅ idem | Alta jornada/Pitoniso |
| `GET /teams/statistics` | ✅ GF/GC torneo si ya jugó | ✅ form W/L, partidos | ✅ France W, 3 GF | **Alta Pitoniso v3** |
| `GET /fixtures/headtohead` | ❌ vacío (sin historial) | ✅ 1 partido (el actual) | ✅ 1 partido | Baja WC (pocos encuentros previos) |
| `GET /odds` | ✅ 14 casas | ✅ 14 casas | ✅ 14 casas | Solo lab interno |

---

## 2. Endpoints vacíos o incompletos

| Endpoint | Resultado spike | Notas |
|----------|-----------------|-------|
| `GET /injuries?fixture=` | 0/3 vacío | Sin bajas publicadas para WC 2026 en API |
| `GET /injuries?team=&season=` | 0/3 vacío | Mismo — no confiar para Pitoniso pre-partido hoy |
| `GET /fixtures/headtohead` | Vacío en programado; 1 fila en live/FT | En WC muchos emparejamientos nuevos |
| `GET /fixtures/lineups` | Vacío si falta ~1h al kickoff | Normal; cron lineups ya cubre ventana −4h |
| `GET /fixtures/events/statistics/players` | Vacíos pre-partido | Esperado |

**Parser fix aplicado:** `/teams/statistics` devuelve `response` como **objeto** (no array) — el script lo normaliza.

---

## 3. Datos para pre-partido

| Fuente | Disponible | Mejor estrategia |
|--------|------------|------------------|
| Fixture detail (venue, round, sede) | ✅ | DB + 0 calls si ya cargado |
| Standings / mini-tabla | ✅ | **Calcular on-demand desde DB**; API 1×/jornada como fallback |
| Team statistics (GF/GC, form torneo) | ✅ tras jornada 1 | On-demand 2 calls/equipo o derivar de DB |
| Lineups | ⏳ ventana pre-kickoff | Cron existente `sync-lineups` — **no duplicar** |
| Injuries | ❌ hoy | Ignorar hasta que API publique |
| H2H | ❌/limitado | Ignorar; usar forma/tabla local |
| Odds | ✅ | Solo lab — no UI |

---

## 4. Datos para en vivo

| Fuente | Ya en prod | Gap |
|--------|------------|-----|
| Marcador, minuto, status | sync-live ✅ | — |
| Events (goles, rojas, subs) | metadata `eventos_clave` ✅ | Parcial vs API completa |
| Lineups | metadata `alineaciones` si cron corrió | — |
| Statistics en live | ❌ no poll | **No añadir cron** — costo alto, poco vs eventos |
| Players/ratings live | ❌ | Solo post-partido |

---

## 5. Datos para post-partido

| Fuente | Utilidad | Recomendación |
|--------|----------|---------------|
| `/fixtures/events` | Timeline completa | Ya casi cubierto; 1 call si stale |
| `/fixtures/statistics` | Posesión, tiros, dominio | **Persistir 1× al FT** (futuro `metadata.statistics`) |
| `/fixtures/players` | MVP, ratings, minutos | On-demand para crónica Ollama |
| `/fixtures/lineups` | Formación usada | Ya en metadata |
| Team statistics | Actualizar forma torneo | Derivar de DB tras FT (0 calls) |

Ejemplo France vs Iraq: posesión 55–45%, 19 vs 4 tiros, Mbappé en events.

---

## 6. Datos para resumen de jornada

| Dato | Fuente óptima | Calls |
|------|---------------|-------|
| Resultados del día | DB `partidos` finalizados | 0 |
| Tabla por grupo | DB standings calc o `/standings` | 0–1 |
| Goleadores / MVPs | `/fixtures/players` por partido FT | 0–4 (on-demand) |
| Narrativa | Ollama sobre agregados | 0 API extra |

**Spike:** `/standings` devuelve 13 bloques (12 grupos + “Group Stage”) — suficiente para copy de jornada.

---

## 7. Datos para Pitoniso v3

| Feature v3 | Fuente spike | Prioridad |
|------------|--------------|-----------|
| GF/GC torneo, goal diff | DB partidos **o** `/teams/statistics` | Alta — DB primero |
| Forma torneo (W/D/L) | `/teams/statistics.form` o DB | Alta |
| Tabla / pts gap | DB (ya Pitoniso v2) | Hecho |
| Crowd, drawSignal | DB pronósticos | Hecho |
| Ranking FIFA | Snapshot estático | Hecho |
| Presión clasificación | Lógica DB (última jornada) | Medio — sin API |
| Lineups strength | metadata lineups | Medio — post confirmación |
| Injuries count | API | **Ignorar** (vacío WC) |
| H2H | API | **Ignorar** (casi vacío) |
| Statistics | Post-partido eval only | No predecir |

---

## 8. Datos solo para redacción Ollama

- `/fixtures/players` — ratings, minutos, nombres para “jugador clave”
- `/fixtures/statistics` — “dominó en posesión”, “pocos tiros”
- Events enriquecidos — cronología narrativa
- Venue/referee desde fixture — **solo si vienen en input** (guardrails IA)
- `/odds` — correlación interna baseline mercado vs crowd (**nunca UI**)

Ollama **no** calcula `predictedOutcome` — ver `PITONISO_V3_DATASET_PLAN.md`.

---

## 9. Costo aproximado API

| Escenario | Calls | Notas |
|-----------|-------|-------|
| Spike completo (este script) | **13/partido** | Incluye standings+odds repetidos |
| Pitoniso preview (optimizado) | **0–3** | Todo desde DB; +2 team stats si DB incompleta |
| Pre-partido lineups | **1** | Ya en `sync-lineups-cron` |
| Post-partido enriquecido | **1–2** | statistics (+ players opcional) |
| Jornada 4 partidos (tabla) | **1** | standings cacheado 30 min (patrón existente) |
| Jornada crónicas Ollama | **0–8** | statistics/players on-demand |
| Live sync actual | **1 + N events** | Sin cambios — no añadir statistics live |

Plan Ultra: margen amplio; el riesgo es **duplicar** calls ya cubiertos por sync-live/lineups.

---

## 10. Recomendación final

| Dato | Acción |
|------|--------|
| Standings API | **Calcular on-demand** desde DB; cache 1×/jornada fallback |
| Team GF/GC/form torneo | **Calcular on-demand** desde DB partidos grupo |
| Fixture detail | **Ya persistido** — no duplicar |
| Events / lineups live | **Ya persistido** vía sync — mantener |
| `/fixtures/statistics` | **Persistir al FT** (1 call) — siguiente iteración |
| `/fixtures/players` | **On-demand** lab/post — no cron |
| `/injuries` | **Ignorar por ahora** |
| `/fixtures/headtohead` | **Ignorar por ahora** (WC) |
| `/odds` | **Lab only** — nunca producto |
| `/teams/statistics` | **On-demand** solo si DB torneo incompleta |

---

## Cómo reproducir

```bash
npm run inspect:api-football-match
# o fixture manual:
node scripts/inspect-api-football-match-data.mjs --fixture-id=1539017
```

---

## Archivos del spike

| Archivo | Rol |
|---------|-----|
| `scripts/inspect-api-football-match-data.mjs` | Inspector read-only |
| `SPORTS_DATA_ENRICHMENT_SPIKE_REPORT.md` | Este reporte |
| `PITONISO_V3_DATASET_PLAN.md` | Plan features v3 |
