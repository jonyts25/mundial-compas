# PITONISO_MODEL_RESEARCH_PLAN — Investigación modelo 1X2 interno

**Objetivo:** Mejorar Pitoniso como experimento **local / empate / visitante** para aprendizaje y evaluación offline.  
**No** es predicción pública, **no** apuestas, **no** reemplaza scoring ni `savePronostico`.

---

## 1. Señales actuales (v2 rule-based)

| Señal | Fuente | Peso aprox. | Archivo |
|-------|--------|-------------|---------|
| crowd | Agregados `pronosticos` | 0.40 | `match-preview.ts`, `draw-signal.ts` |
| form | Partidos finalizados DB | 0.25 | `team-competition-form.ts` |
| table | Mini-tabla grupo DB | 0.20 | `calculate-group-standings.ts` |
| context | Fase, knockout, último partido grupo | 0.15 | `match-preview.ts` |
| ranking | Snapshot FIFA estático | ~0.10 | `fifa-ranking-signal.ts` |
| drawSignal | Heurística multitud+tabla+forma | — | `draw-signal.ts` |
| contradictions | Pares crowd/table/form/ranking | — | `signals.ts` |
| intuition | confidence `presentimiento` / `indeciso` | — | `match-preview.ts` |

**Output actual:** `favorite`, scores internos `{local, draw, visitante}`, `confidence`, `drawSignal`.

---

## 2. Señales nuevas propuestas (feature set v3)

| Feature | Fuente | Disponible hoy | Esfuerzo |
|---------|--------|----------------|----------|
| `gf_pg`, `gc_pg` torneo | DB partidos grupo | Parcial (post-jornada 1) | Bajo |
| `goal_diff` torneo | DB | Sí | Bajo |
| `rank_gap` | FIFA snapshot | Sí | Hecho |
| `rank_norm` | FIFA snapshot | Sí | Hecho |
| `form_last_n` (n=3,5) | DB | Sí | Bajo |
| `table_pts_gap` | Mini-tabla | Sí | Bajo |
| `must_win` / stakes | Última jornada grupo, pts vs 3° | Lógica existente `isLastGroupMatch` | Medio |
| `elimination_pressure` | Escenarios clasificación | `build-knockout-bracket` | Medio |
| `h2h_api` | `/fixtures/headtohead` | No persistido | Medio |
| `injuries_count` | `/injuries` | No | Medio |
| `lineups_strength` | `/fixtures/lineups` | Parcial metadata | Alto |
| `home_venue` | `partidos.sede` | Sí columna | Bajo |
| `live_momentum` | events post-partido only | metadata | Solo post |
| `odds_implied` | `/odds` lab | No | Investigación |

### Feature set v3 (propuesta inicial — 18 features)

```
crowd_local, crowd_draw, crowd_away, crowd_sample
form_local, form_away, form_delta
table_pos_local, table_pos_away, table_pts_gap
rank_local, rank_away, rank_gap_norm
gf_pg_local, gc_pg_local, gf_pg_away, gc_pg_away
is_knockout, is_last_group_match, stakes_score
```

---

## 3. Fórmula simple 1X2 (v3 propuesta)

**Baseline ponderado** (sin ML):

```
score_local  = w_c*crowd_local + w_f*form_local + w_t*table_local + w_r*rank_local + w_g*goal_form_local + w_s*stakes_local
score_away   = (mismo para visitante)
score_draw   = blend(drawSignal, crowd_draw, table_draw_proxy, form_symmetry)
```

Normalizar a pseudo-probabilidades: `p_i = score_i / sum(scores)` (solo interno, no mostrar % al usuario).

**Empate:** sub-modelo dedicado (v2 ya tiene `computeDrawSignal`) — evaluar por separado.

---

## 4. Baselines para comparación

| Baseline | Regla | Propósito |
|----------|-------|-----------|
| **FIFA** | Gana mejor ranking; empate si gap < ε | Suelo “expert naive” |
| **Crowd** | Outcome con mayor % pronósticos | Sabiduría multitud |
| **Table** | Mejor posición en grupo | Tabla manda |
| **Form** | Mayor `formNorm` | Racha reciente |
| **Random** | 1/3 cada outcome | Suelo mínimo |
| **Always home** | Siempre local | Sesgo sede |

Pitoniso v2 actual = baseline compuesto (debe superar FIFA y Crowd en accuracy agregada).

---

## 5. Evaluación por snapshots pre-partido

### Flujo

1. Para cada partido `programado` histórico (o replay torneo):
   - **T₀** = timestamp fijo (ej. −2h kickoff).
   - Capturar features **solo con datos disponibles en T₀** (sin marcador final).
   - Guardar predicción v2/v3 + baselines.
2. Tras `finalizado`, registrar outcome real.
3. Comparar métricas.

### Evitar contaminación retrospectiva

- **Prohibido** usar marcador del partido evaluado en features.
- Form/table: solo partidos con `fecha_kickoff < T₀` y `estatus=finalizado`.
- Crowd: solo pronósticos con `created_at < T₀`.
- Ranking: snapshot FIFA con `effective_date <= T₀` (versionar snapshots).
- Walk-forward: entrenar pesos en jornadas 1–k, validar en k+1.

---

## 6. Métricas

| Métrica | Definición | Prioridad |
|---------|------------|-----------|
| **Accuracy 1X2** | % favorite == outcome | Alta |
| **Accuracy @ confidence** | Stratificar por `leve/bastante/presentimiento` | Alta |
| **Draw accuracy** | Solo partidos empate reales | Alta (empate es débil) |
| **Brier score** | Σ (p_i - y_i)² en pseudo-probs internas | Media |
| **Log loss** | Si se usan probs calibradas | Media |
| **vs FIFA delta** | Acc_pitoniso - Acc_fifa | Alta |
| **Calibration** | Reliability diagram por bin de confianza | Baja |

---

## 7. PostHog vs BD

| Evento / dato | PostHog | BD futura |
|---------------|---------|-----------|
| `pitoniso_expanded` | ✅ ya | — |
| Predicción + outcome (eval) | No (volumen) | `pitoniso_snapshots` |
| Feature vector v3 | No | `pitoniso_snapshots.features` JSONB |
| A/B pesos modelo | Flags en lab solo | — |
| `ai_lab_preview_generated` | ✅ tipado | — |
| Accuracy agregada dashboard | — | Vista materializada / script |

---

## 8. Tabla futura `pitoniso_snapshots` (propuesta)

```sql
-- NO migrar aún — solo diseño
pitoniso_snapshots (
  id uuid PK,
  partido_id uuid FK,
  captured_at timestamptz,  -- T₀
  model_version text,       -- 'v2' | 'v3' | 'baseline_fifa'
  features jsonb,
  predicted_outcome text,   -- local|empate|visitante
  confidence text,
  scores jsonb,             -- {local, draw, away}
  actual_outcome text null, -- backfill post-match
  created_at timestamptz
)
```

Índices: `(partido_id)`, `(model_version, captured_at)`.

---

## 9. Roadmap investigación

| Semana | Entregable |
|--------|------------|
| 1 | Script offline `evaluate-pitoniso-snapshots.mjs` desde DB histórica |
| 2 | Feature v3 desde DB sin API nueva |
| 3 | Grid search pesos w_c, w_f, w_t, w_r |
| 4 | Reporte accuracy vs baselines; decisión si v3 merece lab |
| 5+ | Opcional injuries/H2H API en features |

---

## 10. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Overfit Mundial 2026 (pocos partidos) | Walk-forward; no publicar % |
| Crowd leakage (picks tardíos) | T₀ fijo −2h |
| FIFA snapshot desactualizado | Versionar snapshots por fecha |
| Confundir research con producto | Lab + snapshots; PitonisoCard sin cambios hasta validación |

---

## 11. Archivos de referencia

- `src/lib/sports-core/predictions/preview/match-preview.ts`
- `src/lib/sports-core/predictions/preview/draw-signal.ts`
- `src/lib/sports-core/predictions/preview/signals.ts`
- `src/lib/prediction-engine/team-competition-form.ts`
- `src/lib/partidos/pitoniso-queries.ts`
- `src/components/partidos/PitonisoCard.tsx` — **no modificar en research**
