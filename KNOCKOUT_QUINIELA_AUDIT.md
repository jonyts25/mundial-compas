# KNOCKOUT_QUINIELA_AUDIT

Fecha: 2026-06-18 · Rama: `master` @ `44c322a` + cambios locales P0

## 1. Estado BD (prod, post-upsert)

| Métrica | Valor |
|---------|-------|
| Total partidos | **104** (72 grupos + 32 eliminatoria) |
| Fase grupos | 72 (todos `finalizado`) |
| Dieciseisavos (R32) | 16 |
| Octavos (R16) | 8 |
| Cuartos | 4 |
| Semifinal | 2 |
| Tercer lugar | 1 |
| Final | 1 |
| Duplicados `api_football_fixture_id` | 0 |
| KO con `metadata.fifa_match_number` | 32/32 |
| KO con API-Sports id real | 0 (placeholders `9000073–9000104`) |

### Equipos confirmados vs TBD (post-resolve)

| Fase | Total | Confirmados | TBD |
|------|-------|-------------|-----|
| Dieciseisavos | 16 | **16** | 0 |
| Octavos | 8 | 0 | 8 |
| Cuartos | 4 | 0 | 4 |
| Semifinal | 2 | 0 | 2 |
| Tercer lugar | 1 | 0 | 1 |
| Final | 1 | 0 | 1 |

R32 lleno porque fase de grupos está completa en BD. R16+ esperan ganadores reales.

## 2. Enum `fase` por ronda

| Ronda FIFA | `fase` en BD |
|------------|--------------|
| Ronda de 32 | `dieciseisavos` |
| Octavos | `octavos` |
| Cuartos | `cuartos` |
| Semifinal | `semifinal` |
| 3.er lugar | `tercer_lugar` |
| Final | `final` |

## 3. Código — respuestas auditoría

| # | Pregunta | Resultado |
|---|----------|-----------|
| 1 | ¿Cuántos partidos en BD? | 104 (antes: 72) |
| 2 | ¿Cuántos fase grupos? | 72 |
| 3 | ¿Cuántos R32? | 16 |
| 4 | ¿Octavos/cuartos/semis/final/3er? | 8 / 4 / 2 / 1 / 1 |
| 5 | ¿Qué enum `fase`? | Ver tabla arriba |
| 6 | ¿Fixtures API-Sports para KO? | **No en BD aún** — placeholders; `map-fixture-row.ts` ya mapea KO si API los devuelve |
| 7 | ¿Equipos TBD? | R32 resueltos; R16→final con slots TBD (`Ganador Pxx`, etc.) |
| 8 | ¿Quiniela filtra KO? | **No** — `filterPartidosPorTipo(mundial_completo)` devuelve todos; el bloqueo era **ausencia de filas KO** |
| 9 | ¿Formulario soporta TBD? | **Ahora sí** — muestra label, deshabilita inputs hasta confirmar ambos |
| 10 | ¿Lock eliminatoria? | **Sí** — `isPronosticoLocked` por kickoff, sin cambios |

## 4. Quiniela — flujo actual

```
fetchQuinielaData
  → partidos (programado…finalizado)
  → filterOutPilotPartidos
  → filterPartidosPorTipo (mundial_completo = sin filtro fase)
  → dedupePartidosByMatchKey
  → QuinielaList → PronosticoRow
       → isKnockoutPronosticable → habilita/deshabilita marcador
       → savePronostico (server guard TBD)
```

## 5. Pitoniso

- `fetchPitonisoStaticContext` retorna error si KO con TBD.
- Partido `/partidos/[id]` solo muestra PitonisoCard si contexto OK.

## 6. Sync live

- `sync-live` opera por `api_football_fixture_id` sin filtrar fase.
- **Riesgo:** placeholders usan ids sintéticos; cuando API-Sports publique fixtures reales hay que enlazarlos (via `cargar-partidos` + `alignPartidoUpsertRowsToExistingMatches` por kickoff/equipos o `fifa_match_number`).
- Penales/extra time: scoring no tocado; ganador bracket usa marcador 90' (`getMatchSideWinner` — empate = sin ganador aún).

## 7. Hallazgo raíz

La quiniela solo mostraba grupos porque **no existían filas eliminatorias en BD** (0 KO). El código de filtros ya incluía `mundial_completo`.
