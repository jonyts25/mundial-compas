# EL PITONISO — PI-1 MOTOR — REPORTE

> Ejecución de **PI-1** según `PITONISO_EXECUTION_PLAN.md`.
> Alcance: motor puro + copy + fixtures. **Sin** PI-2/PI-3/PI-4.
>
> **Resultado:** ✅ Completado. Typecheck limpio. Fixtures manuales pasan.

---

## 1. Objetivos cumplidos

| # | Objetivo | Estado |
|---|----------|--------|
| PI-1.1 | `match-preview.ts` — score, confianza, veredicto | ✅ |
| PI-1.2 | `pitoniso-message.ts` — copy, disclaimers, plantillas | ✅ |
| PI-1.3 | `pitoniso.ts` — barrel | ✅ |
| PI-1.4 | Fixtures manuales + script de verificación | ✅ |
| PI-1.5 | Tests unitarios (runner del proyecto) | ⏭️ No hay Vitest/Jest en el repo |
| PI-1.6 | `npx tsc --noEmit` | ✅ Exit 0 |
| PI-1.7 | Lint archivos tocados | ✅ Sin errores |

---

## 2. Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `src/lib/prediction-engine/match-preview.ts` | Motor rule-based: señales, score 1X2, confianza |
| `src/lib/prediction-engine/pitoniso-message.ts` | Copy de El Pitoniso + disclaimers |
| `src/lib/prediction-engine/pitoniso.ts` | Barrel público (+ alias `computePitonisoVerdict`) |
| `src/lib/prediction-engine/pitoniso-pi1.fixtures.ts` | Escenarios manuales + `verifyPitonisoFixtures()` |
| `scripts/verify-pitoniso-pi1.ts` | Script dev: `npx -y tsx scripts/verify-pitoniso-pi1.ts` |

**No creados / no tocados:** Supabase, páginas, UI, analytics, webhooks, scoring, triggers, `pick-aggregates.ts`, `pick-value.ts`.

---

## 3. Tipos creados

### `match-preview.ts`

| Tipo | Descripción |
|------|-------------|
| `MatchPreviewConfidence` | `"indeciso" \| "leve" \| "bastante" \| "presentimiento"` |
| `MatchPreviewFavorite` | `Outcome` (`local \| empate \| visitante`) |
| `MatchPreviewTeamInput` | Posición tabla, forma, gap al pase |
| `MatchPreviewInput` | Agregados + equipos + flags de fase |
| `MatchPreviewSignals` | Señales normalizadas usadas en el score |
| `MatchPreviewScores` | `local`, `draw`, `visitante` compuestos |
| `MatchPreviewVerdict` | Salida del motor |

### `pitoniso-message.ts`

| Tipo | Descripción |
|------|-------------|
| `PitonisoMessageInput` | Veredicto + nombres + pickValue top + flags UI |
| `PitonisoMessage` | `{ message, confidenceLabel, confidenceEmoji }` |

### Constantes

| Nombre | Valor |
|--------|-------|
| `matchPreviewWeights` | crowd 0.40, table 0.20, form 0.25, context 0.15 |
| `matchPreviewMinSample` | `5` |
| `PITONISO_DISCLAIMER_SHORT` | Texto corto recreativo |
| `PITONISO_DISCLAIMER_LONG` | Texto expandido acordeón |

---

## 4. API implementada

| Función | Módulo | Rol |
|---------|--------|-----|
| `computeMatchPreviewVerdict(input)` | match-preview | Veredicto 1X2 + confianza |
| `buildPitonisoMessage(input)` | pitoniso-message | Copy rule-based |
| `confidenceUiLabel(id)` | pitoniso-message | Etiqueta UI de confianza |
| `confidenceUiEmoji(id)` | pitoniso-message | Emoji badge |
| `favoriteDisplayName(...)` | pitoniso-message | Nombre favorito sin markdown |
| `computePitonisoVerdict` | pitoniso (alias) | Alias de producto |
| `verifyPitonisoFixtures()` | fixtures | Aserciones manuales |
| `runPitonisoFixture(scenario)` | fixtures | Pipeline completo fixture |

---

## 5. Ejemplo real — México vs Polonia (fixture `mexico-polonia-grupo`)

### Entrada

- **120 picks** (distribución ilustrativa; local ~44% 1X2)
- **Mini-tabla:** México 2.º / Polonia 3.º (grupo de 4)
- **Forma:** México 5/6 pts norm → 0.83; Polonia 1/6 → 0.17
- **Fase grupos:** sí (+0.05 contexto local)

### Salida del motor

```json
{
  "favorite": "local",
  "confidence": "presentimiento",
  "margin": 0.261,
  "scores": {
    "local": 0.600,
    "draw": 0.339,
    "visitante": 0.251
  },
  "crowdSampleOk": true,
  "totalPicks": 120,
  "mostPopularScore": { "local": 1, "visitante": 1, "pct": 22 },
  "nonCrowdAgreementCount": 3
}
```

### Copy generado

> El Pitoniso ve señales interesantes: **44%** de la quiniela inclina al local. México va 2.º en el grupo con mejor forma reciente. Fuerte inclinación recreativa hacia **México** — el balón siempre redondo. El marcador más repetido en la quiniela: **1-1** (**22%**). Eso es moda de picks, no un resultado asegurado — ojo ahí.

**Nota:** El plan Apéndice C estimaba ~58% multitud local; el fixture usa conteos concretos que dan **44%** local 1X2. El motor refleja los agregados reales del fixture, no números inventados.

---

## 6. Diez ejemplos de mensajes generados

1. **mexico-polonia-grupo** — Señales claras hacia local, marcador moda 1-1.

2. **partido-parejo** — *"El Pitoniso movió las cartas y sigue en duda…"* + moda 1-1 (34%).

3. **sin-picks** — *"Aún no hay señales suficientes en la quiniela…"*

4. **pocos-picks** — *"Todavía hay pocos pronósticos…"* + tabla; confianza capada a leve.

5. **multitud-vs-forma** — *"La multitud apunta hacia México (58%), pero el torneo cuenta otra historia: Polonia llega con mejor forma."*

6. **ultima-jornada** — *"Última jornada de grupo y el pase en juego…"* + 64% local.

7. **empate-favorito** — Partido indeciso con 40% empate en quiniela.

8. **presentimiento-local** — 75% quiniela local + 1.º en grupo → fuerte inclinación.

9. **eliminatoria** — Mismo núcleo que grupos con flag `isKnockout` (contexto +0.15 al peor posicionado).

10. **debut-visitante** — *"Debut de Polonia en el torneo…"* + señales hacia México.

Regenerar: `npx -y tsx scripts/verify-pitoniso-pi1.ts`

---

## 7. Edge cases detectados

| Caso | Comportamiento |
|------|----------------|
| `total === 0` picks | Crowd 33/33/33; confianza → indeciso; copy pide más señales |
| `total < 5` picks | `crowdSampleOk = false`; confianza máxima **leve** |
| Forma `null` (debut) | `formNorm = 0.5` neutral; copy menciona debut |
| Sin mini-tabla | `tableNorm = 0.5` ambos lados |
| Empate en score | Gana outcome con mayor score; empate compite vía `drawTableBlend` / `drawFormBlend` |
| Solo multitud alineada (margin alto) | `presentimiento` requiere ≥2 señales no-crowd; si no → cap **bastante** |
| Multitud vs forma opuestas | Plantilla específica contrasta ambos bandos |
| Desempate `argmax` | Orden fijo local > empate > visitante en empate de scores (implícito en sort estable por orden de entries) |
| Markdown `**` en copy | Para UI futura: renderizar o strip en PI-3 |

---

## 8. Verificación

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | ✅ Exit 0 |
| ESLint (5 archivos PI-1) | ✅ Sin errores |
| `verifyPitonisoFixtures()` | ✅ 6/6 escenarios |
| Vitest / Jest | ⏭️ No configurado en `package.json` |

---

## 9. Observaciones para PI-2

1. **`fetchPronosticosPartidoAgregados`** debe mapear filas a `PickInput[]` sin PII; el motor ya consume `computePickAggregates(picks, null)`.

2. **`team-competition-form.ts`** debe poblar `MatchPreviewTeamInput`:
   - `tablePosition`, `groupSize`, `formNorm` (0–1), `pointsFromTop2`
   - Flags: `isGroupPhase`, `isKnockout`, `isLastGroupMatch` desde `partido.fase` / `jornada`

3. **`fetchPitonisoStaticContext`** puede llamar fixtures pattern: agregados en cliente, estático en server (decisión del plan).

4. **Normalización forma:** PI-2 debe convertir puntos reales (3/1/0) a `formNorm = formPoints / (3 × min(PJ, 3))` antes de pasar al motor.

5. **Empate de scores:** Si PI-3 necesita desempate explícito documentado, considerar preferir favorito = multitud dominante cuando `margin < 0.03`.

6. **Markdown en mensajes:** `PitonisoCard` (PI-3) debe renderizar `**bold**` o usar helper sin markdown.

7. **Script de verify:** Mantener `scripts/verify-pitoniso-pi1.ts` como smoke test en CI futuro (requiere añadir `tsx` o runner).

8. **No re-exportar fixtures** en barrel `pitoniso.ts` — solo uso dev/test.

---

## 10. Qué NO se implementó (por diseño PI-1)

- ❌ PI-2 Datos (Supabase, server actions)
- ❌ PI-3 UI (`PitonisoCard`, page, analytics)
- ❌ PI-4 Validación prod / PostHog
- ❌ Comparación pick usuario vs Pitoniso
- ❌ Persistencia, LLM, APIs externas

---

*PI-1 · El Pitoniso · Motor + copy · Listo para PI-2.*
