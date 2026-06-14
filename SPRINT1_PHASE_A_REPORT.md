# SPRINT 1 — FASE A — REPORTE DE EJECUCIÓN

> Ejecución de **Sprint 1 · Fase A** según `SPORTS_CORE_MASTERPLAN.md` y `SPRINT1_EXECUTION_PLAN.md`.
> Alcance estricto: **A1–A9**. No se tocó Fase B, Fase C, Migración 0, LigaPro ni Sports Core.
>
> **Resultado:** ✅ Completado. Typecheck limpio. Cero errores de lint nuevos introducidos.

---

## 1. Objetivos cumplidos

| ID | Objetivo | Estado |
|----|----------|--------|
| A1 | Instalar `posthog-js` | ✅ |
| A2 | Definir + documentar env vars de PostHog | ✅ |
| A3 | Crear `PostHogProvider` | ✅ |
| A4 | Montar provider en root layout | ✅ |
| A5 | Conectar `posthog.capture` real en `track.ts` (sin PII) | ✅ |
| A6 | Crear `PageViewTracker` + montar en `(app)/layout` | ✅ |
| A7 | Agregar eventos: `page_view`, `group_view`, `match_view`, `prediction_updated` | ✅ |
| A8 | Instrumentar `group_view` + `match_view` | ✅ |
| A9 | Distinguir `pronostico_saved` (creación) vs `prediction_updated` (edición) | ✅ |

Compatibilidad mantenida: **`pronostico_saved`** y **`leaderboard_viewed`** conservan nombre y comportamiento.

---

## 2. Archivos modificados / creados

### Creados (3)

| Archivo | Propósito |
|---------|-----------|
| `src/components/analytics/PostHogProvider.tsx` | Inicializa PostHog una vez en cliente, con doble gating (env enabled + key) y config sin PII. |
| `src/components/analytics/PageViewTracker.tsx` | Emite `page_view` por cambio de ruta (`usePathname`), con anti-duplicados por `ref`. |
| `SPRINT1_PHASE_A_REPORT.md` | Este reporte. |

### Modificados (8)

| Archivo | Cambio |
|---------|--------|
| `package.json` | + `posthog-js` (`^1.386.6`). |
| `src/lib/analytics/track.ts` | `trackEvent` ahora llama `posthog.capture` (gateado por enabled + `typeof window`). `trackEventServer` permanece noop (documentado). |
| `src/lib/analytics/events.ts` | + `page_view`, `group_view`, `match_view`, `prediction_updated` en `AnalyticsEventMap`. |
| `src/app/layout.tsx` | Monta `<PostHogProvider>` envolviendo el árbol. |
| `src/app/(app)/layout.tsx` | Monta `<PageViewTracker />`. |
| `src/app/(app)/grupos/[slug]/page.tsx` | `<AnalyticsViewTracker event="group_view" …>` en el render de éxito. |
| `src/app/(app)/partidos/[id]/page.tsx` | `<AnalyticsViewTracker event="match_view" …>` con `partido_id` + `estatus`. |
| `src/components/quiniela/PronosticoRow.tsx` | `handleSave` distingue creación (`pronostico_saved`) de edición (`prediction_updated`). |
| `docs/ANALYTICS.md` | Documenta integración real, env vars, config sin PII y nuevos eventos. |

---

## 3. Decisiones tomadas

1. **PostHog solo en cliente.** `track.ts` es importado por server actions y route handlers (`callback`, `grupos-actions`, `chat-actions`, etc.). Para no capturar server-side ni arriesgar PII/red en el server, `trackEvent` captura solo si `typeof window !== "undefined"`; `trackEventServer` queda noop (igual que antes). Captura server-side diferida a fases futuras.

2. **Doble gating de inicialización.** El provider inicializa PostHog únicamente si `NEXT_PUBLIC_ANALYTICS_ENABLED === "true"` **y** existe `NEXT_PUBLIC_POSTHOG_KEY`. Si falta cualquiera → no inicializa, `trackEvent` es noop, y **la app funciona exactamente igual** (cumple la restricción).

3. **Sin PII por configuración del SDK:**
   - `autocapture: false` (no captura DOM/texto que pueda contener PII).
   - `capture_pageview: false` (page_view manual con payload controlado `{ path }`).
   - `person_profiles: "identified_only"`.
   - **No** se llama `identify()` (A10 estaba fuera de A1–A9). Si se agrega, será solo con `user.id` (UUID).

4. **`page_view` usa solo `usePathname()`** (no `useSearchParams`): evita meter query con IDs/tokens sensibles en el payload y elimina la necesidad de un `<Suspense>` boundary (que en App Router es obligatorio alrededor de `useSearchParams`).

5. **Naming: compatibilidad sobre pureza.** Se conservaron los nombres existentes en español (`pronostico_saved`, `leaderboard_viewed`) para no romper instrumentación previa. `pronostico_saved` = creación; el nuevo `prediction_updated` = edición. La distinción se hace **en el componente** (sabe si había `pronostico` previo) **sin tocar la server action** `savePronostico`.

6. **`group_view` / `match_view` reutilizan `AnalyticsViewTracker`** (patrón existente de evento al montar, con `ref` anti-doble-disparo), en lugar de crear componentes nuevos. Solo se disparan en el render de éxito (no en estados de error).

7. **`.env.example` no se creó.** No existe en el repo y no se pudo enumerar el contrato completo de env de forma segura. Las variables de analytics se documentaron en `docs/ANALYTICS.md` (fuente de verdad de analytics). Ver pendientes.

---

## 4. Verificación

| Check | Comando | Resultado |
|-------|---------|-----------|
| Typecheck | `npx tsc --noEmit` | ✅ **Exit 0, sin errores.** |
| Lint (archivos de Fase A) | `ReadLints` sobre los 9 archivos | ✅ **Sin errores.** |
| Lint (proyecto) | `npm run lint` | ⚠️ 18 errores + 28 warnings **preexistentes** (ninguno introducido por Fase A). |

**Sobre el lint del proyecto:** los 18 errores ya existían (catalogados en `CURRENT_ERRORS.md`) y pertenecen a archivos no tocados por esta fase: `login/page.tsx`, `ChatGeneral.tsx`, `ChatRoomPanel.tsx`, `UnirseGrupoForm.tsx`, `MarcadorLive.tsx`, `OnboardingStartCard.tsx`, `PartidoAlineaciones.tsx`, `HonorTermsModal.tsx`, `TablonLiquidacion.tsx`, `process.ts`, `sync-lineups-cron.mjs`.

Los 2 errores que aparecen en `PronosticoRow.tsx` (líneas 68 y 218) son `useEffect`/`setState` **preexistentes**, no relacionados con la edición de `handleSave` de esta fase. **No se corrigieron** porque resolver lint preexistente es explícitamente **Fase C** (fuera de alcance).

---

## 5. Riesgos encontrados

| Riesgo | Severidad | Mitigación aplicada / nota |
|--------|-----------|----------------------------|
| `posthog-js` importado en módulo compartido cliente/servidor | Bajo | `posthog-js` es seguro de importar en SSR (no accede a `window` al importar); la captura está guardada por `typeof window`. Typecheck OK. |
| Doble disparo de `page_view` en navegación/StrictMode | Bajo | `ref` con último `path`; solo emite si cambió. |
| Doble disparo de view-events al remontar | Bajo | `AnalyticsViewTracker` usa `fired` ref (una vez por montaje). |
| Captura accidental de PII | Medio→Bajo | `autocapture` off, sin `identify`, payloads solo con enums/UUIDs/path. Política sin PII reforzada en doc. |
| Costo PostHog si se activa con tráfico Mundial | Medio | `person_profiles: "identified_only"` + autocapture off reducen volumen/PII. Vigilar al activar la env en prod. |
| Lint preexistente (18 errores) sigue rojo | Medio | Fuera de alcance (Fase C). No bloquea typecheck. |
| Build de producción no ejecutado | Bajo | Solo se pidió lint + typecheck. Ambos pasan (typecheck limpio). Recomendable un `next build` antes de desplegar. |

---

## 6. Pendientes para Fase B

Fase A no implementó nada de Fase B (correcto). Para Fase B (Pick aggregates), queda:

- [ ] B1. `src/lib/insights/pick-aggregates.ts` — función pura (% por marcador exacto + % por tendencia 1X2), sin BD.
- [ ] B2. Conectar en `PronosticosTodosPanel.tsx` usando datos que ya entrega `fetchPronosticosPartidoTodos`.
- [ ] B3. Renderizar badges ("solo X% acertó", "marcador más elegido"), resaltando el pick del usuario.
- [ ] B4. (Opcional) evento `insight_viewed` para medir engagement del insight.
- [ ] B5. Verificación de privacidad (solo agregados).

### Ganchos útiles ya disponibles para Fase B

- El nuevo evento `match_view` ya permite medir engagement en el detalle de partido (denominador para el funnel del insight).
- `trackEvent` ya emite a PostHog real → cuando se agregue `insight_viewed` solo hay que añadirlo a `events.ts` y dispararlo.
- `AnalyticsViewTracker` es el patrón listo para instrumentar `insight_viewed`.

### Deuda menor heredada (no de Fase A)

- Crear `.env.example` completo (decisión diferida; hoy las vars de analytics viven en `docs/ANALYTICS.md`).
- 18 errores de lint preexistentes → **Fase C**.

---

## 7. Cómo activar (operación)

En el entorno (Railway / local), definir:

```env
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # opcional; EU: https://eu.i.posthog.com
```

Sin estas variables, el comportamiento es idéntico al anterior (noop, solo `console.debug` en dev).

---

*Reporte de ejecución de Sprint 1 · Fase A. Typecheck limpio; sin regresiones de lint introducidas; alcance respetado.*
