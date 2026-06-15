# Sports Core (`src/lib/sports-core`)

Núcleo reutilizable de lógica deportiva / quiniela. Plan maestro: `SPORTS_CORE_MASTERPLAN.md`.

## SC-2 — Estado actual

Tipos en `*/types.ts`. Ver mapping abajo.

## SC-3 — Preview (motor puro)

```
predictions/preview/
├── match-preview.ts   # computeMatchPreviewVerdict
└── signals.ts         # contradicción crowd/table/form
```

Rutas legacy (re-export `@deprecated`):

- `src/lib/prediction-engine/match-preview.ts`
- Funciones en `src/lib/partidos/pitoniso-signals.ts` (tipos producto quedan ahí)

TODO(SC-4): `pick-aggregates` → `sports-core/predictions/aggregates.ts`
TODO(SC-6): renombrar local/visitante y Pitoniso* → nombres genéricos

## Reglas de imports

- ✅ Otros archivos dentro de `sports-core/`
- ❌ React, Next.js, Supabase, `@/components`, `@/app`

## Mapping Mundial Compas → Sports Core (referencia SC-6)

| Producción hoy | Sports Core |
|----------------|-------------|
| `partidos.estatus` | `MatchStatus` (ver `MUNDIAL_ESTATUS_TO_MATCH_STATUS`) |
| `equipo_local_codigo` / `_nombre` | `Match.home` (`Team`) |
| `equipo_visitante_*` | `Match.away` |
| `fase`, `grupo`, `jornada` | `phase`, `groupKey`, `round` |
| `fecha_kickoff` | `kickoffAt` |
| `pronosticos` + `liga_id` | `Prediction` |
| `goles_local` / `goles_visitante` | `PickInput.homeScore` / `awayScore` |
| `Outcome` local/empate/visitante | `Outcome` home/draw/away |
| `StandingTeamRow` | `StandingRow` |
| `UserProfile` / `ProfileMetrics.N,P` | `PlayerProfile` / `scoredPredictions`, `totalPredictions` |
| `MatchPreviewInput.local/visitante` | `home` / `away` |

## Tipos legacy (@deprecated)

Conviven en `predictions/types.ts` y `profiles/types.ts` para documentar compatibilidad durante la migración. Los adapters traducirán en SC-6; el código existente **no** se modifica en SC-2.

## Próximo paso

**SC-3** — Mover `match-preview.ts` y señales a `sports-core/predictions/preview/` con re-exports en rutas antiguas.
