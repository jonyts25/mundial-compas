# NEXT-PENDING-PREDICTION-1 — REPORTE

> Card **“Tu siguiente pronóstico pendiente”** en home autenticado.
>
> **Resultado:** ✅ Implementado. Sin commit automático (según instrucción).

---

## 1. Archivos tocados

| Archivo | Acción |
|---------|--------|
| `src/lib/quiniela/next-pending-prediction.ts` | **Nuevo** — query server |
| `src/components/home/NextPendingPredictionCard.tsx` | **Nuevo** — UI + analytics |
| `src/app/(app)/page.tsx` | **Editado** — fetch + render |
| `src/lib/analytics/events.ts` | **Editado** — eventos shown/clicked |
| `docs/POSTHOG_PRODUCT_REVIEW.md` | **Nuevo** (ANALYTICS-REVIEW-1, sin código app) |
| `NEXT_PENDING_PREDICTION_1_REPORT.md` | **Nuevo** — este reporte |

---

## 2. Query

**Función:** `fetchNextPendingPredictionForUser(userId)`

| Paso | Lógica |
|------|--------|
| 1 | Partidos `estatus = programado`, orden `fecha_kickoff` ASC |
| 2 | Pronósticos del usuario en `LIGA_GLOBAL_ID` |
| 3 | Excluir pilot (`filterOutPilotPartidos`) |
| 4 | Excluir partidos con pronóstico existente |
| 5 | Excluir partidos con `isPronosticoLocked(fecha_kickoff)` |
| 6 | Devolver el primero o `item: null` |

**Cliente Supabase:** `createServerDataClient()` (mismo patrón que calendario).

---

## 3. UX

| Estado | UI |
|--------|-----|
| Hay pendiente | Equipos, meta fase/grupo/jornada/fecha, “Aún no has pronosticado”, copy sugerido, CTA **Pronosticar** → `/partidos/[id]` |
| Sin pendientes | “Vas al día” + mensaje positivo |

**Ubicación home:** tras `AdminPlatformCard`, antes de `OnboardingStartCard` y `HeroSection`.

---

## 4. Analytics

| Evento | Cuándo |
|--------|--------|
| `next_pending_prediction_shown` | Card con partido pendiente (once, `useRef`) |
| `next_pending_prediction_clicked` | Clic en CTA Pronosticar |

Payload: `{ partido_id }` — sin PII.

Estado “Vas al día” no emite eventos (sin partido que trackear).

---

## 5. QA manual

| # | Caso | Esperado |
|---|------|----------|
| 1 | Próximo programado sin pick | Card + link a partido |
| 2 | Ya pronosticó el próximo | Muestra el siguiente pendiente |
| 3 | Sin pendientes | “Vas al día” |
| 4 | Partido bloqueado (lock) | Omitido de candidatos |
| 5 | Móvil | Card responsive, CTA full width |
| 6 | WhatsNewModal | Independiente (z-index modal 60 vs card normal) |

---

## 6. Verificación técnica

| Comando | Resultado |
|---------|-----------|
| `npx tsc --noEmit` | ✅ |
| ESLint archivos tocados | ✅ |

---

## 7. Pendientes / backlog

| Item | Prioridad |
|------|-----------|
| Incluir quinielas de **grupo** (no solo global) | Media |
| Partidos `aplazado` como candidatos | Baja (spec dice solo programado) |
| Evento analytics en estado “Vas al día” | Opcional |
| Reutilizar datos de `fetchCalendarioPartidosData` para evitar query duplicada | Optimización |

---

*NEXT-PENDING-PREDICTION-1 · Jun 2026*
