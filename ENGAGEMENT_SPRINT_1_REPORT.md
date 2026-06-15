# ENGAGEMENT-SPRINT-1 — Reporte

**Fecha:** 2026-06-14  
**Objetivo:** Convertir el home autenticado en un dashboard personal de la quiniela.

## Alcance implementado

| ID | Componente | Estado |
|----|------------|--------|
| ENG-1 | `HomePersonalSummaryCard` | ✅ |
| ENG-2 | `PredictionProgressCard` | ✅ |
| ENG-3 | `NextDeadlineCard` | ✅ |
| ENG-4 | — | ❌ No implementado (fuera de alcance) |

## Archivos nuevos

| Archivo | Rol |
|---------|-----|
| `src/lib/home/home-dashboard-queries.ts` | Fetch consolidado (rank, perfil, progreso, pendientes, próximo cierre) |
| `src/lib/home/format-deadline.ts` | Countdown `"En N días/horas/minutos"` + flag urgencia (&lt; 24 h) |
| `src/components/home/HomePersonalSummaryCard.tsx` | ENG-1 |
| `src/components/home/PredictionProgressCard.tsx` | ENG-2 |
| `src/components/home/NextDeadlineCard.tsx` | ENG-3 |
| `src/components/home/HomeEngagementDashboard.tsx` | Contenedor que monta las 3 cards |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/app/(app)/page.tsx` | Monta `HomeEngagementDashboard` tras `AdminPlatformCard`; reemplaza `NextPendingPredictionCard` |
| `src/lib/analytics/events.ts` | Eventos `home_summary_shown`, `prediction_progress_shown`, `next_deadline_shown` |

## Datos y reglas de negocio

### ENG-1 — Resumen personal

- **Nombre:** `usuario.nombre_visible` (ya cargado en home).
- **Ranking:** posición en liderato global vía `fetchLeaderboard(LIGA_GLOBAL_ID)`; fallback si falla la RPC.
- **Perfil:** `fetchUserProfile(userId)` → emoji + label del perfil primario; fallback “Perfil en camino”.
- **Enviados:** pronósticos del usuario en partidos `programado` + `finalizado` (sin pilot).
- **Pendientes:** partidos `programado`, no bloqueados (`isPronosticoLocked`), sin pronóstico del usuario.

### ENG-2 — Progreso

- **Y (total):** partidos `programado` + `finalizado`, excluyendo pilot.
- **X (enviados):** pronósticos del usuario en ese conjunto.
- **Porcentaje:** entero `Math.round(X/Y * 100)`.

### ENG-3 — Próximo cierre

- Partido `programado` no bloqueado con **cierre más cercano** (orden por `getLockAtMs`, no por kickoff).
- Muestra equipos, fecha/hora CDMX, countdown relativo.
- **Urgencia visual** si faltan &lt; 24 h (borde rojo, badge “Urgente”, CTA rojo).
- **CTA** → `/partidos/[id]`.
- Countdown se actualiza en cliente cada 60 s (`useSyncExternalStore`).

## Analytics

| Evento | Cuándo |
|--------|--------|
| `home_summary_shown` | Primera render de ENG-1 (props: `has_rank`, `has_profile`, `pendientes`) |
| `prediction_progress_shown` | Primera render de ENG-2 (`enviados`, `total`, `percent`) |
| `next_deadline_shown` | Primera render de ENG-3 con partido (`partido_id`) |

## Decisiones de producto

1. **`NextPendingPredictionCard` retirada del home** — ENG-3 cubre urgencia de cierre + CTA; ENG-1 muestra pendientes. El componente y `fetchNextPendingPredictionForUser` siguen en el repo por si se reutilizan.
2. **Un solo fetch de partidos** — `programado` + `finalizado` en una query; el deadline se deriva del mismo set.
3. **Leaderboard completo en memoria** — mismo patrón que `/leaderboard`; rank = búsqueda por `usuario_id`. Sin cambios a RPC/RLS.

## Fuera de alcance (respetado)

- Sports Core, scoring, triggers, webhooks, RLS, Pitoniso, `savePronostico`.
- ENG-4.

## Validación

```bash
npx tsc --noEmit   # ✅ OK
npx eslint …       # ✅ OK (archivos tocados)
```

## Orden en home autenticado

1. `PilotModeBanner` (condicional)
2. `AdminPlatformCard`
3. **`HomeEngagementDashboard`** ← nuevo bloque
4. `OnboardingStartCard`
5. `HeroSection`
6. `CalendarioPartidos`

## Próximos pasos sugeridos (opcional)

- ENG-4 cuando se defina alcance.
- RPC ligera `posicion_usuario_en_liga` si el liderato crece mucho.
- Evento `next_deadline_clicked` si se quiere medir CTR del CTA.
