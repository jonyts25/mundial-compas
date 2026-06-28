# KNOCKOUT_FIXTURE_VALIDATION

Validación del calendario FIFA 2026 en repo vs requisitos P0.

## Totales

| Ronda | Partidos FIFA | `phase` schedule | `fase` BD | ✓ |
|-------|---------------|------------------|-----------|---|
| Ronda de 32 | 16 (73–88) | `r32` | `dieciseisavos` | ✅ |
| Octavos | 8 (89–96) | `r16` | `octavos` | ✅ |
| Cuartos | 4 (97–100) | `qf` | `cuartos` | ✅ |
| Semifinales | 2 (101–102) | `sf` | `semifinal` | ✅ |
| Tercer lugar | 1 (103) | `third` | `tercer_lugar` | ✅ |
| Final | 1 (104) | `final` | `final` | ✅ |
| **Total** | **32** | | | ✅ |

Fuente: `src/lib/standings/world-cup-knockout-schedule.ts`  
Test: `validateKnockoutScheduleCounts()` en `build-knockout-fixture-rows.ts`

## Slots estables (`metadata`)

| Campo | Ejemplo |
|-------|---------|
| `knockout_match_id` | `r32_01` … `r32_16`, `r16_01` … `final`, `third_place` |
| `knockout_round` | `r32`, `r16`, `qf`, `sf`, `third`, `final` |
| `home_slot` / `away_slot` | `2A`, `3rd_vs_1E`, `winner_m73`, `loser_m101` |
| `next_match_id` | Ganador → siguiente ronda |
| `loser_next_match_id` | Perdedor SF → `third_place` |
| `source` | `world-cup-knockout-schedule` |
| `fifa_match_number` | 73–104 |

## Cruces R32 (muestra)

Definición fija en `world-cup-r32-fixtures.ts` + calendario en `world-cup-knockout-schedule.ts`:

| Partido | Local | Visitante |
|---------|-------|-----------|
| 73 | 2A | 2B |
| 74 | 1E | 3.º (Anexo C vs 1E) |
| 79 | 1A | 3.º (Anexo C vs 1A) |
| … | … | … |

Annex C: `world-cup-third-place-scenarios.ts` (495 keys).

## API-Sports fixture_id

| Estado | Detalle |
|--------|---------|
| En schedule local | No embebido (API aún no cargada para KO) |
| En BD prod | Placeholders `9000000 + matchNumber` |
| Mapeo futuro | `map-fixture-row.resolveFifaMatchNumber()` por round M73–M104 o sede+fecha |
| Riesgo | Id distinto al placeholder → `alignPartidoUpsertRowsToExistingMatches` debe fusionar antes del kickoff |

## Kickoff / sede

- Fecha: campo `date` del schedule (hora 12:00 CDMX default hasta que API confirme).
- Sede: `venue` del schedule; se preserva si BD/API trae hora exacta.

## Script seed/upsert

- `scripts/upsert-world-cup-knockout-fixtures.mjs` — idempotente por `api_football_fixture_id` + `fifa_match_number`.
- No duplica: `buildMissingKnockoutFixtureRows()` omite partidos ya indexados.
- Fix aplicado: nombres placeholder únicos por slot (evita colisión en dedupe por kickoff+equipos TBD).

## Validación ejecutada

```bash
node scripts/upsert-world-cup-knockout-fixtures.mjs --dry-run
# scheduleValid.ok = true, toInsert = 32 (BD vacía)

node scripts/upsert-world-cup-knockout-fixtures.mjs
# upserted = 32 total (17 + 15 tras fix dedupe)
```
