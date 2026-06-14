# SPRINT 1 — FASE B — REPORTE DE EJECUCIÓN

> Ejecución de **Sprint 1 · Fase B** (Pick Aggregates) según `SPORTS_CORE_MASTERPLAN.md` y `SPRINT1_EXECUTION_PLAN.md`.
> Alcance estricto: **B1, B2, B3**. **No** se implementó B4, B5, Fase C, Migración 0, LigaPro ni Sports Core.
>
> **Resultado:** ✅ Completado. Typecheck limpio. Cero errores/warnings de lint introducidos.

---

## 1. Objetivos cumplidos

| ID | Objetivo | Estado |
|----|----------|--------|
| B1 | Crear helper puro `src/lib/insights/pick-aggregates.ts` | ✅ |
| B2 | Integrar el helper en `PronosticosTodosPanel` (solo lectura) | ✅ |
| B3 | Renderizar UI: marcador más elegido, resultado más elegido, "solo X% eligió", "solo X% acertó" | ✅ |

**Restricciones respetadas:** solo lectura · TypeScript puro · reversible · sin IA · sin APIs externas · sin tocar scoring/pronósticos/tablas/migraciones/vistas. Sin PII (el helper solo recibe marcadores y un flag `esYo`).

---

## 2. Archivos modificados / creados

### Creados (2)

| Archivo | Propósito |
|---------|-----------|
| `src/lib/insights/pick-aggregates.ts` | Helper puro: `computePickAggregates()` + `outcomeLabel()`. Sin efectos, sin red, sin BD. |
| `SPRINT1_PHASE_B_REPORT.md` | Este reporte. |

### Modificados (1)

| Archivo | Cambio |
|---------|--------|
| `src/components/quiniela/PronosticosTodosPanel.tsx` | `useMemo` que calcula los agregados desde `participantes` + `resultadoReal` (datos que el panel **ya cargaba**), y bloque de UI con los insights. Sin cambios en la carga de datos. |

**Reutilización clave:** el panel ya invocaba `fetchPronosticosPartidoTodos`, que devuelve `participantes` (con `golesLocal`, `golesVisitante`, `puntos`, `esYo`) y `resultadoReal`. Fase B **no añade ninguna consulta**: agrega cálculo en memoria sobre datos ya presentes.

---

## 3. Cálculos implementados

Función pura `computePickAggregates(participantes, resultadoReal)`:

| Salida | Descripción |
|--------|-------------|
| `total` | Nº de pronósticos considerados. |
| `exactScores[]` | **Distribución de marcadores exactos** `{ local, visitante, count, pct }`, ordenada por popularidad desc (desempate determinístico por marcador asc). |
| `outcomes[]` | **Distribución 1X2** en orden fijo `local · empate · visitante`, cada uno `{ count, pct }`. |
| `mostPopularScore` | **Marcador más elegido** (primer elemento de `exactScores`). |
| `mostPopularOutcome` | **Resultado 1X2 más elegido**. |
| `userScore` / `userScoreSharePct` | Marcador del usuario actual + **% que eligió ese mismo marcador**. |
| `exactMatchPct` | **% que acertó el marcador exacto real** (solo si `resultadoReal != null`, es decir partido finalizado con marcador). |
| `userMatchedExact` | Si el usuario acertó el marcador exacto (`null` si no aplica). |

Detalles:
- `outcomeOf`: `local` si `gl > gv`, `visitante` si `gl < gv`, `empate` si `gl == gv`.
- `pct = Math.round(count / total * 100)` (enteros tipo "23%"). Se conserva `count` y `total` por si la UI quiere reformatear.
- Determinístico: mismas entradas → mismas salidas. Sin `Date.now()`, sin aleatoriedad, sin red.
- Caso borde `total === 0` → estructura vacía segura (sin `NaN`, sin `null` inesperados en arrays).

---

## 4. Ejemplos de salida

### Entrada (ilustrativa, 100 pronósticos, partido finalizado 2–1)

```ts
computePickAggregates(
  [
    /* 23× */ { golesLocal: 1, golesVisitante: 1 },
    /* 15× */ { golesLocal: 2, golesVisitante: 0 },
    /*  8× */ { golesLocal: 2, golesVisitante: 1, esYo: true },
    /*  4× */ { golesLocal: 3, golesVisitante: 2 },
    /* … hasta sumar 100, con local=62 / empate=18 / visitante=20 … */
  ],
  { local: 2, visitante: 1 },
);
```

### Salida (resumida)

```jsonc
{
  "total": 100,
  "exactScores": [
    { "local": 1, "visitante": 1, "count": 23, "pct": 23 },
    { "local": 2, "visitante": 0, "count": 15, "pct": 15 },
    { "local": 2, "visitante": 1, "count": 8,  "pct": 8  },
    { "local": 3, "visitante": 2, "count": 4,  "pct": 4  }
    // …
  ],
  "outcomes": [
    { "outcome": "local",     "count": 62, "pct": 62 },
    { "outcome": "empate",    "count": 18, "pct": 18 },
    { "outcome": "visitante", "count": 20, "pct": 20 }
  ],
  "mostPopularScore":   { "local": 1, "visitante": 1, "count": 23, "pct": 23 },
  "mostPopularOutcome": { "outcome": "local", "count": 62, "pct": 62 },
  "userScore":          { "local": 2, "visitante": 1 },
  "userScoreSharePct":  8,
  "exactMatchPct":      8,
  "userMatchedExact":   true
}
```

### Cómo se ve en la UI (`PronosticosTodosPanel`, partido finalizado)

```
Resultado real: 2-1

┌───────────────────────┬───────────────────────┐
│ MARCADOR MÁS ELEGIDO  │ RESULTADO MÁS ELEGIDO  │
│        1-1            │         Local          │
│        23%            │          62%           │
└───────────────────────┴───────────────────────┘

Solo el 8% eligió tu marcador (2-1)
Solo el 8% acertó el marcador exacto · ¡tú incluido! 🎯
```

---

## 5. Verificación

| Check | Comando | Resultado |
|-------|---------|-----------|
| Typecheck | `npx tsc --noEmit` | ✅ **Exit 0, sin errores.** |
| Lint (archivos Fase B) | `ReadLints` + filtro en `npm run lint` | ✅ **Sin errores ni warnings** en `pick-aggregates.ts` ni `PronosticosTodosPanel.tsx`. |
| Lint (proyecto) | `npm run lint` | ⚠️ 18 errores preexistentes (sin cambios; ninguno introducido por Fase B). Pertenecen a Fase C. |

**Hooks:** el `useMemo` se ubicó **antes** del early return (`if (partido.estatus !== "finalizado") return null;`) para mantener el orden de hooks estable (regla `react-hooks/rules-of-hooks`).

---

## 6. Riesgos encontrados

| Riesgo | Severidad | Nota / mitigación |
|--------|-----------|-------------------|
| Redondeo de porcentajes no suma 100% | Bajo (cosmético) | `Math.round` por bucket; aceptable para display. Se conservan `count`/`total` si se quisiera normalizar. |
| Muestras muy pequeñas (p. ej. 1–2 picks) dan % engañosos ("100% eligió") | Bajo | Hoy se muestra igual; en Fase C podría ocultarse el insight bajo un mínimo (p. ej. `total >= 5`). |
| Exposición de picks individuales | Ninguna nueva | El panel **ya** mostraba nombre + marcador de cada quien post-partido; el agregado es menos identificable, no más. |
| Empates de popularidad | Bajo | Desempate determinístico (count desc → local asc → visitante asc). Estable entre renders. |
| Datos solo disponibles tras abrir el panel | Bajo (UX) | El cálculo corre al cargar `participantes` (al pulsar "Predicciones de todos"). No hay prefetch; coherente con el flujo actual. |
| Partido sin `resultadoReal` (marcador null) | Bajo | `exactMatchPct`/`userMatchedExact` quedan `null` y la UI los omite. Sin crashes. |

---

## 7. Ideas para Fase C

- **Umbral mínimo de muestra:** ocultar/atenuar insights con `total < 5` para evitar % engañosos.
- **Superficie en detalle de partido:** mostrar el "solo X% acertó" también fuera del acordeón, como gancho de engagement (combinable con el evento `match_view` ya emitido en Fase A).
- **Evento `insight_viewed`** (era B4, fuera de alcance aquí): instrumentar cuando se renderiza el bloque, para medir engagement del insight contra `match_view`.
- **Diferencial del usuario:** badge "pick diferencial" cuando el marcador del usuario está en el percentil bajo (raro) y acierta.
- **Persistencia/materialización (post-octubre):** si la escala lo exige, mover el agregado a `pick_aggregates` materializado — **pero** su refresh natural es "al finalizar partido" (`trg_partido_finalizado_puntos` = zona congelada), por lo que queda fuera hasta la Migración 3 del masterplan.
- **Normalización 1X2 reusable:** `outcomeOf` podría reutilizarse para futuros tipos de quiniela (ProGol/1X2) sin duplicar lógica.

---

*Reporte de ejecución de Sprint 1 · Fase B. TypeScript puro, solo lectura, reversible. Typecheck limpio; sin regresiones de lint; alcance respetado.*
