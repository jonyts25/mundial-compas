# SPRINT 1.5 — FASE 1.5-A — PICK VALUE ENGINE — REPORTE

> Ejecución de **Sprint 1.5 · Fase 1.5-A** según `PICK_VALUE_EXECUTION_PLAN.md` (aprobado).
> Alcance: solo el checklist (pasos 1–7). Surface A únicamente.
>
> **Resultado:** ✅ Completado. Typecheck limpio. Cero errores/warnings de lint introducidos.

---

## 1. Checklist cumplido

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Exportar `outcomeOf` en `pick-aggregates.ts` | ✅ |
| 2 | Crear `src/lib/prediction-engine/pick-value.ts` | ✅ |
| 3 | Integrar `computePickValue` en `PronosticosTodosPanel` | ✅ |
| 4 | Añadir evento `pick_value_shown` a `events.ts` | ✅ |
| 5 | Disparar `pick_value_shown` en superficie A | ✅ |
| 6 | Typecheck + lint en archivos tocados | ✅ |
| 7 | Generar este reporte | ✅ |

**Restricciones respetadas:** TypeScript puro · solo lectura · reversible · sin perfiles · sin pre-lock · sin rutas nuevas · sin tablas/migraciones/vistas · sin tocar scoring/triggers/webhooks/LigaPro · sin LLM · sin APIs externas · sin modificar Fase C.

---

## 2. Archivos modificados / creados

### Creados (2)

| Archivo | Propósito |
|---------|-----------|
| `src/lib/prediction-engine/pick-value.ts` | Núcleo puro del Pick Value Engine: tipos, thresholds, `computePickValue`, `buildPickValueMessage` y helpers de UI. |
| `SPRINT1_5_PICK_VALUE_REPORT.md` | Este reporte. |

### Modificados (3)

| Archivo | Cambio |
|---------|--------|
| `src/lib/insights/pick-aggregates.ts` | `export` de `outcomeOf` (antes privada). **Sin cambio de comportamiento.** |
| `src/lib/analytics/events.ts` | + evento `pick_value_shown` en `AnalyticsEventMap`. |
| `src/components/quiniela/PronosticosTodosPanel.tsx` | `useMemo` de `pickValue` sobre el `aggregates` ya existente (Fase B), `useEffect` que dispara `pick_value_shown` una vez, y bloque de UI (badge + mensaje + disclaimer). **Sin nuevas consultas de datos.** |

---

## 3. Funciones / API implementada

`src/lib/prediction-engine/pick-value.ts` (todo puro, sin efectos):

| Export | Firma | Rol |
|--------|-------|-----|
| `computePickValue` | `(aggregates: PickAggregates, pick: PickValueInput, options?: PickValueOptions) => PickValue` | Núcleo: interpreta la distribución de Fase B para un pick. |
| `buildPickValueMessage` | `(value: PickValue, ctx?: PickValueContext) => string` | Copy responsable (separable para `narrative-template` futuro). |
| `pickValueThresholds` | const | Umbrales configurables. |
| `DISCLAIMER` | const | Texto recreativo obligatorio. |
| `pickKindLabel` / `pickKindEmoji` / `pickRiskLabel` | helpers UI | Etiquetas y emojis. |
| Tipos | `PickRisk`, `PickKind`, `PickValueInput`, `PickValueContext`, `PickValueOptions`, `PickValue` | Contrato. |

**Reúso (sin duplicar):** importa `outcomeOf`, `outcomeLabel`, `Outcome`, `PickAggregates` de `insights/pick-aggregates.ts`. La distribución y los `sharePct` los sigue calculando `computePickAggregates`; `pick-value` solo **interpreta**.

---

## 4. Lógica implementada

### Eje de clasificación (de `scoreSharePct`)

| `scoreSharePct` | `kind` | `risk` |
|-----------------|--------|--------|
| ≥ 20% | `popular` | `bajo` |
| 10%–20% | `balanceado` | `medio` |
| 3%–10% | `diferencial` | `alto` |
| < 3% | `raro` | `extremo` |

- `minSample = 5`: bajo esto, `sampleOk = false` → mensaje "Aún hay pocos pronósticos para comparar este pick" y **no se muestra el badge ni se dispara analytics**.
- Caso especial en el mensaje: si el **resultado 1X2** es mayoritario (≥50%) pero el **marcador** es diferencial/raro → mensaje tipo *"La mayoría espera victoria de México (62%), pero tu marcador exacto es diferencial: solo el 6% lo eligió…"*.
- También expone `isMostPopularScore` / `isMostPopularOutcome`, `outcome` y `outcomeSharePct`.

---

## 5. Ejemplos de salida

### A) Pick diferencial (partido finalizado, pick del usuario 2-1, 6% lo eligió, 100 picks)

```jsonc
// computePickValue(aggregates, { local: 2, visitante: 1 }, { context })
{
  "scoreSharePct": 6,
  "isMostPopularScore": false,
  "outcome": "local",
  "outcomeSharePct": 62,
  "isMostPopularOutcome": true,
  "risk": "alto",
  "kind": "diferencial",
  "message": "La mayoría espera victoria de México (62%), pero tu marcador exacto es diferencial: solo el 6% lo eligió. Puede mover la tabla si pega.",
  "total": 100,
  "sampleOk": true
}
```

### B) Pick popular (1-1, 24%)

```jsonc
{
  "scoreSharePct": 24, "kind": "popular", "risk": "bajo",
  "isMostPopularScore": true, "outcome": "empate", "outcomeSharePct": 30,
  "message": "Pick popular: tu marcador coincide con el 24% de los participantes. Buen camino si quieres mantener posición.",
  "total": 100, "sampleOk": true
}
```

### C) Muestra insuficiente (3 picks)

```jsonc
{ "kind": "...", "risk": "...", "total": 3, "sampleOk": false,
  "message": "Aún hay pocos pronósticos para comparar este pick." }
// → badge NO se renderiza, pick_value_shown NO se dispara.
```

### UI (surface A, debajo del bloque de Fase B)

```
🃏 Pick diferencial · riesgo alto
La mayoría espera victoria de México (62%), pero tu marcador exacto es
diferencial: solo el 6% lo eligió. Puede mover la tabla si pega.
Estimación recreativa basada en datos disponibles, no es garantía.
```

---

## 6. Analytics

- Evento `pick_value_shown` con payload `{ liga_scope: "global"|"grupo", kind, risk }`.
- Se dispara **una vez** (ref anti-duplicado) cuando el panel está abierto y el badge es visible (`sampleOk`).
- Sin PII (solo enums + scope). Reutiliza el `trackEvent` ya conectado a PostHog (Fase A).
- Funnel: `match_view` → (abrir "Predicciones de todos") → `pick_value_shown`.

---

## 7. Verificación

| Check | Comando | Resultado |
|-------|---------|-----------|
| Typecheck | `npx tsc --noEmit` | ✅ **Exit 0, sin errores.** |
| Lint (archivos tocados) | `ReadLints` + `npm run lint` filtrado | ✅ **Sin errores ni warnings** en `pick-value.ts`, `pick-aggregates.ts`, `events.ts`, `PronosticosTodosPanel.tsx`. |
| Lint (proyecto) | `npm run lint` | ⚠️ Errores preexistentes sin cambios (no introducidos por este sprint; pertenecen a Fase C). |

**Hooks:** el `useMemo` de `pickValue` y el `useEffect` de analytics se ubicaron **antes** del early return (`if (partido.estatus !== "finalizado") return null;`) para mantener el orden de hooks estable.

---

## 8. Riesgos encontrados

| Riesgo | Severidad | Mitigación aplicada |
|--------|-----------|---------------------|
| Sonar a apuesta | Alta | `DISCLAIMER` recreativo en cada render; sin odds monetarias; framing de popularidad/ventaja. |
| Muestras pequeñas | Media | `minSample = 5`; sin badge ni evento si `sampleOk = false`. |
| Framing retrospectivo (surface A es post-partido) | Baja | Aceptado: surface A es el beachhead seguro; el valor predictivo real llega en B/C (no en este sprint). |
| Duplicación con perfiles (Fase C) | Media | Dependencia unidireccional: `pick-value` expone el cálculo; profiles lo importará, no recalculará. |
| Sobreprometer precisión | Media | Porcentajes enteros; sin decimales falsos. |

---

## 9. Ideas para el siguiente paso (no implementado)

- **Surface C (detalle pre-lock)** y **B (quiniela antes de guardar)**: requieren una ruta de lectura **solo-agregado** (conteos sin nombres) por privacidad — siguiente incremento del Pick Value Engine.
- **Perfiles (Fase C):** consumir `computePickValue`/`outcomeOf` para `minorityRate` y el perfil *Apostador Diferencial 🃏*.
- **`narrative-template`:** extraer `buildPickValueMessage` hacia el módulo de narrativa del Prediction Engine cuando se generalice.
- **Evento `pick_value_hint_viewed`** para surfaces pre-lock (medir engagement antes de guardar).

---

## 10. Qué NO se implementó (límites respetados)

- ❌ Surfaces B, C, D (pre-lock / leaderboard).
- ❌ Rutas/server actions nuevas.
- ❌ Perfiles de usuario (Fase C) — solo se preparó su base.
- ❌ Estimación numérica de impacto en leaderboard (solo lenguaje cualitativo).
- ❌ Elo, LigaPro, ProGol, LLM, narrative-template completo.
- ❌ Tablas, migraciones, vistas, materialized views.
- ❌ Cambios a scoring, triggers, webhooks, producción.

---

*Reporte de Sprint 1.5 · Fase 1.5-A. TypeScript puro, solo lectura, reversible, reutiliza Fase B. Typecheck limpio; sin regresiones de lint; alcance respetado.*
