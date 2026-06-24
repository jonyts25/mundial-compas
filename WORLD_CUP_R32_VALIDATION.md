# WORLD_CUP_R32_VALIDATION — Ronda de 32

Validación de la cadena R32 contra reglamento FIFA 2026 en el código actual.

## Cadena de datos

```
partidos (grupos, en_vivo/finalizado)
  → calculateGroupStandingsFromPartidos (tiebreakers FIFA)
  → buildBestThirdPlacesRanking (8/12 terceros)
  → lookupThirdPlaceScenario (Anexo C, 495 keys)
  → WORLD_CUP_R32_FIXTURES (16 cruces fijos)
  → buildKnockoutBracket / buildFullKnockoutTree
  → KnockoutBracketView en /posiciones
```

## Anexo C

| Componente | Archivo | Estado |
|------------|---------|--------|
| 495 combinaciones | `world-cup-third-place-scenarios.ts` | ✅ Cargado |
| Lookup 8 terceros | `lookupThirdPlaceScenario` | ✅ |
| scenarioKey | 8 letras de grupos clasificados, ordenadas | ✅ |
| Placeholder si <8 | `thirdPlaceSlotPlaceholder` | ✅ |

## Mejores terceros

- 12 terceros rankeados con `BEST_THIRD_TIEBREAKER_ORDER`.
- Top 8 → `qualifies: true`.
- Sin H2H entre grupos (correcto FIFA para terceros).

## Cruces R32

- Definición fija: `world-cup-r32-fixtures.ts` (partidos 73–88).
- Calendario sede/fecha: `world-cup-knockout-schedule.ts`.
- México como 1.º Grupo A → **partido 79** vs 3.º vía slot `third_vs_winner` Grupo A.

Test: `fifa-live-scenarios.test.ts` → rival MEX matchNumber 79.

## Provisional vs confirmado

| Flag | Condición |
|------|-----------|
| `isProvisional` | Fase de grupos no completa (`isGroupStageComplete`) |
| `scenarioKey` null | Menos de 8 terceros definidos en ranking |
| Rivales “3.º Grupo X” | Hasta que Annex C asigne equipo concreto |

## Actualización en vivo

1. Marcadores `en_vivo` entran en standings (`calculate-group-standings.ts`).
2. `/posiciones` recalcula en cada RSC refresh.
3. `PosicionesLiveRefresh`: Realtime al `finalizado` + poll 60s si hay live.
4. `LiveScenarioCard`: diff de snapshots en cliente (sessionStorage).

## Validación ejecutada

- `npm run test:core` — incluye `fifa-live-scenarios.test.ts`
- Annex C lookup con 12 grupos simulados → 16 partidos R32
- México mantiene liderato H2H vs Corea con gol en vivo
- Sin mensajes heurísticos en generador

## Riesgos residuales

| Riesgo | Mitigación |
|--------|------------|
| Lag ~60s en UI | sync-live + poll documentado |
| Fair play no distingue terceros | Documentado en tiebreakers |
| Partidos KO en BD vacíos | Calendario FIFA estático + slots provisionales |
