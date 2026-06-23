# PITONISO V3 SIMULATION — Reporte offline

**Fecha:** 2026-06-23  
**Script:** `scripts/evaluate-pitoniso-v3-simulation.ts`  
**Motor:** `src/lib/sports-core/predictions/preview/v3-simulation.ts`

## Metodología anti-fuga

- Crowd: pronósticos con `created_at < fecha_kickoff`
- Forma, tabla, GF/GC: partidos `finalizado` con kickoff anterior
- Sin `/fixtures/statistics` ni datos post-partido en predicción
- Ranking FIFA: snapshot estático (misma limitación que v2)

## Resultados

| Modelo | Accuracy | Evaluados | Skipped |
|--------|----------|-----------|---------|
| Pitoniso v2.1 | 64.1% | 39 | 3 |
| Pitoniso v3 sim | 61.5% | 39 | 3 |
| Baseline FIFA | 60.5% | 38 | 4 |
| Baseline crowd | 61.9% | 42 | 0 |
| Baseline table | 44.4% | 18 | 24 |
| Baseline form | 38.9% | 18 | 24 |

**Delta v3 vs v2.1:** -2.6 pp

## Empates

- Reales: 13
- v2.1 pred=empate: 3 (aciertos 1)
- v3 pred=empate: 3 (aciertos 1)

## v3 vs v2.1

**Mejora (0):** —

**Empeora (1):** Scotland vs Morocco

## Matriz v3 (actual→pred)

- `empate->empate`: 1
- `empate->local`: 8
- `empate->visitante`: 2
- `local->empate`: 2
- `local->local`: 18
- `local->visitante`: 1
- `visitante->local`: 2
- `visitante->visitante`: 5

## Recomendación

**Descartar o revisar pesos** — v3 empeora vs v2.1; no integrar sin recalibración.

## Limitaciones

- Muestra pequeña (42 partidos finalizados)
- Crowd pre-kickoff puede ser bajo en jornada 1
- FIFA snapshot no temporal

## Reproducir

```bash
npx -y tsx scripts/evaluate-pitoniso-v3-simulation.ts
```
