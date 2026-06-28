# KNOCKOUT_ROUND_QUINIELA_REPORT

Fecha: 2026-06-18 · Ticket: **KNOCKOUT-ROUND-QUINIELA-P1**

## ¿Quedó lista la quiniela para TODA la eliminación?

**Sí** — para pronosticar y navegar por ronda en la quiniela global y grupos privados.

La eliminatoria completa (R32 → Final) ya estaba en BD y en el flujo de guardado desde P0. P1 añade la **UX por rondas** y corrige **home / pendientes** respecto a TBD.

---

## Cambios realizados (P1)

### UX de rondas (`QuinielaList`)

- Secciones colapsables por ronda con emoji + título
- Contador de partidos y progreso `N/M pronosticados`
- Ronda activa expandida por defecto (`detectActiveQuinielaPhase`)
- Si eliminatoria arrancó, rondas KO aparecen **antes** que grupos
- Rondas solo TBD: mensaje *«Se habilitará cuando se definan los clasificados.»*

### Visibilidad TBD

- Sin cambios en `savePronostico` ni `PronosticoRow` (ya correctos)
- Filtros pendientes/hoy/próximos siguen excluyendo TBD
- Filtro «Todos» muestra filas bloqueadas

### Homepage

- Restaurado `NextPendingPredictionCard` en `/`
- `fetchNextPendingPredictionForUser`: salta TBD y grupos cerrados
- `computeLigaStats`: pendientes excluyen KO TBD
- Etiqueta de ronda: «Ronda de 32», «Octavos», etc.

### Tests nuevos

- `src/lib/quiniela/knockout-rounds.test.ts` — orden, fases, TBD, progreso, kickoff

### No tocado (según ticket)

- Scoring / `calcular_puntos_pronostico`
- `savePronostico`
- Pitoniso
- Migrations
- Fase de grupos (comportamiento preservado)

---

## Archivos nuevos / modificados

| Archivo | Acción |
|---------|--------|
| `src/lib/quiniela/knockout-rounds.ts` | Nuevo |
| `src/lib/quiniela/knockout-rounds.test.ts` | Nuevo |
| `src/components/quiniela/QuinielaRoundSection.tsx` | Nuevo |
| `src/components/quiniela/QuinielaList.tsx` | Agrupación por ronda |
| `src/lib/quiniela/next-pending-prediction.ts` | TBD + skip grupos cerrados |
| `src/lib/home/home-dashboard-queries.ts` | Pendientes sin TBD |
| `src/app/(app)/page.tsx` | Card siguiente pronóstico |
| `src/components/home/NextPendingPredictionCard.tsx` | Títulos de ronda |
| `KNOCKOUT_ROUND_QUINIELA_AUDIT.md` | Auditoría |
| `KNOCKOUT_ROUND_QUINIELA_REPORT.md` | Este reporte |

---

## Validación

```text
npm run test:core   → 141 passed (21 files)
npm run typecheck   → OK
npm run build       → OK
```

---

## Qué falta (fuera de alcance P1)

- Filtro por ronda en quiniela **global** (chips URL como en grupos `por_fase`) — opcional
- Tests E2E de componentes React
- Resolver automático en prod cuando avancen resultados reales (script `resolve-knockout-participants` ya existe)

---

## QA manual sugerido

1. `/quiniela` — ver secciones Ronda de 32, Octavos (TBD), etc.
2. Octavos colapsados con mensaje de clasificados
3. R32 expandida con inputs activos
4. Filtro Pendientes — solo R32 (no octavos TBD)
5. Filtro Todos — octavos visibles bloqueados
6. Home — card «Tu siguiente pronóstico» apunta a partido R32 pendiente
7. Grupo privado `/grupos/[slug]/quiniela` — mismas secciones
8. Guardar pick R32 — sin regresión
