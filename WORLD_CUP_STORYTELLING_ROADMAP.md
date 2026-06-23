# World Cup Storytelling Roadmap

**WORLD-CUP-LIVE-STORYTELLING-DESIGN-1** — 2026-06-23

---

## Resumen de entregables diseño

| Artefacto | Tipo |
|-----------|------|
| `MATCH_STORY_DATA_AUDIT.md` | Auditoría datos |
| `AI_MATCH_SUMMARY_PLAN.md` | Plan IA + schemas |
| `src/lib/ai/sports-narrator-personas.ts` | Voces ficticias |
| `SPORTS_NARRATOR_PERSONAS_REPORT.md` | Reporte personas |
| `WORLD_CUP_LIVE_SCENARIOS_PLAN.md` | Plan escenarios live |
| `src/lib/world-cup/live-group-scenarios.ts` | Helpers puros |
| `src/lib/world-cup/knockout-slots.ts` | Helpers R32 |
| `src/lib/world-cup/live-group-scenarios.test.ts` | Tests |

---

## 1. Implementar esta semana

| # | Item | Esfuerzo | Valor |
|---|------|----------|-------|
| 1 | **Builder `match_summary_input`** desde DB (sin LLM) | M | Base resúmenes |
| 2 | **Lab API** `/api/dev/ai/match-summary` + persona + Ollama | M | Validar tono |
| 3 | **Persistir `metadata.statistics` al FT** (1 API call) | S | Crónicas con posesión |
| 4 | **Ampliar `eventos_clave`** con subst/amarilla (opcional) | S | Timeline más rica |
| 5 | **Ejecutar `analytics:snapshot` diario** | XS | Ya hecho |
| 6 | **Tests core** con nuevos helpers | XS | Hecho en diseño |

---

## 2. Dejar para octavos (post fase grupos)

| Item | Motivo |
|------|--------|
| UI pública "última jornada viva" | Necesita UX + debounce; máximo valor jornada 3 |
| Resumen jornada automático cron | Requiere builder + cache |
| Impacto quiniela en copy | Agregados listos; falta pipeline |
| Bracket interactivo live | `build-knockout-bracket` ya resuelve R32 |
| Gol anulado / VAR persistido | API irregular — spike primero |

---

## 3. Dejar para LigaPro

Todo el paquete IA crónica amateur (`LIGAPRO_CONTENT_VISION.md`):

- Resumen jornada liga local
- Goleadores/tarjetas capturados por admin
- Identidad narrativa configurable
- **No mezclar** con Mundial Compas prod

---

## 4. Qué NO hacer todavía

- ❌ Features públicas en Home/Partido/Posiciones
- ❌ Cambiar Pitoniso v2.1
- ❌ Tocar `savePronostico` / scoring / migrations
- ❌ Poll statistics en vivo (costo API)
- ❌ Odds en UI
- ❌ Imitar comentaristas en resúmenes IA
- ❌ PII en prompts (nombres usuarios, picks individuales)
- ❌ Reemplazar `comentaristas.ts` en chat live

---

## Gaps principales

| Gap | Severidad | Acción |
|-----|-----------|--------|
| Statistics no en DB | Alta | 1× al FT |
| VAR / gol anulado no modelado | Media | Spike event types |
| Injuries API vacía | Baja | Ignorar |
| UI live scenarios | Media | Post diseño |
| Validador JSON output IA | Media | Zod en lab |

---

## Siguiente paso recomendado

**Spike `match-summary-builder.ts`** (puro): dado `partido_id`, leer DB y emitir `MatchSummaryInput` válido. Probar en admin IA lab con `cronista_clasico` y un partido FT real (France vs Iraq del spike). Si el JSON input es sólido, el 80% del riesgo está controlado antes de cualquier UI.

---

## Validación

```bash
npm run test:core
npm run typecheck
npm run build
```
