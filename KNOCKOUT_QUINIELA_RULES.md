# KNOCKOUT_QUINIELA_RULES

Reglas de producto para pronósticos en fase eliminatoria — Mundial Compas.

## Marcador oficial de quiniela

El pronóstico se compara contra el **marcador oficial al finalizar el partido** (`marcador_local` / `marcador_visitante` en BD):

| Situación | Marcador quiniela |
|-----------|-------------------|
| Termina en 90' | Marcador al pitazo final del segundo tiempo |
| Hay tiempo extra | Marcador tras **120'** (incluye goles en TE) |
| Hay penales | **No** se suman goles de la tanda — queda el empate (o el resultado tras TE) |

## Ejemplos

### 1-1 y gana local en penales

- Resultado real: 1-1 (90' o 120'), local gana 4-3 en penales.
- **Quiniela:** 1-1.
- Pronóstico 1-1 → **3 pts** (exacto).
- Pronóstico 1-0 o 0-1 → **1 pt** (tendencia empate).
- Pronóstico 2-1 → **0 pts**.

### 2-2 y gana visitante en penales

- **Quiniela:** 2-2.
- Pronóstico 2-2 → 3 pts.

### 1-2 en tiempo extra

- 1-1 en 90', visitante anota en TE → **1-2**.
- Pronóstico 1-2 → 3 pts; 0-1 o 1-1 (solo empate 90') → 1 pt si acierta tendencia visitante / empate según regla 3/1/0.

## Quiniela vs clasificado

| Concepto | Qué cuenta |
|----------|------------|
| **Puntos quiniela** | Marcador reglamentario + TE, **sin penales** |
| **Quién avanza** | Ganador del partido (incluye penales) — solo bracket / posiciones, no scoring |

Por ahora **no** se pronostica “quién clasifica”; solo marcador.

## Penales en UI

- El marcador en pantalla puede mostrar línea de penales (`metadata` / reloj) para contexto.
- Esa línea **no** altera `marcador_local` / `marcador_visitante` usados en scoring.

## Futuro

Quinielas Compas podría agregar una modalidad separada **“clasifica”** (1X2 / quién avanza). Sería independiente del marcador actual.

## Implementación

- Scoring: `calcular_puntos_pronostico` (SQL, sin cambios P0).
- Copy UI: `src/lib/world-cup/knockout-quiniela-rules.ts`
- Hint: `KnockoutQuinielaRulesHint` en quiniela y detalle de partido.
