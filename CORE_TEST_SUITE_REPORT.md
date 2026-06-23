# CORE Test Suite Report — CORE-TEST-SUITE-1

**Fecha:** 2026-06-23  
**Objetivo:** Suite automatizada para el núcleo reutilizable de Mundial Compas, sin dependencias de Supabase ni APIs externas.

---

## Framework

| Item | Valor |
|------|-------|
| Runner | **Vitest** `^3.2.4` |
| Config | `vitest.config.ts` — entorno `node`, alias `@` → `./src` |
| Patrón | `src/**/*.test.ts` |

### Scripts (`package.json`)

```bash
npm run test          # vitest run (toda la suite en src/)
npm run test:watch    # vitest en modo watch
npm run test:core     # vitest run src/lib
```

---

## Archivos testeados

| Módulo fuente | Archivo de test | Tests |
|---------------|-----------------|------:|
| `src/lib/insights/pick-aggregates.ts` | `pick-aggregates.test.ts` | 6 |
| `src/lib/prediction-engine/pick-value.ts` | `pick-value.test.ts` | 6 |
| `src/lib/sports-core/predictions/preview/match-preview.ts` | `match-preview.test.ts` | 8 |
| `src/lib/standings/calculate-group-standings.ts` | `standings.test.ts` | (grupos) |
| `src/lib/standings/tiebreakers.ts` | `standings.test.ts` | (desempate) |
| `src/lib/standings/best-third-places.ts` | `standings.test.ts` | (mejores terceros) |
| `src/lib/insights/profiles.ts` | `profiles.test.ts` | 7 |

**Total:** 5 archivos, **30 tests**, todos pasando.

### Cobertura funcional

1. **Pick aggregates** — distribución marcadores/1X2, más popular, sin picks, empate.
2. **Pick value** — popular, balanceado, diferencial, raro; riesgo bajo/medio/alto/extremo; muestra insuficiente.
3. **Pitoniso / match-preview** — ranking signal, drawSignal, contradictions, predictedOutcome (local/empate/visitante/unknown), confidence; fixtures PI-1/PI-4/v2.1 vía `verifyPitonisoFixtures` + `ALL_PITONISO_FIXTURES`.
4. **Standings** — puntos, diferencia de goles, desempate por goal diff, mejores terceros (8 de 12).
5. **Perfiles** — Novato, Francotirador, Brújula, Diferencial, Amante del Empate, En Racha, Equilibrado.

### Scripts verify-* conservados

- `scripts/verify-pitoniso-pi1.ts` — smoke manual / CI ad-hoc.
- `scripts/verify-pitoniso-pi4-qa.ts` — QA narrativo.

Los tests de `match-preview.test.ts` reutilizan las mismas fixtures (`pitoniso-pi1.fixtures.ts`) pero no reemplazan los scripts (útiles para imprimir mensajes de ejemplo).

---

## Qué quedó sin test

| Área | Motivo |
|------|--------|
| `profile-data.ts` (fetch Supabase) | Integración BD; fuera de alcance unitario puro |
| `team-competition-form.ts`, `fifa-ranking-signal.ts` | Dependen de datos externos / queries |
| Scoring / triggers / webhooks | Restricción explícita: no tocar producción |
| Sync live, push, chat moderation | Orquestación + I/O |
| UI components (PitonisoCard, etc.) | Sin cambios de UI solicitados |
| Head-to-head tiebreakers con partidos reales | Solo se probó desempate simple por goal diff |
| Fair play / ranking FIFA en desempate | Fallback documentado; sin datos en BD |

---

## Riesgos

1. **Umbrales frágiles** — `pick-value` y `profiles` usan constantes (`pickValueThresholds`, `profileThresholds`); si cambian, hay que actualizar tests (diseño intencional).
2. **Prioridad de perfiles** — `en_racha` compite con `francotirador`; el test documenta el caso sin conflicto.
3. **Fixtures Pitoniso estáticos** — no validan regresión contra partidos reales de BD (eso sigue en `evaluate-pitoniso-v2.ts` / v3 simulation).
4. **Sin cobertura %** — Vitest no configuró `coverage` aún; solo presencia funcional.

---

## Validación ejecutada

```text
npm run test:core   ✅ 30/30
npm run typecheck   ✅
npm run build       ✅
```

---

## Cómo correr

```bash
# Suite núcleo (recomendado en CI pre-deploy)
npm run test:core

# Desarrollo
npm run test:watch

# Validación completa pre-Mundial
npm run test:core && npm run typecheck && npm run build
```
