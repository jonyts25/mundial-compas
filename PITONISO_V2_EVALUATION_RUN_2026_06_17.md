# Pitoniso v2 — Evaluación post-deploy

> **Fecha:** 2026-06-17  
> **Commit desplegado:** `d2480e5` — `feat: add Pitoniso v2 ranking signal`  
> **Comando:** `npx -y tsx scripts/evaluate-pitoniso-v2.ts`  
> **Motor:** `pitoniso-v2-ranking`

---

## Resumen

| Métrica | Valor |
|---------|------:|
| Partidos finalizados | 22 |
| **Total evaluados** (`predictedOutcome ≠ unknown`) | **17** |
| Omitidos (`indeciso` → `unknown`) | 5 |
| **Aciertos 1X2** | **8** |
| **Accuracy Pitoniso v2** | **47.1%** (8/17) |
| **Baseline FIFA ranking** | **52.6%** (10/19) |

El baseline FIFA solo cuenta partidos donde el ranking no es neutral (19 de 22).

---

## Accuracy por segmento

### Confidence

| Segmento | Hits | Total | Acc |
|----------|-----:|------:|----:|
| presentimiento | 5 | 8 | 62.5% |
| bastante | 2 | 5 | 40.0% |
| leve | 1 | 4 | 25.0% |

### Ranking signal

| Segmento | Hits | Total | Acc |
|----------|-----:|------:|----:|
| local | 6 | 12 | 50.0% |
| visitante | 1 | 3 | 33.3% |
| neutral | 1 | 2 | 50.0% |

### Intuition signal

| Segmento | Hits | Total | Acc |
|----------|-----:|------:|----:|
| cerrado_al_final | 4 | 5 | 80.0% |
| empate_travieso | 2 | 4 | 50.0% |
| favorito_firme | 1 | 3 | 33.3% |
| sorpresa | 1 | 3 | 33.3% |
| tarde_movida | 0 | 2 | 0.0% |

---

## Partidos donde acertó (8)

| Partido | Marcador | Real | Predicho | Confianza |
|---------|----------|------|----------|-----------|
| Mexico vs South Africa | 2-0 | local | local | presentimiento |
| USA vs Paraguay | 4-1 | local | local | bastante |
| Haiti vs Scotland | 0-1 | visitante | visitante | presentimiento |
| Germany vs Curaçao | 7-1 | local | local | presentimiento |
| Sweden vs Tunisia | 5-1 | local | local | leve |
| Iraq vs Norway | 1-4 | visitante | visitante | bastante |
| Argentina vs Algeria | 3-0 | local | local | presentimiento |
| Austria vs Jordan | 3-1 | local | local | presentimiento |

---

## Partidos donde falló (9)

| Partido | Marcador | Real | Predicho | Confianza |
|---------|----------|------|----------|-----------|
| Canada vs Bosnia & Herzegovina | 1-1 | empate | local | presentimiento |
| Qatar vs Switzerland | 1-1 | empate | visitante | bastante |
| Brazil vs Morocco | 1-1 | empate | local | leve |
| Australia vs Türkiye | 2-0 | local | visitante | bastante |
| Netherlands vs Japan | 2-2 | empate | local | leve |
| Spain vs Cape Verde Islands | 0-0 | empate | local | presentimiento |
| Saudi Arabia vs Uruguay | 1-1 | empate | visitante | bastante |
| Iran vs New Zealand | 2-2 | empate | local | leve |
| Portugal vs Congo DR | 1-1 | empate | local | presentimiento |

**Patrón:** 6 de 9 fallos fueron empates reales predichos como local o visitante.

---

## Omitidos — sin predicción firme (5)

| Partido | Marcador | Real | Motivo |
|---------|----------|------|--------|
| Mexico vs Serbia | 5-1 | local | `predictedOutcome = unknown` (indeciso) |
| South Korea vs Czechia | 2-1 | local | indeciso |
| Ivory Coast vs Ecuador | 1-0 | local | indeciso |
| Belgium vs Egypt | 1-1 | empate | indeciso |
| France vs Senegal | 3-1 | local | indeciso |

---

## Limitación — sin snapshot pre-partido

Esta evaluación es **retrospectiva y aproximada**. No existe en BD un registro del veredicto Pitoniso tal como se mostró antes del kickoff.

| Dato usado | Contaminación |
|------------|---------------|
| Pronósticos quiniela global | Picks **actuales**, no los vigentes pre-partido |
| Ranking FIFA | Snapshot estático **jun-2026** aplicado a partidos ya jugados |
| Tabla / forma | Solo partidos anteriores al kickoff ✓ |

**Conclusión:** el 47.1% sirve como línea base interna post-deploy v2, no como accuracy publicable al usuario. Para medición honesta hace falta persistir `pitoniso_shown` con `predicted_outcome` y `version` en el momento pre-partido, o tabla `pitoniso_snapshots`.

---

## Salida cruda del script

```
Partidos finalizados:     22
Evaluados (≠ unknown):    17
Skipped (indeciso):       5
Aciertos:                 8
Accuracy Pitoniso v2:     47.1%
Baseline FIFA ranking:    52.6% (10/19)
```
