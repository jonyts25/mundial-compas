# PITONISO V3 — Plan de dataset y arquitectura

**Fecha:** 2026-06-23  
**Contexto:** Spike `SPORTS_DATA_ENRICHMENT_SPIKE_REPORT.md` + Pitoniso v2.1 en prod  
**Alcance:** Diseño interno — **sin** features públicas, **sin** cambio de scoring ni copy prod.

---

## Principio rector

```
┌─────────────────────────────────────────────────────────┐
│  Sports Core (determinista)                             │
│  → predictedOutcome, confidence, reasonCodes            │
│  → features numéricas desde DB + snapshots              │
└──────────────────────────┬──────────────────────────────┘
                           │ señales + contradicciones
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Ollama (opcional, lab / redacción)                     │
│  → resume señales, explica contradicciones              │
│  → propone hipótesis, redacta análisis                  │
│  → NO decide resultado, NO modifica confidence          │
└─────────────────────────────────────────────────────────┘
```

**Regla:** Ollama nunca emite `predictedOutcome` ni sustituye `reasonCodes`. Solo narrativa sobre input estructurado.

---

## Features calculadas — Pitoniso v3

### Señales heredadas (v2 — mantener)

| Feature | Fuente | Tipo |
|---------|--------|------|
| `crowd_local`, `crowd_draw`, `crowd_away`, `crowd_sample` | Agregados `pronosticos` | Sports Core |
| `table_pos_local`, `table_pos_away`, `table_pts_gap` | Mini-tabla grupo (DB) | Sports Core |
| `form_local`, `form_away`, `form_delta` | Partidos finalizados torneo (DB) | Sports Core |
| `rank_local`, `rank_away`, `rank_gap_norm` | Snapshot FIFA estático | Sports Core |
| `drawSignal` | Heurística crowd+table+form | Sports Core |
| `contradictions[]` | Pares de familias en conflicto | Sports Core |
| `confidence`, `reasonCodes[]` | Rule engine | Sports Core |

### Señales nuevas v3 (propuestas)

| Feature | Fuente primaria | Fuente API fallback | Pre-partido | Live | Post |
|---------|-----------------|---------------------|-------------|------|------|
| `gf_pg_local`, `gc_pg_local` | DB partidos grupo | `/teams/statistics` | ✅ | — | eval |
| `gf_pg_away`, `gc_pg_away` | DB | idem | ✅ | — | eval |
| `goal_diff_local`, `goal_diff_away` | DB | derivado | ✅ | — | eval |
| `tournament_form_local` (WDL string) | DB o API `form` | `/teams/statistics.form` | ✅ | — | eval |
| `stakes_score` / presión clasificación | Lógica `isLastGroupMatch`, pts vs 3° | — | ✅ | — | — |
| `elimination_pressure` | Escenarios knockout (DB) | — | ✅ fases KO | — | — |
| `lineups_confirmed` | metadata `alineaciones` | `/fixtures/lineups` | ✅ −4h | ✅ | ✅ |
| `lineups_strength_proxy` | XI count + formación | metadata | ✅ post XI | — | eval |
| `injuries_count_*` | — | `/injuries` | ⏸ ignorar | — | — |
| `h2h_wins_*` | — | `/fixtures/headtohead` | ⏸ ignorar WC | — | — |
| `match_statistics` | — | `/fixtures/statistics` | ❌ **no predecir** | ❌ no poll | ✅ explicación |
| `player_ratings_top` | — | `/fixtures/players` | ❌ | ❌ | Ollama only |
| `odds_implied_*` | — | `/odds` | lab only | lab | lab |

### Outputs Sports Core v3

```typescript
// Interno / eval — no mostrar probabilidades crudas al usuario
interface PitonisoV3CoreOutput {
  predictedOutcome: "local" | "empate" | "visitante";
  confidence: "alta" | "media" | "baja" | "indeciso";
  reasonCodes: string[];           // ej. "crowd_favor_local", "table_must_win"
  featureVector: Record<string, number | string | boolean | null>;
  drawSignal: { level: string; score: number };
  contradictions: string[];
}
```

---

## Mapping feature → fase del partido

### Pre-partido (Pitoniso card — `estatus=programado`)

**Usar:**
- crowd, table, form, ranking, drawSignal
- GF/GC y goal diff torneo (DB)
- stakes / presión clasificación (DB)
- lineups si `lineups_confirmed=true`

**No usar para score:**
- statistics, player ratings, odds (lab separado)
- injuries/H2H hasta que API tenga datos WC

### En vivo

**Pitoniso público:** oculto (comportamiento actual).

**Interno / eval:** comparar pre-partido vs resultado; statistics solo observación post-hoc.

### Post-partido

**Sports Core eval:**
- ¿Acertó `predictedOutcome`?
- ¿`drawSignal` calibrado en empates?

**Ollama (lab):**
- Crónica: events + statistics + players
- Explicar contradicciones pre-partido vs resultado

### Resumen de jornada

**Sports Core agrega:**
- Resultados por grupo (DB)
- Movimientos de tabla (DB)
- Top goleadores (DB events o API players on-demand)

**Ollama redacta** bullet narrative — no recalcula señales.

---

## Pesos iniciales v3 (propuesta — offline eval)

Extiende `matchPreviewWeights` v2:

| Familia | Peso v2 | Peso v3 propuesto |
|---------|---------|-------------------|
| crowd | 0.40 | 0.35 |
| form | 0.25 | 0.22 |
| table | 0.20 | 0.18 |
| context/stakes | 0.15 | 0.15 |
| ranking | ~0.10 | 0.08 |
| goal_form (GF/GC pg) | — | 0.12 |

Empate: sub-modelo `drawSignal` independiente (v2.1).

---

## Pipeline de datos (sin DB nueva en M0.5)

```
partidos (existente)
  ├── columnas: marcadores, estatus, grupo, jornada, fase
  └── metadata JSONB
        ├── alineaciones      ← sync-lineups (mantener)
        ├── eventos_clave     ← sync-live (mantener)
        ├── statistics        ← FUTURO: 1 call al FT
        └── (no injuries/h2h hasta spike positivo)

pronosticos → crowd
fifa-ranking snapshot → ranking
calculateGroupStandings → table, gf/gc derivable
team-competition-form → form (extender con GF/GC)
```

---

## Rol de Ollama (explícito)

| Permitido | Prohibido |
|-----------|-----------|
| Resumir `reasonCodes` en español | Elegir local/empate/visitante |
| Explicar `contradictions` | Ajustar `confidence` |
| Hipótesis narrativas (“si juega X…”) | Inventar jugadores/estadio sin input |
| Post-partido: crónica y MVP | Usar odds como veredicto |
| Lab: comparar vs baseline FIFA/crowd | Publicar cuotas |

Input IA: usar `ai-sports-prompt-guardrails.ts` — venue/players solo si vienen en payload.

---

## Fases de implementación (post-spike)

| Fase | Entregable | API calls nuevos |
|------|------------|------------------|
| **v3.0-core** | GF/GC, goal diff, stakes desde DB | 0 |
| **v3.0-eval** | Script offline `evaluate-pitoniso-v3` | 0 |
| **v3.1-post** | Persist `metadata.statistics` al FT | +1/partido FT |
| **v3.2-lab** | Ollama post-partido con statistics | on-demand |
| **v3.x-api** | injuries/H2H si API WC mejora | TBD |

---

## Criterios de éxito v3 (offline)

1. Mejor accuracy 1X2 vs baselines FIFA/crowd/table (dataset jornadas 1–2).
2. `drawSignal` Brier score ≤ v2.1 en empates reales.
3. Cero regresión en latencia página partido (features pre-computadas en server).
4. Ollama opcional — card funciona sin LLM.

---

## Referencias

- `SPORTS_DATA_ENRICHMENT_SPIKE_REPORT.md`
- `PITONISO_MODEL_RESEARCH_PLAN.md`
- `src/lib/sports-core/predictions/preview/` (v2)
- `src/lib/ai/ai-sports-prompt-guardrails.ts`
