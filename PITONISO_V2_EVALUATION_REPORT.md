# PITONISO V2 — Evaluación interna 1X2

> **Script:** `scripts/evaluate-pitoniso-v2.ts`  
> **Versión motor:** `pitoniso-v2-ranking`  
> **Uso:** interno — **no mostrar al usuario**, no usar para apuestas.

---

## Objetivo

Medir qué tanto acierta El Pitoniso en resultado 1X2 (`local` / `empate` / `visitante`) comparando `predictedOutcome` contra el marcador final.

---

## Cómo ejecutar

```bash
# Requiere .env.local con Supabase prod (service role)
npx -y tsx scripts/evaluate-pitoniso-v2.ts
```

Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Qué hace el script

1. Lee partidos `estatus = finalizado` con marcador.
2. Por cada partido, **reconstruye** contexto pre-kickoff:
   - Forma (`fetchTeamCompetitionForm` con `fecha_kickoff`)
   - Mini-tabla de grupo
   - Pronósticos quiniela global actuales
   - Ranking FIFA del snapshot estático jun-2026
3. Ejecuta `computeMatchPreviewVerdict` (v2).
4. Compara `predictedOutcome` vs resultado real.
5. Calcula baseline: solo favorito FIFA ranking (si no neutral).
6. Imprime tablas por `confidence`, `ranking_signal`, `intuition_signal`.

---

## Métricas reportadas

| Métrica | Descripción |
|---------|-------------|
| Total evaluados | Partidos con `predictedOutcome !== unknown` |
| Aciertos | `predictedOutcome === actual` |
| Accuracy % | aciertos / evaluados |
| Por confidence | `indeciso` excluido del numerador principal |
| Por ranking_signal | `none` / `local` / `visitante` / `neutral` |
| Baseline FIFA | Aciertos si solo miramos ranking FIFA |

---

## Limitación crítica (contaminación)

**No hay snapshot pre-partido guardado en BD.**

Por tanto, la evaluación retrospectiva puede estar **contaminada**:

| Dato | Problema |
|------|----------|
| Pronósticos quiniela | Son los picks **actuales**, no los que existían antes del partido |
| Ranking FIFA | Snapshot **jun-2026** aplicado a partidos ya jugados |
| Tabla/forma | Sí usa solo partidos anteriores al kickoff ✓ |

**Conclusión:** los números del script son **aproximación orientativa**, útiles para comparar variantes del motor en local, **no** para publicar accuracy real al usuario.

Para evaluación honesta hace falta:

1. Evento `pitoniso_shown` persistido o tabla `pitoniso_snapshots` al mostrar card pre-partido, **o**
2. PostHog export con props `predicted_outcome`, `version`, `partido_id` filtrados por fecha < kickoff.

---

## `predictedOutcome` vs `favorite`

- `favorite`: lado con mayor score del motor (puede ser empate con margen bajo).
- `predictedOutcome`: `unknown` si `confidence === indeciso`; si no, igual a `favorite`.

Esto evita contar como predicción firme los partidos donde el motor declara duda.

---

## Analytics en producción

`pitoniso_shown` ahora incluye:

```typescript
{
  partido_id,
  liga_scope,
  confidence,
  favorite,              // compat
  crowd_sample_ok,
  predicted_outcome,     // nuevo
  ranking_signal,        // none | local | visitante | neutral
  intuition_signal,      // tono narrativo
  version: "pitoniso-v2-ranking"
}
```

PostHog puede agregarse cuando haya volumen; aún no se muestra en UI.

---

## Próximos pasos evaluación

1. Correr script tras cada deploy del motor y guardar salida en CI artifact.
2. Cuando exista ingest ranking diario, versionar snapshot por fecha.
3. Persistir veredicto al `pitoniso_shown` (event store o migration futura).
4. Dashboard interno PostHog: accuracy rolling 7d por `version`.

---

## Ejemplo de salida esperada

```
PITONISO V2 — Evaluación 1X2 (interna)

Partidos finalizados:     42
Evaluados (≠ unknown):    35
Skipped (indeciso):       7
Aciertos:                 18
Accuracy Pitoniso v2:     51.4%
Baseline FIFA ranking:    48.6% (17/35)

Accuracy por confidence
────────────────────────────────────────────────────────
Segmento                       Hits  Total      Acc
leve                              4      8    50.0%
bastante                          9     15    60.0%
presentimiento                    5     12    41.7%

⚠️  Sin snapshot pre-partido: ranking y quiniela actuales pueden contaminar la evaluación.
```

*(Cifras ilustrativas — ejecutar script contra prod/staging para valores reales.)*
