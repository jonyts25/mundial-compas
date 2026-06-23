# MATCH-STATS-FT-1 — Reporte

**Fecha:** 2026-05-18  
**Alcance:** Persistir `metadata.statistics` una vez al FT vía sync-live. Sin UI pública, sin migrations, sin scoring.

---

## Archivos tocados

| Archivo | Rol |
|---------|-----|
| `src/lib/api-football/fetch-statistics.ts` | Cliente `GET /fixtures/statistics` |
| `src/lib/api-football/match-statistics.ts` | Normalizar, leer, merge metadata |
| `src/lib/api-football/match-statistics.test.ts` | Tests normalizador |
| `src/lib/partidos/sync-live-scores-api-sports.ts` | Fetch FT si falta statistics |
| `src/lib/ai/match-summary/build-match-summary-input.ts` | Lee `metadata.statistics` persistido |
| `src/lib/ai/match-summary/build-match-summary-input.test.ts` | Builder con/sin statistics |
| `scripts/backfill-match-statistics.mjs` | Backfill manual dev |

---

## Regla de sync

Cuando `estatus === finalizado` y **no** existe `metadata.statistics` con `provider: "api-sports"` + `fetched_at`:

1. `GET /fixtures/statistics?fixture=<id>` (+1 API request)
2. Normalizar campos home/away
3. Merge en `metadata` (mismo ciclo que eventos/fases)
4. Si API falla → `console.warn`, sync continúa; reintento en próximo sync

**No** se hace polling de statistics en vivo.

---

## Ejemplo `metadata.statistics`

```json
{
  "provider": "api-sports",
  "fetched_at": "2026-06-23T23:30:00.000Z",
  "possession_home_pct": 58,
  "possession_away_pct": 42,
  "shots_total_home": 14,
  "shots_total_away": 9,
  "shots_on_home": 5,
  "shots_on_away": 2,
  "corners_home": 7,
  "corners_away": 3,
  "fouls_home": 11,
  "fouls_away": 15,
  "offsides_home": 2,
  "offsides_away": 1,
  "xg_home": 1.42,
  "xg_away": 0.61
}
```

Campos ausentes en API → `null`.

---

## Partido probado

| Campo | Valor |
|-------|-------|
| Script | `node scripts/backfill-match-statistics.mjs --partido-id=ae7aeb0c-1e96-4cac-8520-73a83c579d79 --dry-run` |
| Partido | England vs Ghana 0-0 (finalizado) |
| Fixture API | `1489402` |
| Modo | `--dry-run` (sin write) |
| Resultado | possession 79/21, shots 19/2, corners 9/2, xG null |

---

## Validaciones (implementación)

| Comando | Resultado |
|---------|-----------|
| `npm run test:core` | 44/44 ✓ |
| `npm run typecheck` | ✓ |
| `npm run build` | ✓ |
| `backfill --dry-run` | ✓ England vs Ghana fixture 1489402 |

---

## QA — MATCH-STATS-FT-1-QA (2026-05-18)

### Entorno

| Item | Valor |
|------|-------|
| Entorno DB | **Producción** (`hbcsvpbksuunbhagjqyk.supabase.co`) — sin staging en `.env.local` |
| Alcance write | **Un solo partido** finalizado (England vs Ghana) |
| API | api-sports (`API_SPORTS_KEY` local) |

### Fase 1 — Verificación local

| Check | Resultado |
|-------|-----------|
| `git status` | 8 archivos MATCH-STATS sin commit |
| `npm run test:core` | 44/44 ✓ |
| `npm run typecheck` | ✓ |
| `npm run build` | ✓ |

### Fase 2 — Escritura controlada

Comando:
```bash
node scripts/backfill-match-statistics.mjs --partido-id=ae7aeb0c-1e96-4cac-8520-73a83c579d79
```

Resultado: **✓ Persistido** (`fetched_at`: `2026-06-23T23:36:17.152Z`)

SQL verificación:
```sql
select id, equipo_local_nombre, equipo_visitante_nombre, metadata->'statistics' as statistics
from partidos where id = 'ae7aeb0c-1e96-4cac-8520-73a83c579d79';
```

| Campo | Valor |
|-------|-------|
| `provider` | `api-sports` ✓ |
| `fetched_at` | presente ✓ |
| `possession_home_pct` / `away` | 79 / 21 |
| `shots_total_home` / `away` | 19 / 2 |
| `shots_on_home` / `away` | 3 / 1 |
| `corners_home` / `away` | 9 / 2 |
| `fouls_home` / `away` | 14 / 24 |
| `offsides_home` / `away` | 2 / 2 |
| `xg_home` / `xg_away` | `null` / `null` (API no provee xG en este fixture) |

Re-ejecutar backfill: script detecta statistics existentes y **omite** (idempotente).

### Fase 3 — Match Summary con stats

**Builder (antes vs después)**

| | Antes (sin `metadata.statistics`) | Después (con write) |
|---|-----------------------------------|---------------------|
| `data_gaps` | `statistics_not_persisted`, `referee_not_persisted`, `timeline_empty` | `referee_not_persisted`, `timeline_empty` |
| `statistics` en input | `null` | posesión 79/21, tiros a puerta 3/1, corners 9/2, xG null |

Personas probadas en builder: `cronista_clasico`, `analista_frio` — ambas reciben bloque `statistics` poblado.

`npm run test:match-summary`: builder ✓ (2 gaps, sin `statistics_not_persisted`). Ollama devolvió `OLLAMA_JSON_SCHEMA_MISMATCH` en 2 intentos (respuesta truncada/incompleta del modelo) — **no bloquea** la validación de stats; el input ya incluye datos para narrar posesión/tiros/corners en `/lab/ia-local`.

**UI lab:** `/lab/ia-local` → sección "Resumen IA de partido" → mismo `partido_id` + persona. El input generado mostrará `statistics` no nulo; la IA puede citar posesión/tiros si el modelo completa JSON válido.

### Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Write en prod (sin staging) | Solo 1 partido FT; metadata merge no toca marcador/scoring |
| xG ausente en muchos fixtures WC | `null` controlado; prompt no exige xG |
| API quota (+1 req/FT) | Solo al pasar a finalizado; skip si ya persistido |
| Ollama JSON flaky en smoke | Independiente de persistencia stats; reintentar en lab |
| Partidos FT previos sin backfill | Usar script dev o esperar próximo sync si aún sin statistics |

---

## Oracle WIP

Cambios AI-LAB-ORACLE-1 guardados en rama local **`ai-lab-oracle-wip`** (commit `ddafd9d`, sin push). `master` limpio.

---

## Siguiente paso

- Backfill masivo jornadas pasadas con el script dev
- Enriquecer resúmenes IA con shots_total / fouls en prompt si se desea
