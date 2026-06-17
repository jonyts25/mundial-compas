# PITONISO V2 RANKING — Reporte

> **Versión:** `pitoniso-v2-ranking`  
> **Fecha:** 2026-06-17  
> **Alcance:** señal FIFA estática + intuición determinista + analytics internos. Sin schema, sin Migration 0.

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `src/lib/sports-core/data/fifa-ranking-2026-06.ts` | Snapshot ranking FIFA por código 3 letras |
| `src/lib/sports-core/predictions/preview/fifa-ranking-signal.ts` | `getFifaRankingSignal`, normalización, analytics helper |
| `src/lib/sports-core/predictions/preview/match-preview.ts` | Peso ranking 10%, `predictedOutcome`, `rankingSignal` en veredicto |
| `src/lib/sports-core/predictions/preview/signals.ts` | `leaderFromRanking`, conflictos crowd/table/form vs ranking |
| `src/lib/sports-core/index.ts` | Export `leaderFromRanking` |
| `src/lib/prediction-engine/pitoniso-intuition.ts` | `intuitionSeed` + copy determinista |
| `src/lib/prediction-engine/pitoniso-message.ts` | Frases ranking + línea intuición |
| `src/lib/prediction-engine/pitoniso-pi1.fixtures.ts` | 4 fixtures nuevos ranking |
| `src/lib/prediction-engine/match-preview.ts` | Re-export tipos v2 |
| `src/lib/partidos/pitoniso-queries.ts` | Lookup FIFA + `rankingSignal` en contexto |
| `src/lib/partidos/pitoniso-signals.ts` | `rankingSignal` en `PitonisoStaticContext` |
| `src/components/partidos/PitonisoCard.tsx` | Motor v2, analytics, líneas contradicción ranking |
| `src/lib/analytics/events.ts` | Campos `predicted_outcome`, `ranking_signal`, `intuition_signal`, `version` |
| `scripts/verify-pitoniso-pi4-qa.ts` | QA con `ranking: null` |
| `scripts/evaluate-pitoniso-v2.ts` | Evaluación retrospectiva 1X2 |

---

## Reglas de ranking FIFA

### Thresholds (`getFifaRankingSignal`)

| Diferencia de posición | `leader` | `confidence` | Label |
|------------------------|----------|--------------|-------|
| 0–5 | `neutral` | `low` | Ranking FIFA casi empatado |
| 6–20 | local/visitante | `medium` | Ventaja ligera |
| 21–50 | local/visitante | `medium` | Ventaja clara |
| 51+ | local/visitante | `high` | Ventaja fuerte |

Menor `rank` = mejor equipo.

### Motor (`match-preview`)

- Peso ranking: **10%** (`matchPreviewRankingWeight`), resto escala proporcional.
- Solo aplica si **ambos** equipos tienen entrada en el snapshot.
- Sin ranking → comportamiento idéntico al motor previo (pesos 40/20/25/15).
- `rankNorm(rank) = 1 - (rank-1)/209`.

### Contradicciones

Nuevos conflictos: `crowd_vs_ranking`, `table_vs_ranking`, `form_vs_ranking`.

---

## Reglas intuición

| Función | Comportamiento |
|---------|----------------|
| `intuitionSeed(partidoId)` | Hash djb2 → 1 de 5 tonos fijos |
| Tonos | `sorpresa`, `empate_travieso`, `favorito_firme`, `tarde_movida`, `cerrado_al_final` |
| Efecto motor | **Ninguno** — solo copy |
| Estabilidad | Misma `partidoId` → mismo tono en cada refresh |

---

## Ejemplos de copy

**Ranking alto:**
> El ranking mundial también le guiña el ojo a **Argentina**.

**Ranking medio:**
> En el papel, **Alemania** llega mejor parado según el ranking FIFA.

**Ranking contradice veredicto:**
> El ranking dice una cosa, pero el Mundial suele burlarse de los papeles.

**Intuición:**
> El Pitoniso huele una sorpresa en el aire — el Mundial no lee los papeles.

**Contradicción UI:**
> La multitud y el ranking mundial no se ponen de acuerdo.

---

## `predictedOutcome`

| Valor | Cuándo |
|-------|--------|
| `local` / `empate` / `visitante` | `confidence !== "indeciso"` |
| `unknown` | `confidence === "indeciso"` |

Expuesto en `MatchPreviewVerdict.predictedOutcome`. Analytics en `pitoniso_shown` (no visible al usuario).

---

## QA ejecutado

```bash
npx tsc --noEmit                    # OK
npx -y tsx scripts/verify-pitoniso-pi1.ts   # OK (10 fixtures)
npx -y tsx scripts/verify-pitoniso-pi4-qa.ts # OK
npx eslint <archivos tocados>       # OK
```

### Fixtures nuevos

| ID | Escenario |
|----|-----------|
| `ranking-favorito-claro` | ARG 1 vs HAI 60 |
| `ranking-cerrado` | MEX 13 vs USA 14 → neutral |
| `ranking-vs-crowd-form` | Crowd/form local, ranking visitante |
| `equipo-sin-ranking` | Código `ZZZ` → señal ignorada |

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Ranking estático desactualizado | Documentado; ingest diario como siguiente paso |
| Snapshot no refleja forma pre-Mundial | Peso ranking solo 10% |
| Evaluación histórica contaminada | Script documenta limitación; ver `PITONISO_V2_EVALUATION_REPORT.md` |
| Fixtures legacy sin códigos | Sin cambio de pesos si no hay ranking |
| PostHog nuevas props | Solo analytics interno; dashboards a actualizar |

---

## Siguiente paso: ranking dinámico diario

1. **Ingest** FIFA ranking (API o CSV) → tabla `fifa_ranking_snapshots` (Migration futura, fuera de este scope).
2. **Cron** diario que actualice snapshot con `as_of` date.
3. **Pitoniso** lee rank vigente a `fecha_kickoff` del partido (no rank de hoy).
4. **Evaluación** guardar veredicto pre-partido en evento o tabla `pitoniso_snapshots` para accuracy real.

Hasta entonces, `fifa-ranking-2026-06.ts` es fuente editorial versionada en git.
