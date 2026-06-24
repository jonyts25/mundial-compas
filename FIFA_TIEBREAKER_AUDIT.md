# FIFA_TIEBREAKER_AUDIT — Mundial 2026

Auditoría del motor de desempates usado en tablas y escenarios en vivo.

## Orden exacto de desempates

### Fase de grupos (`GROUP_TIEBREAKER_ORDER`)

Implementado en `src/lib/standings/tiebreakers.ts`:

| # | Criterio | Clave |
|---|----------|-------|
| 1 | Puntos | `points` |
| 2 | Puntos en enfrentamiento directo (mini-liga entre empatados) | `head_to_head_points` |
| 3 | Diferencia de goles en enfrentamiento directo | `head_to_head_goal_diff` |
| 4 | Goles a favor en enfrentamiento directo | `head_to_head_goals_for` |
| 5 | Diferencia de goles en todo el grupo | `goal_diff_all` |
| 6 | Goles a favor en todo el grupo | `goals_for_all` |
| 7 | Fair play | `fair_play` |
| 8 | Ranking FIFA / fallback | `fifa_ranking_fallback` |

### Mejores terceros (`BEST_THIRD_TIEBREAKER_ORDER`)

Sin enfrentamiento directo entre grupos:

1. Puntos  
2. Diferencia de goles  
3. Goles a favor  
4. Fair play  
5. Fallback alfabético  

## Dónde se implementa

| Uso | Archivo |
|-----|---------|
| Orden en grupo | `tiebreakers.ts` → `sortTeamsByTiebreakers` |
| Tabla desde partidos | `calculate-group-standings.ts` |
| Mejores terceros | `best-third-places.ts` |
| Escenarios en vivo | `live-group-scenarios.ts` → mismo `calculateGroupStandingsFromPartidos` |
| Explicación audit | `fifa-tiebreaker-explainer.ts` |

## Datos NO disponibles hoy

| Criterio FIFA | Estado en app |
|---------------|---------------|
| Enfrentamiento directo | ✅ Con partidos del grupo |
| Diferencia / GF grupo | ✅ |
| Fair play (tarjetas) | ⚠️ Sin agregado por equipo → empate neutro (0) |
| Sorteo / ranking FIFA | ⚠️ Fallback: `localeCompare` por `teamKey` |

Documentado en cabecera de `tiebreakers.ts`.

## ¿México puede perder el liderato ante Corea?

### Pregunta concreta

> “Si Corea marca un gol, ¿México baja al segundo lugar?”

### Respuesta (demostrada con el motor)

**No necesariamente — y en el escenario auditado, no baja.**

Fixture: `buildMexicoKoreaHeadToHeadFixtures()` en  
`src/lib/world-cup/fixtures/world-cup-fifa-scenarios.fixture.ts`

| Partido | Resultado |
|---------|-----------|
| México vs Corea | 1-0 (FT) |
| México vs Sudáfrica | 2-0 (FT) |
| Corea vs Chequia | 2-0 (FT) |
| Sudáfrica vs Chequia | 1-0 (FT) |
| Corea vs Sudáfrica | 1-0 (**en_vivo**) |

Tras el gol de Corea en vivo:

- México y Corea **empatan a 6 puntos**.
- Enfrentamiento directo: México 1-0 Corea → **3 pts vs 0 pts** en mini-liga.
- Criterio decisivo: `head_to_head_points`.
- **México sigue 1.º, Corea 2.º.**

Test: `fifa-live-scenarios.test.ts` → `"México mantiene 1.º tras gol de Corea en vivo"`.

### Qué dato determina el liderato

No basta un gol de Corea si al empatar a puntos el **enfrentamiento directo** favorece a México. El motor no usa heurísticas de “un gol = bajar de puesto”.

### Cuándo sí podría cambiar el 1.º

Solo si el motor FIFA lo confirma, por ejemplo:

- Corea supera a México en **puntos totales**, o  
- Empatan a puntos y Corea gana en **H2H** (p. ej. si el partido directo hubiera sido empate o victoria coreana).

## Implicación para mensajes

**Prohibido** en escenarios FIFA (`fifa-live-scenarios.ts`):

- “a un gol de…”
- “si cae un gol…”
- “le quita el liderato” (sin diff del motor)

**Permitido:**

- Posición actual del snapshot: “México terminaría como líder del Grupo A.”
- Cambios solo vía `detectFifaScenarioChanges(before, after)`.

## Limitaciones conocidas

1. **Empates a 3+ equipos:** `sortTeamsByTiebreakers` agrupa empatados por puntos del array completo; FIFA reduce a subconjunto mínimo. Caso raro en grupos de 4.
2. **Fair play:** no distingue equipos hoy.
3. **Partidos no iniciados en jornada 3:** no modelados aparte; snapshot usa todos los marcadores disponibles.
