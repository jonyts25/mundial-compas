# VAR-EVENTS-1 — Reporte de implementación

**Fecha:** 2026-05-18  
**Alcance:** Mapeo y persistencia de eventos VAR / penal fallado / gol anulado. Sin cambios en scoring, `savePronostico`, migrations ni Pitoniso.

---

## Cambios realizados

### Fase 1 — Missed Penalty (P0)

- `src/lib/api-football/match-events.ts`: `Goal` + `Missed Penalty` → `tipo: penal_fallado` (nunca `gol`).
- `src/lib/api-football/goal-event-detail.ts`: helpers `isMissedPenaltyFromDetail`, `isVarGoalCancelledDetail`.
- `src/lib/api-football/fetch-events.ts`: `findLatestGoalForScore` excluye missed penalties.

### Fase 2 — Persistir eventos Var

- API `type: Var` → `eventos_clave` con `tipo: var`, conservando `detail`, minuto, jugador, equipo y `comments` si vienen.
- `MomentoClaveTipo` extendido en TypeScript (metadata JSON, sin migration).

### Fase 3 — Goles anulados / marcador baja

- `goal-notify-state.ts`: `scoreDecreased`, `detectScoreDecreaseSide`.
- `goal-cancel-notify-state.ts`: dedup `metadata.notified_cancelled_goals`.
- `sync-live-scores-api-sports.ts`: al bajar marcador en vivo, asocia Var `Goal cancelled` reciente, añade `gol_anulado` a timeline y notifica.
- Actualiza `gol_notify_score` al nuevo marcador (sin tocar puntos de quiniela).

### Fase 4 — Push / chat

| Evento | Chat | Push |
|--------|------|------|
| `gol_anulado` | ✅ | ✅ (`gol_anulado`) |
| `penal_fallado` | ✅ | ✅ (`penal_fallado`) |
| `var` (timeline) | — | — (solo persistencia) |

Handlers nuevos: `on-goal-cancelled.ts`, `on-penal-fallado.ts`.

### Fase 5 — Match Summary

- Timeline: `penal_fallado`, `var`, `gol_anulado`.
- Prompt: VAR y penal fallado solo si aparecen en timeline.

### Fase 6 — Script QA

- `scripts/inspect-var-events.mjs` — dry-run por defecto, lista Var / Missed Penalty / Goal cancelled.

### UI mínima

- `PartidoEventosClave.tsx`: iconos 🎯 / VAR / ❌ para nuevos tipos (sin rediseño).

---

## Eventos soportados

| API type:detail | `eventos_clave.tipo` | Timeline summary |
|-----------------|----------------------|------------------|
| Goal:Normal Goal | `gol` | `gol` |
| Goal:Penalty | `gol` | `penalty_goal` |
| Goal:Own Goal | `gol` | `own_goal` |
| Goal:Missed Penalty | `penal_fallado` | `penal_fallado` |
| Var:* | `var` | `var` |
| (sync score ↓) | `gol_anulado` | `gol_anulado` |
| Card:Red Card | `tarjeta_roja` | `tarjeta_roja` |

---

## Ejemplos reales (WC 2026, API)

| Partido | Fixture | Evento |
|---------|---------|--------|
| Argentina vs Austria | 1489399 | Messi min 9 — Missed Penalty |
| Bélgica vs Irán | 1489395 | Taremi min 27 — Var Goal cancelled |
| Francia vs Senegal | — | Mbappé min 60 — Penalty confirmed / cancelled |

Ejecutar `node scripts/inspect-var-events.mjs --fixture-id=1489395` para ver detalle en dry-run.

---

## Riesgos

1. **Goles anulados históricos:** partidos ya finalizados no se re-sincronizan automáticamente; hace falta backfill opcional futuro.
2. **Asociación VAR ↔ bajada de marcador:** heurística por equipo; si API no trae Var a tiempo, se crea `gol_anulado` genérico.
3. **Push Var penalty confirmed/cancelled:** pendiente (solo timeline); chat no spamea cada Var menor.
4. **Doble notificación:** mitigado con `notified_cancelled_goals`, `notified_penal_fallados` y `tryClaimLiveEvent`.

---

## Pendiente

- Backfill masivo de `eventos_clave` para 46 FT ya jugados.
- Push opcional para `Var: Penalty confirmed/cancelled`.
- Chat narrativo para eventos Var menores (Card upgrade, etc.) — solo timeline hoy.

---

## Validación

```bash
npm run test:core
npm run typecheck
npm run build
node scripts/inspect-var-events.mjs --limit=5
```
