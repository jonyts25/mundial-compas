# MATCH-SUMMARY-LAB-1 — Reporte

**Fecha:** 2026-05-18  
**Alcance:** Lab privado — builder + endpoint + UI `/lab/ia-local`. Sin DB save, sin UI pública, sin scoring/migrations/Pitoniso.

---

## Archivos tocados

| Archivo | Rol |
|---------|-----|
| `src/lib/ai/match-summary/match-summary-types.ts` | Tipos `MatchSummaryInput` / `MatchSummaryOutput` |
| `src/lib/ai/match-summary/build-match-summary-input.ts` | `buildMatchSummaryInput(partidoId, options)` |
| `src/lib/ai/match-summary/match-summary-prompt.ts` | Prompt + validación JSON salida |
| `src/app/api/dev/ai/match-summary/route.ts` | `POST /api/dev/ai/match-summary` |
| `src/components/admin/MatchSummaryLabClient.tsx` | Sección lab en UI |
| `src/components/admin/IaLocalLabScreen.tsx` | Integración sección "Resumen IA de partido" |
| `scripts/test-match-summary-lab.mjs` | Wrapper smoke |
| `scripts/test-match-summary-lab.ts` | Smoke builder + Ollama |
| `package.json` | Script `test:match-summary` |

---

## URL de prueba

- **Lab UI:** `/lab/ia-local` (requiere `canUseAiLab`)
- **API:** `POST /api/dev/ai/match-summary`  
  Body: `{ "partido_id": "<uuid>", "persona_id": "cronista_clasico" }`

---

## Partido y persona usados (smoke)

| Campo | Valor |
|-------|-------|
| Partido | England vs Ghana **0-0** |
| `partido_id` | `ae7aeb0c-1e96-4cac-8520-73a83c579d79` |
| Persona | `cronista_clasico` (El Cronista de Archivo) |
| Modelo | `gemma3:4b` (Ollama local) |

---

## Ejemplo input (resumido)

```json
{
  "version": "match-summary-v1",
  "partido_id": "ae7aeb0c-1e96-4cac-8520-73a83c579d79",
  "persona_id": "cronista_clasico",
  "match": {
    "home_code": "ENG",
    "home_name": "England",
    "away_code": "GHA",
    "away_name": "Ghana",
    "score_home": 0,
    "score_away": 0,
    "status": "finalizado",
    "phase": "grupos",
    "group": "L",
    "jornada": 2,
    "venue": "…",
    "referee": null,
    "kickoff_iso": "…"
  },
  "timeline": [],
  "statistics": null,
  "lineups": { "home_formation": "4-3-3", "away_formation": "4-2-3-1" },
  "standings_context": {
    "group_letter": "L",
    "home_position_before": 1,
    "home_position_after": 1,
    "away_position_before": 2,
    "away_position_after": 2
  },
  "quiniela_impact": { "liga_scope": "global", "picks_total": 12, "…": "…" },
  "data_gaps": [
    "statistics_not_persisted",
    "referee_not_persisted",
    "timeline_empty"
  ]
}
```

---

## Ejemplo output (smoke)

```json
{
  "version": "match-summary-v1",
  "headline": "Inglaterra empata con Ghana en el Grupo L",
  "lede": "El partido entre Inglaterra y Ghana concluyó sin goles. El marcador final fue 0-0.",
  "body_paragraphs": ["…"],
  "standout_player": null,
  "facts": [
    "El marcador final fue 0-0.",
    "El partido se jugó en el Grupo L, jornada 2.",
    "Inglaterra ocupaba la primera posición antes del encuentro y mantiene su posición."
  ],
  "table_impact": "…",
  "quiniela_impact": null,
  "confidence": "media",
  "data_gaps_acknowledged": ["…"]
}
```

---

## Data gaps observados

| Gap | Origen |
|-----|--------|
| `statistics_not_persisted` | No hay `metadata.statistics` en DB |
| `referee_not_persisted` | Árbitro no se guarda en sync actual |
| `timeline_empty` | Partido sin `eventos_clave` (0-0 sin rojas) |
| `lineups_not_available` | Si falta `metadata.alineaciones` |
| `quiniela_picks_unavailable` | Sin pronósticos en liga global |
| `standings_context_not_group_stage` | Fases fuera de grupos |

El prompt prohíbe mencionar estadísticas/VAR/sede/árbitro cuando faltan en el input.

---

## Qué faltaría para producción

1. **Persistir `metadata.statistics` al FT** (sync-live / webhook) — siguiente paso recomendado.
2. Persistir árbitro y eventos completos (VAR, sustituciones) si API los expone.
3. Cache `metadata.ai_summary` post-validación (no en este sprint).
4. UI pública en detalle partido + feature flag.
5. Rate limit y cola async para partidos masivos de jornada.
6. Tests de regresión con partidos con goles, VAR y stats reales.

---

## Validaciones ejecutadas

| Comando | Resultado |
|---------|-----------|
| `npm run test:core` | 35/35 ✓ |
| `npm run typecheck` | ✓ |
| `npm run build` | ✓ (incluye ruta `/api/dev/ai/match-summary`) |
| `npm run test:match-summary` | ✓ JSON válido, facts, sin VAR/stats alucinados |
| `npm run test:ollama` | ✓ (Ollama activo) |

Smoke checks adicionales:
- `facts[]` no vacío
- Sin mención VAR si input sin VAR
- Sin posesión/xG/corners si `statistics=null`
- Sin nombres de comentaristas reales

---

## Commit anterior (storytelling)

- **Hash:** `95f187280699deeacaf1a49c68af08a6543e708d`
- **Push:** `origin/master`
- **Railway:** deploy `9bed6af0` — **SUCCESS** (2026-06-23 17:18 -06:00) en `mundial-compas.up.railway.app`

**Este sprint (MATCH-SUMMARY-LAB-1) no tiene commit** — cambios locales sin commitear.
