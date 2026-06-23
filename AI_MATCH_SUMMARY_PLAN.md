# AI Match Summary Plan — WORLD-CUP-LIVE-STORYTELLING-DESIGN-1

**Estado:** Diseño + schemas. Sin UI pública. Sin cambios a Pitoniso/scoring.

---

## Casos de uso

| Caso | Trigger | Consumidor |
|------|---------|------------|
| Resumen post-partido | `estatus=finalizado` | Detalle partido, push digest |
| Resumen de jornada | Último FT de jornada / cron nocturno | Home, notificación |
| Previa siguiente jornada | T−24h jornada N+1 | Home, email opcional |
| Jugador destacado | FT + rating o ≥2 goles | Card en resumen |
| Partido destacado | Heurística jornada | Hero jornada |
| Sorpresa de la jornada | Upset vs ranking FIFA | Bullet narrativo |
| Impacto quiniela | Agregados pronósticos | Bloque separado |
| Impacto tabla | Standings diff | Bloque factual |

---

## Reglas de redacción (todas las voces)

1. **IA no inventa** — solo campos del input JSON.
2. **Silencio explícito** — si falta posesión, no decir "dominó".
3. **No comentaristas reales** — usar `sports-narrator-personas.ts`.
4. **No picks individuales** — solo % agregados sin usuarios.
5. **Separar hechos de interpretación** — `facts[]` vs `narrative`.
6. **Salida JSON** validable antes de mostrar UI.

---

## Pipeline propuesto (lab → prod)

```
DB partidos + metadata + pronósticos agregados
        ↓
Builder TypeScript (sin LLM) → match_summary_input
        ↓
Ollama / API interna (canUseAiLab) + persona prompt
        ↓
JSON schema validation → match_summary_output
        ↓
Cache metadata.ai_summary (futuro, NO en este sprint)
```

**No tocar Pitoniso:** motor aparte en `src/lib/ai/match-summary/` (futuro).

---

## Schemas

### `match_summary_input`

```typescript
interface MatchSummaryInput {
  version: "match-summary-v1";
  partido_id: string;
  fixture_id: number | null;
  persona_id: SportsNarratorPersonaId;
  locale: "es-MX";
  match: {
    home_code: string;
    home_name: string;
    away_code: string;
    away_name: string;
    score_home: number;
    score_away: number;
    status: "finalizado" | "en_vivo";
    phase: string;
    group: string | null;
    jornada: number | null;
    venue: string | null;
    referee: string | null;
    kickoff_iso: string;
  };
  timeline: Array<{
    minute: number | null;
    extra: number | null;
    type: "gol" | "tarjeta_roja" | "penalty_goal" | "own_goal";
    player: string;
    team_code: string;
    detail: string | null;
  }>;
  statistics: {
    possession_home_pct: number | null;
    possession_away_pct: number | null;
    shots_on_home: number | null;
    shots_on_away: number | null;
    corners_home: number | null;
    corners_away: number | null;
    xg_home: number | null;
    xg_away: number | null;
  } | null;
  lineups: {
    home_formation: string | null;
    away_formation: string | null;
  } | null;
  standings_context: {
    home_position_before: number | null;
    home_position_after: number | null;
    away_position_before: number | null;
    away_position_after: number | null;
    group_letter: string | null;
  } | null;
  quiniela_impact: {
    liga_scope: "global" | "grupo";
    picks_total: number;
    most_common_score: string | null;
    most_common_score_pct: number | null;
    exact_hits_estimated: number | null;
    trend_hits_estimated: number | null;
  } | null;
  data_gaps: string[];
}
```

### `match_summary_output`

```typescript
interface MatchSummaryOutput {
  version: "match-summary-v1";
  partido_id: string;
  persona_id: SportsNarratorPersonaId;
  headline: string;
  lede: string;
  body_paragraphs: string[];
  standout_player: {
    name: string;
    reason: string;
  } | null;
  facts: string[];
  table_impact: string | null;
  quiniela_impact: string | null;
  confidence: "alta" | "media" | "baja";
  data_gaps_acknowledged: string[];
}
```

### `round_summary_input`

```typescript
interface RoundSummaryInput {
  version: "round-summary-v1";
  jornada: number;
  persona_id: SportsNarratorPersonaId;
  locale: "es-MX";
  matches: Array<{
    partido_id: string;
    label: string;
    score: string;
    highlight: boolean;
  }>;
  group_movements: Array<{
    group: string;
    team_code: string;
    team_name: string;
    old_position: number;
    new_position: number;
  }>;
  best_thirds_snapshot: Array<{
    rank: number;
    group: string;
    team_name: string;
    points: number;
    qualifies: boolean;
  }>;
  featured_match_id: string | null;
  upset: { partido_id: string; description: string } | null;
  quiniela_day: {
    picks_count: number;
    avg_points_per_user: number | null;
    top_score_line: string | null;
  } | null;
  data_gaps: string[];
}
```

### `round_summary_output`

```typescript
interface RoundSummaryOutput {
  version: "round-summary-v1";
  jornada: number;
  persona_id: SportsNarratorPersonaId;
  headline: string;
  summary: string;
  bullets: string[];
  featured_match: string | null;
  surprise: string | null;
  table_highlights: string[];
  quiniela_paragraph: string | null;
  facts: string[];
}
```

### `next_round_preview_input`

```typescript
interface NextRoundPreviewInput {
  version: "next-round-preview-v1";
  jornada: number;
  persona_id: SportsNarratorPersonaId;
  locale: "es-MX";
  upcoming_matches: Array<{
    partido_id: string;
    kickoff_iso: string;
    home_name: string;
    away_name: string;
    group: string | null;
    stakes: string | null;
  }>;
  standings: Array<{
    group: string;
    rows: Array<{ position: number; team_name: string; points: number }>;
  }>;
  scenarios: Array<{
    team_code: string;
    team_name: string;
    message: string;
  }>;
  provisional_knockout: Array<{
    team_name: string;
    opponent_label: string;
    is_provisional: boolean;
  }>;
  data_gaps: string[];
}
```

### `next_round_preview_output`

```typescript
interface NextRoundPreviewOutput {
  version: "next-round-preview-v1";
  jornada: number;
  persona_id: SportsNarratorPersonaId;
  headline: string;
  intro: string;
  matches_to_watch: Array<{ partido_id: string; blurb: string }>;
  classification_races: string[];
  provisional_bracket_notes: string[];
  facts: string[];
}
```

---

## Validación

- JSON Schema o Zod en lab (`canUseAiLab`).
- Rechazar output si `facts` citan campo no presente en input.
- `confidence=baja` si `data_gaps.length > 2`.

---

## Fases de implementación

| Fase | Entregable |
|------|------------|
| D1 (esta semana) | Builder input desde DB + persona + lab API |
| D2 | Persist `metadata.statistics` al FT |
| D3 | UI card solo admin / feature flag |
| D4 | Resumen jornada cron |

**Fuera de alcance:** modificar Pitoniso, savePronostico, scoring.
