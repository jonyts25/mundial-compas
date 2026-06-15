# ENGAGEMENT-MULTI-QUINIELA-1 — Reporte

**Fecha:** 2026-06-14  
**Objetivo:** Hacer el home consciente de que un usuario puede pertenecer a varias quinielas (global + grupos privados).

---

## Resumen

Se añadió el carrusel **「Tus quinielas」** debajo del dashboard global existente. Cada card muestra ranking, participantes, enviados, pendientes, progreso % y estado (`Vas al día` / `Te faltan N` / `Cierra pronto`), con CTA a la quiniela correspondiente.

El dashboard ENG-1 (resumen global) **no se eliminó** ni se modificó en UX.

---

## Archivos

| Archivo | Cambio |
|---------|--------|
| `src/lib/home/home-dashboard-queries.ts` | `fetchHomeQuinielaSummaries()`, helpers compartidos `computeLigaStats`, tipos `HomeQuinielaSummary` |
| `src/components/home/MultiQuinielaSummaryCarousel.tsx` | Carrusel horizontal + cards |
| `src/app/(app)/page.tsx` | Fetch + montaje debajo de `HomeEngagementDashboard` |
| `src/lib/analytics/events.ts` | `home_quiniela_summary_shown`, `home_quiniela_summary_clicked` |

---

## Query `fetchHomeQuinielaSummaries(userId)`

1. Carga partidos `programado` + `finalizado` (sin pilot).
2. Carga todos los `pronosticos` del usuario (todas las ligas).
3. Carga grupos privados vía `fetchMisGrupos` (degradación: `[]` si falla).
4. Siempre incluye liga global (`LIGA_GLOBAL_ID`) aunque `fetchMisGrupos` excluya `es_sistema`.
5. Por cada liga:
   - Ranking: `fetchLeaderboard(ligaId)` → posición del usuario (null si falla).
   - Participantes: `miembros_count` del grupo o RPC `contar_miembros_liga`.
   - Progreso / pendientes: mismas reglas que dashboard global, scoped por `liga_id`.
   - `Cierra pronto`: pendiente con lock &lt; 24 h (`isDeadlineUrgent`).
6. Orden: global primero, grupos por nombre.

---

## Rutas CTA

| Scope | CTA | Ruta |
|-------|-----|------|
| Global | `Pronosticar` / `Ir a quiniela` | `/quiniela` |
| Grupo | Idem | `/grupos/[slug]/quiniela` |

**Detalle de partido:** `/partidos/[id]` sigue cargando pronóstico solo en `LIGA_GLOBAL_ID` (`fetchPartidoDetallePageData`). **No** se usa como CTA para grupos privados.

---

## Analytics

| Evento | Payload |
|--------|---------|
| `home_quiniela_summary_shown` | `{ ligas_count }` |
| `home_quiniela_summary_clicked` | `{ liga_id, liga_scope: "global" \| "grupo" }` |

Sin PII.

---

## UX / layout

- Sección debajo de `HomeEngagementDashboard`.
- Scroll horizontal con `snap-x`, cards ~85vw / max 18rem.
- Badge de estado con color (verde / ámbar / rojo).
- Barra de progreso por card.

---

## QA manual (checklist)

| # | Caso | Esperado |
|---|------|----------|
| 1 | Solo global | 1 card global; dashboard igual |
| 2 | Global + 2 grupos | 3 cards; stats independientes |
| 3 | Grupo sin pronósticos | 0% progreso; pendientes = pool abierto |
| 4 | Grupo al día | Badge 「Vas al día」 |
| 5 | Clic global | → `/quiniela` |
| 6 | Clic grupo | → `/grupos/{slug}/quiniela` |
| 7 | Móvil | Carrusel deslizable |
| 8 | WhatsNew + dashboard | Sin regresión (componentes separados) |

---

## Fuera de alcance (respetado)

- Migration 0, Sports Core, scoring, triggers, webhooks, RLS, `savePronostico`, Pitoniso engine, schema BD.

---

## Validación

```bash
npx tsc --noEmit   # ✅
npx eslint …       # ✅ archivos tocados
```

---

## Notas

- Si `fetchLeaderboard` falla para una liga, ranking muestra 「Sin datos」; el resto de la card sigue visible.
- Duplicación intencional global: dashboard ENG-1 + card global en carrusel (QA explícito).
