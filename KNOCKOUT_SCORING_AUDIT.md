# KNOCKOUT_SCORING_AUDIT

Auditoría P0 — marcador eliminatoria vs scoring quiniela.

## Cadena de scoring

```
partidos.marcador_local / marcador_visitante
  → trg_partido_finalizado_puntos
  → recalcular_puntos_partido
  → calcular_puntos_pronostico (3 exacto, 1 tendencia, 0)
  → pronosticos.puntos
```

**No se modificó** scoring en este P0.

## sync-live / ingest API-Sports

| Componente | Comportamiento |
|------------|----------------|
| `mapFixtureToPartidoRow` | `marcador_*` ← `item.goals.home/away` |
| `sync-live-scores-api-sports` | Upsert vía `mapFixtureToPartidoRow` |
| Webhook `on-status` / `on-goal` | `extractScoreFromPayload` → `fixture.goals` |
| `metadata` penales | `parsePenaltyScoresFromMetadata` — **solo display** / push |

### API-Sports (contrato esperado)

- `goals.home/away`: marcador **actual** incluyendo TE, **excluyendo** tanda de penales.
- `score.extratime`, `score.fulltime`, `score.penalty`: no mapeados hoy en `types-fixtures.ts`.

## Confirmaciones

| Pregunta | Resultado |
|----------|-----------|
| ¿Marcador guardado incluye penales? | **No** (usa `goals`, no `score.penalty`) |
| ¿Scoring usa marcador sin penales? | **Sí** — compara `marcador_*` tal cual |
| ¿Ganador por penales avanza bracket? | **Sí** — `getMatchSideWinner` en partido `finalizado`; empate 90'/TE no asigna ganador hasta resultado en BD |

## Riesgos residuales

| Riesgo | Severidad | Mitigación propuesta |
|--------|-----------|----------------------|
| API devuelve `goals` distinto a TE en edge cases | Media | Helper `resolveQuinielaMarcadorFromApiGoals` (prefiere `score.extratime`) — **no aplicado** en sync aún |
| Tipos TS sin `score` object | Baja | Extender `ApiFootballFixtureItem` y mapeo cuando confirmemos payload WC |
| Empate post-TE sin penales en BD | Baja | Bracket no avanza hasta marcador decisivo; coherente con reglas FIFA |

## Veredicto

**No se detectó que hoy el scoring cuente penales dentro del marcador.** El flujo actual es compatible con la regla de producto documentada en `KNOCKOUT_QUINIELA_RULES.md`.

Fix mínimo recomendado (futuro, no P0): en `map-fixture-row.ts`, si existe `score.extratime`, persistir esos valores en `marcador_*` al finalizar (AET/PEN).
