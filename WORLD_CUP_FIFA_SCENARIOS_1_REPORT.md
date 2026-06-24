# WORLD_CUP_FIFA_SCENARIOS_1 — Reporte de entrega

**Objetivo:** Escenarios en vivo FIFA-accurate para la última jornada de grupos del Mundial 2026, reutilizando el motor existente sin duplicar reglas.

**Fecha:** 2026-05-18  
**Estado:** ✅ Completado

---

## Resumen ejecutivo

Se implementó un generador de escenarios en vivo que **solo emite mensajes derivados del motor FIFA** (`calculateGroupStandingsFromPartidos` → `buildBestThirdPlacesRanking` → `lookupThirdPlaceScenario` → R32). Se eliminó el riesgo de mensajes heurísticos del tipo *"a un gol de quitar el liderato"* mediante validación explícita y diff de snapshots.

La card **"Escenario en vivo"** ya está integrada en `/posiciones` mientras la fase de grupos no esté cerrada.

---

## Fase 1 — Auditoría de desempates FIFA

**Entregable:** [`FIFA_TIEBREAKER_AUDIT.md`](FIFA_TIEBREAKER_AUDIT.md)

| Pregunta | Respuesta (demostrada con motor) |
|----------|----------------------------------|
| ¿México puede perder el liderato ante Corea con un gol en vivo? | **No** en el fixture auditado: empatan a 6 pts pero México gana H2H (`head_to_head_points`). |
| ¿Qué dato lo determina? | Puntos en enfrentamiento directo (MEX 3 vs KOR 0 en mini-liga). |
| ¿Contempla H2H / GD / GF / fair play / sorteo? | Sí en código; fair play y ranking FIFA usan fallback neutro (documentado). |

**Implementación:** `src/lib/standings/tiebreakers.ts` — orden `GROUP_TIEBREAKER_ORDER` y `BEST_THIRD_TIEBREAKER_ORDER`.

---

## Fase 2 — Generador de escenarios reales

**Archivos nuevos:**

| Archivo | Rol |
|---------|-----|
| `src/lib/world-cup/fifa-live-scenarios.ts` | Snapshot serializado, statements, diff, guard anti-heurísticas |
| `src/lib/world-cup/fifa-tiebreaker-explainer.ts` | `explainRankBetweenTeams` para auditoría |
| `src/lib/world-cup/fixtures/world-cup-fifa-scenarios.fixture.ts` | Fixtures México/Corea/Chequia/Sudáfrica |

**Funciones clave:**

- `buildLiveScenarioCardModel(partidos)` — modelo completo para UI
- `buildFifaScenarioStatements(snapshot)` — mensajes permitidos (posiciones + rival Anexo C)
- `detectFifaScenarioChanges(before, after)` — eventos solo por diff de motor
- `assertFifaScenarioMessage(text)` — bloquea patrones heurísticos

**Reutiliza (sin duplicar):** `live-group-scenarios.ts`, `knockout-slots.ts`, `world-cup-third-place-scenarios.ts`, `build-knockout-bracket.ts`.

---

## Fase 3 — Card en `/posiciones`

**Componente:** `src/components/posiciones/LiveScenarioCard.tsx`

Muestra:

- Líder / 2.º / 3.º provisionales por grupo activo
- Mejores terceros clasificables
- Rivales provisionales R32 (Anexo C)
- Cambios desde la última visita (sessionStorage + `detectFifaScenarioChanges`)

**Integración:** `posiciones-queries.ts` → `page.tsx` (visible si `!groupStageComplete`).

---

## Fase 4 — Detector de cambios importantes

Eventos generados por comparación de `LiveSnapshotState`:

| Tipo | Ejemplo |
|------|---------|
| `leader_changed` | ⚠️ X pasa del 1.º al 2.º en el Grupo Y |
| `second_changed` | ⚠️ Sudáfrica pasa del 2.º al 3.º en el Grupo F |
| `third_qualifier_changed` | ⚠️ J4 entra provisionalmente como mejor tercero |
| `provisional_opponent_changed` | ⚠️ México cambia de rival provisional: … |
| `bracket_scenario_changed` | ⚠️ Cambió la combinación FIFA de mejores terceros (Anexo C) |

**No usa heurísticas:** solo diff de `positions`, `qualifyingThirdTeamIds`, `opponents`, `scenarioKey`.

---

## Fase 5 — Ronda de 32

**Entregable:** [`WORLD_CUP_R32_VALIDATION.md`](WORLD_CUP_R32_VALIDATION.md)

Validado:

- 495 combinaciones Anexo C (`world-cup-third-place-scenarios.ts`)
- 8 mejores terceros → `lookupThirdPlaceScenario`
- México 1.º Grupo A → partido **79** (`getProvisionalOpponent`)
- Cruces provisionales vs confirmados (`isProvisional`, `scenarioKey`)
- Refresh en vivo: Realtime + poll 60s (`PosicionesLiveRefresh`)

---

## Fase 6 — Tests

**Archivo:** `src/lib/world-cup/fifa-live-scenarios.test.ts` (8 tests)

| Caso | Qué valida |
|------|------------|
| México vs Corea H2H | México 1.º tras gol coreano en vivo; criterio `head_to_head_points` |
| Sin cambio de liderato | Diff no emite `leader_changed` para MEX |
| Card + rival R32 | Líder MEX, 2.º KOR, rival match 79 |
| Anti-heurísticas | Rechaza "a un gol" y "Si cae un gol, México baja" |
| Cambio rival | Detecta `provisional_opponent_changed` |
| Chequia / Sudáfrica | RSA 3.º, CZE 4.º Grupo A; Sudáfrica altera Anexo C en fixture F |
| Anexo C lookup | 12 grupos → 16 partidos R32 |

**Fixtures:** `buildMexicoKoreaHeadToHeadFixtures`, `buildSouthAfricaThirdDropBefore/After`.

---

## Validaciones ejecutadas

```
npm run test:core   → 98/98 ✅
npm run typecheck   → ✅
npm run build       → ✅
```

---

## Archivos tocados / creados

| Acción | Archivo |
|--------|---------|
| Nuevo | `FIFA_TIEBREAKER_AUDIT.md` |
| Nuevo | `WORLD_CUP_R32_VALIDATION.md` |
| Nuevo | `WORLD_CUP_FIFA_SCENARIOS_1_REPORT.md` |
| Nuevo | `src/lib/world-cup/fifa-live-scenarios.ts` |
| Nuevo | `src/lib/world-cup/fifa-tiebreaker-explainer.ts` |
| Nuevo | `src/lib/world-cup/fifa-live-scenarios.test.ts` |
| Nuevo | `src/lib/world-cup/fixtures/world-cup-fifa-scenarios.fixture.ts` |
| Nuevo | `src/components/posiciones/LiveScenarioCard.tsx` |
| Modificado | `src/lib/standings/posiciones-queries.ts` |
| Modificado | `src/app/(app)/posiciones/page.tsx` |

**No tocado (según restricciones):** scoring, Pitoniso, pronósticos, migrations.

---

## Limitaciones conocidas

1. **Fair play / ranking FIFA:** empate neutro hasta tener tarjetas agregadas por equipo.
2. **Empates a 3+ equipos:** subconjunto mínimo FIFA no modelado por separado (caso raro en grupos de 4).
3. **Partidos `programado`:** no entran en standings; solo `finalizado` y `en_vivo`.
4. **Diff en cliente:** primera visita no tiene snapshot previo; mensajes de "sin cambios" aparecen a partir de la segunda carga en la sesión.

---

## Respuesta directa — México vs Corea

> *"Si Corea marca un gol, ¿México baja al segundo lugar?"*

**No**, con el estado modelado en `buildMexicoKoreaHeadToHeadFixtures()`. Corea puede igualar a 6 puntos, pero México conserva el 1.º por **enfrentamiento directo** (victoria 1-0). El motor y la card reflejan eso; no se muestra mensaje de descenso porque `detectFifaScenarioChanges` no detecta cambio de posición para MEX.

---

## Próximos pasos opcionales (fuera de scope)

- Agregar fair play real cuando existan tarjetas por equipo en DB.
- Pasar snapshot previo desde servidor (cookie/Redis) para diff sin depender de sessionStorage.
- Expandir `focusTeamIds` más allá de MEX según preferencia del usuario.
