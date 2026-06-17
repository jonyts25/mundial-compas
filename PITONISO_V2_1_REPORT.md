# PITONISO V2.1 — Empate Signal + Confidence Calibration

> **Versión analytics:** `pitoniso-v2.1-draw`  
> **Fecha:** 2026-06-17  
> **Motivación:** 6/9 fallos v2 fueron empates reales predichos como local/visitante.

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `src/lib/sports-core/predictions/preview/draw-signal.ts` | **Nuevo** — `computeDrawSignal`, `DrawSignal` |
| `src/lib/sports-core/predictions/preview/match-preview.ts` | `drawSignal`, confianza v2.1, `predictedOutcome` con empate |
| `src/lib/sports-core/predictions/preview/signals.ts` | (sin cambio estructural) |
| `src/lib/sports-core/index.ts` | Export draw-signal |
| `src/lib/prediction-engine/match-preview.ts` | Re-export `DrawSignal` |
| `src/lib/prediction-engine/pitoniso-message.ts` | Copy empate (`drawPhrase`) |
| `src/lib/prediction-engine/pitoniso-pi1.fixtures.ts` | 4 fixtures v2.1 + expectativas ajustadas |
| `src/components/partidos/PitonisoCard.tsx` | Analytics `draw_signal_*`, version v2.1 |
| `src/lib/analytics/events.ts` | Tipos `pitoniso_shown` v2.1 |
| `scripts/evaluate-pitoniso-v2.ts` | Métricas empate + comparación v2 |

---

## Reglas `drawSignal`

Puntuación interna (threshold **strong ≥ 6**, **medium ≥ 3**):

| Factor | Puntos | Reason key |
|--------|--------|------------|
| `rankDiff ≤ 10` | +2 | `ranking_parejo` |
| `rankDiff ≤ 20` | +1 | `ranking_cercano` |
| Multitud dividida o muestra insuficiente | +2 | `multitud_dividida` |
| `|scoreLocal − scoreVisitante| × 100 ≤ 10` | +2 | `scores_cerrados` |
| `≤ 20` | +1 | `scores_parejos` |
| Tabla/forma sin líder claro | +1 | `tabla_forma_sin_lider` |
| Ranking vs tabla+forma (mismo torneo) | +2 | `ranking_vs_torneo` |
| ≥2 contradicciones | +2 | `senalas_contradictorias` |
| 1 contradicción | +1 | `contradiccion_leve` |
| Margen motor `< 0.10` | +1 | `margen_bajo` |

**No draw** si 3+ señales alineadas con margen amplio, o ranking amplio **alineado** con tabla+forma.

### Guardrail multitud (v2.1.1)

Evita falsos empates cuando la quiniela ya inclina a un ganador:

| Condición | Efecto |
|-----------|--------|
| `crowdSampleOk` + líder multitud ≥ **55%** (`CROWD_CLEAR_LEADER_SHARE`) | `drawSignal` máx. **medium** (`multitud_clara_guardrail`); no empate automático por draw |
| Fallback: moda 1X2 ≥ 55% y alineada con `leaderFromCrowdOutcomes` | Mismo guardrail |
| Proxy share líder: `crowdLeaderShare(signals)` desde señales normalizadas 0–1 | Equivale a `%` en `PickAggregates.outcomes` |
| Proxy moda: `mostPopularOutcome.pct / 100` | Share del outcome más repetido |
| Empate co-líder con ganador (`crowdDrawCoLeadsTop`) | Dos outcomes al tope (ej. 40/40/20), no triple 33/33/33 |
| Sin picks (`!crowdSampleOk`, `totalPicks === 0`) | Draw strong no fuerza empate si favorito score ≠ empate |
| Empate co-líder + moda alineada al favorito score | Draw strong → ganador, no empate automático |

**Strong draw permitido** cuando multitud dividida, muestra insuficiente, o empate triple en crowd.

---

## Reglas `predictedOutcome` (v2.1)

| Condición | Resultado |
|-----------|-----------|
| Sin picks ni señales estáticas | `unknown` |
| `crowdBlocksAutoDraw` + draw ≠ none + favorito ≠ empate | favorito score |
| `drawSignal.strong` + multitud clara bloqueada | favorito score |
| `drawSignal.strong` + sin picks estáticos | favorito score |
| `drawSignal.strong` + empate co-líder en crowd + moda = favorito | favorito score |
| `drawSignal.strong` (resto) | `empate` |
| `drawSignal.medium` + contradicción fuerte (≥2) | `empate` |
| `drawSignal.medium` + contradicción leve | `unknown` |
| `drawSignal.medium` + favorito ≠ empate | `unknown` |
| Favorito score = empate | `empate` |
| Señales alineadas, draw none | `local` / `visitante` |

---

## Reglas `confidence` (v2.1)

| Nivel | Cuándo |
|-------|--------|
| `presentimiento` | 3+ señales alineadas, sin contradicción fuerte, draw none, margen ≥0.18 |
| `bastante` | 3+ alineadas sin contradicción leve; o 2 alineadas con contradicción leve |
| `leve` | draw medium, contradicciones, margen bajo |
| `presentimiento` (empate) | `predictedOutcome=empate` + draw strong |
| `leve` (empate) | `predictedOutcome=empate` + draw medium |
| `indeciso` | `predictedOutcome=unknown` o sin datos |

---

## Analytics `pitoniso_shown`

Campos nuevos:

- `draw_signal_level`: `none` | `medium` | `strong`
- `draw_signal_reasons_count`: número entero
- `version`: `"pitoniso-v2.1-draw"`

Se mantienen: `predicted_outcome`, `ranking_signal`, `intuition_signal`, `confidence`, `favorite`.

---

## Evaluación v2.1 (post-guardrail multitud)

Ver `PITONISO_V2_1_EVALUATION_RUN_2026_06_17.md`.

| Métrica | v2 | v2.1 (guardrail) |
|---------|----|------------------|
| Finalizados | 22 | 23 |
| Evaluados | 17 | 20 |
| Aciertos | 8 | **12** |
| Accuracy | **47.1%** | **60.0%** |
| Baseline FIFA | 52.6% | 55.0% |
| Empates reales | 9 | 9 |
| Predichos empate | ~0 | **2** |
| Empates acertados | 0 | **1** (Bélgica–Egipto) |
| Empates fallados (pred L/V) | 6 | **6** |

**Lectura:** El guardrail elimina los 3 falsos empates objetivo (México–Serbia, Costa de Marfil–Ecuador, Francia–Senegal) sin perder Bélgica–Egipto. Accuracy sube en dataset contaminado (+12.9 pp vs v2 en subconjunto comparable). England–Croatia sigue como falso empate (crowd/modas favorecen empate).

---

## Copy empate (ejemplos)

- “El Pitoniso ve este partido demasiado cerrado como para casarse con un ganador.”
- “Las señales se estorban entre sí; el empate empieza a asomarse.”
- “Aquí huele a empate travieso.”
- “El ranking inclina la balanza, pero no lo suficiente para dormir tranquilo.”

Máximo una línea extra; sin cambio de layout.

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Sobre-predicción de empate (`strong` en partidos con favorito claro) | Ajustar thresholds tras más partidos |
| Accuracy global plana en n=17 | Esperado; foco en recall de empates |
| Evaluación contaminada (sin snapshot) | Documentado; no publicar métricas al usuario |
| `favorite` ≠ `predictedOutcome` | UI sigue mostrando inclinación score; analytics usa `predicted_outcome` |

---

## Siguiente paso recomendado

1. **Deploy v2.1** y monitorear `pitoniso_shown` con `draw_signal_level`.
2. **Persistir snapshot pre-partido** para evaluación honesta.
3. **Calibrar thresholds** de draw strong (evitar falsos empates en favoritos claros tipo ARG–Argelia).
4. Subir peso de `crowdDraw` en motor solo cuando `drawSignal.medium+` (opcional v2.2).
