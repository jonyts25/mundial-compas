# SPORTS CORE — SC-2 TIPOS GENÉRICOS — REPORTE

> Ejecución de **SC-2** según `SPORTS_CORE_MASTERPLAN.md` §4 y §6.
>
> **Resultado:** ✅ Completado. Solo tipos nuevos; cero cambios de imports en la app.

---

## 1. Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `src/lib/sports-core/matches/types.ts` | `Team`, `Competition`, `Match`, `MatchStatus`, type guards, mapping Mundial |
| `src/lib/sports-core/standings/types.ts` | `StandingRow`, `StandingGroup`, `StandingsSnapshot` |
| `src/lib/sports-core/predictions/types.ts` | `Outcome`, `Prediction`, `PickInput`, preview, agregados, legacy aliases |
| `src/lib/sports-core/profiles/types.ts` | `ProfileMetrics`, `PlayerProfile`, badges |
| `src/lib/sports-core/index.ts` | Barrel export |
| `src/lib/sports-core/README.md` | Reglas, mapping, estado SC-2 |
| `SPORTS_CORE_SC2_REPORT.md` | Este reporte |

**No modificados:** ningún archivo bajo `src/lib/insights`, `prediction-engine`, `partidos`, `app/`, UI, Supabase, Pitoniso.

---

## 2. Contratos definidos

### matches

| Tipo | Descripción |
|------|-------------|
| `Team` | Equipo canónico con `id`, `name`, opcionales crest/externalIds |
| `Competition` | Torneo con `slug`, `format`, `timezone` |
| `Match` | Partido con `home`/`away`, `kickoffAt`, `status`, `score?` |
| `MatchStatus` | `scheduled` \| `live` \| `halftime` \| `finished` \| `postponed` \| `cancelled` |

### standings

| Tipo | Descripción |
|------|-------------|
| `StandingRow` | Fila de tabla (equivalente futuro a `StandingTeamRow`) |
| `StandingGroup` | Grupo + filas |
| `StandingsSnapshot` | Snapshot con `competitionId`, `fetchedAt` |

### predictions

| Tipo | Descripción |
|------|-------------|
| `Outcome` | `home` \| `draw` \| `away` (canónico) |
| `LegacyOutcome` | `local` \| `empate` \| `visitante` (@deprecated) |
| `Prediction` | Pronóstico con `poolId`, `userId`, `payload` |
| `PickInput` | Agregados anónimos `homeScore` / `awayScore` |
| `LegacyPickInput` | `golesLocal` / `golesVisitante` (@deprecated) |
| `PickAggregates` | Distribución (shape canónico home/away) |
| `MatchPreviewInput` | Motor preview con `home`/`away` team input |
| `MatchPreviewVerdict` | Veredicto 1X2 + confianza |

### profiles

| Tipo | Descripción |
|------|-------------|
| `ProfileMetrics` | Métricas con nombres descriptivos (`scoredPredictions`, …) |
| `PlayerProfile` | Perfil rule-based (sustituto futuro de `UserProfile`) |
| `LegacyProfileMetrics` | `N`, `P`, `exactos`, … (@deprecated) |

### Type guards (runtime mínimo en carpeta nueva)

| Función | Condición |
|---------|-----------|
| `isScheduledMatch` | `scheduled` o `postponed` |
| `isLiveMatch` | `live` o `halftime` |
| `isFinishedMatch` | `finished` o `cancelled` |

Constante de mapping: `MUNDIAL_ESTATUS_TO_MATCH_STATUS`.

---

## 3. Decisiones de naming

| Decisión | Razón |
|----------|--------|
| `home` / `away` / `draw` en lugar de `local` / `visitante` / `empate` | Nomenclatura cross-liga e inglés técnico en core; adapters traducen español producto |
| `PlayerProfile` vs `UserProfile` | “Player” = participante de quiniela; auth sigue en capa app |
| `poolId` vs `ligaId` | Concepto genérico pool/grupo/global |
| Tipos `Legacy*` + `@deprecated` | SC-2 sin romper código existente; migración explícita en SC-4/SC-6 |
| `ProfileMetrics.scoredPredictions` vs `N` | Legibilidad en core; adapter mapea campos cortos actuales |
| Guards en `matches/types.ts` | Cohesión con `MatchStatus`; funciones puras permitidas en SC-2 |

---

## 4. Confirmación cero runtime changes

| Check | Resultado |
|-------|-----------|
| Imports existentes sin cambios | ✅ Ningún archivo fuera de `sports-core/` importa la carpeta nueva |
| Lógica movida | ❌ Ninguna (SC-3+) |
| UI / Pitoniso / quiniela | ✅ Intactos |
| Scoring, triggers, webhooks, RLS, BD | ✅ No tocados |
| `npx tsc --noEmit` | ✅ Exit 0 |
| ESLint `src/lib/sports-core/**` | ✅ Sin errores |

Los type guards y `MUNDIAL_ESTATUS_TO_MATCH_STATUS` existen solo en archivos nuevos no referenciados por la app → **comportamiento en producción idéntico**.

---

## 5. Mapping documentado

Ver tabla completa en `src/lib/sports-core/README.md` § Mapping Mundial Compas → Sports Core.

Ejemplos clave:

```
programado  → scheduled
en_vivo     → live
goles_local → PickInput.homeScore
local (Outcome) → home
```

---

## 6. Próximos pasos — SC-3

1. Mover `match-preview.ts` → `sports-core/predictions/preview/match-preview.ts`
2. Mover `pitoniso-signals.ts` → `sports-core/predictions/preview/signals.ts`
3. Re-export desde rutas antiguas con comentario `@deprecated`
4. Adaptar motor a tipos canónicos **o** traducir en thin wrapper hasta SC-6
5. Verificar fixtures `verify-pitoniso-pi1.ts` sin cambio visible de producto

**Prompt sugerido:** *“Implementa SC-3 según SPORTS_CORE_MASTERPLAN.md y SPORTS_CORE_SC2_REPORT.md”*

---

*SC-2 · Tipos genéricos Sports Core · Jun 2026*
