# KNOCKOUT_RULES_COMMS_1_REPORT

Ejecución KNOCKOUT-RULES-COMMS-1 — reglas eliminatoria + comunicación.

## Resumen

| Item | Estado |
|------|--------|
| Regla documentada | ✅ `KNOCKOUT_QUINIELA_RULES.md` |
| Auditoría scoring | ✅ `KNOCKOUT_SCORING_AUDIT.md` — sin cambios a scoring |
| Copy UI quiniela/partido | ✅ `KnockoutQuinielaRulesHint` |
| Copy provisional R32 | ✅ oculto si `groupStageComplete` |
| Whats-new + banner | ✅ versión `2026-06-knockout-rules-v1` |
| Script push dry-run | ✅ `scripts/send-knockout-rules-announcement.mjs` |
| Commit | **No** (por instrucción) |

## Regla de producto

Marcador quiniela = oficial al final (90' o 120' con TE). Penales **no** modifican marcador ni puntos. Solo definen quién avanza.

Implementación de referencia: `src/lib/world-cup/knockout-quiniela-rules.ts`

## Auditoría scoring (conclusión)

- `calcular_puntos_pronostico` sin cambios.
- `marcador_*` viene de API `goals.home/away` — no incluye tanda de penales.
- **Riesgo documentado:** no se mapea aún `score.extratime` explícitamente; fix futuro opcional en `map-fixture-row.ts`.

## Cambios UI

| Ubicación | Cambio |
|-----------|--------|
| `PronosticoRow` | Hint reglas en KO programados pronosticables |
| `TuPronosticoCard` | Mismo hint en `/partidos/[id]` |
| `KnockoutRulesBanner` | Banner quiniela global + grupos |
| `WhatsNewModal` | Ítem «Arranca la fase final» |
| `KnockoutTreeView` | «Cruces definidos» si grupos cerrados; provisional solo si grupos abiertos |
| `KnockoutBracketView` | Sin «provisional» en slots R32 post-grupos |
| `PosicionesContent` | Copy «cruces definidos» |

## Comunicación usuarios

| Canal | Key dedupe |
|-------|------------|
| Whats-new modal | `WHATS_NEW_VERSION` = `2026-06-knockout-rules-v1` |
| Banner quiniela | `KNOCKOUT_RULES_BANNER_KEY` + `KNOCKOUT_RULES_VERSION` |
| Push (opcional) | `metadata.announcement_key` = `2026-06-knockout-rules-v1` |

Banner eliminatoria anterior conserva su propia versión (`KNOCKOUT_QUINIELA_BANNER_VERSION`) para no re-mostrar a quien ya lo cerró.

### Push

```bash
node scripts/send-knockout-rules-announcement.mjs          # dry-run
node scripts/send-knockout-rules-announcement.mjs --send   # envía solo a push activo, dedupe en notificaciones
```

## Tests

| Test | Resultado |
|------|-----------|
| 1-1 + penales → empate quiniela | ✅ |
| 2-2 + penales → empate | ✅ |
| 1-2 TE → visitante | ✅ |
| Dedupe announcement key | ✅ |
| Provisional suffix oculto post-grupos | ✅ |
| `npm run test:core` | ✅ 124 tests |
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ |

## Git status

Ver `git status` al cierre — cambios locales sin commit.
